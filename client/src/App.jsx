import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import StartScreen from './StartScreen';
import LobbyScreen from './LobbyScreen';
import SpielScreen from './SpielScreen';
import VoteScreen from './VoteScreen';
import AufloeungScreen from './AufloeungScreen';

export default function App() {
  const [screen, setScreen] = useState('start');
  const [spielerId, setSpielerID] = useState(null);
  const [lobby, setLobby] = useState(null);
  const [karte, setKarte] = useState(null);
  const [alleOrte, setAlleOrte] = useState([]);
  const [runde, setRunde] = useState(0);
  const [aufloesung, setAufloesung] = useState(null);
  const [ausgeschlosseneOrte, setAusgeschlosseneOrte] = useState([]);
  const [nachrichten, setNachrichten] = useState([]);
  const [timer, setTimer] = useState(null);
  const [voteData, setVoteData] = useState(null);
  const [voteErgebnis, setVoteErgebnis] = useState(null);
  const [roundSettings, setRoundSettings] = useState(null);
  const [verbunden, setVerbunden] = useState(socket.connected);

  const voteErgebnisTimer = useRef(null);
  const lobbyCodeRef = useRef(null);
  const spielerNameRef = useRef(null);

  function pushNachricht(text) {
    setNachrichten(prev => [...prev.slice(-3), text]);
    setTimeout(() => setNachrichten(prev => prev.slice(1)), 5000);
  }

  useEffect(() => {
    // socket already auto-connects via socket.js
    // if already connected, sync immediately
    if (socket.connected) {
      setVerbunden(true);
      socket.emit('state:sync', { code: lobbyCodeRef.current, name: spielerNameRef.current });
    }

    socket.on('connect', () => {
      setVerbunden(true);
      socket.emit('state:sync', { code: lobbyCodeRef.current, name: spielerNameRef.current });
    });

    socket.on('disconnect', () => setVerbunden(false));

    socket.on('lobby:update', (data) => setLobby(data));

    socket.on('runde:karte', ({ karte: k, alleOrte: orte, runde: r, settings }) => {
      setKarte(k);
      setAlleOrte(orte);
      setRunde(r);
      setRoundSettings(settings);
      setAusgeschlosseneOrte([]);
      setVoteData(null);
      setVoteErgebnis(null);
      setTimer(null);
      setAufloesung(null);
      setScreen('spiel');
    });

    socket.on('timer:tick', ({ restzeit, gesamt }) => setTimer({ restzeit, gesamt }));

    socket.on('runde:aufloesung', (data) => {
      setAufloesung(data);
      setVoteData(null);
      setTimer(null);
      setScreen('aufloesung');
    });

    socket.on('ort:ausgeschlossen:update', ({ ausgeschlosseneOrte: liste }) => {
      setAusgeschlosseneOrte(liste);
    });

    socket.on('vote:gestartet', (data) => {
      setVoteData(data);
      setScreen('vote');
    });

    socket.on('vote:fortschritt', ({ abgegeben, gesamt, stimmen }) => {
      setVoteData(prev => prev ? { ...prev, abgegeben, gesamt, stimmen } : prev);
    });

    socket.on('vote:ergebnis', (data) => {
      setVoteData(null);
      setVoteErgebnis(data);
      setScreen('spiel');
      if (voteErgebnisTimer.current) clearTimeout(voteErgebnisTimer.current);
      voteErgebnisTimer.current = setTimeout(() => setVoteErgebnis(null), 6000);
    });

    socket.on('vote:abgebrochen', () => {
      setVoteData(null);
      setScreen('spiel');
      pushNachricht('Abstimmung abgebrochen.');
    });

    socket.on('system:nachricht', ({ text }) => pushNachricht(text));

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('lobby:update');
      socket.off('runde:karte');
      socket.off('timer:tick');
      socket.off('runde:aufloesung');
      socket.off('ort:ausgeschlossen:update');
      socket.off('vote:gestartet');
      socket.off('vote:fortschritt');
      socket.off('vote:ergebnis');
      socket.off('vote:abgebrochen');
      socket.off('system:nachricht');
      if (voteErgebnisTimer.current) clearTimeout(voteErgebnisTimer.current);
    };
  }, []);

  const handleErstellen = (name) => new Promise((res, rej) => {
    socket.emit('lobby:erstellen', { name }, (r) => {
      if (r.success) { setSpielerID(r.spielerId); lobbyCodeRef.current = r.code; spielerNameRef.current = name; setScreen('lobby'); res(); }
      else rej(new Error(r.error));
    });
  });

  const handleBeitreten = (name, code) => new Promise((res, rej) => {
    socket.emit('lobby:beitreten', { code, name }, (r) => {
      if (r.success) { setSpielerID(r.spielerId); lobbyCodeRef.current = code; spielerNameRef.current = name; setScreen('lobby'); res(); }
      else rej(new Error(r.error));
    });
  });

  const handleRundeStarten = (testModus = false) => {
    socket.emit('runde:starten', { testModus }, (res) => {
      if (res && !res.success) alert(res.error);
    });
  };

  const handleNaechsteRunde = () => {
    setKarte(null);
    setAufloesung(null);
    setAusgeschlosseneOrte([]);
    setVoteData(null);
    setVoteErgebnis(null);
    setTimer(null);
    setScreen('lobby');
  };

  return (
    <>
      {!verbunden && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
          background: '#c0392b', color: 'white', padding: '10px',
          textAlign: 'center', fontSize: 14, fontWeight: 600
        }}>
          ⚠️ Keine Verbindung zum Server – wird wiederhergestellt...
        </div>
      )}

      {screen === 'start' && (
        <StartScreen onErstellen={handleErstellen} onBeitreten={handleBeitreten} />
      )}
      {screen === 'lobby' && lobby && (
        <LobbyScreen
          lobby={lobby}
          spielerId={spielerId}
          verbunden={verbunden}
          onRundeStarten={handleRundeStarten}
          onSettingsUpdate={(s) => socket.emit('settings:update', s)}
        />
      )}
      {screen === 'spiel' && (
        <SpielScreen
          karte={karte} alleOrte={alleOrte} runde={runde}
          lobby={lobby} spielerId={spielerId}
          ausgeschlosseneOrte={ausgeschlosseneOrte}
          onOrtToggle={(ortId) => socket.emit('ort:markieren', { ortId })}
          onVoteStarten={({ beschuldigter, these }) => socket.emit('vote:starten', { beschuldigter, these })}
          onAgentRaten={(ortName) => socket.emit('agent:raten', { ortName })}
          voteErgebnis={voteErgebnis}
          timer={timer}
          roundSettings={roundSettings}
        />
      )}
      {screen === 'vote' && voteData && (
        <VoteScreen
          voteData={voteData}
          spielerId={spielerId}
          spielerListe={lobby?.spieler || []}
          onVoteAbgeben={(ja) => socket.emit('vote:abgeben', { ja })}
          onVoteAbbrechen={() => socket.emit('vote:abbrechen')}
        />
      )}
      {screen === 'aufloesung' && aufloesung && (
        <AufloeungScreen
          aufloesung={aufloesung} spielerId={spielerId}
          lobby={lobby} onNaechsteRunde={handleNaechsteRunde}
        />
      )}

      {nachrichten.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2000, alignItems: 'center'
        }}>
          {nachrichten.map((m, i) => (
            <div key={i} style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '8px 16px',
              fontSize: 13, color: 'var(--text2)', animation: 'fadeIn 0.3s ease',
              boxShadow: 'var(--shadow)', whiteSpace: 'nowrap'
            }}>{m}</div>
          ))}
        </div>
      )}
    </>
  );
}
