// app/page.tsx

import { BusinessOverviewSection } from "@/components/BusinessOverviewSection";

import { PricingSection } from "@/components/PricingSection";



export default function HomePage() {

  return (

    <main className="bg-white">

      {/* Simple hero placeholder – can customize later */}

      <section className="py-16 bg-slate-900 text-white">

        <div className="max-w-5xl mx-auto px-4">

          <h1 className="text-3xl md:text-5xl font-bold mb-4">

            Sparkling Clean Bins, Smarter Routes.

          </h1>

          <p className="text-sm md:text-base text-slate-200 mb-6 max-w-2xl">

            Bin Blast Co. is launching January 1, 2026 in Peachtree City and

            Fayetteville—bringing eco-friendly trash can cleaning and

            subscription-based freshness to Fayette County and beyond.

          </p>

          <a

            href="/signup"

            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-blue-500 text-sm font-medium hover:bg-blue-600"

          >

            Get Started Today

          </a>

        </div>

      </section>



      <BusinessOverviewSection />

      <PricingSection />

    </main>

  );

}


