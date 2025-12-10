// app/page.tsx

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import Link from "next/link";

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
            <h1 className="hero-headline">Sparkling Clean Bins, Every Time</h1>
            <p className="hero-subheadline">
              Professional curbside trash bin cleaning that eliminates odors, kills bacteria, and keeps your home fresh. Plus, manage everything through your own online dashboard.
            </p>
            <div className="hero-buttons">
              <Link href="#pricing" className="btn btn-primary btn-large">Book Now</Link>
              <Link href="#why-different" className="btn btn-secondary btn-large">Explore Features</Link>
            </div>
          </div>
        </section>

        {/* Why Bin Blast Co. Is Different Section */}
        <section id="why-different" className="benefits" style={{ padding: "5rem 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title">Why Bin Blast Co. Is Different</h2>
            <p className="section-subtitle" style={{ textAlign: "center", marginBottom: "3rem", color: "var(--text-light)", fontSize: "1.125rem" }}>
              More than a cleaning service. Your bins stay fresh, and you get a modern customer experience to match.
            </p>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
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
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Personalized Customer Dashboard
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Manage your plan, view your payment status, and update your details from a clean, easy-to-use dashboard.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
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
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Loyalty Rewards
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Earn loyalty levels as you complete cleanings. Unlock perks and track your progress over time.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Referral Program
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Share your unique link. When friends sign up, both of you receive discounts on your next cleaning.
                </p>
              </div>
              <div className="benefit-card" style={{ 
                background: "#ffffff", 
                borderRadius: "16px", 
                padding: "2rem", 
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                transition: "transform 0.2s, box-shadow 0.2s"
              }}>
                <h3 className="benefit-title" style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                  Built-In AI Assistant
                </h3>
                <p className="benefit-description" style={{ color: "var(--text-light)", lineHeight: "1.6" }}>
                  Get instant answers about pricing, scheduling, and our process through a chat assistant available right on the site.
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
                <p className="step-description">Schedule your bin cleaning appointment online. Choose a plan and trash day that works for you.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3 className="step-title">We Clean Your Bins</h3>
                <p className="step-description">Our professional team arrives with specialized equipment to thoroughly clean, sanitize, and deodorize your bins.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3 className="step-title">Enjoy Clean Bins</h3>
                <p className="step-description">Your bins are left fresh, odor-free, and ready to use. For subscribers, we return automatically on your schedule.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Plans & Pricing Section */}
        <section id="pricing" style={{ padding: "5rem 0", background: "#ffffff" }}>
          <div className="container">
            <h2 className="section-title">Plans & Pricing</h2>
            <p style={{ 
              textAlign: "center", 
              marginBottom: "3rem", 
              color: "var(--text-light)", 
              fontSize: "1.125rem",
              maxWidth: "800px",
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              Every plan includes full access to your Bin Blast Co. dashboard, smart scheduling tools, loyalty rewards, and referral credits.
            </p>
            <PricingSection />
          </div>
        </section>

        {/* Your Bin Blast Dashboard Section */}
        <section id="dashboard" className="account-section" style={{ padding: "5rem 0", background: "#f9fafb" }}>
          <div className="container">
            <h2 className="section-title">Your Bin Blast Dashboard</h2>
            <p className="section-subtitle">
              When you sign up, you get access to a modern online dashboard that makes managing your service simple.
            </p>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", 
              gap: "3rem",
              alignItems: "center",
              marginTop: "3rem"
            }}>
              {/* Left side - Dashboard mockup */}
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb",
                minHeight: "400px",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}>
                {/* Mock dashboard cards */}
                <div style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <div style={{ height: "12px", background: "#d1d5db", borderRadius: "6px", width: "60%", marginBottom: "0.75rem" }}></div>
                  <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", width: "80%" }}></div>
                </div>
                <div style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <div style={{ height: "12px", background: "#d1d5db", borderRadius: "6px", width: "70%", marginBottom: "0.75rem" }}></div>
                  <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", width: "90%", marginBottom: "0.5rem" }}></div>
                  <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", width: "75%" }}></div>
                </div>
                <div style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <div style={{ height: "12px", background: "#d1d5db", borderRadius: "6px", width: "65%", marginBottom: "0.75rem" }}></div>
                  <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "4px", width: "85%" }}></div>
                </div>
              </div>

              {/* Right side - Feature list */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Plan Overview
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    See your current plan, billing status, and upcoming cleanings at a glance.
                  </p>
                </div>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Schedule Cleanings Anytime
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    Choose your trash day, confirm your address, and add special instructions for our team.
                  </p>
                </div>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Loyalty Levels
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    Track your progress from Level 1 up as you complete more cleanings.
                  </p>
                </div>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Referral Rewards
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    Access your referral link, track how many referrals you have, and see upcoming credits.
                  </p>
                </div>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Cleaning History
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    Review past and upcoming appointments so you always know when we were there.
                  </p>
                </div>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    24/7 AI Chat Support
                  </h3>
                  <p style={{ color: "var(--text-light)", fontSize: "0.95rem", margin: 0 }}>
                    Ask questions, get help with booking, and learn more about our services directly from the assistant.
                  </p>
                </div>
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
            <h2 className="cta-title">Ready for Fresh, Odor-Free Bins Every Month?</h2>
            <p className="cta-sub">
              Join one of our recurring plans and let us handle the dirty work. You get professionally cleaned bins on a regular schedule plus full access to your Bin Blast Co. customer dashboard.
            </p>
            <p className="cta-detail">Only $65 / month — up to 2 bins</p>
            <p className="cta-detail">Additional bins: +$10 each</p>
            <p className="cta-detail">Cancel anytime, no long-term contracts</p>
            <Link href="#pricing" className="cta-btn">
              Get My Plan
            </Link>
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
