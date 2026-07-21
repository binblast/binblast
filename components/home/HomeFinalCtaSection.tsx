import Link from "next/link";

export function HomeFinalCtaSection() {
  return (
    <section className="home-final-cta">
      <div className="container home-final-cta__inner">
        <h2>Ready for Cleaner, Fresher Trash Bins?</h2>
        <p>
          Book your Bin Blast Co. service online or request a custom quote for your community or business.
        </p>
        <div className="home-final-cta__actions">
          <Link href="#pricing" className="btn btn-primary btn-large">
            Book a Cleaning
          </Link>
          <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large">
            Request a Commercial Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
