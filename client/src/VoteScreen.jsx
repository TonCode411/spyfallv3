import styles from './VoteScreen.module.css';

export default function VoteScreen({ voteData, spielerId, spielerListe, onVoteAbgeben, onVoteAbbrechen }) {
  const istAnklaeger = voteData?.anklaeger === spielerId;
  const istBeschuldigter = voteData?.beschuldigter === spielerId;
  const hatAbgestimmt = voteData?.stimmen?.[spielerId] !== undefined;
  const abgegeben = voteData?.abgegeben || Object.keys(voteData?.stimmen || {}).length || 0;
  const gesamt = voteData?.gesamt || spielerListe?.length || 1;

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.icon}>🚨</div>
          <h1 className={styles.title}>Anklage!</h1>
        </div>

        <div className={styles.anklageBox}>
          <div className={styles.zeile}>
            <span className={styles.nameA}>{voteData?.anklaegerName}</span>
            <span className={styles.pfeil}>beschuldigt</span>
            <span className={styles.nameB}>{voteData?.beschuldigterName}</span>
          </div>
          {voteData?.these && (
            <div className={styles.these}>„{voteData.these}"</div>
          )}
        </div>

        {istBeschuldigter && (
          <div className={styles.hinweis} style={{ background: 'var(--red-dim)', borderColor: 'rgba(224,85,85,0.3)', color: 'var(--red)' }}>
            ⚠️ Du wirst beschuldigt!
          </div>
        )}
        {istAnklaeger && (
          <div className={styles.hinweis}>
            ✓ Du hast die Anklage gestartet – deine Stimme zählt als Ja.
          </div>
        )}

        <div className={styles.frage}>
          Ist <strong>{voteData?.beschuldigterName}</strong> der Agent?
        </div>

        <div className={styles.fortschritt}>
          <span>{abgegeben} von {gesamt} haben abgestimmt</span>
          <div className={styles.bar}>
            <div className={styles.barFill} style={{ width: `${Math.round((abgegeben / gesamt) * 100)}%` }} />
          </div>
        </div>

        {!hatAbgestimmt ? (
          <div className={styles.buttons}>
            <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 15 }} onClick={() => onVoteAbgeben(true)}>
              ✓ Ja, ist der Agent
            </button>
            <button className="btn btn-danger" style={{ flex: 1, justifyContent: 'center', padding: '14px', fontSize: 15 }} onClick={() => onVoteAbgeben(false)}>
              ✗ Nein, falsch beschuldigt
            </button>
          </div>
        ) : (
          <div className={styles.warte}>
            <div className={styles.wartePulse} />
            Warte auf andere Spieler...
          </div>
        )}

        {(istAnklaeger) && (
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 8 }}
            onClick={onVoteAbbrechen}>
            Abstimmung abbrechen
          </button>
        )}
      </div>
    </div>
  );
}
