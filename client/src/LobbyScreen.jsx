import { useState } from 'react';
import styles from './LobbyScreen.module.css';

export default function LobbyScreen({ lobby, spielerId, onRundeStarten, onSettingsUpdate }) {
  const [settingsOffen, setSettingsOffen] = useState(false);
  const [aktTab, setAktTab] = useState('orte'); // orte | spiel
  const [aktivierteOrte, setAktivierteOrte] = useState(
    lobby.settings?.aktivierteOrte || lobby.alleOrte?.map(o => o.id) || []
  );
  const [timerAktiv, setTimerAktiv] = useState(lobby.settings?.timerAktiv || false);
  const [timerModus, setTimerModus] = useState(lobby.settings?.timerModus || 'standard');
  const [timerSekunden, setTimerSekunden] = useState(lobby.settings?.timerSekunden || 300);
  const [punkteAktiv, setPunkteAktiv] = useState(lobby.settings?.punkteAktiv || false);
  const [nonCommMode, setNonCommMode] = useState(lobby.settings?.nonCommMode || false);
  const [kopiert, setKopiert] = useState(false);

  const istHost = lobby.hostId === spielerId;
  const spielerListe = lobby.spieler || [];
  const alleOrte = lobby.alleOrte || [];
  const anzahl = spielerListe.length;

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}?code=${lobby.code}`);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const toggleOrt = (id) => {
    setAktivierteOrte(prev => {
      if (prev.includes(id)) return prev.length <= 1 ? prev : prev.filter(x => x !== id);
      return [...prev, id];
    });
  };

  const settingsSpeichern = () => {
    onSettingsUpdate({ aktivierteOrte, timerAktiv, timerModus, timerSekunden, punkteAktiv, nonCommMode });
    setSettingsOffen(false);
  };

  const timerLabel = () => {
    if (!timerAktiv) return 'Kein Timer';
    const n = anzahl || 5;
    if (timerModus === 'competitive') return `${n} × 1 Min = ${n} Min`;
    if (timerModus === 'standard') return `${n} × 2 Min = ${n * 2} Min`;
    return `${Math.floor(timerSekunden / 60)}:${String(timerSekunden % 60).padStart(2, '0')} Min`;
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>🕵️ Agenten Undercover</h1>
          {anzahl < 5 && (
            <div className={styles.empfehlung}>
              💡 Am besten mit 5+ Spielern
            </div>
          )}
        </div>
        <div className={styles.codeBox}>
          <div className="label" style={{ marginBottom: 4 }}>Lobby-Code</div>
          <div className={styles.codeValue}>{lobby.code}</div>
          <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 14px', width: '100%', justifyContent: 'center' }} onClick={copyLink}>
            {kopiert ? '✓ Kopiert!' : '🔗 Einladungslink kopieren'}
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
                {lobby.settings?.punkteAktiv && (
                  <span className={styles.punkte}>{s.punkte || 0} Pkt</span>
                )}
                {s.istHost && <span className="tag tag-host">Host</span>}
                {s.id === spielerId && !s.istHost && (
                  <span className="tag" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text3)', border: '1px solid var(--border)', fontSize: 11 }}>Du</span>
                )}
              </div>
            ))}
            {anzahl < 3 && (
              <p className="text-dim" style={{ fontSize: 12, marginTop: 8 }}>
                Noch {3 - anzahl} Spieler mindestens benoetigt...
              </p>
            )}
          </div>
        </div>

        {/* Rechte Spalte */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card">
            <div className="label">Einstellungen</div>
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
              <span className="text-muted">Non-Comm Modus</span>
              <span className="text-accent">{nonCommMode ? 'Aktiv' : 'Aus'}</span>
            </div>
            {istHost && (
              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', marginTop: 14, fontSize: 13 }} onClick={() => setSettingsOffen(true)}>
                ⚙️ Einstellungen
              </button>
            )}
          </div>

          {istHost ? (
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px', fontSize: 16 }}
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
            <summary className={styles.howtoTitle}>📖 Wie spielt man?</summary>
            <div className={styles.howtoContent}>
              <p>Alle Spieler befinden sich am selben geheimen <strong>Ort</strong> – nur der <strong>Agent</strong> weiss nicht wo.</p>
              <p>Reihum stellt jeder einem anderen Spieler eine Frage. Antworte nicht zu spezifisch – sonst verraetest du den Ort. Aber auch nicht zu vage – sonst wirkst du wie der Agent!</p>
              <p><strong>Spieler gewinnen</strong>, wenn sie den Agenten per Voting enttarnen.</p>
              <p><strong>Der Agent gewinnt</strong>, wenn er unerkannt bleibt oder den Ort korrekt erraet.</p>
              <hr style={{ borderColor: 'var(--border)', margin: '10px 0' }} />
              <p><strong>Abstimmung starten:</strong> Jeder kann eine Anklage starten – alle stimmen ab. Mehrheit entscheidet.</p>
              <p><strong>Agent raet:</strong> Der Agent kann jederzeit einen Ort tippen und die Runde beenden.</p>
            </div>
          </details>
        </div>
      </div>

      {/* Settings Modal */}
      {settingsOffen && (
        <div className={styles.modalOverlay} onClick={() => setSettingsOffen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Einstellungen</h2>
              <div className={styles.tabs}>
                <button className={`${styles.tab} ${aktTab === 'orte' ? styles.tabAktiv : ''}`} onClick={() => setAktTab('orte')}>Orte</button>
                <button className={`${styles.tab} ${aktTab === 'spiel' ? styles.tabAktiv : ''}`} onClick={() => setAktTab('spiel')}>Spielmodus</button>
              </div>
            </div>

            {aktTab === 'orte' && (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setAktivierteOrte(alleOrte.map(o => o.id))}>Alle an</button>
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '6px 12px' }} onClick={() => setAktivierteOrte([alleOrte[0]?.id])}>Alle aus</button>
                  <span className="text-dim" style={{ fontSize: 12, marginLeft: 'auto', alignSelf: 'center' }}>{aktivierteOrte.length} aktiv</span>
                </div>
                <div className={styles.orteGrid}>
                  {alleOrte.map(o => {
                    const aktiv = aktivierteOrte.includes(o.id);
                    return (
                      <button key={o.id} className={`${styles.ortToggle} ${aktiv ? styles.ortAktiv : ''}`} onClick={() => toggleOrt(o.id)}>
                        <span>{o.emoji}</span>
                        <span style={{ flex: 1, textAlign: 'left' }}>{o.name}</span>
                        {aktiv && <span style={{ color: 'var(--accent)', fontSize: 11 }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {aktTab === 'spiel' && (
              <div className={styles.spielSettings}>
                <div className={styles.settingBlock}>
                  <div className={styles.settingBlockTitle}>⏱ Timer</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={timerAktiv} onChange={e => setTimerAktiv(e.target.checked)} />
                    <span>Timer aktivieren</span>
                  </label>
                  {timerAktiv && (
                    <div className={styles.timerOptionen}>
                      {['competitive', 'standard', 'custom'].map(m => (
                        <button key={m} className={`${styles.modusBtn} ${timerModus === m ? styles.modusBtnAktiv : ''}`} onClick={() => setTimerModus(m)}>
                          {m === 'competitive' ? '⚡ Competitive (1 Min/Spieler)' : m === 'standard' ? '🕐 Standard (2 Min/Spieler)' : '✏️ Eigene Zeit'}
                        </button>
                      ))}
                      {timerModus === 'custom' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                          <input type="range" min={60} max={900} step={30} value={timerSekunden} onChange={e => setTimerSekunden(Number(e.target.value))}
                            style={{ flex: 1, accentColor: 'var(--accent)' }} />
                          <span className="text-accent" style={{ fontWeight: 700, minWidth: 50 }}>
                            {Math.floor(timerSekunden / 60)}:{String(timerSekunden % 60).padStart(2, '0')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className={styles.settingBlock}>
                  <div className={styles.settingBlockTitle}>🏆 Punkte</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={punkteAktiv} onChange={e => setPunkteAktiv(e.target.checked)} />
                    <span>Punktesystem aktivieren</span>
                  </label>
                  {punkteAktiv && (
                    <div className={styles.punkteInfo}>
                      <div>Agent enttarnt → <strong>Alle Spieler +1</strong>, Anklaeger +1 extra</div>
                      <div>Falsche Anklage / keine Mehrheit → <strong>Agent +1</strong></div>
                      <div>Agent erraet Ort → <strong>Agent +3</strong></div>
                      <div>Zeit abgelaufen → Agent +1 (standard) / +2 (competitive)</div>
                    </div>
                  )}
                </div>

                <div className={styles.settingBlock}>
                  <div className={styles.settingBlockTitle}>💬 Non-Communication Modus</div>
                  <label className={styles.toggle}>
                    <input type="checkbox" checked={nonCommMode} onChange={e => setNonCommMode(e.target.checked)} />
                    <span>Anklagen per Textfeld statt laut</span>
                  </label>
                  <p className="text-dim" style={{ fontSize: 12, marginTop: 6 }}>
                    Im Non-Comm Modus wird die Anklage-These ins Textfeld getippt statt laut ausgesprochen.
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
