const TRUST_ITEMS = [
  {
    label: "Residential & Commercial Service",
    detail: "Homes, HOAs, restaurants, and businesses",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
        <path d="M10 20v-6h4v6" />
      </svg>
    ),
  },
  {
    label: "One-Time & Recurring Plans",
    detail: "Flexible scheduling for every property",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    label: "Local Metro Atlanta Team",
    detail: "Based in Fayette County, GA",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Easy Online Booking",
    detail: "Book or quote in minutes online",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="4" width="18" height="14" rx="2" />
        <path d="M7 8h10M7 12h6" />
      </svg>
    ),
  },
] as const;

export function HomeTrustBar() {
  return (
    <section className="home-trust-bar" aria-label="Why customers choose Bin Blast Co.">
      <div className="container">
        <div className="home-trust-bar__inner">
          {TRUST_ITEMS.map((item) => (
            <article key={item.label} className="home-trust-bar__item">
              <span className="home-trust-bar__icon" aria-hidden="true">
                {item.icon}
              </span>
              <div className="home-trust-bar__copy">
                <p className="home-trust-bar__title">{item.label}</p>
                <p className="home-trust-bar__detail">{item.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
