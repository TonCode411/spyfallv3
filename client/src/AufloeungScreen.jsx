import styles from './AufloeungScreen.module.css';

const GRUENDE = {
  enttarnt:     { emoji: '🎉', title: 'Agent enttarnt!',           farbe: 'gruen' },
  agent_richtig:{ emoji: '🕵️', title: 'Agent hat den Ort erraten!', farbe: 'rot'  },
  agent_falsch: { emoji: '❌', title: 'Agent lag falsch!',          farbe: 'gruen' },
  zeit:         { emoji: '⏱',  title: 'Zeit abgelaufen!',           farbe: 'rot'  }
};

export default function AufloeungScreen({ aufloesung, spielerId, lobby, onNaechsteRunde }) {
  const istHost = lobby?.hostId === spielerId;
  const { ort, karten, spieler, grund, anklaegerName, agentGuess, agentPunkte, punkteUpdate } = aufloesung;
  const info = GRUENDE[grund] || GRUENDE.enttarnt;
  const punkteAktiv = lobby?.settings?.punkteAktiv;

  const spielerListe = Object.entries(karten).map(([id, k]) => ({
    id, name: spieler[id]?.name || '?', ...k
  }));
  const agent = spielerListe.find(s => s.typ === 'agent');

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>

        <div className={`${styles.header} fade-in`}>
          <div className={styles.emoji}>{info.emoji}</div>
          <h1 className={`${styles.title} ${info.farbe === 'rot' ? styles.rot : styles.gruen}`}>
            {info.title}
          </h1>
          {anklaegerName && (
            <div className={styles.sub}>Anklage von <strong>{anklaegerName}</strong></div>
          )}
          {agentGuess && (
            <div className={styles.sub}>
              Agent tippte: <strong>{agentGuess}</strong> {grund === 'agent_richtig' ? '✓' : '✗'}
            </div>
          )}
          {agentPunkte > 0 && (
            <div className={styles.sub}>Agent erhielt <strong>+{agentPunkte} {agentPunkte === 1 ? 'Punkt' : 'Punkte'}</strong></div>
          )}
        </div>

        <div className={`${styles.ortBox} fade-in`} style={{ animationDelay: '0.05s' }}>
          <div className={styles.ortLabel}>Der geheime Ort</div>
          <div className={styles.ortName}>{ort.emoji} {ort.name}</div>
        </div>

        <div className={`${styles.agentBox} fade-in`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.agentLabel}>Der Agent war</div>
          <div className={styles.agentName}>🕵️ {agent?.name || '?'}</div>
        </div>

        {punkteAktiv && punkteUpdate && punkteUpdate.length > 0 && (
          <div className={`${styles.punkteBox} fade-in`} style={{ animationDelay: '0.15s' }}>
            <div className="label">Punktestand</div>
            <div className={styles.punkteListe}>
              {[...punkteUpdate].sort((a, b) => b.punkte - a.punkte).map((p, i) => (
                <div key={p.id} className={`${styles.punkteItem} ${p.id === spielerId ? styles.punkteIch : ''}`}>
                  <span className={styles.platz}>{i + 1}.</span>
                  <span className={styles.punkteName}>{p.name}</span>
                  <span className={styles.punkteZahl}>{p.punkte} Pkt</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className={`${styles.kartenListe} fade-in`} style={{ animationDelay: '0.2s' }}>
          <div className="label">Alle Karten</div>
          {spielerListe.map(s => (
            <div key={s.id} className={`${styles.karteItem} ${s.typ === 'agent' ? styles.karteItemAgent : styles.karteItemSpieler}`}>
              <div className={styles.karteAvatar}>{s.name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div className={styles.karteName}>
                  {s.name}
                  {s.id === spielerId && <span className="text-dim" style={{ fontSize: 11, marginLeft: 6 }}>(Du)</span>}
                </div>
                {s.typ !== 'agent' && <div className={styles.karteRolle}>{s.rolle}</div>}
              </div>
              {s.typ === 'agent'
                ? <span className="tag tag-agent">Agent</span>
                : <span className="tag tag-spieler">Spieler</span>
              }
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          {istHost ? (
            <button className="btn btn-primary" style={{ padding: '14px 40px', fontSize: 15 }} onClick={onNaechsteRunde}>
              ▶ Naechste Runde
            </button>
          ) : (
            <div className={styles.warteHost}>Warte auf den Host...</div>
          )}
        </div>

      </div>
    </div>
  );
}
