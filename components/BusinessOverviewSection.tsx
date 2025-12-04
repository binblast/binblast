// components/BusinessOverviewSection.tsx
import React from "react";

export function BusinessOverviewSection() {
  return (
    <section id="about" className="about-section">
      <div className="container">
        <div className="about-content">
          <h2 className="section-title about-title">
            Bin Blast Co. – Clean Bins. Clean Routes. Clean Growth.
          </h2>
          <div className="about-text">
            <p>
              Bin Blast Co. is a Georgia-based residential and commercial trash can
              cleaning company launching January 1, 2026, starting in the Peachtree
              City and Fayetteville areas of Fayette County. We operate as an LLC,
              with plans to elect S-Corp status once annual profits exceed $70,000,
              keeping the business tax-efficient as we scale.
            </p>
            <p>
              Our mission is simple: keep your trash bins and dumpsters{" "}
              <strong>sanitized, deodorized, and
              hassle-free</strong> using eco-friendly methods and smart routing. Our
              custom-built Next.js platform handles customer onboarding, address
              lookup, trash-day detection, subscription management, and future route
              scheduling automation—so customers get a smooth experience and our
              routes stay profitable.
            </p>
            <p>
              We organize service by <strong>county
              zones</strong> to align cleaning days with local trash pickup schedules.
              This lets us stack homes on the same streets, reduce drive time, and
              protect profit on every route—from our first homes in Fayette County
              to future expansion across Georgia.
            </p>
            <p>
              Bin Blast Co. starts with residential customers and will expand into
              commercial dumpster cleaning, pressure washing add-ons, and HOA
              contracts as we grow. Over time, we&apos;ll add branded cleaning
              vehicles and build a franchise-ready model that can roll out to new
              cities and regions.
            </p>
            <p>
              In the launch phase, employees use their own vehicles while Bin Blast
              Co. provides all cleaning equipment, chemicals, and training. With
              transparent pricing, automated systems, and scalable routes, Bin Blast
              Co. is built to grow into a <strong>
              million-dollar trash can cleaning brand</strong>.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
