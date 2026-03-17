const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { ORTE } = require('./gameData');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });
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
  if (n < 3) return { error: 'Mindestens 3 Spieler benoetigt' };
  const verfuegbareOrte = ORTE.filter(o => lobby.settings.aktivierteOrte.includes(o.id));
  if (verfuegbareOrte.length === 0) return { error: 'Keine Orte aktiviert' };
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
  return Object.entries(lobby.aktuelleRunde.karten).find(([, k]) => k.typ === 'agent')?.[0];
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
  const sek = lobby.settings.timerModus === 'competitive' ? n * 60
    : lobby.settings.timerModus === 'standard' ? n * 120
    : (lobby.settings.timerSekunden || 300);
  lobby.timerRestzeit = sek;
  lobby.timerGesamt = sek;
  lobby.timerInterval = setInterval(() => {
    if (lobby.pausiert) return;
    lobby.timerRestzeit--;
    io.to(lobby.code).emit('timer:tick', { restzeit: lobby.timerRestzeit, gesamt: lobby.timerGesamt });
    if (lobby.timerRestzeit <= 0) { stopTimer(lobby); zeitAbgelaufen(lobby); }
  }, 1000);
}

function zeitAbgelaufen(lobby) {
  if (lobby.status !== 'laufend') return;
  const agentId = getAgentId(lobby);
  // wenig Zeit (competitive) = einfacher = weniger Punkte
  const agentPunkte = lobby.settings.timerModus === 'competitive' ? 1 : 2;
  if (agentId && lobby.settings.punkteAktiv) addPunkte(lobby, agentId, agentPunkte);
  io.to(lobby.code).emit('runde:aufloesung', {
    ort: { name: lobby.aktuelleRunde.ort.name, emoji: lobby.aktuelleRunde.ort.emoji },
    karten: lobby.aktuelleRunde.karten,
    spieler: lobby.players,
    grund: 'zeit',
    agentPunkte,
    punkteUpdate: buildPunkteUpdate(lobby)
  });
  lobby.status = 'aufloesung';
  io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
}

function getLobbyState(code) {
  const lobby = lobbies[code];
  if (!lobby) return null;
  return {
    code: lobby.code, hostId: lobby.hostId, status: lobby.status,
    runde: lobby.runde, pausiert: lobby.pausiert || false,
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

const DEFAULT_SETTINGS = {
  aktivierteOrte: ORTE.map(o => o.id),
  maxSpieler: 8,
  timerAktiv: false,
  timerModus: 'standard',
  timerSekunden: 300,
  punkteAktiv: false,
  nonCommMode: false
};

io.on('connection', (socket) => {
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
    if (lobby.status === 'laufend') return cb({ success: false, error: 'Spiel laeuft bereits' });
    if (Object.keys(lobby.players).length >= lobby.settings.maxSpieler) return cb({ success: false, error: 'Lobby ist voll' });
    lobby.players[socket.id] = { id: socket.id, name, punkte: 0 };
    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;
    cb({ success: true, code, spielerId: socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  socket.on('settings:update', (newSettings) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.hostId !== socket.id) return;
    lobby.settings = { ...lobby.settings, ...newSettings };
    if (Array.isArray(newSettings.aktivierteOrte) && newSettings.aktivierteOrte.length === 0)
      lobby.settings.aktivierteOrte = [ORTE[0].id];
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('runde:starten', (_, cb) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.hostId !== socket.id) return;
    if (Object.keys(lobby.players).length < 3) return cb && cb({ success: false, error: 'Mindestens 3 Spieler benoetigt' });
    const result = dealCards(lobby);
    if (result.error) return cb && cb({ success: false, error: result.error });

    lobby.status = 'laufend';
    lobby.runde++;
    lobby.aktuelleRunde = result;
    lobby.pausiert = false;
    lobby.voting = null;
    Object.values(lobby.players).forEach(p => { p.ausgeschlosseneOrte = []; });

    Object.values(lobby.players).forEach(p => {
      const karte = result.karten[p.id];
      if (karte) io.to(p.id).emit('runde:karte', {
        karte,
        alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji })),
        runde: lobby.runde,
        settings: lobby.settings
      });
    });

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
    if (idx === -1) p.ausgeschlosseneOrte.push(ortId); else p.ausgeschlosseneOrte.splice(idx, 1);
    socket.emit('ort:ausgeschlossen:update', { ausgeschlosseneOrte: p.ausgeschlosseneOrte });
  });

  // VOTING
  socket.on('vote:starten', ({ beschuldigter, these }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.status !== 'laufend' || lobby.voting) return;
    lobby.pausiert = true;
    const gesamt = Object.keys(lobby.players).length;
    lobby.voting = {
      anklaeger: socket.id,
      anklaegerName: lobby.players[socket.id]?.name,
      beschuldigter,
      beschuldigterName: lobby.players[beschuldigter]?.name,
      these,
      stimmen: {},
      gesamt
    };
    io.to(lobby.code).emit('vote:gestartet', {
      anklaeger: socket.id,
      anklaegerName: lobby.voting.anklaegerName,
      beschuldigter,
      beschuldigterName: lobby.voting.beschuldigterName,
      these
    });
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('vote:abgeben', ({ ja }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || !lobby.voting) return;
    if (lobby.voting.stimmen[socket.id] !== undefined) return; // schon abgestimmt
    lobby.voting.stimmen[socket.id] = ja;
    const abgegeben = Object.keys(lobby.voting.stimmen).length;
    const { gesamt } = lobby.voting;

    io.to(lobby.code).emit('vote:fortschritt', { abgegeben, gesamt });

    if (abgegeben >= gesamt) {
      const jaStimmen = Object.values(lobby.voting.stimmen).filter(Boolean).length;
      const mehrheit = jaStimmen > gesamt / 2;
      const agentId = getAgentId(lobby);
      const beschuldigterIstAgent = lobby.voting.beschuldigter === agentId;

      if (mehrheit) {
        if (beschuldigterIstAgent) {
          if (lobby.settings.punkteAktiv) {
            Object.keys(lobby.players).forEach(pid => { if (pid !== agentId) addPunkte(lobby, pid, 1); });
            addPunkte(lobby, lobby.voting.anklaeger, 1);
          }
          stopTimer(lobby);
          lobby.status = 'aufloesung';
          io.to(lobby.code).emit('runde:aufloesung', {
            ort: { name: lobby.aktuelleRunde.ort.name, emoji: lobby.aktuelleRunde.ort.emoji },
            karten: lobby.aktuelleRunde.karten,
            spieler: lobby.players,
            grund: 'enttarnt',
            anklaeger: lobby.voting.anklaeger,
            anklaegerName: lobby.voting.anklaegerName,
            punkteUpdate: buildPunkteUpdate(lobby)
          });
        } else {
          // Falsch beschuldigt - Agent +1
          if (lobby.settings.punkteAktiv && agentId) addPunkte(lobby, agentId, 1);
          io.to(lobby.code).emit('vote:ergebnis', {
            mehrheit: true, beschuldigterIstAgent: false,
            jaStimmen, gesamtStimmen: gesamt,
            agentPunkte: lobby.settings.punkteAktiv ? 1 : 0
          });
          lobby.voting = null;
          lobby.pausiert = false;
        }
      } else {
        // Keine Mehrheit - Agent +1
        if (lobby.settings.punkteAktiv && agentId) addPunkte(lobby, agentId, 1);
        io.to(lobby.code).emit('vote:ergebnis', {
          mehrheit: false, jaStimmen, gesamtStimmen: gesamt,
          agentPunkte: lobby.settings.punkteAktiv ? 1 : 0
        });
        lobby.voting = null;
        lobby.pausiert = false;
      }
      io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
    }
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

  // AGENT GUESS
  socket.on('agent:raten', ({ ortName }) => {
    const lobby = lobbies[socket.data.lobbyCode];
    if (!lobby || lobby.status !== 'laufend') return;
    if (socket.id !== getAgentId(lobby)) return;
    const richtig = ortName.toLowerCase().trim() === lobby.aktuelleRunde.ort.name.toLowerCase().trim();
    stopTimer(lobby);
    if (richtig && lobby.settings.punkteAktiv) addPunkte(lobby, socket.id, 3);
    lobby.status = 'aufloesung';
    io.to(lobby.code).emit('runde:aufloesung', {
      ort: { name: lobby.aktuelleRunde.ort.name, emoji: lobby.aktuelleRunde.ort.emoji },
      karten: lobby.aktuelleRunde.karten,
      spieler: lobby.players,
      grund: richtig ? 'agent_richtig' : 'agent_falsch',
      agentGuess: ortName,
      agentPunkte: richtig ? 3 : 0,
      punkteUpdate: buildPunkteUpdate(lobby)
    });
    io.to(lobby.code).emit('lobby:update', getLobbyState(lobby.code));
  });

  socket.on('disconnect', () => {
    const code = socket.data.lobbyCode;
    if (!code || !lobbies[code]) return;
    const lobby = lobbies[code];
    delete lobby.players[socket.id];
    if (lobby.hostId === socket.id) {
      const remaining = Object.keys(lobby.players);
      if (remaining.length === 0) { stopTimer(lobby); delete lobbies[code]; return; }
      lobby.hostId = remaining[0];
    }
    if (lobby.voting) lobby.voting.gesamt = Math.max(1, Object.keys(lobby.players).length);
    io.to(code).emit('lobby:update', getLobbyState(code));
    io.to(code).emit('system:nachricht', { text: `${socket.data.name || 'Jemand'} hat die Lobby verlassen.` });
  });
});

app.get('/health', (_, res) => res.json({ ok: true, lobbies: Object.keys(lobbies).length }));
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server auf Port ${PORT}`));
