// components/BusinessOverviewSection.tsx
import React from "react";

export function BusinessOverviewSection() {
  return (
    <section id="about" className="py-16 bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Bin Blast Co. – Clean Bins. Clean Routes. Clean Growth.
        </h2>
        <p className="text-sm md:text-base text-slate-600 mb-4">
          Bin Blast Co. is a Georgia-based residential and commercial trash can
          cleaning company launching January 1, 2026, starting in the Peachtree
          City and Fayetteville areas of Fayette County. We operate as an LLC,
          with plans to elect S-Corp status once annual profits exceed $70,000,
          keeping the business tax-efficient as we scale.
        </p>
        <p className="text-sm md:text-base text-slate-600 mb-4">
          Our mission is simple: keep your trash bins and dumpsters{" "}
          <span className="font-semibold">sanitized, deodorized, and
          hassle-free</span> using eco-friendly methods and smart routing. Our
          custom-built Next.js platform handles customer onboarding, address
          lookup, trash-day detection, subscription management, and future route
          scheduling automation—so customers get a smooth experience and our
          routes stay profitable.
        </p>
        <p className="text-sm md:text-base text-slate-600 mb-4">
          We organize service by <span className="font-semibold">county
          zones</span> to align cleaning days with local trash pickup schedules.
          This lets us stack homes on the same streets, reduce drive time, and
          protect profit on every route—from our first homes in Fayette County
          to future expansion across Georgia.
        </p>
        <p className="text-sm md:text-base text-slate-600 mb-4">
          Bin Blast Co. starts with residential customers and will expand into
          commercial dumpster cleaning, pressure washing add-ons, and HOA
          contracts as we grow. Over time, we&apos;ll add branded cleaning
          vehicles and build a franchise-ready model that can roll out to new
          cities and regions.
        </p>
        <p className="text-sm md:text-base text-slate-600">
          In the launch phase, employees use their own vehicles while Bin Blast
          Co. provides all cleaning equipment, chemicals, and training. With
          transparent pricing, automated systems, and scalable routes, Bin Blast
          Co. is built to grow into a <span className="font-semibold">
          million-dollar trash can cleaning brand</span>.
        </p>
      </div>
    </section>
  );
}
