// app/page.tsx

import { Navbar } from "@/components/Navbar";
import { BusinessOverviewSection } from "@/components/BusinessOverviewSection";
import { PricingSection } from "@/components/PricingSection";
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

        <BusinessOverviewSection />
        <PricingSection />
      </main>
    </>
  );
}


