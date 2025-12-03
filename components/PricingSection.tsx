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
      <section id="pricing" className="py-16 bg-slate-50">

      <div className="max-w-6xl mx-auto px-4">

        <div className="text-center mb-10">

          <h2 className="text-3xl md:text-4xl font-bold mb-3">

            Simple, Profitable Pricing That Scales

          </h2>

          <p className="text-sm md:text-base text-slate-600 max-w-2xl mx-auto">

            Bin Blast Co. keeps bins fresh and routes profitable with clear,

            subscription-based pricing designed to grow from Peachtree City to a

            statewide franchise.

          </p>

        </div>



        <div className="grid gap-6 md:grid-cols-4">

          {PLANS.map((plan) => (

            <div

              key={plan.id}

              className={`flex flex-col rounded-2xl border bg-white shadow-sm p-5 ${

                plan.highlight

                  ? "border-blue-600 shadow-md ring-2 ring-blue-100"

                  : "border-slate-200"

              }`}

            >

              {plan.highlight && (

                <div className="inline-flex self-start px-3 py-1 mb-3 rounded-full bg-blue-50 text-xs font-semibold text-blue-700">

                  Most Popular

                </div>

              )}



              {plan.includesBags && (

                <div className="inline-flex self-start px-3 py-1 mb-3 rounded-full bg-emerald-50 text-xs font-semibold text-emerald-700">

                  Includes {plan.bagsPerCycle} Fresh Bags

                </div>

              )}



              <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>

              <div className="flex items-baseline gap-1 mb-1">

                <span className="text-3xl font-bold">

                  {plan.priceRange ? plan.priceRange : `$${plan.price}`}

                </span>

                <span className="text-sm text-slate-500">

                  {plan.priceSuffix}

                </span>

              </div>

              <div className="text-xs font-medium text-blue-600 mb-3">

                {plan.frequencyLabel}

              </div>



              <p className="text-sm text-slate-600 mb-3 flex-1">

                {plan.description}

              </p>



              {plan.note && (

                <p className="text-xs text-slate-500 mb-4">

                  {plan.note}

                </p>

              )}



              <button

                onClick={() => handlePlanClick(plan.id)}

                className={`mt-auto inline-flex items-center justify-center w-full text-sm font-medium px-4 py-2.5 rounded-lg transition ${

                  plan.highlight

                    ? "bg-blue-600 text-white hover:bg-blue-700"

                    : "bg-slate-900 text-white hover:bg-slate-800"

                }`}

              >

                Get Started

              </button>

            </div>

          ))}

        </div>



        <p className="text-xs text-slate-500 text-center mt-6 max-w-3xl mx-auto">

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

