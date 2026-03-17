import { useState } from 'react';
import styles from './StartScreen.module.css';

export default function StartScreen({ onErstellen, onBeitreten }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [modus, setModus] = useState(null); // 'neu' | 'beitreten'
  const [fehler, setFehler] = useState('');
  const [laden, setLaden] = useState(false);

  const handleErstellen = async () => {
    if (!name.trim()) return setFehler('Bitte gib deinen Namen ein.');
    setFehler('');
    setLaden(true);
    try {
      await onErstellen(name.trim());
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaden(false);
    }
  };

  const handleBeitreten = async () => {
    if (!name.trim()) return setFehler('Bitte gib deinen Namen ein.');
    if (!code.trim()) return setFehler('Bitte gib einen Lobby-Code ein.');
    setFehler('');
    setLaden(true);
    try {
      await onBeitreten(name.trim(), code.trim().toUpperCase());
    } catch (e) {
      setFehler(e.message);
    } finally {
      setLaden(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.bg}>
        <div className={styles.bgLine} style={{ '--angle': '45deg', '--pos': '20%' }} />
        <div className={styles.bgLine} style={{ '--angle': '-30deg', '--pos': '70%' }} />
        <div className={styles.bgDot} style={{ '--x': '15%', '--y': '20%' }} />
        <div className={styles.bgDot} style={{ '--x': '85%', '--y': '75%' }} />
        <div className={styles.bgDot} style={{ '--x': '50%', '--y': '10%' }} />
      </div>

      <div className={`${styles.container} fade-in`}>
        <div className={styles.header}>
          <div className={styles.badge}>🕵️</div>
          <h1 className={styles.title}>Agenten<br />Undercover</h1>
          <p className={styles.subtitle}>Wer unter euch ist der Agent?</p>
        </div>

        <div className={styles.card}>
          {!modus ? (
            <div className={styles.menuButtons}>
              <button className={`btn btn-primary ${styles.menuBtn}`} onClick={() => setModus('neu')}>
                <span>✦</span> Neue Lobby erstellen
              </button>
              <button className={`btn btn-ghost ${styles.menuBtn}`} onClick={() => setModus('beitreten')}>
                <span>→</span> Lobby beitreten
              </button>
            </div>
          ) : (
            <div className={styles.form}>
              <button className={styles.back} onClick={() => { setModus(null); setFehler(''); }}>
                ← Zurück
              </button>

              <h2 className={styles.formTitle}>
                {modus === 'neu' ? 'Neue Lobby' : 'Lobby beitreten'}
              </h2>

              <div className={styles.field}>
                <div className="label">Dein Name</div>
                <input
                  type="text"
                  placeholder="z.B. Max Mustermann"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (modus === 'neu' ? handleErstellen() : handleBeitreten())}
                  maxLength={20}
                  autoFocus
                />
              </div>

              {modus === 'beitreten' && (
                <div className={styles.field}>
                  <div className="label">Lobby-Code</div>
                  <input
                    type="text"
                    placeholder="z.B. AB3XYZ"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && handleBeitreten()}
                    maxLength={6}
                    style={{ letterSpacing: '0.2em', fontWeight: 600, fontSize: 18 }}
                  />
                </div>
              )}

              {fehler && <div className={styles.fehler}>{fehler}</div>}

              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}
                onClick={modus === 'neu' ? handleErstellen : handleBeitreten}
                disabled={laden}
              >
                {laden ? '...' : modus === 'neu' ? 'Lobby erstellen' : 'Beitreten'}
              </button>
            </div>
          )}
        </div>

        <p className={styles.hint}>
          3–8 Spieler · Jeder auf seinem Gerät · Kein Account nötig
        </p>
      </div>
    </div>
  );
}
