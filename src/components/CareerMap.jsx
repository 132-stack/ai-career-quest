import CareerCard from "./CareerCard";

export default function CareerMap({ careers, onSelect }) {
  return (
    <section className="career-map">
      <h2>🌍 Explore Career World</h2>
      <p>Choose a location and discover your future career.</p>

      <div className="career-grid">
        {careers.map((career) => (
          <CareerCard
            key={career.id}
            career={career}
            onClick={() => onSelect(career)}
          />
        ))}
      </div>
    </section>
  );
}