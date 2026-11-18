export default function MissionPanel({ career, onComplete }) {
  if (!career) return null;

  return (
    <section className="mission-panel">
      <h2>🎯 Career Mission</h2>

      <h3>{career.icon} {career.name}</h3>

      <p>{career.mission}</p>

      <p>Reward: ⭐ {career.reward} XP</p>

      <button onClick={() => onComplete(career)}>
        Complete Mission
      </button>
    </section>
  );
}