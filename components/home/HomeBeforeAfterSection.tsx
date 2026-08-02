import Image from "next/image";
import { BookCleaningLink } from "./BookCleaningLink";

const BEFORE_AFTER = [
  {
    label: "Dirty Bin",
    image: "/bin-before.jpg",
    alt: "Dirty trash bin interior before Bin Blast Co. cleaning",
    badgeClass: "home-before-after__badge--before",
  },
  {
    label: "Professionally Cleaned Bin",
    image: "/bin-after.jpg",
    alt: "Professionally cleaned trash bin after Bin Blast Co. service",
    badgeClass: "home-before-after__badge--after",
  },
] as const;

export function HomeBeforeAfterSection() {
  return (
    <section id="results" className="home-before-after">
      <div className="container home-before-after__container">
        <h2 className="section-title">See the Difference</h2>
        <p className="section-subtitle">
          Real before-and-after results from Bin Blast Co. service visits.
        </p>

        <div className="home-before-after__grid">
          <figure className="home-before-after__card">
            <div className="home-before-after__media">
              <Image
                src={BEFORE_AFTER[0].image}
                alt={BEFORE_AFTER[0].alt}
                fill
                sizes="(max-width: 768px) 100vw, 440px"
                loading="lazy"
              />
              <span className={`home-before-after__badge ${BEFORE_AFTER[0].badgeClass}`}>
                {BEFORE_AFTER[0].label}
              </span>
            </div>
          </figure>

          <div className="home-before-after__arrow" aria-hidden="true">
            ↓
          </div>

          <figure className="home-before-after__card">
            <div className="home-before-after__media">
              <Image
                src={BEFORE_AFTER[1].image}
                alt={BEFORE_AFTER[1].alt}
                fill
                sizes="(max-width: 768px) 100vw, 440px"
                loading="lazy"
              />
              <span className={`home-before-after__badge ${BEFORE_AFTER[1].badgeClass}`}>
                {BEFORE_AFTER[1].label}
              </span>
            </div>
          </figure>
        </div>

        <div className="home-section-cta">
          <BookCleaningLink />
        </div>
      </div>
    </section>
  );
}
