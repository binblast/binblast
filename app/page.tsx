// app/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";
import { BUSINESS_HOURS_LINES } from "@/lib/business-hours";
import { PRIMARY_SERVICE_AREAS, METRO_ATLANTA_TAGLINE } from "@/lib/service-areas";
import { buildPageMetadata } from "@/lib/seo/metadata-helpers";
import { JsonLd } from "@/components/seo/JsonLd";
import { HomeCityLinks, HomeServiceLinks } from "@/components/seo/HomeServiceLinks";
import { faqPageSchema } from "@/lib/seo/schema";
import { HOME_FAQ_ITEMS } from "@/lib/seo/faq-data";
import { BrandLogo } from "@/components/BrandLogo";
import { WhoWeServeSection } from "@/components/WhoWeServeSection";
import { CommercialServicesSection } from "@/components/CommercialServicesSection";
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

const MetroAtlantaServiceAreas = dynamic(
  () => import("@/components/MetroAtlantaServiceAreas").then((mod) => mod.MetroAtlantaServiceAreas),
  {
    ssr: false,
    loading: () => (
      <div className="service-areas-grid">
        {PRIMARY_SERVICE_AREAS.map((area) => (
          <span key={area} className="service-area-chip">
            {area}
          </span>
        ))}
      </div>
    ),
  }
);

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
              <p className="hero-eyebrow">Cleaner bins. Cleaner communities.</p>
              <h1 className="hero-headline">Professional Trash Can Cleaning in South Metro Atlanta</h1>
              <p className="hero-subheadline">
                Bin Blast Co. cleans, sanitizes, and deodorizes residential and commercial trash bins throughout Fayetteville, Peachtree City, Tyrone, Newnan, and surrounding communities.
              </p>
              <p className="hero-service-areas">{METRO_ATLANTA_TAGLINE}</p>
              <div className="hero-buttons">
                <Link href="#pricing" className="btn btn-primary btn-large">Book a Cleaning</Link>
                <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large">
                  Commercial Services
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section id="environment" className="environment-section">
          <div className="container">
            <h2 className="section-title">A Cleaner, Fresher Trash Bin Without the Hassle</h2>
            <p className="section-subtitle environment-section__subtitle">
              Every cleaned bin means less odor, bacteria, and buildup at the curb — helping Metro Atlanta neighborhoods stay fresher and more sanitary.
            </p>
            <div className="environment-grid">
              <div className="environment-card">
                <h3>Deep Clean &amp; Sanitize</h3>
                <p>High-pressure cleaning removes grime, residue, and bacteria that attract pests and create strong odors.</p>
              </div>
              <div className="environment-card">
                <h3>Eco-Conscious Process</h3>
                <p>We use a professional cleaning process designed to be safe for families, pets, and the environment.</p>
              </div>
              <div className="environment-card">
                <h3>Healthier Curbsides</h3>
                <p>Regular service keeps residential, HOA, and commercial bins fresh instead of letting waste residue build up.</p>
              </div>
              <div className="environment-card">
                <h3>Local Metro Atlanta Service</h3>
                <p>Based in Fayette County and expanding routes to help more communities stay clean year-round.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Service Areas Section */}
        <section id="service-areas" className="service-areas-section">
          <div className="container">
            <h2 className="section-title">Areas We Serve</h2>
            <p className="section-subtitle service-areas-subtitle">
              We are based in Fayette County and continue to expand our residential and commercial service routes throughout Metro Atlanta.
            </p>
            <MetroAtlantaServiceAreas />
          </div>
        </section>

        <section id="hoa-services" className="environment-section" style={{ background: "#ffffff", borderBottom: "1px solid #e5e7eb" }}>
          <div className="container" style={{ maxWidth: "860px", textAlign: "center" }}>
            <h2 className="section-title">HOA and Neighborhood Bin Cleaning</h2>
            <p className="section-subtitle environment-section__subtitle">
              Give boards and residents a professional option for neighborhood trash can cleaning, bin sanitizing, and recurring curbside service.
            </p>
            <Link href="/hoa-trash-can-cleaning" className="btn btn-primary btn-large">
              Learn About HOA Bin Cleaning
            </Link>
          </div>
        </section>

        <HomeServiceLinks />

        <WhoWeServeSection />

        <CommercialServicesSection />

        {/* Why Bin Blast Co. Is Different Section */}
        <section id="why-different" className="benefits" style={{ padding: "clamp(3rem, 8vw, 5rem) 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title">Why Customers Choose Bin Blast Co.</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "clamp(2rem, 5vw, 3rem)", color: "var(--text-light)", fontSize: "clamp(0.95rem, 3vw, 1.125rem)" }}>
              More than a cleaning truck. Customers get a modern Metro Atlanta trash bin cleaning experience with smart scheduling, loyalty rewards, and easy account management.
            </p>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap",
              gap: "clamp(1rem, 3vw, 1.5rem)",
              justifyContent: "center",
              maxWidth: "1200px",
              margin: "0 auto",
              padding: "0 clamp(1rem, 3vw, 1.5rem)"
            }}>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "clamp(12px, 3vw, 16px)", 
                padding: "clamp(1.5rem, 4vw, 2rem)", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "min(280px, 100%)",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Personalized Customer Dashboard
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>
                  Customers can manage their plan, track upcoming cleanings, view payments, and update details from a clean, easy-to-use dashboard.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "clamp(12px, 3vw, 16px)", 
                padding: "clamp(1.5rem, 4vw, 2rem)", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "min(280px, 100%)",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Smart Scheduling
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>
                  Pick your trash day, add special instructions, and let our system handle the rest so you never forget a cleaning.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "clamp(12px, 3vw, 16px)", 
                padding: "clamp(1.5rem, 4vw, 2rem)", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "min(280px, 100%)",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Loyalty Rewards
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>
                  Earn loyalty levels as your bins are cleaned. Unlock perks, track your progress, and get rewarded for staying fresh.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "clamp(12px, 3vw, 16px)", 
                padding: "clamp(1.5rem, 4vw, 2rem)", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "min(280px, 100%)",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Referral Program
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>
                  Share your link with friends and neighbors. When they sign up, both of you receive credits toward your next cleaning.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "clamp(12px, 3vw, 16px)", 
                padding: "clamp(1.5rem, 4vw, 2rem)", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "min(280px, 100%)",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "clamp(1.125rem, 4vw, 1.25rem)", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Built-In AI Assistant
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6", fontSize: "clamp(0.9rem, 3vw, 0.95rem)" }}>
                  Get instant answers about pricing, scheduling, our process, and the partner program through the chat assistant built into the site.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="how-it-works">
          <div className="container">
            <h2 className="section-title">How Bin Blast Co. Works</h2>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <h3 className="step-title">Book Your Service</h3>
                <p className="step-description">Choose a plan, pick your trash day, and schedule online in under two minutes.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3 className="step-title">We Clean Your Bins</h3>
                <p className="step-description">Our professional team arrives with specialized equipment to deep clean, sanitize, and deodorize your bins curbside.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3 className="step-title">Enjoy Clean Bins</h3>
                <p className="step-description">Your bins stay fresh, odor-free, and ready to use. For subscribers, we return automatically on your schedule.</p>
              </div>
            </div>
          </div>
        </section>

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

        {/* Your Bin Blast Dashboard Section */}
        <section id="dashboard" className="account-section" style={{ padding: "clamp(3rem, 8vw, 5rem) 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title" style={{ textAlign: "center" }}>Your Bin Blast Dashboards</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "clamp(1.75rem, 5vw, 3rem)" }}>
              Every account includes access to a modern online dashboard. Customers manage cleanings and referrals. Partners track bookings and payouts.
            </p>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.5rem",
              maxWidth: "1200px",
              margin: "0 auto"
            }} className="dashboard-grid">
              {/* Card 1: Plan Overview */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Plan Overview
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  See your current plan, billing status, and upcoming cleanings at a glance.
                </p>
              </div>

              {/* Card 2: Schedule Cleanings Anytime */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Schedule Cleanings Anytime
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  Choose your trash day, confirm your address, and add special instructions for our team.
                </p>
              </div>

              {/* Card 3: Loyalty Levels */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Loyalty Levels
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  Track your progress from Level 1 up as you complete more cleanings.
                </p>
              </div>

              {/* Card 4: Referral Rewards */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Referral Rewards
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  Access your referral link, see how many sign-ups you've driven, and view upcoming credits.
                </p>
              </div>

              {/* Card 5: Cleaning History */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Cleaning History
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  Review past and upcoming appointments so you always know when we were there.
                </p>
          </div>

              {/* Card 6: 24/7 AI Chat Support */}
              <div className="dashboard-preview-card" style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  24/7 AI Chat Support
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem", lineHeight: "1.6", margin: 0 }}>
                  Ask questions, get help with booking, and learn more about customer or partner features directly from the assistant.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* What We Clean Section */}
        <section id="services" className="service-section water-splash">
          <div className="container">
            <h2 className="section-title">What We Clean</h2>
            <p className="section-subtitle">
              Bin Blast Co. provides professional curbside cleaning for residential, commercial, and multi-unit properties. If it rolls to the curb, we can clean it.
            </p>
            <div className="service-grid">
              <div className="service-card">
                <h3>Residential Bins</h3>
                <p>Single-family homes, townhomes, and yard bins cleaned right at the curb.</p>
              </div>
              <div className="service-card">
                <h3>Commercial Bins</h3>
                <p>Perfect for businesses, restaurants, schools, offices, and small facilities.</p>
              </div>
              <div className="service-card">
                <h3>Apartments & HOAs</h3>
                <p>Shared bins and community containers for apartments, HOAs, and neighborhoods.</p>
              </div>
              <div className="service-card">
                <h3>Recycling & Specialty Bins</h3>
                <p>Recycling, yard waste, and other specialty bins that need a deep clean.</p>
              </div>
            </div>
            <p className="contact-note">
              Not sure if we clean your bin type? <Link href="#pricing">Contact us or book a one-time clean</Link> — we likely do!
            </p>
          </div>
        </section>

        {/* Testimonials Section */}
        <section id="testimonials" className="testimonials-section">
          <div className="container">
            <h2 className="section-title">Customer Reviews</h2>
            <p className="section-subtitle">What our customers are saying about Bin Blast Co.</p>
            <div className="testimonials-grid">
              <div className="testimonial-card">
                <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#f59e0b", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                  5 STARS
                </div>
                <p className="testimonial-text">&quot;My bins have NEVER smelled this good.&quot;</p>
                <p className="testimonial-name">— Jordan P.</p>
              </div>
              <div className="testimonial-card">
                <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#f59e0b", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                  5 STARS
                </div>
                <p className="testimonial-text">&quot;Best $65/mo I&apos;ve spent. Zero smells now.&quot;</p>
                <p className="testimonial-name">— Ashley M.</p>
              </div>
              <div className="testimonial-card">
                <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#f59e0b", marginBottom: "1rem", letterSpacing: "0.05em" }}>
                  5 STARS
                </div>
                <p className="testimonial-text">&quot;Didn&apos;t know I needed this until I got it.&quot;</p>
                <p className="testimonial-name">— Marcus D.</p>
              </div>
            </div>
            <Link href="#faq" className="reviews-button">Read More Reviews</Link>
          </div>
        </section>

        <HomeCityLinks />

        <FAQSection />

        {/* CTA Box Section */}
        <section className="cta-box">
          <div className="cta-content">
            <h2 className="cta-title">Schedule Your Trash Can Cleaning</h2>
            <p className="cta-sub">
              Book residential curbside trash can cleaning or request a commercial quote for restaurants, HOAs, apartments, and properties throughout Metro Atlanta.
            </p>
            <div className="marketing-cta-actions" style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
              <Link href="#pricing" className="btn btn-primary btn-large">
                Get My Cleaning Plan
              </Link>
              <Link href="/?openQuote=commercial#pricing" className="btn btn-secondary btn-large" style={{ background: "transparent", border: "2px solid #ffffff", color: "#ffffff" }}>
                Request a Commercial Quote
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="book-now" className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-cta">
                <div className="footer-brand-logo">
                  <BrandLogo variant="footer" tone="dark" href="/" />
                </div>
                <h2 className="footer-title">Ready to Get Started?</h2>
                <p className="footer-description">Book your bin cleaning service today and experience the difference of professionally cleaned bins!</p>
                <Link href="#pricing" className="btn btn-primary btn-large">Book Your Cleaning Now</Link>
              </div>
              <div className="footer-info">
                <div className="footer-section">
                  <h3 className="footer-heading">Contact Us</h3>
                  <p>Phone: <a href="tel:+14703050823" style={{ color: "inherit", textDecoration: "none" }}>(470) 305-0823</a></p>
                  <p>Email: support@binblastco.com</p>
                </div>
                <div className="footer-section">
                  <h3 className="footer-heading">Hours</h3>
                  {BUSINESS_HOURS_LINES.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
                <div className="footer-section">
                  <h3 className="footer-heading">Service Areas</h3>
                  <p style={{ marginBottom: "0.75rem", lineHeight: 1.6 }}>
                    Based in Fayette County — serving Metro Atlanta
                  </p>
                  <div className="footer-service-areas">
                    {PRIMARY_SERVICE_AREAS.map((area) => (
                      <span key={area} className="footer-service-area-chip">{area}</span>
                    ))}
                  </div>
                </div>
                <div className="footer-section">
                  <h3 className="footer-heading">Careers</h3>
                  <p><Link href="/careers" style={{ color: "inherit", textDecoration: "none" }}>Join Our Team</Link></p>
                  <p><Link href="/employee/register" style={{ color: "inherit", textDecoration: "none" }}>Apply to Become a Bin Blaster</Link></p>
                  <p><Link href="/employee" style={{ color: "inherit", textDecoration: "none" }}>Employee Sign In</Link></p>
                </div>
                <div className="footer-section">
                  <h3 className="footer-heading">For Businesses</h3>
                  <p><Link href="/partners" style={{ color: "inherit", textDecoration: "none" }}>Partner Program</Link></p>
                  <p><Link href="/partners/apply" style={{ color: "inherit", textDecoration: "none" }}>Apply to Partner</Link></p>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; 2024 Bin Blast Co. All rights reserved.</p>
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
