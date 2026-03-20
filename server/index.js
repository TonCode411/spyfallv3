const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { ORTE } = require('./gameData');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000
});
const lobbies = {};

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealCards(lobby) {
  const playerList = Object.values(lobby.players);
  const n = playerList.length;
  if (n < 1) return { error: 'Keine Spieler' };
  const verfuegbareOrte = ORTE.filter(o => lobby.settings.aktivierteOrte.includes(o.id));
  if (!verfuegbareOrte.length) return { error: 'Keine Orte aktiviert' };
  const ort = verfuegbareOrte[Math.floor(Math.random() * verfuegbareOrte.length)];
  const rollen = shuffle(ort.rollen).slice(0, n - 1);
  const agentIndex = Math.floor(Math.random() * n);
  const karten = {};
  let ri = 0;
  for (let i = 0; i < n; i++) {
    const p = playerList[i];
    karten[p.id] = i === agentIndex
      ? { typ: 'agent', ort: null, rolle: null }
      : { typ: 'spieler', ort: ort.name, ortEmoji: ort.emoji, rolle: rollen[ri++] };
  }
  return { ort, karten };
}

function getAgentId(lobby) {
  if (!lobby.aktuelleRunde) return null;
  const entry = Object.entries(lobby.aktuelleRunde.karten).find(([, k]) => k.typ === 'agent');
  return entry ? entry[0] : null;
}

function addPunkte(lobby, id, n) {
  if (lobby.players[id]) lobby.players[id].punkte = (lobby.players[id].punkte || 0) + n;
}

function buildPunkteUpdate(lobby) {
  return Object.values(lobby.players).map(p => ({ id: p.id, name: p.name, punkte: p.punkte || 0 }));
}

function stopTimer(lobby) {
  if (lobby.timerInterval) { clearInterval(lobby.timerInterval); lobby.timerInterval = null; }
}

function startTimer(lobby) {
  stopTimer(lobby);
  if (!lobby.settings.timerAktiv) return;
  const n = Object.keys(lobby.players).length;
  const sek =
    lobby.settings.timerModus === 'competitive' ? n * 60 :
    lobby.settings.timerModus === 'standard' ? n * 120 :
    (lobby.settings.timerSekunden || 300);
  lobby.timerRestzeit = sek;
  lobby.timerGesamt = sek;
  lobby.timerInterval = setInterval(() => {
    if (lobby.status !== 'laufend') { stopTimer(lobby); return; }
    if (lobby.pausiert) return;
    lobby.timerRestzeit = Math.max(0, lobby.timerRestzeit - 1);
    io.to(lobby.code).emit('timer:tick', { restzeit: lobby.timerRestzeit, gesamt: lobby.timerGesamt });
    if (lobby.timerRestzeit <= 0) { stopTimer(lobby); zeitAbgelaufen(lobby); }
  }, 1000);
}

function triggerAufloesung(lobby, grund, extra) {
  stopTimer(lobby);
  lobby.status = 'aufloesung';
  lobby.voting = null;
  lobby.pausiert = false;
  io.to(lobby.code).emit('runde:aufloesung', {
    ort: { name: lobby.aktuelleRunde.ort.name, emoji: lobby.aktuelleRunde.ort.emoji },
    karten: lobby.aktuelleRunde.karten,
    spieler: Object.fromEntries(Object.entries(lobby.players).map(([id, p]) => [id, { name: p.name, punkte: p.punkte || 0 }])),
    grund,
    punkteUpdate: buildPunkteUpdate(lobby),
    ...(extra || {})
  });
  io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
}

function zeitAbgelaufen(lobby) {
  if (lobby.status !== 'laufend') return;
  const agentId = getAgentId(lobby);
  const competitive = lobby.settings.timerModus === 'competitive';
  const agentPunkte = competitive ? 1 : 2;
  if (agentId && lobby.settings.punkteAktiv) addPunkte(lobby, agentId, agentPunkte);
  triggerAufloesung(lobby, 'zeit', { agentPunkte });
}

// Single resolveVote function - defined at module level, not inside connection handler
function resolveVote(lobby) {
  if (!lobby.voting) return;
  const { stimmen, gesamt, anklaeger, anklaegerName, beschuldigter } = lobby.voting;
  const jaStimmen = Object.values(stimmen).filter(Boolean).length;
  const mehrheit = jaStimmen > gesamt / 2;
  const agentId = getAgentId(lobby);
  const beschuldigterIstAgent = beschuldigter === agentId;

  if (mehrheit && beschuldigterIstAgent) {
    if (lobby.settings.punkteAktiv) {
      Object.keys(lobby.players).forEach(pid => { if (pid !== agentId) addPunkte(lobby, pid, 1); });
      addPunkte(lobby, anklaeger, 1); // extra fuer Anklaeger
    }
    triggerAufloesung(lobby, 'enttarnt', { anklaeger, anklaegerName });
  } else {
    const agentPunkte = lobby.settings.punkteAktiv ? 1 : 0;
    if (lobby.settings.punkteAktiv && agentId) addPunkte(lobby, agentId, 1);
    lobby.voting = null;
    lobby.pausiert = false;
    io.to(lobby.code).emit('vote:ergebnis', {
      mehrheit, beschuldigterIstAgent, jaStimmen, gesamtStimmen: gesamt, agentPunkte
    });
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  }
}

function getLobbyState(code) {
  const lobby = lobbies[code];
  if (!lobby) return null;
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    runde: lobby.runde,
    pausiert: lobby.pausiert || false,
    spieler: Object.values(lobby.players).map(p => ({
      id: p.id, name: p.name, istHost: p.id === lobby.hostId, punkte: p.punkte || 0
    })),
    settings: lobby.settings,
    alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji })),
    voting: lobby.voting ? {
      anklaeger: lobby.voting.anklaeger,
      anklaegerName: lobby.voting.anklaegerName,
      beschuldigter: lobby.voting.beschuldigter,
      beschuldigterName: lobby.voting.beschuldigterName,
      these: lobby.voting.these,
      abgegeben: Object.keys(lobby.voting.stimmen).length,
      gesamt: lobby.voting.gesamt,
      stimmen: lobby.voting.stimmen
    } : null,
    timerGesamt: lobby.timerGesamt || null,
    timerRestzeit: lobby.timerRestzeit || null
  };
}

function sendKarteToPlayer(playerId, lobby) {
  const karte = lobby.aktuelleRunde?.karten[playerId];
  if (!karte) return;
  io.to(playerId).emit('runde:karte', {
    karte,
    alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji })),
    runde: lobby.runde,
    settings: lobby.settings
  });
}

const DEFAULT_SETTINGS = {
  aktivierteOrte: ORTE.map(o => o.id),
  maxSpieler: 8,
  timerAktiv: false,
  timerModus: 'standard',
  timerSekunden: 300,
  punkteAktiv: false,
  nonCommMode: false,
  testModus: false
};

io.on('connection', (socket) => {
  console.log('connect', socket.id);

  socket.on('ping:keepalive', () => socket.emit('pong:keepalive'));

  socket.on('lobby:erstellen', ({ name }, cb) => {
    let code;
    do { code = genCode(); } while (lobbies[code]);
    lobbies[code] = {
      code, hostId: socket.id,
      players: { [socket.id]: { id: socket.id, name, punkte: 0 } },
      status: 'wartend', runde: 0, aktuelleRunde: null,
      pausiert: false, voting: null, timerInterval: null,
      timerRestzeit: null, timerGesamt: null,
      settings: { ...DEFAULT_SETTINGS }
    };
    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;
    cb({ success: true, code, spielerId: socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  socket.on('lobby:beitreten', ({ code, name }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb({ success: false, error: 'Lobby nicht gefunden' });

    const istBekannt = !!lobby.players[socket.id];
    const istVoll = Object.keys(lobby.players).length >= lobby.settings.maxSpieler;

    // Block new players if game is running or lobby is full
    if (!istBekannt && lobby.status === 'laufend')
      return cb({ success: false, error: 'Spiel laeuft bereits' });
    if (!istBekannt && istVoll)
      return cb({ success: false, error: 'Lobby ist voll' });

    // Add or restore player
    lobby.players[socket.id] = lobby.players[socket.id] || { id: socket.id, name, punkte: 0 };
    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;
    cb({ success: true, code, spielerId: socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  socket.on('state:sync', ({ code: syncCode, name: syncName } = {}) => {
    // Restore socket.data if lost after server restart
    const code = socket.data.lobbyCode || syncCode;
    if (code && !socket.data.lobbyCode) {
      socket.data.lobbyCode = code;
      socket.join(code);
      if (syncName) socket.data.name = syncName;
      // Re-add player to lobby if needed
      const l = lobbies[code];
      if (l && !l.players[socket.id]) {
        l.players[socket.id] = { id: socket.id, name: syncName || 'Spieler', punkte: 0 };
      }
    }
    const lobby = lobbies[code];
    if (!lobby) return;
    socket.emit('lobby:update', getLobbyState(code));
    if (lobby.status === 'laufend' && lobby.aktuelleRunde) {
      sendKarteToPlayer(socket.id, lobby);
      if (lobby.timerGesamt) {
        socket.emit('timer:tick', { restzeit: lobby.timerRestzeit, gesamt: lobby.timerGesamt });
      }
      if (lobby.voting) {
        socket.emit('vote:gestartet', {
          anklaeger: lobby.voting.anklaeger,
          anklaegerName: lobby.voting.anklaegerName,
          beschuldigter: lobby.voting.beschuldigter,
          beschuldigterName: lobby.voting.beschuldigterName,
          these: lobby.voting.these,
          abgegeben: Object.keys(lobby.voting.stimmen).length,
          gesamt: lobby.voting.gesamt,
          stimmen: lobby.voting.stimmen
        });
      }
    }
  });

  socket.on('settings:update', (newSettings) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.hostId !== socket.id) return;
    lobby.settings = { ...lobby.settings, ...newSettings };
    if (Array.isArray(newSettings.aktivierteOrte) && !newSettings.aktivierteOrte.length)
      lobby.settings.aktivierteOrte = [ORTE[0].id];
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('runde:starten', ({ testModus: clientTestModus } = {}, cb) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.hostId !== socket.id) return;
    const n = Object.keys(lobby.players).length;
    const testModus = clientTestModus === true || lobby.settings.testModus === true;
    if (n < 1) { if (cb) cb({ success: false, error: 'Keine Spieler gefunden' }); return; }
    const result = dealCards(lobby);
    if (result.error) { if (cb) cb({ success: false, error: result.error }); return; }

    lobby.status = 'laufend';
    lobby.runde++;
    lobby.aktuelleRunde = result;
    lobby.pausiert = false;
    lobby.voting = null;
    lobby.timerRestzeit = null;
    lobby.timerGesamt = null;
    Object.values(lobby.players).forEach(p => { p.ausgeschlosseneOrte = []; });

    // FIX: use sendKarteToPlayer with player id
    Object.keys(lobby.players).forEach(playerId => sendKarteToPlayer(playerId, lobby));

    startTimer(lobby);
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
    if (cb) cb({ success: true });
  });

  socket.on('ort:markieren', ({ ortId }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || !lobby.aktuelleRunde) return;
    const p = lobby.players[socket.id];
    if (!p) return;
    if (!p.ausgeschlosseneOrte) p.ausgeschlosseneOrte = [];
    const idx = p.ausgeschlosseneOrte.indexOf(ortId);
    if (idx === -1) p.ausgeschlosseneOrte.push(ortId);
    else p.ausgeschlosseneOrte.splice(idx, 1);
    socket.emit('ort:ausgeschlossen:update', { ausgeschlosseneOrte: p.ausgeschlosseneOrte });
  });

  socket.on('vote:starten', ({ beschuldigter, these }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.status !== 'laufend' || lobby.voting) return;
    if (!lobby.players[beschuldigter]) return;

    lobby.pausiert = true;
    const gesamt = Object.keys(lobby.players).length;
    lobby.voting = {
      anklaeger: socket.id,
      anklaegerName: lobby.players[socket.id]?.name || '?',
      beschuldigter,
      beschuldigterName: lobby.players[beschuldigter]?.name || '?',
      these: these || '',
      stimmen: { [socket.id]: true },
      gesamt
    };

    io.to(lobby.code).emit('vote:gestartet', {
      anklaeger: socket.id,
      anklaegerName: lobby.voting.anklaegerName,
      beschuldigter,
      beschuldigterName: lobby.voting.beschuldigterName,
      these: lobby.voting.these,
      abgegeben: 1,
      gesamt,
      stimmen: lobby.voting.stimmen
    });
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('vote:abgeben', ({ ja }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || !lobby.voting) return;
    if (lobby.voting.stimmen[socket.id] !== undefined) return;
    lobby.voting.stimmen[socket.id] = ja;

    const abgegeben = Object.keys(lobby.voting.stimmen).length;
    io.to(lobby.code).emit('vote:fortschritt', {
      abgegeben,
      gesamt: lobby.voting.gesamt,
      stimmen: lobby.voting.stimmen
    });

    if (abgegeben >= lobby.voting.gesamt) resolveVote(lobby);
  });

  socket.on('vote:abbrechen', () => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || !lobby.voting) return;
    if (lobby.voting.anklaeger !== socket.id && lobby.hostId !== socket.id) return;
    lobby.voting = null;
    lobby.pausiert = false;
    io.to(lobby.code).emit('vote:abgebrochen');
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('agent:raten', ({ ortName }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.status !== 'laufend') return;
    if (socket.id !== getAgentId(lobby)) return;
    const richtig = ortName.toLowerCase().trim() === lobby.aktuelleRunde.ort.name.toLowerCase().trim();
    if (richtig && lobby.settings.punkteAktiv) addPunkte(lobby, socket.id, 3);
    triggerAufloesung(lobby, richtig ? 'agent_richtig' : 'agent_falsch', {
      agentGuess: ortName,
      agentPunkte: richtig ? 3 : 0
    });
  });

  socket.on('disconnect', () => {
    const code = socket.data.lobbyCode;
    if (!code || !lobbies[code]) return;
    const lobby = lobbies[code];
    const name = socket.data.name || 'Jemand';
    delete lobby.players[socket.id];

    if (lobby.hostId === socket.id) {
      const remaining = Object.keys(lobby.players);
      if (!remaining.length) { stopTimer(lobby); delete lobbies[code]; return; }
      lobby.hostId = remaining[0];
      io.to(remaining[0]).emit('system:nachricht', { text: 'Du bist jetzt Host.' });
    }

    if (lobby.voting) {
      delete lobby.voting.stimmen[socket.id];
      lobby.voting.gesamt = Object.keys(lobby.players).length;
      const abgegeben = Object.keys(lobby.voting.stimmen).length;
      if (lobby.voting.gesamt > 0 && abgegeben >= lobby.voting.gesamt) {
        resolveVote(lobby);
      }
    }

    io.to(code).emit('lobby:update', getLobbyState(code));
    io.to(code).emit('system:nachricht', { text: name + ' hat die Lobby verlassen.' });
  });
});

setInterval(() => {
  const count = Object.keys(lobbies).length;
  if (count > 0) console.log('Aktive Lobbies: ' + count);
}, 30000);

app.get('/health', (_, res) => res.json({ ok: true, lobbies: Object.keys(lobbies).length }));
app.get('/', (_, res) => res.json({ status: 'Agenten Undercover Server' }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log('Server laeuft auf Port ' + PORT));
