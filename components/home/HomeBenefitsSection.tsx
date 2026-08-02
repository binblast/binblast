import Link from "next/link";

const BENEFITS = [
  {
    title: "Eliminate Odors",
    description: "Stop embarrassing smells from drifting into your garage, patio, or driveway.",
  },
  {
    title: "Kill Germs & Bacteria",
    description: "Professional sanitizing helps reduce the bacteria that thrive in dirty bins.",
  },
  {
    title: "Keep Flies Away",
    description: "A clean bin means fewer pests hanging around your curb and home.",
  },
  {
    title: "Prevent Maggots",
    description: "Regular cleaning removes the residue that attracts maggots in warm weather.",
  },
  {
    title: "Save Time",
    description: "Skip the hose, bleach, and scrub brush. We handle it in minutes.",
  },
  {
    title: "Protect Your Family",
    description: "Keep kids, pets, and neighbors away from dirty runoff and lingering germs.",
  },
] as const;

export function HomeBenefitsSection() {
  return (
    <section id="benefits" className="home-benefits">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          What You Get With Every Cleaning
        </h2>
        <p className="section-subtitle" style={{ textAlign: "center", margin: "0.75rem auto 0" }}>
          Real outcomes for homeowners and business owners — not just a rinse.
        </p>
        <div className="home-benefits__grid">
          {BENEFITS.map((benefit) => (
            <article key={benefit.title} className="home-benefits__card">
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
            </article>
          ))}
        </div>
        <div className="home-section-cta">
          <Link href="#pricing" className="btn btn-primary btn-large">
            Book Your Cleaning
          </Link>
        </div>
      </div>
    </section>
  );
}
