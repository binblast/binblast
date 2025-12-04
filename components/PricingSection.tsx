// components/PricingSection.tsx
"use client";

import React, { useState } from "react";
import { SignupFormModal } from "./SignupFormModal";



type PlanId = "one-time" | "twice-month" | "commercial";

type PricingPlan = {
  id: PlanId;
  name: string;
  price: number | string; // Can be number or "Custom Quote"
  priceSuffix?: "/clean" | "/month";
  highlight?: boolean;
  binInfo: string; // e.g. "FOR UP TO 2 BINS"
  additionalInfo?: string; // e.g. "Additional bins: +$10 each"
  features: string[]; // Array of feature strings
  buttonText: string;
};

const PLANS: PricingPlan[] = [
  {
    id: "one-time",
    name: "One-Time Blast",
    price: 35,
    priceSuffix: "/clean",
    binInfo: "FOR UP TO 2 BINS",
    additionalInfo: "Additional bins: +$10 each",
    features: [
      "Deep clean, sanitize, and deodorize",
      "Ideal for first-time or seasonal cleanings",
      "Great before move-ins or events"
    ],
    buttonText: "Book One-Time Clean"
  },
  {
    id: "twice-month",
    name: "Bi-Weekly Clean (2x/Month)",
    price: 65,
    priceSuffix: "/month",
    highlight: true,
    binInfo: "FOR UP TO 2 BINS",
    additionalInfo: "Additional bins: +$10 each",
    features: [
      "Automatic cleaning every 2 weeks",
      "Eliminates odor, bacteria, and build-up",
      "Perfect for busy households and families"
    ],
    buttonText: "Start Bi-Weekly Plan"
  },
  {
    id: "commercial",
    name: "Commercial & HOA Plans",
    price: "Custom Quote",
    binInfo: "BUILT FOR MULTI-BIN PROPERTIES",
    features: [
      "Apartments & community bins",
      "HOAs & neighborhood partnerships",
      "Restaurants & commercial properties",
      "Bulk pricing & flexible schedules"
    ],
    buttonText: "Schedule Consultation"
  }
];



export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlanClick = (planId: PlanId) => {
    if (planId === "commercial") {
      // For commercial plans, scroll to contact or handle differently
      const contactSection = document.getElementById("contact") || document.getElementById("faq");
      if (contactSection) {
        const offsetTop = contactSection.offsetTop - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth'
        });
      }
      return;
    }
    setSelectedPlan(planId as "one-time" | "twice-month");
    setIsModalOpen(true);
  };

  return (
    <>
      <section id="pricing" className="pricing-section">

      <div className="container">

        <h2 className="section-title">Plans & Pricing</h2>

        <p className="section-subtitle">

          Bin Blast Co. keeps bins fresh and routes profitable with clear,

          subscription-based pricing designed to grow from Peachtree City to a

          statewide franchise.

        </p>



        <div className="pricing-grid">

          {PLANS.map((plan) => (

            <button

              key={plan.id}

              onClick={() => handlePlanClick(plan.id)}

              className={`pricing-card card-link ${plan.highlight ? 'popular' : ''}`}

            >

              {plan.highlight && (

                <div className="popular-badge">Most Popular</div>

              )}



              <h3 className="plan-name">{plan.name}</h3>

              <p className={`price-big ${typeof plan.price === 'string' ? 'custom' : ''}`}>

                {typeof plan.price === 'number' ? `$${plan.price}` : plan.price}

                {plan.priceSuffix && typeof plan.price === 'number' && <span className="price-small">{plan.priceSuffix}</span>}

              </p>

              <p className="price-sub" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: "0.8rem", fontWeight: "600", color: "#6b7280", marginTop: "0.4rem", marginBottom: "0.1rem" }}>

                {plan.binInfo}

              </p>

              {plan.additionalInfo && (

                <p className="price-extra">{plan.additionalInfo}</p>

              )}



              <ul className="pricing-list">

                {plan.features.map((feature, index) => (

                  <li key={index}>{feature}</li>

                ))}

              </ul>



              <div className={`card-cta ${plan.highlight ? 'primary' : ''}`}>{plan.buttonText}</div>

            </button>

          ))}

        </div>



        <p style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center", marginTop: "2rem", maxWidth: "900px", marginLeft: "auto", marginRight: "auto" }}>

          All plans include eco-friendly, high-pressure cleaning, disinfecting,

          and deodorizing. Extra bins are always just +$10/bin so your pricing

          stays simple and profitable as you scale routes and add more

          households per street.

        </p>

      </div>

    </section>

      <SignupFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedPlan={selectedPlan as "one-time" | "twice-month" | undefined}
      />
    </>

  );

}

