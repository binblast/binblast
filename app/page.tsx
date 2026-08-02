// app/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqPageSchema } from "@/lib/seo/schema";
import { HOME_FAQ_ITEMS } from "@/lib/seo/faq-data";
import { HomeHeroActions } from "@/components/home/HomeHeroActions";
import { BookCleaningLink } from "@/components/home/BookCleaningLink";
import { BrandLogo } from "@/components/BrandLogo";
import { HomeTrustBar } from "@/components/home/HomeTrustBar";
import { HomeProblemSection } from "@/components/home/HomeProblemSection";
import { HomeBeforeAfterSection } from "@/components/home/HomeBeforeAfterSection";
import { HomeHowItWorksSection } from "@/components/home/HomeHowItWorksSection";
import { HomeBenefitsSection } from "@/components/home/HomeBenefitsSection";
import { HomeWhyChooseSection } from "@/components/home/HomeWhyChooseSection";
import { HomeServiceTypesSection } from "@/components/home/HomeServiceTypesSection";
import { HomeReviewsSection } from "@/components/home/HomeReviewsSection";
import { HomeServiceAreaSection } from "@/components/home/HomeServiceAreaSection";
import { HomeFinalCtaSection } from "@/components/home/HomeFinalCtaSection";
import "@/components/home/homepage.css";
import "@/components/seo/seo-marketing.css";

export const metadata = buildPageMetadata({
  path: "/",
  title: "Trash Bin Cleaning & Sanitizing | Bin Blast Co. | South Metro Atlanta",
  description:
    "Professional trash bin cleaning, trash can cleaning, and bin sanitizing for homes and businesses in Fayetteville, Peachtree City, and South Metro Atlanta. Book online today.",
  keywords: [
    "trash bin cleaning",
    "trash can cleaning",
    "garbage can cleaning",
    "residential trash bin cleaning",
    "commercial trash bin cleaning",
    "bin sanitizing",
    "Fayette County trash bin cleaning",
    "Peachtree City trash bin cleaning",
    "Fayetteville trash bin cleaning",
    "trash can cleaning near me",
    "trash can sanitizing",
    "HOA trash can cleaning",
    "restaurant trash bin cleaning",
  ],
});

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const PricingSection = dynamic(
  () => import("@/components/PricingSection").then((mod) => ({ default: mod.PricingSection })),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: "400px", padding: "4rem 0" }} />,
  }
);

const FAQSection = dynamic(
  () => import("@/components/FAQSection").then((mod) => ({ default: mod.FAQSection })),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: "400px", padding: "4rem 0" }} />,
  }
);

const ChatWidget = dynamic(
  () => import("@/components/ChatWidget").then((mod) => ({ default: mod.ChatWidget })),
  {
    ssr: false,
    loading: () => null,
  }
);

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqPageSchema(HOME_FAQ_ITEMS)} />
      <Navbar />
      <main className="bg-white marketing-main">
        <section id="home" className="hero hero--conversion">
          <div className="container hero__grid hero__grid--conversion">
            <div className="hero__copy hero__copy--conversion">
              <p className="hero-eyebrow hero-eyebrow--dark">
                Residential &amp; Commercial · South Metro Atlanta
              </p>
              <h1 className="hero-headline hero-headline--dark">
                Professional Trash Bin Cleaning &amp; Sanitizing
              </h1>
              <p className="hero-subheadline hero-subheadline--dark">
                Keep your trash cans fresh, odor-free, and bacteria-free without lifting a finger.
              </p>
              <HomeHeroActions />
              <p className="hero-note hero-note--dark">
                Serving Fayetteville, Peachtree City, Tyrone, Newnan &amp; surrounding areas.
              </p>
            </div>
            <div className="hero__visual">
              <Image
                src="/residential-bin-service.jpg"
                alt="Bin Blast Co. technician professionally cleaning a residential trash bin at the curb"
                width={720}
                height={540}
                priority
                className="hero__visual-image"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </section>

        <HomeTrustBar />
        <HomeProblemSection />
        <HomeBeforeAfterSection />
        <HomeHowItWorksSection />
        <HomeBenefitsSection />
        <HomeWhyChooseSection />
        <HomeServiceTypesSection />
        <HomeReviewsSection />
        <HomeServiceAreaSection />

        <section id="pricing" className="pricing-section-anchor">
          <Suspense fallback={<div style={{ minHeight: "400px", padding: "4rem 0" }} />}>
            <PricingSection />
          </Suspense>
        </section>

        <section
          id="partners"
          style={{ padding: "2.5rem 0", background: "#f0f9ff", borderTop: "1px solid #bae6fd" }}
        >
          <div className="container" style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
            <h2 className="section-title" style={{ fontSize: "clamp(1.25rem, 4vw, 1.5rem)" }}>
              Business Owner?
            </h2>
            <p style={{ color: "var(--text-light)", lineHeight: 1.7, marginBottom: "1.25rem" }}>
              Restaurants, property managers, and HOAs can request a custom quote for recurring
              commercial trash bin cleaning.
            </p>
            <Link href="/?openQuote=custom#pricing" className="btn btn-secondary btn-large">
              Get a Custom Quote
            </Link>
          </div>
        </section>

        <FAQSection />

        <HomeFinalCtaSection />

        <footer id="book-now" className="footer footer-enhanced">
          <div className="container">
            <div className="footer-content">
              <div className="footer-brand-block">
                <BrandLogo variant="footer" tone="dark" href="/" />
                <p>
                  Bin Blast Co. provides professional trash bin cleaning, sanitizing, and deodorizing
                  for homes and businesses throughout South Metro Atlanta.
                </p>
                <BookCleaningLink large={false} style={{ marginTop: "1rem" }} />
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Residential Services</h3>
                <p>
                  <Link href="/residential-trash-can-cleaning">Residential Bin Cleaning</Link>
                </p>
                <p>
                  <Link href="/hoa-trash-can-cleaning">HOA Bin Cleaning</Link>
                </p>
                <p>
                  <Link href="/one-time-trash-can-cleaning">One-Time Cleaning</Link>
                </p>
                <p>
                  <Link href="/recurring-trash-can-cleaning">Recurring Cleaning</Link>
                </p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Commercial Services</h3>
                <p>
                  <Link href="/commercial-trash-bin-cleaning">Commercial Bin Cleaning</Link>
                </p>
                <p>
                  <Link href="/restaurant-trash-bin-cleaning">Restaurant Bin Cleaning</Link>
                </p>
                <p>
                  <Link href="/?openQuote=custom#pricing">Get a Custom Quote</Link>
                </p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Service Areas</h3>
                <p>
                  <Link href="/trash-can-cleaning-fayetteville-ga">Fayetteville</Link>
                </p>
                <p>
                  <Link href="/trash-can-cleaning-peachtree-city-ga">Peachtree City</Link>
                </p>
                <p>
                  <Link href="/trash-can-cleaning-atlanta-ga">Atlanta</Link>
                </p>
                <p>
                  <Link href="#service-areas">View All Service Areas</Link>
                </p>
              </div>
              <div className="footer-section">
                <h3 className="footer-heading">Company</h3>
                <p>
                  <Link href="/careers">Join Our Team</Link>
                </p>
                <p>
                  <Link href="/employee/register">Apply to Become a Bin Blaster</Link>
                </p>
                <p>
                  <Link href="/login">Customer Sign In</Link>
                </p>
                <p>
                  <Link href="/employee">Employee Sign In</Link>
                </p>
                <p>
                  Phone: <a href="tel:+14703050823">(470) 305-0823</a>
                </p>
                <p>
                  Email: <a href="mailto:support@binblastco.com">support@binblastco.com</a>
                </p>
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
