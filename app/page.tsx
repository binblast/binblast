// app/page.tsx

import { Navbar } from "@/components/Navbar";
import { PricingSection } from "@/components/PricingSection";
import { FAQSection } from "@/components/FAQSection";
import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="bg-white">
        {/* Hero Section with Background Image */}
        <section id="home" className="hero">
          <div className="container">
            <div className="hero-logo">BIN BLAST CO.</div>
            <h1 className="hero-headline">Sparkling Clean Bins, Every Time</h1>
            <p className="hero-subheadline">
              Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free. Book your cleaning today!
            </p>
            <div className="hero-buttons">
              <Link href="#pricing" className="btn btn-primary btn-large">Book Now</Link>
              <Link href="#how-it-works" className="btn btn-secondary btn-large">Learn More</Link>
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
                <p className="step-description">Schedule your bin cleaning appointment online or by phone. Choose a time that works best for you.</p>
              </div>
              <div className="step-card">
                <div className="step-number">2</div>
                <h3 className="step-title">We Clean Your Bins</h3>
                <p className="step-description">Our professional team arrives with specialized equipment to thoroughly clean and sanitize your bins.</p>
              </div>
              <div className="step-card">
                <div className="step-number">3</div>
                <h3 className="step-title">Enjoy Clean Bins</h3>
                <p className="step-description">Your bins are left sparkling clean, sanitized, and ready to use. No more odors or bacteria!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Clean Your Bins Section */}
        <section className="benefits">
          <div className="container">
            <h2 className="section-title">Why Clean Your Bins</h2>
            <div className="benefits-grid">
              <div className="benefit-card">
                <h3 className="benefit-title">Eliminate Odors</h3>
                <p className="benefit-description">Remove unpleasant smells that can linger around your home and attract pests.</p>
              </div>
              <div className="benefit-card">
                <h3 className="benefit-title">Kill Bacteria</h3>
                <p className="benefit-description">Our sanitization process eliminates harmful bacteria and germs for a healthier environment.</p>
              </div>
              <div className="benefit-card">
                <h3 className="benefit-title">Extend Bin Life</h3>
                <p className="benefit-description">Regular cleaning helps maintain your bins and prevents premature wear and damage.</p>
              </div>
              <div className="benefit-card">
                <h3 className="benefit-title">Save Time</h3>
                <p className="benefit-description">Let the professionals handle it while you focus on what matters most to you.</p>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />

        {/* Account Section */}
        <section id="account" className="account-section">
          <div className="container">
            <h2 className="section-title">Manage Your Bin Blast Service</h2>
            <p className="section-subtitle">
              Sign up for your account to book new cleanings, see upcoming appointments, 
              update your information, and manage your plans—all in one place.
            </p>
            <div className="account-grid">
              <Link href="#pricing" className="account-card card-link">
                <h3>New to Bin Blast Co.?</h3>
                <p>
                  Get started instantly through our online portal. Choose your plan, tell us your trash day, 
                  and we&apos;ll handle the rest.
                </p>
                <ul className="account-list">
                  <li>24/7 online booking</li>
                  <li>Choose one-time or recurring plans</li>
                </ul>
              </Link>
            </div>
          </div>
        </section>

        {/* What We Clean Section */}
        <section id="services" className="service-section water-splash">
          <div className="container">
            <h2 className="section-title">What We Clean</h2>
            <p className="section-subtitle">
              Bin Blast Co. provides professional curbside cleaning for residential, commercial, and multi-unit properties.
              Whether it&apos;s a trash bin, recycling bin, or specialty container — if it rolls to the curb, we clean it.
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
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">&quot;My bins have NEVER smelled this good.&quot;</p>
                <p className="testimonial-name">— Jordan P.</p>
              </div>
              <div className="testimonial-card">
                <div className="stars">⭐⭐⭐⭐⭐</div>
                <p className="testimonial-text">&quot;Best $65/mo I&apos;ve spent. Zero smells now.&quot;</p>
                <p className="testimonial-name">— Ashley M.</p>
              </div>
              <div className="testimonial-card">
                <div className="stars">⭐⭐⭐⭐⭐</div>
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
              Join our Bi-Weekly Clean Plan and keep your bins spotless with zero hassle —
              professional cleaning, sanitizing, and deodorizing every visit.
            </p>
            <p className="cta-detail">Only $65 / month — up to 2 bins</p>
            <p className="cta-detail">Additional bins: +$10 each</p>
            <p className="cta-detail">Cancel anytime, no long-term contracts</p>
            <Link href="#pricing" className="cta-btn">
              Get My Monthly Plan
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
    </>
  );
}


