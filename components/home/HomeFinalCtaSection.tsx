import { BookCleaningLink } from "./BookCleaningLink";
import { HomeSectionLink } from "./HomeSectionLink";

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
          <BookCleaningLink />
          <HomeSectionLink sectionId="pricing" className="btn btn-secondary btn-large">
            View Pricing
          </HomeSectionLink>
        </div>
      </div>
    </section>
  );
}
