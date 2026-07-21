import Link from "next/link";

const BENEFITS = [
  "Recurring scheduled service",
  "One-time deep cleaning",
  "Custom quotes",
  "Multiple-bin pricing",
  "Cleaning, sanitizing, and deodorizing",
  "Service throughout Metro Atlanta",
] as const;

export function CommercialServicesSection() {
  return (
    <section id="commercial-services" className="commercial-services-section">
      <div className="container">
        <h2 className="section-title">Commercial and Restaurant Bin Cleaning</h2>
        <p className="section-subtitle commercial-services-subtitle">
          Food waste, grease, leaking bags, and heavy use can leave commercial bins with strong
          odors, residue, flies, and unsanitary buildup. Bin Blast Co. offers recurring and one-time
          cleaning solutions for restaurants, apartments, offices, schools, churches, and other
          commercial properties.
        </p>

        <ul className="commercial-benefits-list">
          {BENEFITS.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>

        <div className="commercial-services-cta">
          <Link href="/?openQuote=commercial#pricing" className="btn btn-primary btn-large">
            Request a Commercial Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
