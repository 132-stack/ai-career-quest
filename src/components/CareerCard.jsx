export default function CareerCard({ career, onClick }) {
  return (
    <button className="career-card" onClick={onClick}>
      <span className="career-icon">{career.icon}</span>
      <h3>{career.name}</h3>
      <p>{career.description}</p>
      <span className="career-location">{career.location}</span>
    </button>
  );
}