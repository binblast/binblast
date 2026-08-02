import { BookCleaningLink } from "./BookCleaningLink";
import { HomeSectionLink } from "./HomeSectionLink";

export function HomeHeroActions() {
  return (
    <div className="hero-buttons">
      <BookCleaningLink />
      <HomeSectionLink sectionId="pricing" className="btn btn-secondary btn-large">
        View Pricing
      </HomeSectionLink>
    </div>
  );
}
