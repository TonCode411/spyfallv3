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
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// In-memory game state
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
  const { players, settings } = lobby;
  const playerList = Object.values(players);
  const n = playerList.length;

  if (n < 3) return { error: 'Mindestens 3 Spieler benötigt' };

  // Pick random location from enabled set
  const verfuegbareOrte = ORTE.filter(o => settings.aktivierteOrte.includes(o.id));
  if (verfuegbareOrte.length === 0) return { error: 'Keine Orte aktiviert' };

  const ort = verfuegbareOrte[Math.floor(Math.random() * verfuegbareOrte.length)];

  // Pick roles - shuffle and take n-1 (one agent)
  const rollen = shuffle(ort.rollen).slice(0, n - 1);

  // Assign agent randomly
  const agentIndex = Math.floor(Math.random() * n);

  // Build cards
  const karten = {};
  let rollenIndex = 0;
  for (let i = 0; i < n; i++) {
    const p = playerList[i];
    if (i === agentIndex) {
      karten[p.id] = { typ: 'agent', ort: null, rolle: null };
    } else {
      karten[p.id] = { typ: 'spieler', ort: ort.name, ortEmoji: ort.emoji, rolle: rollen[rollenIndex++] };
    }
  }

  return { ort, karten };
}

io.on('connection', (socket) => {
  console.log('Verbunden:', socket.id);

  // Create lobby
  socket.on('lobby:erstellen', ({ name }, cb) => {
    let code;
    do { code = genCode(); } while (lobbies[code]);

    lobbies[code] = {
      code,
      hostId: socket.id,
      players: {
        [socket.id]: { id: socket.id, name, bereit: false }
      },
      status: 'wartend', // wartend | laufend
      runde: 0,
      settings: {
        aktivierteOrte: ORTE.map(o => o.id),
        minSpieler: 3,
        maxSpieler: 8
      },
      aktuelleRunde: null
    };

    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;

    cb({ success: true, code, spielerId: socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  // Join lobby
  socket.on('lobby:beitreten', ({ code, name }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb({ success: false, error: 'Lobby nicht gefunden' });
    if (lobby.status === 'laufend') return cb({ success: false, error: 'Spiel läuft bereits' });

    const spielerAnzahl = Object.keys(lobby.players).length;
    if (spielerAnzahl >= lobby.settings.maxSpieler) return cb({ success: false, error: 'Lobby ist voll' });

    lobby.players[socket.id] = { id: socket.id, name, bereit: false };
    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;

    cb({ success: true, code, spielerId: socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  // Rejoin (refresh)
  socket.on('lobby:rejoin', ({ code, name }, cb) => {
    const lobby = lobbies[code];
    if (!lobby) return cb({ success: false, error: 'Lobby nicht gefunden' });

    lobby.players[socket.id] = { id: socket.id, name, bereit: false };
    socket.join(code);
    socket.data.lobbyCode = code;
    socket.data.name = name;

    cb({ success: true, code, spielerId: socket.id, istHost: lobby.hostId === socket.id });
    io.to(code).emit('lobby:update', getLobbyState(code));

    // Send current round if running
    if (lobby.status === 'laufend' && lobby.aktuelleRunde) {
      const karte = lobby.aktuelleRunde.karten[socket.id];
      if (karte) {
        socket.emit('runde:karte', {
          karte,
          alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji })),
          runde: lobby.runde
        });
      }
    }
  });

  // Update settings (host only)
  socket.on('settings:update', ({ aktivierteOrte }) => {
    const code = socket.data.lobbyCode;
    const lobby = lobbies[code];
    if (!lobby || lobby.hostId !== socket.id) return;

    if (aktivierteOrte && aktivierteOrte.length > 0) {
      lobby.settings.aktivierteOrte = aktivierteOrte;
    }
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  // Start / next round (host only)
  socket.on('runde:starten', (_, cb) => {
    const code = socket.data.lobbyCode;
    const lobby = lobbies[code];
    if (!lobby || lobby.hostId !== socket.id) return;

    const spielerAnzahl = Object.keys(lobby.players).length;
    if (spielerAnzahl < 3) {
      if (cb) cb({ success: false, error: 'Mindestens 3 Spieler benötigt' });
      return;
    }

    const result = dealCards(lobby);
    if (result.error) {
      if (cb) cb({ success: false, error: result.error });
      return;
    }

    lobby.status = 'laufend';
    lobby.runde++;
    lobby.aktuelleRunde = result;

    // Reset player exclusion lists
    Object.values(lobby.players).forEach(p => { p.ausgeschlosseneOrte = []; });

    // Send each player their card privately
    Object.values(lobby.players).forEach(p => {
      const karte = result.karten[p.id];
      if (karte) {
        io.to(p.id).emit('runde:karte', {
          karte,
          alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji })),
          runde: lobby.runde
        });
      }
    });

    io.to(code).emit('lobby:update', getLobbyState(code));
    if (cb) cb({ success: true });
  });

  // Agent streicht Ort aus
  socket.on('ort:ausschliessen', ({ ortId }) => {
    const code = socket.data.lobbyCode;
    const lobby = lobbies[code];
    if (!lobby || !lobby.aktuelleRunde) return;

    const karte = lobby.aktuelleRunde.karten[socket.id];
    if (!karte || karte.typ !== 'agent') return;

    // Toggle
    if (!lobby.players[socket.id].ausgeschlosseneOrte) {
      lobby.players[socket.id].ausgeschlosseneOrte = [];
    }
    const liste = lobby.players[socket.id].ausgeschlosseneOrte;
    const idx = liste.indexOf(ortId);
    if (idx === -1) liste.push(ortId);
    else liste.splice(idx, 1);

    socket.emit('ort:ausgeschlossen:update', { ausgeschlosseneOrte: liste });
  });

  // Spieler streicht Ort aus (für taktisches Spiel)
  socket.on('ort:markieren', ({ ortId }) => {
    const code = socket.data.lobbyCode;
    const lobby = lobbies[code];
    if (!lobby || !lobby.aktuelleRunde) return;

    if (!lobby.players[socket.id].ausgeschlosseneOrte) {
      lobby.players[socket.id].ausgeschlosseneOrte = [];
    }
    const liste = lobby.players[socket.id].ausgeschlosseneOrte;
    const idx = liste.indexOf(ortId);
    if (idx === -1) liste.push(ortId);
    else liste.splice(idx, 1);

    socket.emit('ort:ausgeschlossen:update', { ausgeschlosseneOrte: liste });
  });

  // Runde beenden / Auflösung
  socket.on('runde:beenden', () => {
    const code = socket.data.lobbyCode;
    const lobby = lobbies[code];
    if (!lobby || lobby.hostId !== socket.id) return;
    if (!lobby.aktuelleRunde) return;

    // Reveal to all
    io.to(code).emit('runde:aufloesung', {
      ort: { name: lobby.aktuelleRunde.ort.name, emoji: lobby.aktuelleRunde.ort.emoji },
      karten: lobby.aktuelleRunde.karten,
      spieler: lobby.players
    });

    lobby.status = 'aufloesung';
    io.to(code).emit('lobby:update', getLobbyState(code));
  });

  // Disconnect
  socket.on('disconnect', () => {
    const code = socket.data.lobbyCode;
    if (!code || !lobbies[code]) return;

    const lobby = lobbies[code];
    delete lobby.players[socket.id];

    // If host leaves, assign new host
    if (lobby.hostId === socket.id) {
      const remaining = Object.keys(lobby.players);
      if (remaining.length === 0) {
        delete lobbies[code];
        return;
      }
      lobby.hostId = remaining[0];
    }

    io.to(code).emit('lobby:update', getLobbyState(code));
    io.to(code).emit('system:nachricht', { text: `${socket.data.name || 'Jemand'} hat die Lobby verlassen.` });
  });
});

function getLobbyState(code) {
  const lobby = lobbies[code];
  if (!lobby) return null;
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    runde: lobby.runde,
    spieler: Object.values(lobby.players).map(p => ({
      id: p.id,
      name: p.name,
      istHost: p.id === lobby.hostId
    })),
    settings: lobby.settings,
    alleOrte: ORTE.map(o => ({ id: o.id, name: o.name, emoji: o.emoji }))
  };
}

// Health check
app.get('/health', (_, res) => res.json({ status: 'ok', lobbies: Object.keys(lobbies).length }));

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🕵️  Agenten-Undercover Server läuft auf Port ${PORT}`);
});
