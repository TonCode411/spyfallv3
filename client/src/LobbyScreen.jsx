import { useState } from 'react';
import styles from './LobbyScreen.module.css';

export default function LobbyScreen({ lobby, spielerId, onRundeStarten, onSettingsUpdate }) {
  const [settingsOffen, setSettingsOffen] = useState(false);
  const [aktivierteOrte, setAktivierteOrte] = useState(
    lobby.settings?.aktivierteOrte || lobby.alleOrte?.map(o => o.id) || []
  );
  const [kopiert, setKopiert] = useState(false);

  const istHost = lobby.hostId === spielerId;
  const spielerListe = lobby.spieler || [];
  const alleOrte = lobby.alleOrte || [];

  const copyCode = () => {
    navigator.clipboard.writeText(lobby.code);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const copyLink = () => {
    const url = `${window.location.origin}?code=${lobby.code}`;
    navigator.clipboard.writeText(url);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const toggleOrt = (id) => {
    setAktivierteOrte(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 1) return prev; // min 1
        return prev.filter(x => x !== id);
      }
      return [...prev, id];
    });
  };

  const allesAn = () => setAktivierteOrte(alleOrte.map(o => o.id));
  const allesAus = () => setAktivierteOrte(alleOrte.length > 0 ? [alleOrte[0].id] : []);

  const settingsSpeichern = () => {
    onSettingsUpdate({ aktivierteOrte });
    setSettingsOffen(false);
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.main}>

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>🕵️ Agenten Undercover</h1>
            <p className="text-muted" style={{ fontSize: 13 }}>Warte auf alle Spieler...</p>
          </div>
          <div className={styles.codeBox}>
            <div className="label" style={{ marginBottom: 4 }}>Lobby-Code</div>
            <div className={styles.codeValue}>{lobby.code}</div>
            <div className={styles.codeActions}>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={copyCode}>
                {kopiert ? '✓ Kopiert' : '📋 Code'}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={copyLink}>
                🔗 Link
              </button>
            </div>
          </div>
        </div>

        <div className={styles.grid}>

          {/* Spielerliste */}
          <div className="card">
            <div className="label">Spieler ({spielerListe.length})</div>
            <div className={styles.spielerListe}>
              {spielerListe.map(s => (
                <div key={s.id} className={styles.spielerItem}>
                  <div className={styles.spielerAvatar}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={styles.spielerName}>{s.name}</span>
                  {s.istHost && <span className="tag tag-host">Host</span>}
                  {s.id === spielerId && !s.istHost && (
                    <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: '1px solid var(--border)', fontSize: 11 }}>Du</span>
                  )}
                </div>
              ))}
              {spielerListe.length < 3 && (
                <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>
                  Noch {3 - spielerListe.length} Spieler benötigt...
                </p>
              )}
            </div>
          </div>

          {/* Einstellungen & Start */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="label">Einstellungen</div>
              <div className={styles.settingRow}>
                <span className="text-muted">Aktive Orte</span>
                <span className="text-accent" style={{ fontWeight: 600 }}>
                  {aktivierteOrte.length} / {alleOrte.length}
                </span>
              </div>
              <div className={styles.settingRow}>
                <span className="text-muted">Spieler</span>
                <span className="text-accent" style={{ fontWeight: 600 }}>
                  {spielerListe.length}
                </span>
              </div>

              {istHost && (
                <button
                  className="btn btn-ghost"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 16, fontSize: 13 }}
                  onClick={() => setSettingsOffen(true)}
                >
                  ⚙️ Orte verwalten
                </button>
              )}
            </div>

            {istHost && (
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16 }}
                onClick={onRundeStarten}
                disabled={spielerListe.length < 3}
              >
                🎮 Runde starten
              </button>
            )}

            {!istHost && (
              <div className={styles.warteBox}>
                <div className={styles.wartePulse} />
                <span className="text-muted" style={{ fontSize: 13 }}>
                  Warte auf den Host...
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOffen && (
        <div className={styles.modalOverlay} onClick={() => setSettingsOffen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22 }}>Orte verwalten</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={allesAn}>Alle an</button>
                <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={allesAus}>Alle aus</button>
              </div>
            </div>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 16 }}>
              Aktive Orte: <strong className="text-accent">{aktivierteOrte.length}</strong> — mindestens 1 muss aktiv sein.
            </p>
            <div className={styles.orteGrid}>
              {alleOrte.map(o => {
                const aktiv = aktivierteOrte.includes(o.id);
                return (
                  <button
                    key={o.id}
                    className={`${styles.ortToggle} ${aktiv ? styles.ortAktiv : ''}`}
                    onClick={() => toggleOrt(o.id)}
                  >
                    <span>{o.emoji}</span>
                    <span>{o.name}</span>
                    {aktiv && <span className={styles.checkmark}>✓</span>}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettingsOffen(false)}>
                Abbrechen
              </button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={settingsSpeichern}>
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
