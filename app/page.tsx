// app/page.tsx

import dynamic from "next/dynamic";
import { Suspense } from "react";
import Link from "next/link";

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

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* Hero Section with Background Image */}
        <section id="home" className="hero">
          <div className="container">
            <h1 className="hero-headline">Sparkling Clean Bins. Simple for You. Profitable for Partners.</h1>
            <p className="hero-subheadline">
              Homeowners get fresh, odor-free bins on autopilot. Local service businesses plug into our system to add bin cleaning as a new, done-for-you revenue stream.
            </p>
            <div className="hero-buttons">
              <Link href="#pricing" className="btn btn-primary btn-large">Book a Cleaning</Link>
              <Link href="#why-different" className="btn btn-secondary btn-large">Explore Features</Link>
            </div>
          </div>
        </section>

        {/* Why Bin Blast Co. Is Different Section */}
        <section id="why-different" className="benefits" style={{ padding: "5rem 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title">The Bin Blast Co. Advantage</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "3rem", color: "var(--text-light)", fontSize: "1.125rem" }}>
              More than a cleaning truck. We give customers a modern experience and partners a simple way to add recurring revenue.
            </p>
            <div style={{ 
              display: "flex", 
              flexWrap: "wrap",
              gap: "1.5rem",
              justifyContent: "center",
              maxWidth: "1200px",
              margin: "0 auto"
            }}>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "280px",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Personalized Customer Dashboard
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Customers can manage their plan, track upcoming cleanings, view payments, and update details from a clean, easy-to-use dashboard.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "280px",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Smart Scheduling
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Pick your trash day, add special instructions, and let our system handle the rest so you never forget a cleaning.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "280px",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Loyalty Rewards
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Earn loyalty levels as your bins are cleaned. Unlock perks, track your progress, and get rewarded for staying fresh.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "280px",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Referral Program
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Share your link with friends and neighbors. When they sign up, both of you receive credits toward your next cleaning.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s",
                flex: "0 1 calc(33.333% - 1rem)",
                minWidth: "280px",
                maxWidth: "350px"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Built-In AI Assistant
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Get instant answers about pricing, scheduling, our process, and the partner program through the chat assistant built into the site.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="how-it-works">
          <div className="container">
            <h2 className="section-title">How It Works</h2>
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
        <section id="partners" style={{ padding: "5rem 0", background: "#f0f9ff", borderTop: "2px solid #bae6fd" }}>
          <div className="container">
            <h2 className="section-title" style={{ textAlign: "center" }}>Partner With Bin Blast Co.</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "3rem", color: "var(--text-light)", fontSize: "1.125rem" }}>
              Service businesses plug into our system to offer bin cleaning without buying trucks, software, or building a brand from scratch.
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2rem",
              maxWidth: "1200px",
              margin: "0 auto",
              marginBottom: "3rem"
            }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                  60% Revenue Share
                </h3>
                <p style={{ color: "var(--text-light)", lineHeight: "1.6", marginBottom: "1rem" }}>
                  Earn 60% of every booking that comes through your unique partner link. No upfront costs, no monthly fees, no contracts. Example: $35 booking = $21 to you.
                </p>
              </div>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                  Your Own Booking Link
                </h3>
                <p style={{ color: "var(--text-light)", lineHeight: "1.6", marginBottom: "1rem" }}>
                  Get a unique booking link branded with Bin Blast Co. and tied to your account. Share it by text, email, social media, or from your website.
                </p>
              </div>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                  Partner Dashboard
                </h3>
                <p style={{ color: "var(--text-light)", lineHeight: "1.6", marginBottom: "1rem" }}>
                  Track bookings, view earnings, and monitor performance in a dedicated partner dashboard with real-time reporting.
                </p>
              </div>
            </div>
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "3rem",
              border: "2px solid #bae6fd",
              maxWidth: "900px",
              margin: "0 auto",
              textAlign: "center"
            }}>
              <h3 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                Perfect For Service Businesses
              </h3>
              <p style={{ fontSize: "1.125rem", color: "#0c4a6e", marginBottom: "2rem", lineHeight: "1.6" }}>
                Car detailers, pressure washers, landscapers, property managers, HVAC companies, and other service pros can easily add curbside bin cleaning as an upsell or standalone service.
              </p>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                justifyContent: "center",
                marginBottom: "2rem"
              }}>
                {["Car Detailers", "Pressure Washers", "Landscapers", "Property Managers", "HVAC Companies", "Other Service Businesses"].map((business) => (
                  <span key={business} style={{
                    padding: "0.5rem 1rem",
                    background: "#f0f9ff",
                    borderRadius: "8px",
                    color: "#0369a1",
                    fontSize: "0.875rem",
                    fontWeight: "600"
                  }}>
                    {business}
                  </span>
                ))}
              </div>
              <Link 
                href="/partners/apply" 
                className="btn btn-primary"
                style={{
                  display: "inline-block",
                  padding: "0.75rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                Apply to Become a Partner
              </Link>
              <p style={{ fontSize: "0.875rem", color: "#0c4a6e", marginTop: "1rem", margin: 0 }}>
                We'll review your application and help you plug into our system step by step.
              </p>
            </div>
          </div>
        </section>

        {/* Your Bin Blast Dashboard Section */}
        <section id="dashboard" className="account-section" style={{ padding: "5rem 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title" style={{ textAlign: "center" }}>Your Bin Blast Dashboards</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "3rem" }}>
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
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

        <FAQSection />

        {/* CTA Box Section */}
        <section className="cta-box">
          <div className="cta-content">
            <h2 className="cta-title">Ready for Fresh Bins or a New Revenue Stream?</h2>
            <p className="cta-sub">
              Homeowners can join a recurring plan and let us handle the dirty work. Service businesses can plug into our partner program to add bin cleaning to their offerings with no extra overhead.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginTop: "2rem" }}>
              <Link href="#pricing" className="btn btn-primary btn-large">
                Get My Cleaning Plan
              </Link>
              <Link href="/partners/apply" className="btn btn-secondary btn-large" style={{ background: "transparent", border: "2px solid #ffffff", color: "#ffffff" }}>
                Apply to Become a Partner
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer id="book-now" className="footer">
          <div className="container">
            <div className="footer-content">
              <div className="footer-cta">
                <div className="footer-logo">BIN BLAST CO.</div>
                <h2 className="footer-title">Ready to Get Started?</h2>
                <p className="footer-description">Book your bin cleaning service today and experience the difference of professionally cleaned bins!</p>
                <Link href="#pricing" className="btn btn-primary btn-large">Book Your Cleaning Now</Link>
              </div>
              <div className="footer-info">
                <div className="footer-section">
                  <h3 className="footer-heading">Contact Us</h3>
                  <p>Phone: (555) 123-4567</p>
                  <p>Email: info@binblastco.com</p>
                </div>
                <div className="footer-section">
                  <h3 className="footer-heading">Hours</h3>
                  <p>Monday - Friday: 8am - 6pm</p>
                  <p>Saturday: 9am - 4pm</p>
                  <p>Sunday: Closed</p>
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
            </div>
          </div>
        </footer>
      </main>
      <ChatWidget />
    </>
  );
}
