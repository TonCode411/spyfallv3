import { useState, useEffect } from 'react';
import styles from './SpielScreen.module.css';

export default function SpielScreen({
  karte,
  alleOrte,
  runde,
  lobby,
  spielerId,
  ausgeschlosseneOrte,
  onOrtToggle,
  onRundeBeenden,
  onNaechsteRunde
}) {
  const [karteAufgedeckt, setKarteAufgedeckt] = useState(false);
  const [sekunden, setSekunden] = useState(0);
  const [timerLaeuft, setTimerLaeuft] = useState(false);

  const istHost = lobby?.hostId === spielerId;
  const istAgent = karte?.typ === 'agent';

  // Timer
  useEffect(() => {
    if (!timerLaeuft) return;
    const interval = setInterval(() => setSekunden(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [timerLaeuft]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const ortAusgeschlossen = (id) => ausgeschlosseneOrte?.includes(id);

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <div className={styles.runde}>Runde {runde}</div>
        <div className={styles.timerArea}>
          <div className={styles.timer}>{formatTime(sekunden)}</div>
          <button
            className={`btn ${timerLaeuft ? 'btn-ghost' : 'btn-ghost'}`}
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => setTimerLaeuft(t => !t)}
          >
            {timerLaeuft ? '⏸' : '▶'}
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 12px', fontSize: 12 }}
            onClick={() => { setSekunden(0); setTimerLaeuft(false); }}
          >
            ↺
          </button>
        </div>
      </div>

      <div className={styles.content}>

        {/* Karte */}
        <div className={styles.karteSection}>
          <div className="label">Deine Karte</div>

          {!karteAufgedeckt ? (
            <div className={styles.karteVerdeckt} onClick={() => setKarteAufgedeckt(true)}>
              <div className={styles.karteVerdecktInner}>
                <div className={styles.karteIcon}>🃏</div>
                <p>Tippen zum Aufdecken</p>
                <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>Zeige niemandem deinen Bildschirm!</p>
              </div>
            </div>
          ) : (
            <div className={`${styles.karte} ${istAgent ? styles.karteAgent : styles.karteSpieler}`}>
              {istAgent ? (
                <div className={styles.agentKarte}>
                  <div className={styles.agentIcon}>🕵️</div>
                  <div className={styles.agentTitel}>Du bist der</div>
                  <div className={styles.agentName}>AGENT</div>
                  <div className={styles.agentHinweis}>
                    Finde den Ort heraus — ohne aufzufliegen!
                  </div>
                </div>
              ) : (
                <div className={styles.spielerKarte}>
                  <div className={styles.ortEmoji}>{karte.ortEmoji}</div>
                  <div className={styles.ortName}>{karte.ort}</div>
                  <div className={styles.rolleLabel}>Deine Rolle</div>
                  <div className={styles.rolleName}>{karte.rolle}</div>
                </div>
              )}
            </div>
          )}

          {karteAufgedeckt && (
            <button
              className="btn btn-ghost"
              style={{ width: '100%', justifyContent: 'center', marginTop: 10, fontSize: 13 }}
              onClick={() => setKarteAufgedeckt(false)}
            >
              🙈 Karte verbergen
            </button>
          )}
        </div>

        {/* Ortsliste */}
        <div className={styles.orteSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div className="label">Alle Orte ({alleOrte.length})</div>
            {istAgent && (
              <span className="tag tag-agent" style={{ fontSize: 10 }}>Agent: Orte ausschließen</span>
            )}
          </div>

          <div className={styles.orteGrid}>
            {alleOrte.map(o => {
              const ausgeschlossen = ortAusgeschlossen(o.id);
              return (
                <button
                  key={o.id}
                  className={`${styles.ortItem} ${ausgeschlossen ? styles.ortAusgeschlossen : ''} ${!istAgent && karte?.ort === o.name ? styles.ortMeiner : ''}`}
                  onClick={() => onOrtToggle(o.id)}
                  title={istAgent ? 'Klicken zum Ausschließen' : 'Klicken zum Markieren'}
                >
                  <span className={styles.ortEmoji2}>{o.emoji}</span>
                  <span className={styles.ortName2}>{o.name}</span>
                  {ausgeschlossen && <span className={styles.ortX}>✕</span>}
                  {!istAgent && karte?.ort === o.name && !ausgeschlossen && (
                    <span className={styles.ortMark}>●</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Host-Aktionen */}
      {istHost && (
        <div className={styles.hostActions}>
          <button className="btn btn-danger" onClick={onRundeBeenden}>
            🔍 Runde aufloesen
          </button>
          <button className="btn btn-success" onClick={onNaechsteRunde}>
            ▶ Nächste Runde
          </button>
        </div>
      )}
    </div>
  );
}
