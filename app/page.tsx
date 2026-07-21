// app/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { METRO_ATLANTA_TAGLINE } from "@/lib/service-areas";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/seo/schema";
import { HOME_FAQ_ITEMS } from "@/lib/seo/faq-data";
import { BrandLogo } from "@/components/BrandLogo";
import { HomeTrustBar } from "@/components/home/HomeTrustBar";
import { HomeServiceTypesSection } from "@/components/home/HomeServiceTypesSection";
import { HomeBeforeAfterSection } from "@/components/home/HomeBeforeAfterSection";
import { HomeReviewsSection } from "@/components/home/HomeReviewsSection";
import { HomeServiceAreaSection } from "@/components/home/HomeServiceAreaSection";
import { HomeFinalCtaSection } from "@/components/home/HomeFinalCtaSection";
import "@/components/home/homepage.css";
import "@/components/seo/seo-marketing.css";

export const metadata = buildPageMetadata({
  path: "/",
  title: "Trash Can Cleaning in South Metro Atlanta | Bin Blast Co.",
  description:
    "Professional trash can cleaning, sanitizing, and deodorizing for homes, HOAs, restaurants, and businesses across South Metro Atlanta.",
  keywords: [
    "trash can cleaning near me",
    "trash can cleaning Fayetteville GA",
    "garbage can cleaning Peachtree City GA",
    "trash bin cleaning South Atlanta",
    "trash can sanitizing",
    "residential trash can cleaning",
    "HOA trash can cleaning",
    "restaurant trash bin cleaning",
    "commercial bin cleaning",
  ],
});

// CRITICAL: Dynamically import all components that use Firebase to prevent import-time errors
// This ensures Firebase is initialized before these components load
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const PricingSection = dynamic(() => import("@/components/PricingSection").then(mod => ({ default: mod.PricingSection })), {
  ssr: false,
  loading: () => <div style={{ minHeight: "400px", padding: "4rem 0" }} />,
});

const FAQSection = dynamic(() => import("@/components/FAQSection").then(mod => ({ default: mod.FAQSection })), {
  ssr: false,
  loading: () => <div style={{ minHeight: "400px", padding: "4rem 0" }} />,
});

// Dynamically import ChatWidget to prevent SSR issues
const ChatWidget = dynamic(() => import("@/components/ChatWidget").then(mod => ({ default: mod.ChatWidget })), {
  ssr: false,
  loading: () => null,
});

const ENVIRONMENT_CARDS = [
  {
    title: "Deep Cleaning",
    description:
      "High-pressure cleaning helps remove grime, residue, spills, and buildup from inside and outside the bin.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 3v3" />
        <path d="M8 6h8" />
        <path d="M7 9h10l-1 11H8L7 9z" />
      </svg>
    ),
  },
  {
    title: "Sanitizing & Deodorizing",
    description:
      "Our process helps reduce unpleasant odors and leaves your trash bins feeling fresher after service.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 2v4" />
        <path d="M8 6h8" />
        <path d="M9 10h6" />
        <path d="M10 14h4" />
        <path d="M11 18h2" />
      </svg>
    ),
  },
  {
    title: "Convenient Curbside Service",
    description:
      "Leave your bins accessible after collection day, and our team handles the cleaning at your location.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V20h14V9.5" />
      </svg>
    ),
  },
  {
    title: "Local, Reliable Service",
    description:
      "Bin Blast Co. serves homeowners, communities, and businesses throughout South Metro Atlanta.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
] as const;

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqPageSchema(HOME_FAQ_ITEMS)} />
      <Navbar />
      <main className="bg-white marketing-main">
        {/* Hero Section */}
        <section id="home" className="hero hero--split">
          <div className="hero__backdrop" aria-hidden="true">
            <picture>
              <source media="(min-width: 1280px)" srcSet="/website-cover.jpg" />
              <img
                src="/website-cover-1920.jpg"
                alt="Bin Blast Co. truck cleaning and sanitizing a residential trash can in South Metro Atlanta, Georgia"
                className="hero__backdrop-image"
                decoding="async"
                fetchPriority="high"
                width={1920}
                height={1071}
              />
            </picture>
            <div className="hero__backdrop-overlay" />
          </div>
          <div className="container hero__grid">
            <div className="hero__copy">
              <p className="hero-eyebrow">Cleaner Bins. Cleaner Communities.</p>
              <h1 className="hero-headline">Professional Trash Can Cleaning in South Metro Atlanta</h1>
              <p className="hero-subheadline">
                Bin Blast Co. cleans, sanitizes, and deodorizes residential and commercial trash bins throughout Fayetteville, Peachtree City, Tyrone, Newnan, and surrounding communities.
              </p>
              <p className="hero-service-areas">{METRO_ATLANTA_TAGLINE}</p>
              <div className="hero-buttons">
                <Link href="#pricing" className="btn btn-primary btn-large">Book a Cleaning</Link>
                <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large">
                  Get a Commercial Quote
                </Link>
              </div>
              <p className="hero-note">One-time and recurring cleaning options available.</p>
            </div>
          </div>
        </section>

        <HomeTrustBar />

        <section id="environment" className="environment-section">
          <div className="container">
            <h2 className="section-title">A Cleaner, Fresher Trash Bin Without the Hassle</h2>
            <p className="section-subtitle environment-section__subtitle">
              Your trash cans collect more than waste. Bin Blast Co. helps remove built-up grime, unpleasant odors, and residue so your bins and curbside area feel cleaner and more presentable.
            </p>
            <div className="environment-grid">
              {ENVIRONMENT_CARDS.map((card) => (
                <div key={card.title} className="environment-card">
                  <span className="environment-card__icon">{card.icon}</span>
                  <h3>{card.title}</h3>
                  <p>{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="how-it-works">
          <div className="container">
            <h2 className="section-title">Clean Bins in Three Simple Steps</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3 className="step-title">Choose Your Service</h3>
                <p className="step-description">Select a one-time or recurring cleaning option based on your needs.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3 className="step-title">Leave Your Bins Accessible</h3>
                <p className="step-description">Place your empty bins at the agreed service location after trash collection.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3 className="step-title">We Clean and Refresh Them</h3>
                <p className="step-description">Our team cleans, sanitizes, and deodorizes your bins before marking the service complete.</p>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: "2rem" }}>
              <Link href="#pricing" className="btn btn-primary btn-large">Book a Cleaning</Link>
            </div>
          </div>
        </section>

        <HomeServiceTypesSection />
        <HomeBeforeAfterSection />
        <HomeReviewsSection />
        <HomeServiceAreaSection />

        {/* Plans & Pricing Section */}
        <Suspense fallback={<div style={{ minHeight: "400px", padding: "4rem 0" }} />}>
          <PricingSection />
        </Suspense>

        {/* Business Partner Program Section */}
        <section id="partners" style={{ padding: "2.5rem 0", background: "#f0f9ff", borderTop: "1px solid #bae6fd" }}>
          <div className="container" style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
            <h2 className="section-title" style={{ fontSize: "clamp(1.25rem, 4vw, 1.5rem)" }}>
              Service Business Partners
            </h2>
            <p style={{ color: "var(--text-light)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              Local pressure washing, detailing, and service businesses can add recurring bin-cleaning revenue through the Bin Blast Co. partner program.
            </p>
            <Link href="/partners" className="btn btn-secondary btn-large">
              Explore the Partner Program
            </Link>
          </div>
        </section>

        <FAQSection />

        <HomeFinalCtaSection />

        {/* Footer */}
        <footer id="book-now" className="footer footer-enhanced">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand-block">
                <BrandLogo variant="footer" tone="dark" href="/" />
                <p>
                  Bin Blast Co. provides professional trash can cleaning, sanitizing, and deodorizing for homes, HOAs, restaurants, and businesses throughout South Metro Atlanta.
                </p>
                <Link href="#pricing" className="btn btn-primary" style={{ marginTop: "1rem" }}>
                  Book a Cleaning
                </Link>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Residential Services</h3>
                <p><Link href="/residential-trash-can-cleaning">Residential Bin Cleaning</Link></p>
                <p><Link href="/hoa-trash-can-cleaning">HOA Bin Cleaning</Link></p>
                <p><Link href="/one-time-trash-can-cleaning">One-Time Cleaning</Link></p>
                <p><Link href="/recurring-trash-can-cleaning">Recurring Cleaning</Link></p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Commercial Services</h3>
                <p><Link href="/commercial-trash-bin-cleaning">Commercial Bin Cleaning</Link></p>
                <p><Link href="/restaurant-trash-bin-cleaning">Restaurant Bin Cleaning</Link></p>
                <p><Link href="/?openQuote=commercial#pricing">Request a Commercial Quote</Link></p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Service Areas</h3>
                <p><Link href="/trash-can-cleaning-fayetteville-ga">Fayetteville</Link></p>
                <p><Link href="/trash-can-cleaning-peachtree-city-ga">Peachtree City</Link></p>
                <p><Link href="/trash-can-cleaning-atlanta-ga">Atlanta</Link></p>
                <p><Link href="#service-areas">View All Service Areas</Link></p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Company</h3>
                <p><Link href="/careers">Join Our Team</Link></p>
                <p><Link href="/employee/register">Apply to Become a Bin Blaster</Link></p>
                <p><Link href="/login">Customer Sign In</Link></p>
                <p><Link href="/employee">Employee Sign In</Link></p>
                <p>Phone: <a href="tel:+14703050823">(470) 305-0823</a></p>
                <p>Email: <a href="mailto:support@binblastco.com">support@binblastco.com</a></p>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} Bin Blast Co. All rights reserved.</p>
              <div className="footer-legal-links">
                <Link href="/terms">Terms of Service</Link>
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/cancellation">Cancellation &amp; Refunds</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>
      <ChatWidget />
    </>
  );
}
