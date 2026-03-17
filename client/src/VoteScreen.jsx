import styles from './VoteScreen.module.css';

export default function VoteScreen({ voteData, spielerId, spielerListe, onVoteAbgeben, onVoteAbbrechen }) {
  const hatAbgestimmt = voteData?.stimmen && voteData.stimmen[spielerId] !== undefined;
  const istAnklaeger = voteData?.anklaeger === spielerId;
  const istBeschuldigter = voteData?.beschuldigter === spielerId;
  const abgegeben = voteData?.abgegeben || Object.keys(voteData?.stimmen || {}).length;
  const gesamt = voteData?.gesamt || spielerListe?.length || 1;
  const prozent = Math.round((abgegeben / gesamt) * 100);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>

        <div className={styles.header}>
          <div className={styles.badge}>🚨</div>
          <h1 className={styles.title}>Anklage!</h1>
        </div>

        <div className={styles.anklageBox}>
          <div className={styles.anklageZeile}>
            <span className={styles.anklaegerName}>{voteData?.anklaegerName}</span>
            <span className={styles.pfeil}>beschuldigt</span>
            <span className={styles.beschuldigterName}>{voteData?.beschuldigterName}</span>
          </div>
          {voteData?.these && (
            <div className={styles.these}>„{voteData.these}"</div>
          )}
        </div>

        {istBeschuldigter && (
          <div className={styles.duBist}>⚠️ Du wirst beschuldigt!</div>
        )}
        {istAnklaeger && (
          <div className={styles.duBist} style={{ background: 'var(--accent-dim)', borderColor: 'rgba(201,168,76,0.3)', color: 'var(--accent)' }}>
            ✓ Du hast die Anklage gestartet – deine Stimme wurde automatisch als Ja gewertet.
          </div>
        )}

        <div className={styles.frage}>
          Glaubst du, <strong>{voteData?.beschuldigterName}</strong> ist der Agent?
        </div>

        <div className={styles.fortschritt}>
          <div className={styles.fortschrittText}>{abgegeben} von {gesamt} haben abgestimmt</div>
          <div className={styles.fortschrittBar}>
            <div className={styles.fortschrittFill} style={{ width: `${prozent}%` }} />
          </div>
        </div>

        {!hatAbgestimmt ? (
          <div className={styles.buttons}>
            <button className={`btn btn-success ${styles.voteBtn}`} onClick={() => onVoteAbgeben(true)}>
              ✓ Ja, ist der Agent
            </button>
            <button className={`btn btn-danger ${styles.voteBtn}`} onClick={() => onVoteAbgeben(false)}>
              ✗ Nein, falsch beschuldigt
            </button>
          </div>
        ) : (
          <div className={styles.warte}>
            <div className={styles.wartePulse} />
            Stimme abgegeben – warte auf andere...
          </div>
        )}

        {istAnklaeger && (
          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', fontSize: 12, marginTop: 4 }}
            onClick={onVoteAbbrechen}>
            Abstimmung abbrechen
          </button>
        )}
      </div>
    </div>
  );
}
