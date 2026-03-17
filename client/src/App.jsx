import { useState, useEffect } from 'react';
import socket from './socket';
import StartScreen from './StartScreen';
import LobbyScreen from './LobbyScreen';
import SpielScreen from './SpielScreen';
import VoteScreen from './VoteScreen';
import AufloeungScreen from './AufloeungScreen';

// screens: start | lobby | spiel | vote | aufloesung

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
  const [voteData, setVoteData] = useState(null); // full vote state for VoteScreen
  const [voteErgebnis, setVoteErgebnis] = useState(null);
  const [roundSettings, setRoundSettings] = useState(null);

  function pushNachricht(text) {
    setNachrichten(prev => [...prev.slice(-3), text]);
    setTimeout(() => setNachrichten(prev => prev.slice(1)), 5000);
  }

  useEffect(() => {
    socket.connect();

    socket.on('lobby:update', (data) => {
      setLobby(data);
    });

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

    socket.on('timer:tick', ({ restzeit, gesamt }) => {
      setTimer({ restzeit, gesamt });
    });

    socket.on('runde:aufloesung', (data) => {
      setAufloesung(data);
      setVoteData(null);
      setScreen('aufloesung');
    });

    socket.on('ort:ausgeschlossen:update', ({ ausgeschlosseneOrte: liste }) => {
      setAusgeschlosseneOrte(liste);
    });

    // Vote gestartet -> zeige VoteScreen
    socket.on('vote:gestartet', (data) => {
      setVoteData({ ...data, stimmen: { [data.anklaeger]: true } });
      setVoteErgebnis(null);
      setScreen('vote');
    });

    socket.on('vote:fortschritt', ({ abgegeben, gesamt }) => {
      setVoteData(prev => prev ? { ...prev, abgegeben, gesamt } : prev);
    });

    // Vote beendet ohne Aufloesung -> zurueck zum Spiel
    socket.on('vote:ergebnis', (data) => {
      setVoteData(null);
      setVoteErgebnis(data);
      setScreen('spiel');
      setTimeout(() => setVoteErgebnis(null), 5000);
    });

    socket.on('vote:abgebrochen', () => {
      setVoteData(null);
      setScreen('spiel');
      pushNachricht('Abstimmung abgebrochen.');
    });

    socket.on('system:nachricht', ({ text }) => pushNachricht(text));

    return () => {
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
    };
  }, []);

  const handleErstellen = (name) => new Promise((res, rej) => {
    socket.emit('lobby:erstellen', { name }, (r) => {
      if (r.success) { setSpielerID(r.spielerId); setScreen('lobby'); res(); }
      else rej(new Error(r.error));
    });
  });

  const handleBeitreten = (name, code) => new Promise((res, rej) => {
    socket.emit('lobby:beitreten', { code, name }, (r) => {
      if (r.success) { setSpielerID(r.spielerId); setScreen('lobby'); res(); }
      else rej(new Error(r.error));
    });
  });

  const handleRundeStarten = () => {
    socket.emit('runde:starten', {}, (res) => {
      if (res && !res.success) alert(res.error);
    });
  };

  const handleNaechsteRunde = () => {
    setKarte(null); setAufloesung(null); setAusgeschlosseneOrte([]);
    setVoteData(null); setVoteErgebnis(null); setTimer(null);
    setScreen('lobby');
    socket.emit('runde:starten', {}, (res) => {
      if (res && !res.success) console.warn(res.error);
    });
  };

  const handleSettingsUpdate = (s) => socket.emit('settings:update', s);
  const handleOrtToggle = (ortId) => socket.emit('ort:markieren', { ortId });
  const handleVoteStarten = ({ beschuldigter, these }) => socket.emit('vote:starten', { beschuldigter, these });
  const handleVoteAbgeben = (ja) => socket.emit('vote:abgeben', { ja });
  const handleVoteAbbrechen = () => socket.emit('vote:abbrechen');
  const handleAgentRaten = (ortName) => socket.emit('agent:raten', { ortName });

  const spielerListe = lobby?.spieler || [];

  return (
    <>
      {screen === 'start' && (
        <StartScreen onErstellen={handleErstellen} onBeitreten={handleBeitreten} />
      )}
      {screen === 'lobby' && lobby && (
        <LobbyScreen
          lobby={lobby} spielerId={spielerId}
          onRundeStarten={handleRundeStarten}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}
      {screen === 'spiel' && karte && (
        <SpielScreen
          karte={karte} alleOrte={alleOrte} runde={runde}
          lobby={lobby} spielerId={spielerId}
          ausgeschlosseneOrte={ausgeschlosseneOrte}
          onOrtToggle={handleOrtToggle}
          onVoteStarten={handleVoteStarten}
          onAgentRaten={handleAgentRaten}
          voteErgebnis={voteErgebnis}
          timer={timer}
          roundSettings={roundSettings}
        />
      )}
      {screen === 'vote' && voteData && (
        <VoteScreen
          voteData={voteData}
          spielerId={spielerId}
          spielerListe={spielerListe}
          onVoteAbgeben={handleVoteAbgeben}
          onVoteAbbrechen={handleVoteAbbrechen}
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
