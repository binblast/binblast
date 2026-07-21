const TRUST_ITEMS = [
  {
    label: "Residential & Commercial Service",
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
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 11h18" />
      </svg>
    ),
  },
  {
    label: "Local Metro Atlanta Team",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Easy Online Booking",
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
    <section className="home-trust-bar" aria-label="Service highlights">
      <div className="container home-trust-bar__inner">
        {TRUST_ITEMS.map((item) => (
          <div key={item.label} className="home-trust-bar__item">
            <span className="home-trust-bar__icon">{item.icon}</span>
            <span className="home-trust-bar__text">{item.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
