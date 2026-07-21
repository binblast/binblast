import Link from "next/link";
import { HOME_CITY_LINKS, HOME_SERVICE_LINKS } from "@/lib/seo/home-links";

export function HomeServiceLinks() {
  return (
    <section className="seo-home-links">
      <div className="container">
        <h2 className="section-title">Trash Can Cleaning Services</h2>
        <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Explore service pages for residential, HOA, commercial, restaurant, sanitizing, and recurring bin cleaning.
        </p>
        <div className="seo-links-grid">
          {HOME_SERVICE_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="seo-link-card">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeCityLinks() {
  return (
    <section className="seo-home-links seo-home-links--muted">
      <div className="container">
        <h2 className="section-title">Local Service Area Pages</h2>
        <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          View trash can cleaning information for South Metro Atlanta communities we serve.
        </p>
        <div className="seo-links-grid">
          {HOME_CITY_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="seo-link-card">
              Trash can cleaning in {link.label}
            </Link>
          ))}
        </div>
        <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/blog" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
            Read trash can cleaning tips on our blog
          </Link>
        </p>
      </div>
    </section>
  );
}
