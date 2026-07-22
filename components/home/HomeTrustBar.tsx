import Link from "next/link";

const TRUST_ITEMS = [
  {
    label: "Residential & Commercial Service",
    detail: "Homes, HOAs, restaurants, and businesses",
    href: "/#services-overview",
  },
  {
    label: "One-Time & Recurring Plans",
    detail: "Flexible scheduling for every property",
    href: "/blog/one-time-vs-recurring-trash-can-cleaning",
  },
  {
    label: "Local Metro Atlanta Team",
    detail: "Based in Fayette County, GA",
    href: "/#service-areas",
  },
  {
    label: "Easy Online Booking",
    detail: "Book or quote in minutes online",
    href: "/#pricing",
  },
] as const;

export function HomeTrustBar() {
  return (
    <section className="home-trust-bar" aria-label="Why customers choose Bin Blast Co.">
      <div className="container">
        <div className="home-trust-bar__inner">
          {TRUST_ITEMS.map((item) => (
            <Link key={item.label} href={item.href} className="home-trust-bar__item">
              <p className="home-trust-bar__title">{item.label}</p>
              <p className="home-trust-bar__detail">{item.detail}</p>
              <span className="home-trust-bar__link">Learn more →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
