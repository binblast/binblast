// app/page.tsx

import { PricingSection } from "@/components/PricingSection";
import Link from "next/link";



export default function HomePage() {

  return (

    <main>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-teal-600 text-white py-20 md:py-32">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="text-4xl md:text-5xl font-bold mb-4 tracking-wide">
            BIN BLAST CO.
          </div>
          <h1 className="text-3xl md:text-5xl font-bold mb-6">
            Sparkling Clean Bins, Every Time
          </h1>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto text-blue-50">
            Professional trash bin cleaning service that keeps your bins fresh, sanitized, and odor-free. Book your cleaning today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#pricing"
              className="px-8 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition"
            >
              Book Now
            </Link>
            <Link
              href="#how-it-works"
              className="px-8 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Book Your Service</h3>
              <p className="text-slate-600">
                Schedule your bin cleaning appointment online or by phone. Choose a time that works best for you.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">We Clean Your Bins</h3>
              <p className="text-slate-600">
                Our professional team arrives with specialized equipment to thoroughly clean and sanitize your bins.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Enjoy Clean Bins</h3>
              <p className="text-slate-600">
                Your bins are left sparkling clean, sanitized, and ready to use. No more odors or bacteria!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Clean Your Bins Section */}
      <section className="py-16 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Clean Your Bins
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Eliminate Odors</h3>
              <p className="text-slate-600">
                Remove unpleasant smells that can linger around your home and attract pests.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Kill Bacteria</h3>
              <p className="text-slate-600">
                Our sanitization process eliminates harmful bacteria and germs for a healthier environment.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Extend Bin Life</h3>
              <p className="text-slate-600">
                Regular cleaning helps maintain your bins and prevents premature wear and damage.
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Save Time</h3>
              <p className="text-slate-600">
                Let the professionals handle it while you focus on what matters most to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <PricingSection />

    </main>

  );

}


