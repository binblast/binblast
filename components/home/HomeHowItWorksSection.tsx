import Link from "next/link";

const STEPS = [
  {
    number: "1",
    title: "Schedule Your Cleaning",
    description: "Pick a one-time or recurring plan online in minutes. No phone tag required.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h1V3a1 1 0 0 1 1-1zm13 9H4v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7zM6 7v1h12V7a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z" />
      </svg>
    ),
  },
  {
    number: "2",
    title: "We Arrive After Trash Pickup",
    description: "Leave your empty bins at the curb. You don't need to be home — we handle the rest.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6a3 3 0 0 1 3-3h9l3 3h3a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6zm3-1a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9h-3a1 1 0 0 1-1-1V5H6zm11 4h2v8a1 1 0 0 1-1 1h-1V9z" />
      </svg>
    ),
  },
  {
    number: "3",
    title: "Enjoy a Fresh, Sanitized Bin",
    description: "We deep-clean, sanitize, and deodorize your bins so they smell clean and look presentable again.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2c1.1 0 2 .9 2 2v1h3a2 2 0 0 1 2 2v11a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2h3V4c0-1.1.9-2 2-2zm0 2v1h0V4zm-4 5a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2H8zm0 4a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2H8z" />
      </svg>
    ),
  },
] as const;

export function HomeHowItWorksSection() {
  return (
    <section id="how-it-works" className="home-how-it-works">
      <div className="container">
        <h2 className="section-title" style={{ textAlign: "center" }}>
          How It Works
        </h2>
        <p className="section-subtitle" style={{ textAlign: "center", margin: "0.75rem auto 0" }}>
          Three simple steps. No scrubbing, no harsh chemicals, no hassle.
        </p>
        <div className="home-how-it-works__grid">
          {STEPS.map((step) => (
            <article key={step.number} className="home-how-it-works__card">
              <div className="home-how-it-works__icon">{step.icon}</div>
              <span className="home-how-it-works__step">Step {step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
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
