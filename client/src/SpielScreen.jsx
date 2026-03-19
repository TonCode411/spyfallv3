import { useState, useEffect } from 'react';
import styles from './SpielScreen.module.css';

export default function SpielScreen({
  karte, alleOrte, runde, lobby, spielerId,
  ausgeschlosseneOrte, onOrtToggle,
  onVoteStarten, onAgentRaten,
  voteErgebnis, timer, roundSettings
}) {
  const [karteAufgedeckt, setKarteAufgedeckt] = useState(false);
  const [anklageModus, setAnklageModus] = useState(false);
  const [beschuldigter, setBeschuldigter] = useState('');
  const [these, setThese] = useState('');
  const [agentRatModus, setAgentRatModus] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [vorschlaege, setVorschlaege] = useState([]);

  const istAgent = karte?.typ === 'agent';
  const nonCommMode = roundSettings?.nonCommMode || lobby?.settings?.nonCommMode;
  const punkteAktiv = roundSettings?.punkteAktiv || lobby?.settings?.punkteAktiv;
  const spielerListe = lobby?.spieler || [];

  useEffect(() => {
    if (!agentInput.trim()) { setVorschlaege([]); return; }
    const q = agentInput.toLowerCase();
    setVorschlaege(alleOrte.filter(o => o.name.toLowerCase().includes(q)).slice(0, 6));
  }, [agentInput, alleOrte]);

  const handleAnklage = () => {
    if (!beschuldigter) return;
    const zielName = spielerListe.find(s => s.id === beschuldigter)?.name || '?';
    const finalThese = (nonCommMode && these.trim()) ? these.trim() : zielName + ' ist der Agent!';
    onVoteStarten({ beschuldigter, these: finalThese });
    setAnklageModus(false);
    setBeschuldigter('');
    setThese('');
  };

  const handleGuess = (name) => {
    onAgentRaten(name);
    setAgentRatModus(false);
    setAgentInput('');
    setVorschlaege([]);
  };

  const timerWarn = timer && timer.restzeit <= 30;
  const timerKrit = timer && timer.restzeit <= 10;
  const fmtTime = (s) => Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');

  if (!karte) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text3)' }}>Lade...</p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Topbar */}
      <div className={styles.topBar}>
        <span className={styles.runde}>Runde {runde}</span>
        {timer?.gesamt && (
          <span className={`${styles.timer} ${timerWarn ? styles.timerWarn : ''} ${timerKrit ? styles.timerKrit : ''}`}>
            ⏱ {fmtTime(timer.restzeit)}
          </span>
        )}
        {punkteAktiv && (
          <div className={styles.punkte}>
            {[...spielerListe].sort((a, b) => (b.punkte || 0) - (a.punkte || 0)).map(s => (
              <span key={s.id} className={`${styles.punkteItem} ${s.id === spielerId ? styles.punkteIch : ''}`}>
                {s.name.split(' ')[0]}: {s.punkte || 0}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vote Ergebnis Toast */}
      {voteErgebnis && (
        <div className={`${styles.toast} ${voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent ? styles.toastRot : styles.toastGruen}`}>
          {!voteErgebnis.mehrheit && `🗳 Keine Mehrheit (${voteErgebnis.jaStimmen}/${voteErgebnis.gesamtStimmen}). Weiter!${voteErgebnis.agentPunkte > 0 ? ' Agent +' + voteErgebnis.agentPunkte : ''}`}
          {voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent && `❌ Falsche Anklage! Beschuldigter war kein Agent.${voteErgebnis.agentPunkte > 0 ? ' Agent +' + voteErgebnis.agentPunkte : ''}`}
        </div>
      )}

      <div className={styles.content}>
        {/* Linke Spalte */}
        <div className={styles.links}>
          <div className="label">Deine Karte</div>

          {!karteAufgedeckt ? (
            <div className={styles.karteVerdeckt} onClick={() => setKarteAufgedeckt(true)}>
              <span style={{ fontSize: 36 }}>🃏</span>
              <span>Tippen zum Aufdecken</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Niemand darf mitsehen!</span>
            </div>
          ) : (
            <div className={`${styles.karte} ${istAgent ? styles.karteAgent : styles.karteSpieler}`}>
              {istAgent ? (
                <div className={styles.agentInhalt}>
                  <div style={{ fontSize: 44, marginBottom: 6 }}>🕵️</div>
                  <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(224,85,85,0.7)', fontWeight: 600 }}>Du bist der</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, color: 'var(--red)' }}>AGENT</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4, fontStyle: 'italic' }}>Finde den Ort heraus!</div>
                </div>
              ) : (
                <div className={styles.spielerInhalt}>
                  <div style={{ fontSize: 38, marginBottom: 6 }}>{karte.ortEmoji}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{karte.ort}</div>
                  <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text3)', marginTop: 10 }}>Deine Rolle</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{karte.rolle}</div>
                </div>
              )}
            </div>
          )}

          {karteAufgedeckt && (
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
              onClick={() => setKarteAufgedeckt(false)}>
              🙈 Karte verbergen
            </button>
          )}

          {/* Aktionsbereich */}
          {!anklageModus && !agentRatModus && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!istAgent && (
                <button className="btn btn-danger" style={{ width: '100%', justifyContent: 'center' }}
                  onClick={() => setAnklageModus(true)}>
                  🚨 Anklage starten
                </button>
              )}
              {istAgent && (
                <button className="btn" style={{ width: '100%', justifyContent: 'center', background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(201,168,76,0.4)' }}
                  onClick={() => setAgentRatModus(true)}>
                  🎯 Ort erraten & Runde beenden
                </button>
              )}
            </div>
          )}

          {/* Anklage-Formular */}
          {anklageModus && (
            <div className={styles.formBox}>
              <div className="label">Wen beschuldigst du?</div>
              <select className={styles.select} value={beschuldigter} onChange={e => setBeschuldigter(e.target.value)}>
                <option value="">— Spieler wählen —</option>
                {spielerListe.filter(s => s.id !== spielerId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {nonCommMode && (
                <input type="text" placeholder="These (optional)..."
                  value={these} onChange={e => setThese(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAnklage()}
                />
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => { setAnklageModus(false); setBeschuldigter(''); setThese(''); }}>
                  Abbrechen
                </button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={handleAnklage} disabled={!beschuldigter}>
                  🚨 Anklagen!
                </button>
              </div>
            </div>
          )}

          {/* Agent raten */}
          {agentRatModus && (
            <div className={styles.formBox}>
              <div className="label">Welcher Ort ist es?</div>
              <input type="text" placeholder="Ort eintippen..."
                value={agentInput} onChange={e => setAgentInput(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && agentInput.trim() && handleGuess(agentInput)}
              />
              {vorschlaege.length > 0 && (
                <div className={styles.vorschlaege}>
                  {vorschlaege.map(o => (
                    <button key={o.id} className={styles.vorschlagBtn} onClick={() => handleGuess(o.name)}>
                      {o.emoji} {o.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => { setAgentRatModus(false); setAgentInput(''); }}>
                  Abbrechen
                </button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => handleGuess(agentInput)} disabled={!agentInput.trim()}>
                  🎯 Raten!
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rechte Spalte: Ortsliste */}
        <div className={styles.orteSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="label" style={{ margin: 0 }}>Alle Orte ({alleOrte.length})</div>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              {istAgent ? 'Klicken = ausschließen' : 'Klicken = markieren'}
            </span>
          </div>
          <div className={styles.orteGrid}>
            {alleOrte.map(o => {
              const aus = ausgeschlosseneOrte?.includes(o.id);
              const meiner = !istAgent && karte?.ort === o.name;
              return (
                <button key={o.id}
                  className={`${styles.ortItem} ${aus ? styles.ortAus : ''} ${meiner && !aus ? styles.ortMeiner : ''}`}
                  onClick={() => onOrtToggle(o.id)}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{o.emoji}</span>
                  <span style={{ flex: 1, lineHeight: 1.3, textAlign: 'left' }}>{o.name}</span>
                  {aus && <span style={{ color: 'var(--red)', fontSize: 10, fontWeight: 700 }}>✕</span>}
                  {meiner && !aus && <span style={{ color: 'var(--green)', fontSize: 9 }}>●</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
