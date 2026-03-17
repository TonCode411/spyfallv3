import { useState } from 'react';
import styles from './LobbyScreen.module.css';

export default function LobbyScreen({ lobby, spielerId, onRundeStarten, onSettingsUpdate }) {
  const alleOrte = lobby.alleOrte || [];
  const spielerListe = lobby.spieler || [];
  const anzahl = spielerListe.length;
  const istHost = lobby.hostId === spielerId;

  const [settingsOffen, setSettingsOffen] = useState(false);
  const [aktTab, setAktTab] = useState('orte');
  const [kopiert, setKopiert] = useState(false);

  // Local settings state
  const [aktivierteOrte, setAktivierteOrte] = useState(lobby.settings?.aktivierteOrte || alleOrte.map(o => o.id));
  const [timerAktiv, setTimerAktiv] = useState(lobby.settings?.timerAktiv || false);
  const [timerModus, setTimerModus] = useState(lobby.settings?.timerModus || 'standard');
  const [timerSekunden, setTimerSekunden] = useState(lobby.settings?.timerSekunden || 300);
  const [punkteAktiv, setPunkteAktiv] = useState(lobby.settings?.punkteAktiv || false);
  const [nonCommMode, setNonCommMode] = useState(lobby.settings?.nonCommMode || false);

  const copyLink = () => {
    const url = `${window.location.origin}?code=${lobby.code}`;
    navigator.clipboard.writeText(url);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const toggleOrt = (id) => {
    setAktivierteOrte(prev =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter(x => x !== id) : prev
        : [...prev, id]
    );
  };

  const settingsSpeichern = () => {
    onSettingsUpdate({ aktivierteOrte, timerAktiv, timerModus, timerSekunden, punkteAktiv, nonCommMode });
    setSettingsOffen(false);
  };

  const timerLabel = () => {
    if (!timerAktiv) return 'Kein Timer';
    const n = anzahl || 5;
    if (timerModus === 'competitive') return `${n} × 1 Min`;
    if (timerModus === 'standard') return `${n} × 2 Min`;
    return `${Math.floor(timerSekunden / 60)}:${String(timerSekunden % 60).padStart(2, '0')} fix`;
  };

  return (
    <div className={styles.wrapper}>

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🕵️ Agenten Undercover</h1>
          {anzahl < 5 && anzahl >= 3 && (
            <div className={styles.tipp}>💡 Am besten mit 5+ Spielern</div>
          )}
        </div>
        <div className={styles.codeBox}>
          <div className="label" style={{ marginBottom: 4 }}>Lobby-Code</div>
          <div className={styles.codeValue}>{lobby.code}</div>
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, padding: '6px 12px' }} onClick={copyLink}>
            {kopiert ? '✓ Link kopiert!' : '🔗 Einladungslink kopieren'}
          </button>
        </div>
      </div>

      <div className={styles.grid}>

        {/* Spielerliste */}
        <div className="card">
          <div className="label">Spieler ({anzahl} / {lobby.settings?.maxSpieler || 8})</div>
          <div className={styles.spielerListe}>
            {spielerListe.map(s => (
              <div key={s.id} className={styles.spielerItem}>
                <div className={styles.spielerAvatar}>{s.name.charAt(0).toUpperCase()}</div>
                <span className={styles.spielerName}>{s.name}</span>
                {punkteAktiv && <span className={styles.punkte}>{s.punkte || 0} Pkt</span>}
                {s.istHost && <span className="tag tag-host">Host</span>}
                {s.id === spielerId && !s.istHost && (
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text3)', border: '1px solid var(--border)', fontSize: 10 }}>Du</span>
                )}
              </div>
            ))}
            {anzahl < 3 && (
              <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>
                Noch {3 - anzahl} Spieler benoetigt...
              </p>
            )}
          </div>
        </div>

        {/* Rechts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <div className="card">
            <div className="label">Spieleinstellungen</div>
            <div className={styles.settingRow}>
              <span className="text-muted">Aktive Orte</span>
              <span className="text-accent">{aktivierteOrte.length} / {alleOrte.length}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted">Timer</span>
              <span className="text-accent">{timerLabel()}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted">Punkte</span>
              <span className="text-accent">{punkteAktiv ? 'Aktiv' : 'Aus'}</span>
            </div>
            <div className={styles.settingRow}>
              <span className="text-muted">Non-Comm</span>
              <span className="text-accent">{nonCommMode ? 'Aktiv' : 'Aus'}</span>
            </div>
            {istHost && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 12, fontSize: 13 }}
                onClick={() => setSettingsOffen(true)}>
                ⚙️ Einstellungen anpassen
              </button>
            )}
          </div>

          {istHost ? (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '15px', fontSize: 16 }}
              onClick={onRundeStarten} disabled={anzahl < 3}>
              🎮 Runde starten
            </button>
          ) : (
            <div className={styles.warteBox}>
              <div className={styles.wartePulse} />
              <span className="text-muted" style={{ fontSize: 13 }}>Warte auf den Host...</span>
            </div>
          )}

          {/* How to play */}
          <details className={styles.howto}>
            <summary className={styles.howtoSummary}>📖 Spielregeln</summary>
            <div className={styles.howtoContent}>
              <p>Alle Spieler befinden sich am gleichen geheimen <strong>Ort</strong> – nur der <strong>Agent</strong> weiss nicht, wo.</p>
              <p>Reihum stellt jeder einem anderen eine Frage. Antworte nicht zu spezifisch (verraetest du den Ort) und nicht zu vage (wirkst du wie der Agent).</p>
              <div className={styles.howtoRegeln}>
                <div><strong>🎉 Spieler gewinnen</strong> wenn der Agent per Voting enttarnt wird.</div>
                <div><strong>🕵️ Agent gewinnt</strong> wenn er unerkannt bleibt oder den Ort korrekt erraet.</div>
                <div><strong>🚨 Anklage</strong> Jeder kann eine Anklage starten → alle stimmen ab → Mehrheit entscheidet.</div>
                <div><strong>🎯 Agent raten</strong> Der Agent kann jederzeit einen Ort tippen → Runde endet sofort.</div>
              </div>
            </div>
          </details>

        </div>
      </div>

      {/* Settings Modal */}
      {settingsOffen && (
        <div className={styles.overlay} onClick={() => setSettingsOffen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>

            <div className={styles.modalHeader}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Einstellungen</h2>
              <div className={styles.tabs}>
                {['orte', 'spiel'].map(t => (
                  <button key={t} className={`${styles.tab} ${aktTab === t ? styles.tabAktiv : ''}`} onClick={() => setAktTab(t)}>
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
                    const aktiv = aktivierteOrte.includes(o.id);
                    return (
                      <button key={o.id} className={`${styles.ortBtn} ${aktiv ? styles.ortBtnAktiv : ''}`} onClick={() => toggleOrt(o.id)}>
                        <span>{o.emoji}</span>
                        <span style={{ flex: 1, textAlign: 'left', fontSize: 12 }}>{o.name}</span>
                        {aktiv && <span style={{ color: 'var(--accent)', fontSize: 11 }}>✓</span>}
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
                        { id: 'competitive', label: '⚡ Competitive — 1 Min pro Spieler' },
                        { id: 'standard',    label: '🕐 Standard — 2 Min pro Spieler' },
                        { id: 'custom',      label: '✏️ Eigene Zeit' }
                      ].map(m => (
                        <button key={m.id}
                          className={`${styles.modusBtn} ${timerModus === m.id ? styles.modusBtnAktiv : ''}`}
                          onClick={() => setTimerModus(m.id)}>
                          {m.label}
                        </button>
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
                      <div>Agent enttarnt → <strong>Alle Spieler +1</strong>, Anklaeger +1 extra</div>
                      <div>Falsche/keine Mehrheit → <strong>Agent +1</strong></div>
                      <div>Agent erraet Ort → <strong>Agent +3</strong></div>
                      <div>Zeit ab (Standard) → <strong>Agent +2</strong> · (Competitive) → <strong>Agent +1</strong></div>
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
                    Normal: These wird laut ausgesprochen. Mit dieser Option wird sie ins Spiel getippt und allen angezeigt.
                  </p>
                </div>

              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSettingsOffen(false)}>Abbrechen</button>
              <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={settingsSpeichern}>Speichern</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
