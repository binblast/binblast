import Link from "next/link";

export function HomeFinalCtaSection() {
  return (
    <section className="home-final-cta">
      <div className="container home-final-cta__inner">
        <h2>Ready for a Fresh, Sanitized Trash Bin?</h2>
        <p>
          Book online in minutes. We serve homeowners and businesses across Fayetteville,
          Peachtree City, and South Metro Atlanta.
        </p>
        <div className="home-final-cta__actions">
          <Link href="#pricing" className="btn btn-primary btn-large">
            Book Your Cleaning
          </Link>
          <Link href="#pricing" className="btn btn-secondary btn-large">
            View Pricing
          </Link>
        </div>
      </div>
    </section>
  );
}
