import Link from "next/link";
import { PRIORITY_CITY_PAGES } from "@/lib/seo/business-info";
import { BookCleaningLink } from "./BookCleaningLink";

export function HomeServiceAreaSection() {
  return (
    <section id="service-areas" className="home-service-area-section">
      <div className="container" style={{ textAlign: "center" }}>
        <h2 className="section-title">Serving South Metro Atlanta</h2>
        <p className="section-subtitle" style={{ margin: "0.75rem auto 0" }}>
          Bin Blast Co. is based in Fayette County and provides trash can cleaning throughout select communities in South Metro Atlanta. Availability is confirmed during booking.
        </p>
        <div className="home-service-area-section__grid">
          {PRIORITY_CITY_PAGES.map((city) => (
            <Link key={city.slug} href={`/${city.slug}`} className="home-service-area-chip">
              {city.city}
            </Link>
          ))}
        </div>
        <BookCleaningLink />
      </div>
    </section>
  );
}
