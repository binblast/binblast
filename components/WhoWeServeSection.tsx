const AUDIENCES = [
  {
    id: "homeowners",
    title: "Homeowners",
    description:
      "Recurring curbside cleaning that keeps your bins fresh, sanitized, and odor-free.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 10.5L12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
  {
    id: "hoa",
    title: "HOA Communities",
    description:
      "Flexible neighborhood programs, preferred-vendor partnerships, and resident signup options.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 20V10l8-5 8 5v10" />
        <path d="M9 20v-6h6v6" />
        <path d="M4 10h16" />
      </svg>
    ),
  },
  {
    id: "restaurants",
    title: "Restaurants",
    description:
      "Scheduled cleaning for trash cans and waste areas to help control food residue, odors, flies, and buildup.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M4 11h16" />
        <path d="M6 7v8" />
        <path d="M10 7v8" />
        <path d="M14 7c0 3 2 5 4 5v4H10v-4c2 0 4-2 4-5z" />
      </svg>
    ),
  },
  {
    id: "apartments",
    title: "Apartment Communities",
    description:
      "Recurring service for shared waste containers and high-traffic disposal areas.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <path d="M4 10h16" />
        <path d="M10 10v10" />
      </svg>
    ),
  },
  {
    id: "property-managers",
    title: "Property Managers",
    description:
      "Reliable scheduled cleaning across residential and commercial properties.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 21v-6h6v6" />
      </svg>
    ),
  },
  {
    id: "commercial",
    title: "Commercial Properties",
    description:
      "Custom cleaning plans based on container quantity, condition, and service frequency.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="8" width="18" height="13" rx="2" />
        <path d="M7 8V6a5 5 0 0 1 10 0v2" />
        <path d="M12 12v4" />
      </svg>
    ),
  },
] as const;

export function WhoWeServeSection() {
  return (
    <section id="who-we-serve" className="who-we-serve-section">
      <div className="container">
        <h2 className="section-title">Who We Serve</h2>
        <p className="section-subtitle who-we-serve-subtitle">
          Metro Atlanta trash bin cleaning for homes, neighborhoods, restaurants, apartments, and
          commercial properties — with curbside service designed to stay convenient and consistent.
        </p>
        <div className="who-we-serve-grid">
          {AUDIENCES.map((item) => (
            <article key={item.id} className="who-we-serve-card">
              <div className="who-we-serve-card__icon">{item.icon}</div>
              <h3 className="who-we-serve-card__title">{item.title}</h3>
              <p className="who-we-serve-card__description">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
