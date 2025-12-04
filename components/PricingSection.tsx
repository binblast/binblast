// components/PricingSection.tsx
"use client";

import React, { useState } from "react";
import { SignupFormModal } from "./SignupFormModal";



type PlanId = "one-time" | "twice-month" | "bi-monthly" | "quarterly";



type PricingPlan = {

  id: PlanId;

  name: string;

  price: number;

  priceSuffix: "/clean" | "/month";

  priceRange?: string; // e.g. "$60–$65"

  highlight?: boolean;

  description: string;

  frequencyLabel: string;

  includesBags?: boolean;

  bagsPerCycle?: number;

  note?: string;

};



const PLANS: PricingPlan[] = [

  {

    id: "one-time",

    name: "One-Time Blast",

    price: 35,

    priceSuffix: "/clean",

    description: "Perfect for move-outs, deep resets, and first-time cleans.",

    frequencyLabel: "Single visit · No contract",

    note: "+$10 per extra bin",

  },

  {

    id: "twice-month",

    name: "Twice-a-Month Clean",

    price: 65,

    priceSuffix: "/month",

    highlight: true,

    description:

      "Keep your bins consistently fresh with two cleanings every month.",

    frequencyLabel: "2 cleans per month",

    note: "Base price includes 1 bin · +$10 per extra bin",

  },

  {

    id: "bi-monthly",

    name: "Bi-Monthly Clean (Every 2 Months)",

    price: 60,

    priceSuffix: "/month",

    priceRange: "$60–$65",

    description:

      "Lower-frequency service plus a bag bundle to keep odors in check.",

    frequencyLabel: "1 clean every 2 months",

    includesBags: true,

    bagsPerCycle: 10,

    note: "1 bin included · +10 FREE Fresh Bags every cycle · +$10 per additional bin",

  },

  {

    id: "quarterly",

    name: "Quarterly Clean (Every 3 Months)",

    price: 75,

    priceSuffix: "/month",

    description:

      "Seasonal deep refresh plus fresh bags so bins never get out of control.",

    frequencyLabel: "1 clean every 3 months",

    includesBags: true,

    bagsPerCycle: 10,

    note: "1 bin included · +10 FREE Fresh Bags every cycle · +$10 per additional bin",

  },

];



export function PricingSection() {
  const [selectedPlan, setSelectedPlan] = useState<PlanId | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePlanClick = (planId: PlanId) => {
    setSelectedPlan(planId);
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



              {plan.includesBags && (

                <div style={{ 

                  display: "inline-flex", 

                  alignSelf: "flex-start", 

                  padding: "0.3rem 0.7rem", 

                  marginBottom: "0.75rem", 

                  borderRadius: "999px", 

                  background: "#ecfdf5", 

                  fontSize: "0.75rem", 

                  fontWeight: "700", 

                  color: "#047857"

                }}>

                  +{plan.bagsPerCycle} Fresh Bags / cycle

                </div>

              )}



              <h3 className="plan-name">{plan.name}</h3>

              <p className={`price-big ${plan.id === "quarterly" || plan.id === "bi-monthly" ? "custom" : ""}`}>

                {plan.priceRange ? plan.priceRange : `$${plan.price}`}

                {plan.priceSuffix === "/month" && !plan.priceRange && <span className="price-small">/month</span>}

              </p>

              <p className="price-sub plan-subtext">{plan.frequencyLabel}</p>

              {plan.note && (

                <p className="price-extra">{plan.note}</p>

              )}



              <p style={{ fontSize: "0.95rem", color: "var(--text-light)", marginBottom: "1.5rem", textAlign: "left", lineHeight: "1.6" }}>

                {plan.description}

              </p>



              <div className={`card-cta ${plan.highlight ? 'primary' : ''}`}>Get Started</div>

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
        selectedPlan={selectedPlan}
      />
    </>

  );

}

