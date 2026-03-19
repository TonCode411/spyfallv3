import { useState } from 'react';
import styles from './LobbyScreen.module.css';

export default function LobbyScreen({ lobby, spielerId, verbunden, onRundeStarten, onSettingsUpdate }) {
  const alleOrte = lobby.alleOrte || [];
  const spielerListe = lobby.spieler || [];
  const anzahl = spielerListe.length;
  const istHost = lobby.hostId === spielerId;

  const [settingsOffen, setSettingsOffen] = useState(false);
  const [aktTab, setAktTab] = useState('orte');
  const [kopiert, setKopiert] = useState(false);

  const s = lobby.settings || {};
  const testModus = s.testModus || false;
  const [aktivierteOrte, setAktivierteOrte] = useState(s.aktivierteOrte || alleOrte.map(o => o.id));
  const [timerAktiv, setTimerAktiv] = useState(s.timerAktiv || false);
  const [timerModus, setTimerModus] = useState(s.timerModus || 'standard');
  const [timerSekunden, setTimerSekunden] = useState(s.timerSekunden || 300);
  const [punkteAktiv, setPunkteAktiv] = useState(s.punkteAktiv || false);
  const [nonCommMode, setNonCommMode] = useState(s.nonCommMode || false);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '?code=' + lobby.code);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const toggleOrt = (id) => setAktivierteOrte(prev =>
    prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]
  );

  const speichern = () => {
    onSettingsUpdate({ aktivierteOrte, timerAktiv, timerModus, timerSekunden, punkteAktiv, nonCommMode });
    setSettingsOffen(false);
  };

  const timerLabel = () => {
    if (!timerAktiv) return 'Kein Timer';
    const n = anzahl || 5;
    if (timerModus === 'competitive') return n + ' × 1 Min';
    if (timerModus === 'standard') return n + ' × 2 Min';
    return Math.floor(timerSekunden / 60) + ':' + String(timerSekunden % 60).padStart(2, '0') + ' fix';
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🕵️ Agenten Undercover</h1>
          {anzahl >= 3 && anzahl < 5 && (
            <div className={styles.tipp}>💡 Am besten mit 5+ Spielern</div>
          )}
        </div>
        <div className={styles.codeBox}>
          <div className="label" style={{ marginBottom: 4 }}>Lobby-Code</div>
          <div className={styles.codeValue}>{lobby.code}</div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px 12px' }} onClick={copyLink}>
            {kopiert ? '✓ Kopiert!' : '🔗 Einladungslink'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className="card">
          <div className="label">Spieler ({anzahl} / {s.maxSpieler || 8})</div>
          <div className={styles.spielerListe}>
            {spielerListe.map(sp => (
              <div key={sp.id} className={styles.spielerItem}>
                <div className={styles.avatar}>{sp.name.charAt(0).toUpperCase()}</div>
                <span className={styles.spielerName}>{sp.name}</span>
                {punkteAktiv && <span className={styles.punkte}>{sp.punkte || 0} Pkt</span>}
                {sp.istHost && <span className="tag tag-host">Host</span>}
                {sp.id === spielerId && !sp.istHost && (
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid var(--border)', fontSize: 10 }}>Du</span>
                )}
              </div>
            ))}
            {anzahl < 3 && (
              <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>Noch {3 - anzahl} Spieler benötigt...</p>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="card">
            <div className="label">Einstellungen</div>
            <div className={styles.row}><span className="text-muted">Aktive Orte</span><span className="text-accent">{aktivierteOrte.length} / {alleOrte.length}</span></div>
            <div className={styles.row}><span className="text-muted">Timer</span><span className="text-accent">{timerLabel()}</span></div>
            <div className={styles.row}><span className="text-muted">Punkte</span><span className="text-accent">{punkteAktiv ? 'Aktiv' : 'Aus'}</span></div>
            <div className={styles.row}><span className="text-muted">Non-Comm</span><span className="text-accent">{nonCommMode ? 'Aktiv' : 'Aus'}</span></div>
            {istHost && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 13 }}
                onClick={() => setSettingsOffen(true)}>
                ⚙️ Einstellungen
              </button>
            )}
          </div>

          {istHost ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {!verbunden && (
                <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(224,85,85,0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, color: 'var(--red)', textAlign: 'center' }}>
                  ⚠️ Keine Verbindung – warte...
                </div>
              )}
              <button
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: 15, fontSize: 16 }}
                onClick={onRundeStarten}
                disabled={!verbunden || (anzahl < 3 && !testModus)}
              >
                🎮 Runde starten
              </button>
              <button
                className="btn btn-ghost"
                style={{ width: '100%', justifyContent: 'center', fontSize: 12,
                  ...(testModus ? { borderColor: 'rgba(201,168,76,0.4)', color: 'var(--accent)' } : { opacity: 0.6 }) }}
                onClick={() => onSettingsUpdate({ testModus: !testModus })}
                disabled={!verbunden}
              >
                🧪 Test-Modus {testModus ? 'AN (Solo spielbar)' : 'AUS'}
              </button>
            </div>
          ) : (
            <div className={styles.warteBox}>
              <div className={styles.pulse} />
              <span className="text-muted" style={{ fontSize: 13 }}>Warte auf den Host...</span>
            </div>
          )}

          <details className={styles.howto}>
            <summary className={styles.howtoTitle}>📖 Spielregeln</summary>
            <div className={styles.howtoBody}>
              <p>Alle befinden sich am gleichen geheimen <strong>Ort</strong> – nur der <strong>Agent</strong> kennt ihn nicht.</p>
              <p>Reihum stellt jeder eine Frage. Wer zu spezifisch antwortet verrät den Ort, wer zu vage antwortet wirkt wie der Agent.</p>
              <div className={styles.regeln}>
                <div>🎉 <strong>Spieler gewinnen</strong> wenn der Agent per Voting enttarnt wird</div>
                <div>🕵️ <strong>Agent gewinnt</strong> wenn er unerkannt bleibt oder den Ort errät</div>
                <div>🚨 <strong>Anklage</strong> — jeder kann starten, alle stimmen ab</div>
                <div>🎯 <strong>Agent raten</strong> — tippt den Ort, Runde endet sofort</div>
              </div>
            </div>
          </details>
        </div>
      </div>

      {settingsOffen && (
        <div className={styles.overlay} onClick={() => setSettingsOffen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalTop}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Einstellungen</h2>
              <div className={styles.tabs}>
                {['orte', 'spiel'].map(t => (
                  <button key={t} className={`${styles.tab} ${aktTab === t ? styles.tabAn : ''}`} onClick={() => setAktTab(t)}>
                    {t === 'orte' ? 'Orte' : 'Spielmodus'}
                  </button>
                ))}
              </div>
            </div>

            {aktTab === 'orte' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setAktivierteOrte(alleOrte.map(o => o.id))}>Alle an</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setAktivierteOrte([alleOrte[0]?.id])}>Alle aus</button>
                  <span className="text-dim" style={{ fontSize: 12, marginLeft: 'auto' }}>{aktivierteOrte.length} aktiv</span>
                </div>
                <div className={styles.orteGrid}>
                  {alleOrte.map(o => {
                    const an = aktivierteOrte.includes(o.id);
                    return (
                      <button key={o.id} className={`${styles.ortBtn} ${an ? styles.ortBtnAn : ''}`} onClick={() => toggleOrt(o.id)}>
                        <span>{o.emoji}</span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>{o.name}</span>
                        {an && <span style={{ color: 'var(--accent)', fontSize: 11 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {aktTab === 'spiel' && (
              <div className={styles.spielTab}>
                <div className={styles.block}>
                  <div className={styles.blockTitle}>⏱ Timer</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={timerAktiv} onChange={e => setTimerAktiv(e.target.checked)} />
                    <span>Timer aktivieren</span>
                  </label>
                  {timerAktiv && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
                      {[
                        { id: 'competitive', label: '⚡ Competitive — 1 Min / Spieler' },
                        { id: 'standard', label: '🕐 Standard — 2 Min / Spieler' },
                        { id: 'custom', label: '✏️ Eigene Zeit' }
                      ].map(m => (
                        <button key={m.id} className={`${styles.modusBtn} ${timerModus === m.id ? styles.modusBtnAn : ''}`}
                          onClick={() => setTimerModus(m.id)}>{m.label}</button>
                      ))}
                      {timerModus === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                          <input type="range" min={60} max={900} step={30} value={timerSekunden}
                            onChange={e => setTimerSekunden(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent)' }} />
                          <span className="text-accent" style={{ fontWeight: 700, minWidth: 44 }}>
                            {Math.floor(timerSekunden / 60)}:{String(timerSekunden % 60).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.block}>
                  <div className={styles.blockTitle}>🏆 Punkte</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={punkteAktiv} onChange={e => setPunkteAktiv(e.target.checked)} />
                    <span>Punktesystem aktivieren</span>
                  </label>
                  {punkteAktiv && (
                    <div className={styles.infoBox}>
                      <div>Agent enttarnt → <strong>Alle Spieler +1</strong>, Ankläger +1 extra</div>
                      <div>Falsche Anklage / keine Mehrheit → <strong>Agent +1</strong></div>
                      <div>Agent errät Ort → <strong>Agent +3</strong></div>
                      <div>Zeit ab (Standard) → <strong>Agent +2</strong> · Competitive → <strong>Agent +1</strong></div>
                    </div>
                  )}
                </div>

                <div className={styles.block}>
                  <div className={styles.blockTitle}>💬 Non-Communication Modus</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={nonCommMode} onChange={e => setNonCommMode(e.target.checked)} />
                    <span>Anklage-These ins Textfeld tippen</span>
                  </label>
                  <p className="text-dim" style={{ fontSize: 12 }}>
                    Anklage-These wird getippt statt laut ausgesprochen und allen angezeigt.
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettingsOffen(false)}>Abbrechen</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={speichern}>Speichern</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
