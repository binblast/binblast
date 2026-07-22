import Link from "next/link";

const ENVIRONMENT_CARDS = [
  {
    title: "Deep Cleaning",
    description:
      "High-pressure cleaning helps remove grime, residue, spills, and buildup from inside and outside the bin.",
    href: "/residential-trash-can-cleaning",
  },
  {
    title: "Sanitizing & Deodorizing",
    description:
      "Our process helps reduce unpleasant odors and leaves your trash bins feeling fresher after service.",
    href: "/trash-can-sanitizing",
  },
  {
    title: "Convenient Curbside Service",
    description:
      "Leave your bins accessible after collection day, and our team handles the cleaning at your location.",
    href: "/blog/how-to-clean-a-trash-can-safely",
  },
  {
    title: "Local, Reliable Service",
    description:
      "Bin Blast Co. serves homeowners, communities, and businesses throughout South Metro Atlanta.",
    href: "/#service-areas",
  },
] as const;

export function HomeEnvironmentSection() {
  return (
    <section id="environment" className="environment-section">
      <div className="container">
        <h2 className="section-title">A Cleaner, Fresher Trash Bin Without the Hassle</h2>
        <p className="section-subtitle environment-section__subtitle">
          Your trash cans collect more than waste. Bin Blast Co. helps remove built-up grime, unpleasant odors, and
          residue so your bins and curbside area feel cleaner and more presentable.
        </p>
        <div className="environment-grid">
          {ENVIRONMENT_CARDS.map((card) => (
            <Link key={card.title} href={card.href} className="environment-card environment-card--link">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <span className="environment-card__link">Learn more →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
