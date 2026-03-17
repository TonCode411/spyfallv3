import styles from './AufloeungScreen.module.css';

export default function AufloeungScreen({ aufloesung, spielerId, lobby, onNaechsteRunde }) {
  const istHost = lobby?.hostId === spielerId;
  const { ort, karten, spieler } = aufloesung;

  const spielerListe = Object.entries(karten).map(([id, karte]) => ({
    id,
    name: spieler[id]?.name || 'Unbekannt',
    ...karte
  }));

  const agent = spielerListe.find(s => s.typ === 'agent');

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={`${styles.header} fade-in`}>
          <div className={styles.reveal}>— Aufloesung —</div>
          <h1 className={styles.title}>
            {ort.emoji} {ort.name}
          </h1>
          <p className="text-muted">Das war der geheime Ort!</p>
        </div>

        <div className={`${styles.agentBox} fade-in`} style={{ animationDelay: '0.1s' }}>
          <div className={styles.agentLabel}>Der Agent war</div>
          <div className={styles.agentName}>🕵️ {agent?.name || '?'}</div>
        </div>

        <div className={`${styles.kartenGrid} fade-in`} style={{ animationDelay: '0.2s' }}>
          {spielerListe.map((s, i) => (
            <div
              key={s.id}
              className={`${styles.karteItem} ${s.typ === 'agent' ? styles.agentKarte : styles.spielerKarte2}`}
              style={{ animationDelay: `${0.1 * i}s` }}
            >
              <div className={styles.karteKopf}>
                <div className={styles.karteAvatar}>
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className={styles.karteName}>{s.name}</div>
                  {s.id === spielerId && (
                    <span className="text-dim" style={{ fontSize: 11 }}>Du</span>
                  )}
                </div>
                <div className={styles.karteTag}>
                  {s.typ === 'agent'
                    ? <span className="tag tag-agent">Agent</span>
                    : <span className="tag tag-spieler">Spieler</span>
                  }
                </div>
              </div>
              {s.typ !== 'agent' && (
                <div className={styles.karteRolle}>
                  <span className="text-dim" style={{ fontSize: 12 }}>Rolle: </span>
                  <span style={{ fontWeight: 600 }}>{s.rolle}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className={styles.actions}>
          {istHost ? (
            <button className="btn btn-primary" style={{ padding: '14px 32px', fontSize: 15 }} onClick={onNaechsteRunde}>
              ▶ Nächste Runde
            </button>
          ) : (
            <div className={styles.warte}>
              <div className="text-muted" style={{ fontSize: 14 }}>Wartet auf den Host...</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
