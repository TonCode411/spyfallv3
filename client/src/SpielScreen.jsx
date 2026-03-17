import { useState, useEffect } from 'react';
import styles from './SpielScreen.module.css';

export default function SpielScreen({
  karte, alleOrte, runde, lobby, spielerId,
  ausgeschlosseneOrte, onOrtToggle,
  onVoteStarten, onVoteAbgeben, onVoteAbbrechen,
  onAgentRaten,
  voteState, voteErgebnis, timer, roundSettings
}) {
  const [karteAufgedeckt, setKarteAufgedeckt] = useState(false);
  const [anklageModus, setAnklageModus] = useState(false);
  const [beschuldigter, setBeschuldigter] = useState('');
  const [these, setThese] = useState('');
  const [agentRatModus, setAgentRatModus] = useState(false);
  const [agentInput, setAgentInput] = useState('');
  const [agentVorschlaege, setAgentVorschlaege] = useState([]);

  const istHost = lobby?.hostId === spielerId;
  const istAgent = karte?.typ === 'agent';
  const nonCommMode = roundSettings?.nonCommMode || lobby?.settings?.nonCommMode;
  const punkteAktiv = roundSettings?.punkteAktiv || lobby?.settings?.punkteAktiv;
  const spielerListe = lobby?.spieler || [];
  const pausiert = lobby?.pausiert;

  // Agent Ort-Vorschlaege
  useEffect(() => {
    if (!agentInput.trim()) { setAgentVorschlaege([]); return; }
    const q = agentInput.toLowerCase();
    setAgentVorschlaege(alleOrte.filter(o => o.name.toLowerCase().includes(q)).slice(0, 5));
  }, [agentInput, alleOrte]);

  const handleAnklage = () => {
    if (!beschuldigter) return;
    if (!nonCommMode) {
      onVoteStarten({ beschuldigter, these: these || `Ich glaube, ${spielerListe.find(s => s.id === beschuldigter)?.name} ist der Agent!` });
    } else {
      onVoteStarten({ beschuldigter, these });
    }
    setAnklageModus(false);
    setBeschuldigter('');
    setThese('');
  };

  const handleAgentRaten = (ortName) => {
    onAgentRaten(ortName);
    setAgentRatModus(false);
    setAgentInput('');
  };

  const formatTime = (s) => {
    if (s == null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const timerWarnung = timer && timer.restzeit <= 30;
  const timerKritisch = timer && timer.restzeit <= 10;

  const hatAbgestimmt = voteState && voteState.stimmen && voteState.stimmen[spielerId] !== undefined;
  const istAnklaeger = voteState?.anklaeger === spielerId;

  return (
    <div className={styles.wrapper}>
      {/* Topbar */}
      <div className={styles.topBar}>
        <div className={styles.runde}>Runde {runde}</div>
        {timer && (
          <div className={`${styles.timerDisplay} ${timerWarnung ? styles.timerWarn : ''} ${timerKritisch ? styles.timerKrit : ''}`}>
            ⏱ {formatTime(timer.restzeit)}
          </div>
        )}
        {pausiert && !voteState && (
          <div className={styles.pauseTag}>⏸ Pausiert</div>
        )}
        {punkteAktiv && (
          <div className={styles.punkteLeiste}>
            {spielerListe.map(s => (
              <span key={s.id} className={`${styles.punkteItem} ${s.id === spielerId ? styles.punkteItemIch : ''}`}>
                {s.name.split(' ')[0]}: {s.punkte || 0}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Vote Ergebnis Toast */}
      {voteErgebnis && (
        <div className={`${styles.voteToast} ${voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent ? styles.voteToastRot : ''}`}>
          {voteErgebnis.mehrheit && !voteErgebnis.beschuldigterIstAgent && (
            <>❌ Falsch beschuldigt! Agent bekommt {voteErgebnis.agentPunkte > 0 ? `+${voteErgebnis.agentPunkte} Punkt` : 'Bonus'}.</>
          )}
          {!voteErgebnis.mehrheit && (
            <>🗳 Keine Mehrheit ({voteErgebnis.jaStimmen}/{voteErgebnis.gesamtStimmen}). Weiter gehts!{voteErgebnis.agentPunkte > 0 ? ` Agent +${voteErgebnis.agentPunkte}` : ''}</>
          )}
        </div>
      )}

      <div className={styles.content}>
        {/* Karte */}
        <div className={styles.karteSection}>
          <div className="label">Deine Karte</div>
          {!karteAufgedeckt ? (
            <div className={styles.karteVerdeckt} onClick={() => setKarteAufgedeckt(true)}>
              <div className={styles.karteIcon}>🃏</div>
              <p>Tippen zum Aufdecken</p>
              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>Zeige niemandem deinen Bildschirm!</p>
            </div>
          ) : (
            <div className={`${styles.karte} ${istAgent ? styles.karteAgent : styles.karteSpieler}`}>
              {istAgent ? (
                <div className={styles.agentKarte}>
                  <div className={styles.agentIcon}>🕵️</div>
                  <div className={styles.agentTitel}>Du bist der</div>
                  <div className={styles.agentName}>AGENT</div>
                  <div className={styles.agentHinweis}>Finde den Ort heraus!</div>
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
            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12 }} onClick={() => setKarteAufgedeckt(false)}>
              🙈 Verbergen
            </button>
          )}

          {/* Aktions-Buttons */}
          <div className={styles.aktionen}>
            {!voteState && !anklageModus && !agentRatModus && (
              <>
                {!istAgent && (
                  <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setAnklageModus(true)}>
                    🚨 Anklage starten
                  </button>
                )}
                {istAgent && (
                  <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13, borderColor: 'rgba(201,168,76,0.4)', color: 'var(--accent)' }} onClick={() => setAgentRatModus(true)}>
                    🎯 Ort erraten
                  </button>
                )}
              </>
            )}
          </div>

          {/* Anklage-Formular */}
          {anklageModus && !voteState && (
            <div className={styles.anklageForm}>
              <div className="label">Wen beschuldigst du?</div>
              <select className={styles.select} value={beschuldigter} onChange={e => setBeschuldigter(e.target.value)}>
                <option value="">— Spieler waehlen —</option>
                {spielerListe.filter(s => s.id !== spielerId).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {nonCommMode && (
                <>
                  <div className="label" style={{ marginTop: 8 }}>Deine These (wird allen angezeigt)</div>
                  <input type="text" placeholder={`Ich glaube ${spielerListe.find(s => s.id === beschuldigter)?.name || '...'} ist der Agent, weil...`}
                    value={these} onChange={e => setThese(e.target.value)} />
                </>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => setAnklageModus(false)}>Abbrechen</button>
                <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={handleAnklage} disabled={!beschuldigter}>
                  Anklage!
                </button>
              </div>
            </div>
          )}

          {/* Agent Rat-Formular */}
          {agentRatModus && (
            <div className={styles.anklageForm}>
              <div className="label">Welcher Ort ist es?</div>
              <input type="text" placeholder="Ort eintippen..." value={agentInput} onChange={e => setAgentInput(e.target.value)} autoFocus />
              {agentVorschlaege.length > 0 && (
                <div className={styles.vorschlaege}>
                  {agentVorschlaege.map(o => (
                    <button key={o.id} className={styles.vorschlagBtn} onClick={() => handleAgentRaten(o.name)}>
                      {o.emoji} {o.name}
                    </button>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => { setAgentRatModus(false); setAgentInput(''); }}>Abbrechen</button>
                <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 13 }} onClick={() => handleAgentRaten(agentInput)} disabled={!agentInput.trim()}>
                  Raten!
                </button>
              </div>
            </div>
          )}

          {/* Vote UI */}
          {voteState && (
            <div className={styles.voteBox}>
              <div className={styles.voteTitle}>🗳 Abstimmung</div>
              <div className={styles.voteThese}>
                <strong>{voteState.anklaegerName}</strong> beschuldigt <strong>{voteState.beschuldigterName}</strong>
                {voteState.these && voteState.these !== `Ich glaube, ${voteState.beschuldigterName} ist der Agent!` && (
                  <div className={styles.voteTheseText}>„{voteState.these}"</div>
                )}
              </div>
              <div className={styles.voteFortschritt}>
                {voteState.abgegeben || 0} / {voteState.gesamt || spielerListe.length} abgestimmt
              </div>
              {!hatAbgestimmt ? (
                <div className={styles.voteButtons}>
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onVoteAbgeben(true)}>
                    ✓ Ja, ist der Agent
                  </button>
                  <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onVoteAbgeben(false)}>
                    ✗ Nein
                  </button>
                </div>
              ) : (
                <div className={styles.voteWarte}>Stimme abgegeben – warte auf andere...</div>
              )}
              {(istAnklaeger || istHost) && (
                <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 8 }} onClick={onVoteAbbrechen}>
                  Abstimmung abbrechen
                </button>
              )}
            </div>
          )}
        </div>

        {/* Ortsliste */}
        <div className={styles.orteSection}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="label" style={{ margin: 0 }}>Alle Orte ({alleOrte.length})</div>
            {istAgent && <span className="tag tag-agent" style={{ fontSize: 10 }}>Klicken zum Ausschliessen</span>}
            {!istAgent && <span className="tag tag-spieler" style={{ fontSize: 10 }}>Klicken zum Markieren</span>}
          </div>
          <div className={styles.orteGrid}>
            {alleOrte.map(o => {
              const ausgeschlossen = ausgeschlosseneOrte?.includes(o.id);
              const meinerOrt = !istAgent && karte?.ort === o.name;
              return (
                <button key={o.id}
                  className={`${styles.ortItem} ${ausgeschlossen ? styles.ortAus : ''} ${meinerOrt && !ausgeschlossen ? styles.ortMeiner : ''}`}
                  onClick={() => onOrtToggle(o.id)}>
                  <span className={styles.ortEmoji2}>{o.emoji}</span>
                  <span className={styles.ortName2}>{o.name}</span>
                  {ausgeschlossen && <span className={styles.ortX}>✕</span>}
                  {meinerOrt && !ausgeschlossen && <span className={styles.ortMark}>●</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
