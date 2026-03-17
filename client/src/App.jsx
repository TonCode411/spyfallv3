import { useState, useEffect } from 'react';
import socket from './socket';
import StartScreen from './StartScreen';
import LobbyScreen from './LobbyScreen';
import SpielScreen from './SpielScreen';
import AufloeungScreen from './AufloeungScreen';

// Screens: 'start' | 'lobby' | 'spiel' | 'aufloesung'

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

  // Check URL for lobby code (invite link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      // Pre-fill join flow — handled by StartScreen via URL param
      window._lobbyCodeFromUrl = code.toUpperCase();
    }
  }, []);

  // Socket setup
  useEffect(() => {
    socket.connect();

    socket.on('lobby:update', (data) => {
      setLobby(data);
      if (data.status === 'wartend' && screen === 'aufloesung') {
        // Host triggered next round from aufloesung screen
      }
    });

    socket.on('runde:karte', ({ karte: k, alleOrte: orte, runde: r }) => {
      setKarte(k);
      setAlleOrte(orte);
      setRunde(r);
      setAusgeschlosseneOrte([]);
      setScreen('spiel');
    });

    socket.on('runde:aufloesung', (data) => {
      setAufloesung(data);
      setScreen('aufloesung');
    });

    socket.on('ort:ausgeschlossen:update', ({ ausgeschlosseneOrte: liste }) => {
      setAusgeschlosseneOrte(liste);
    });

    socket.on('system:nachricht', ({ text }) => {
      setNachrichten(prev => [...prev.slice(-4), text]);
      setTimeout(() => setNachrichten(prev => prev.slice(1)), 5000);
    });

    socket.on('disconnect', () => {
      console.log('Getrennt vom Server');
    });

    return () => {
      socket.off('lobby:update');
      socket.off('runde:karte');
      socket.off('runde:aufloesung');
      socket.off('ort:ausgeschlossen:update');
      socket.off('system:nachricht');
    };
  }, []);

  const handleErstellen = (name) => {
    return new Promise((resolve, reject) => {
      socket.emit('lobby:erstellen', { name }, (res) => {
        if (res.success) {
          setSpielerID(res.spielerId);
          setScreen('lobby');
          resolve();
        } else {
          reject(new Error(res.error || 'Fehler beim Erstellen'));
        }
      });
    });
  };

  const handleBeitreten = (name, code) => {
    return new Promise((resolve, reject) => {
      socket.emit('lobby:beitreten', { code, name }, (res) => {
        if (res.success) {
          setSpielerID(res.spielerId);
          setScreen('lobby');
          resolve();
        } else {
          reject(new Error(res.error || 'Fehler beim Beitreten'));
        }
      });
    });
  };

  const handleRundeStarten = () => {
    socket.emit('runde:starten', {}, (res) => {
      if (res && !res.success) {
        alert(res.error);
      }
    });
  };

  const handleNaechsteRunde = () => {
    setKarte(null);
    setAufloesung(null);
    setAusgeschlosseneOrte([]);
    setScreen('lobby');
    // Small delay then trigger next round
    socket.emit('runde:starten', {}, (res) => {
      if (res && !res.success) {
        // Falls Fehler, einfach in Lobby bleiben
        console.warn(res.error);
      }
    });
  };

  const handleRundeBeenden = () => {
    socket.emit('runde:beenden');
  };

  const handleSettingsUpdate = ({ aktivierteOrte }) => {
    socket.emit('settings:update', { aktivierteOrte });
  };

  const handleOrtToggle = (ortId) => {
    socket.emit('ort:markieren', { ortId });
  };

  return (
    <>
      {screen === 'start' && (
        <StartScreen onErstellen={handleErstellen} onBeitreten={handleBeitreten} />
      )}
      {screen === 'lobby' && lobby && (
        <LobbyScreen
          lobby={lobby}
          spielerId={spielerId}
          onRundeStarten={handleRundeStarten}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}
      {screen === 'spiel' && karte && (
        <SpielScreen
          karte={karte}
          alleOrte={alleOrte}
          runde={runde}
          lobby={lobby}
          spielerId={spielerId}
          ausgeschlosseneOrte={ausgeschlosseneOrte}
          onOrtToggle={handleOrtToggle}
          onRundeBeenden={handleRundeBeenden}
          onNaechsteRunde={handleNaechsteRunde}
        />
      )}
      {screen === 'aufloesung' && aufloesung && (
        <AufloeungScreen
          aufloesung={aufloesung}
          spielerId={spielerId}
          lobby={lobby}
          onNaechsteRunde={handleNaechsteRunde}
        />
      )}

      {/* System notifications */}
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
              boxShadow: 'var(--shadow)'
            }}>
              {m}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
