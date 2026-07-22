import Image from "next/image";
import Link from "next/link";

const BEFORE_AFTER = [
  {
    label: "Before",
    image: "/bin-before.jpg",
    alt: "Dirty trash bin interior before Bin Blast Co. cleaning",
    badgeClass: "home-before-after__badge--before",
  },
  {
    label: "After",
    image: "/bin-after.jpg",
    alt: "Clean trash bin interior after Bin Blast Co. cleaning",
    badgeClass: "home-before-after__badge--after",
  },
] as const;

export function HomeBeforeAfterSection() {
  return (
    <section id="results" className="home-before-after">
      <div className="container" style={{ maxWidth: "920px", textAlign: "center" }}>
        <h2 className="section-title">See the Bin Blast Difference</h2>
        <p className="section-subtitle" style={{ margin: "0.75rem auto 0" }}>
          Real before-and-after photos from Bin Blast Co. service visits.
        </p>
        <div className="home-before-after__grid">
          {BEFORE_AFTER.map((photo) => (
            <figure key={photo.label} className="home-before-after__card">
              <div className="home-before-after__media">
                <Image
                  src={photo.image}
                  alt={photo.alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 440px"
                  loading="lazy"
                />
                <span className={`home-before-after__badge ${photo.badgeClass}`}>{photo.label}</span>
              </div>
              <figcaption className="home-before-after__caption">
                <span>Peachtree City, GA</span>
                <span>Residential Cleaning</span>
              </figcaption>
            </figure>
          ))}
        </div>
        <Link href="#pricing" className="btn btn-primary btn-large">
          Book a Cleaning
        </Link>
      </div>
    </section>
  );
}
