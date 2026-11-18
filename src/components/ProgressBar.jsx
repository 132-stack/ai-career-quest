export default function ProgressBar({ xp }) {
  const level = Math.floor(xp / 200) + 1;
  const progress = (xp % 200) / 200 * 100;

  return (
    <div className="xp-section">
      <div className="xp-info">
        <span>LEVEL {level}</span>
        <span>{xp} XP</span>
      </div>

      <div className="xp-track">
        <div
          className="xp-fill"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}