import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocationSeoPage, LOCATION_SEO_PAGES } from "@/data/locationSeoPages";

interface LocationPageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return LOCATION_SEO_PAGES.map((page) => ({ slug: page.slug }));
}

export function generateMetadata({ params }: LocationPageProps): Metadata {
  const page = getLocationSeoPage(params.slug);
  if (!page) return {};

  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords,
  };
}

export default function LocationPage({ params }: LocationPageProps) {
  const page = getLocationSeoPage(params.slug);
  if (!page) notFound();

  return (
    <main className="bg-white marketing-main" style={{ padding: "clamp(3rem, 8vw, 5rem) 1.5rem" }}>
      <div className="container" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <p style={{ color: "#16a34a", fontWeight: 600, marginBottom: "0.75rem" }}>
          Metro Atlanta • Based in Fayette County
        </p>
        <h1 style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)", marginBottom: "1rem", lineHeight: 1.2 }}>
          {page.headline}
        </h1>
        <p style={{ color: "#4b5563", fontSize: "1.0625rem", lineHeight: 1.7, marginBottom: "2rem" }}>
          {page.description}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <Link href="/#pricing" className="btn btn-primary btn-large">
            Book a Cleaning
          </Link>
          <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large">
            Request a Commercial Quote
          </Link>
        </div>
        <p style={{ marginTop: "2rem", color: "#6b7280", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Don&apos;t see your neighborhood listed yet? We are actively expanding routes throughout
          Metro Atlanta — request service and we&apos;ll confirm availability for your address.
        </p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/" style={{ color: "#2563eb", textDecoration: "none" }}>
            ← Back to Bin Blast Co. homepage
          </Link>
        </p>
      </div>
    </main>
  );
}
