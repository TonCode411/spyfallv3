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
  const [agentVorschlaege, setAgentVorschlaege] = useState([]);

  const istAgent = karte?.typ === 'agent';
  const nonCommMode = roundSettings?.nonCommMode || lobby?.settings?.nonCommMode;
  const punkteAktiv = roundSettings?.punkteAktiv || lobby?.settings?.punkteAktiv;
  const spielerListe = lobby?.spieler || [];

  useEffect(() => {
    if (!agentInput.trim()) { setAgentVorschlaege([]); return; }
    const q = agentInput.toLowerCase();
    setAgentVorschlaege(alleOrte.filter(o => o.name.toLowerCase().includes(q)).slice(0, 6));
  }, [agentInput, alleOrte]);

  const handleAnklage = () => {
    if (!beschuldigter) return;
    const beschuldigterName = spielerListe.find(s => s.id === beschuldigter)?.name || '?';
    const finalThese = nonCommMode && these.trim()
      ? these.trim()
      : `Ich glaube, ${beschuldigterName} ist der Agent!`;
    onVoteStarten({ beschuldigter, these: finalThese });
    setAnklageModus(false);
    setBeschuldigter('');
    setThese('');
  };

  const handleAgentRaten = (ortName) => {
    onAgentRaten(ortName);
    setAgentRatModus(false);
    setAgentInput('');
    setAgentVorschlaege([]);
  };

  const timerWarnung = timer && timer.restzeit <= 30;
  const timerKritisch = timer && timer.restzeit <= 10;
  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className={styles.wrapper}>

      {/* Topbar */}
      <div className={styles.topBar}>
        <div className={styles.runde}>Runde {runde}</div>
        {timer && timer.gesamt && (
          <div className={`${styles.timer} ${timerWarnung ? styles.timerWarn : ''} ${timerKritisch ? styles.timerKrit : ''}`}>
            ⏱ {formatTime(timer.restzeit)}
          </div>
        )}
        {punkteAktiv && (
          <div className={styles.punkteLeiste}>
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
        <div className={`${styles.toast} ${voteErgebnis.mehrheit === false || (voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent) ? styles.toastRot : styles.toastGruen}`}>
          {!voteErgebnis.mehrheit && `🗳 Keine Mehrheit (${voteErgebnis.jaStimmen}/${voteErgebnis.gesamtStimmen}). Weiter geht's!${voteErgebnis.agentPunkte ? ` Agent +${voteErgebnis.agentPunkte}` : ''}`}
          {voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent && `❌ Falsche Anklage! Der Beschuldigte war kein Agent.${voteErgebnis.agentPunkte ? ` Agent +${voteErgebnis.agentPunkte}` : ''}`}
        </div>
      )}

      <div className={styles.content}>

        {/* Linke Spalte: Karte + Aktionen */}
        <div className={styles.links}>

          {/* Karte */}
          <div className="label">Deine Karte</div>
          {!karteAufgedeckt ? (
            <div className={styles.karteVerdeckt} onClick={() => setKarteAufgedeckt(true)}>
              <span style={{ fontSize: 36 }}>🃏</span>
              <span>Tippen zum Aufdecken</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>Niemand darf deinen Bildschirm sehen!</span>
            </div>
          ) : (
            <>
              <div className={`${styles.karte} ${istAgent ? styles.karteAgent : styles.karteSpieler}`}>
                {istAgent ? (
                  <div className={styles.agentInhalt}>
                    <div className={styles.agentEmoji}>🕵️</div>
                    <div className={styles.agentSubtitle}>Du bist der</div>
                    <div className={styles.agentTitel}>AGENT</div>
                    <div className={styles.agentHint}>Finde den Ort heraus!</div>
                  </div>
                ) : (
                  <div className={styles.spielerInhalt}>
                    <div className={styles.spielerEmoji}>{karte.ortEmoji}</div>
                    <div className={styles.spielerOrt}>{karte.ort}</div>
                    <div className={styles.spielerRolleLabel}>Deine Rolle</div>
                    <div className={styles.spielerRolle}>{karte.rolle}</div>
                  </div>
                )}
              </div>
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }}
                onClick={() => setKarteAufgedeckt(false)}>
                🙈 Karte verbergen
              </button>
            </>
          )}

          {/* Aktionen */}
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
                <option value="">— Spieler waehlen —</option>
                {spielerListe.filter(s => s.id !== spielerId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {nonCommMode && (
                <>
                  <div className="label" style={{ marginTop: 8 }}>Deine These (optional)</div>
                  <input type="text"
                    placeholder="...ist der Agent, weil..."
                    value={these} onChange={e => setThese(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && beschuldigter && handleAnklage()}
                  />
                </>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => { setAnklageModus(false); setBeschuldigter(''); setThese(''); }}>
                  Abbrechen
                </button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={handleAnklage} disabled={!beschuldigter}>
                  🚨 Jetzt anklagen!
                </button>
              </div>
            </div>
          )}

          {/* Agent Rat-Formular */}
          {agentRatModus && (
            <div className={styles.formBox}>
              <div className="label">Welcher Ort ist es?</div>
              <input type="text" placeholder="Ort eintippen..."
                value={agentInput} onChange={e => setAgentInput(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && agentInput.trim() && handleAgentRaten(agentInput)}
              />
              {agentVorschlaege.length > 0 && (
                <div className={styles.vorschlaege}>
                  {agentVorschlaege.map(o => (
                    <button key={o.id} className={styles.vorschlagBtn} onClick={() => handleAgentRaten(o.name)}>
                      {o.emoji} {o.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => { setAgentRatModus(false); setAgentInput(''); }}>
                  Abbrechen
                </button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  onClick={() => handleAgentRaten(agentInput)} disabled={!agentInput.trim()}>
                  🎯 Raten & beenden!
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
              {istAgent ? '→ Klicken zum Ausschliessen' : '→ Klicken zum Markieren'}
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
                  <span style={{ flex: 1, lineHeight: 1.3 }}>{o.name}</span>
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
