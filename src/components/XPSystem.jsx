export default function XPSystem({ xp, completedMissions = [] }) {
  const level = Math.floor(xp / 200) + 1;

  const ranks = [
    { xp: 0, name: "Rookie Inventor" },
    { xp: 200, name: "Tech Explorer" },
    { xp: 400, name: "Prompt Pro" },
    { xp: 700, name: "AI Pioneer" },
    { xp: 1000, name: "Future Architect" }
  ];

  const rank = [...ranks]
    .reverse()
    .find(item => xp >= item.xp);

  return (
    <div className="xp-system">
      <h2>⭐ Player Progress</h2>

      <h3>{rank.name}</h3>

      <p>Level {level}</p>
      <p>{xp} XP</p>
      <p>
        Missions completed: {completedMissions.length}/6
      </p>

      <div className="xp-track">
        <div
          className="xp-fill"
          style={{ width: `${(xp % 200) / 2}%` }}
        />
      </div>
    </div>
  );
}