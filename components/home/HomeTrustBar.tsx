const TRUST_ITEMS = [
  {
    label: "⭐⭐⭐⭐⭐ Customer Reviews",
    detail: "Trusted by homeowners across South Metro Atlanta",
  },
  {
    label: "Locally Owned",
    detail: "Based in Fayette County, GA",
  },
  {
    label: "Eco-Friendly Cleaning",
    detail: "Professional process, safer for your property",
  },
  {
    label: "Reliable Service",
    detail: "On-time curbside visits you can count on",
  },
  {
    label: "Professional Equipment",
    detail: "Built for deep bin cleaning at your curb",
  },
  {
    label: "Fully Sanitized",
    detail: "Cleaned, sanitized, and deodorized every visit",
  },
] as const;

export function HomeTrustBar() {
  return (
    <section className="home-trust-bar" aria-label="Why customers trust Bin Blast Co.">
      <div className="container">
        <div className="home-trust-bar__inner">
          {TRUST_ITEMS.map((item) => (
            <div key={item.label} className="home-trust-bar__item">
              <p className="home-trust-bar__title">{item.label}</p>
              <p className="home-trust-bar__detail">{item.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
