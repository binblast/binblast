// components/TrashOnboardingWizard.tsx
"use client";
import React, { useState } from "react";

type PlanId = "basic" | "standard" | "premium";

type Plan = {
  id: PlanId;
  name: string;
  pricePerClean: number;
  frequencyLabel: string; // e.g. "Monthly", "Bi-Weekly"
  description: string;
};

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic Clean",
    pricePerClean: 25,
    frequencyLabel: "Monthly",
    description: "1 bin cleaned once per month.",
  },
  {
    id: "standard",
    name: "Standard Shine",
    pricePerClean: 40,
    frequencyLabel: "Bi-Weekly",
    description: "Up to 2 bins cleaned every other week.",
  },
  {
    id: "premium",
    name: "Premium Blast",
    pricePerClean: 60,
    frequencyLabel: "Weekly",
    description: "Up to 3 bins cleaned every week.",
  },
];

type Step = 1 | 2 | 3 | 4 | 5;

type CustomerInfo = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

type ServiceInfo = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  trashDayOfWeek: string; // "Monday" etc.
  preferredTimeWindow: string; // e.g. "8AM–12PM"
  startDate: string; // ISO date string
};

type FormState = {
  planId: PlanId | null;
  customer: CustomerInfo;
  service: ServiceInfo;
};

const EMPTY_FORM: FormState = {
  planId: null,
  customer: {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  },
  service: {
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    trashDayOfWeek: "",
    preferredTimeWindow: "",
    startDate: "",
  },
};

export const TrashOnboardingWizard: React.FC = () => {
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedTrashDay, setSuggestedTrashDay] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const selectedPlan = PLANS.find((p) => p.id === form.planId) || null;

  const updateCustomer = (patch: Partial<CustomerInfo>) => {
    setForm((prev) => ({ ...prev, customer: { ...prev.customer, ...patch } }));
  };

  const updateService = (patch: Partial<ServiceInfo>) => {
    setForm((prev) => ({ ...prev, service: { ...prev.service, ...patch } }));
  };

  async function lookupTrashDay() {
    setLookupLoading(true);
    setLookupError(null);
    setSuggestedTrashDay(null);

    try {
      const params = new URLSearchParams({
        postalCode: form.service.postalCode,
        city: form.service.city,
        state: form.service.state,
      });

      const res = await fetch(`/api/trash-schedule/lookup?${params.toString()}`);

      if (!res.ok) {
        setLookupLoading(false);
        return;
      }

      const data = await res.json();
      if (data.defaultTrashDayOfWeek) {
        setSuggestedTrashDay(data.defaultTrashDayOfWeek);
        // also auto-fill
        updateService({ trashDayOfWeek: data.defaultTrashDayOfWeek });
      }
    } catch (err: any) {
      setLookupError("Could not fetch local trash schedule.");
    } finally {
      setLookupLoading(false);
    }
  }

  const handlePlanSelect = (planId: PlanId) => {
    setForm((prev) => ({ ...prev, planId }));
    setStep(2);
  };

  const canGoNext = () => {
    if (step === 1) return form.planId !== null;
    if (step === 2) {
      const { firstName, lastName, email, phone } = form.customer;
      return firstName && lastName && email && phone;
    }
    if (step === 3) {
      const {
        addressLine1,
        city,
        state,
        postalCode,
        trashDayOfWeek,
        preferredTimeWindow,
        startDate,
      } = form.service;
      return (
        addressLine1 &&
        city &&
        state &&
        postalCode &&
        trashDayOfWeek &&
        preferredTimeWindow &&
        startDate
      );
    }
    if (step === 4) return true;
    return false;
  };

  const handleNext = () => {
    if (!canGoNext()) return;
    setError(null);
    setStep((prev) => (prev < 5 ? ((prev + 1) as Step) : prev));
  };

  const handleBack = () => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
  };

  const handleSubmit = async () => {
    if (!selectedPlan) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          customer: form.customer,
          service: form.service,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Something went wrong.");
      }

      // Optionally handle payment redirect here if API returns Stripe URL.
      setStep(5);
    } catch (err: any) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => {
    const labels = ["Plan", "Info", "Schedule", "Review", "Done"];
    return (
      <div className="flex items-center justify-between mb-6">
        {labels.map((label, index) => {
          const current = index + 1;
          const isActive = current <= step;
          return (
            <div key={label} className="flex-1 flex items-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold ${
                  isActive ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {current}
              </div>
              {index < labels.length - 1 && (
                <div
                  className={`flex-1 h-[2px] mx-2 ${
                    current < step ? "bg-blue-600" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderPlanStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Choose your bin cleaning package
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Pick the plan that matches how often your trash gets picked up.
      </p>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => handlePlanSelect(plan.id)}
            className={`border rounded-xl p-4 text-left transition shadow-sm hover:shadow-md ${
              form.planId === plan.id
                ? "border-blue-600 ring-2 ring-blue-100"
                : "border-gray-200"
            }`}
          >
            <div className="font-semibold text-lg mb-1">{plan.name}</div>
            <div className="text-2xl font-bold mb-1">
              ${plan.pricePerClean}
              <span className="text-sm font-normal text-gray-500">
                /clean
              </span>
            </div>
            <div className="text-xs font-medium text-blue-600 mb-2">
              {plan.frequencyLabel}
            </div>
            <p className="text-sm text-gray-600">{plan.description}</p>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCustomerStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Tell us who we&apos;re cleaning for
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm mb-1">First name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.customer.firstName}
            onChange={(e) => updateCustomer({ firstName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Last name</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.customer.lastName}
            onChange={(e) => updateCustomer({ lastName: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.customer.email}
            onChange={(e) => updateCustomer({ email: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Phone</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.customer.phone}
            onChange={(e) => updateCustomer({ phone: e.target.value })}
          />
        </div>
      </div>
    </div>
  );

  const renderServiceStep = () => (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        Where and when should we clean?
      </h2>
      <div className="grid gap-4">
        <div>
          <label className="block text-sm mb-1">Street address</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.service.addressLine1}
            onChange={(e) => updateService({ addressLine1: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Apartment / Unit (optional)</label>
          <input
            className="w-full border rounded-lg px-3 py-2 text-sm"
            value={form.service.addressLine2}
            onChange={(e) => updateService({ addressLine2: e.target.value })}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">City</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.city}
              onChange={(e) => updateService({ city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">State</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.state}
              onChange={(e) => updateService({ state: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">ZIP code</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.postalCode}
              onChange={(e) => updateService({ postalCode: e.target.value })}
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Trash day</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.trashDayOfWeek}
              onChange={(e) =>
                updateService({ trashDayOfWeek: e.target.value })
              }
            >
              <option value="">Select a day</option>
              <option>Monday</option>
              <option>Tuesday</option>
              <option>Wednesday</option>
              <option>Thursday</option>
              <option>Friday</option>
            </select>
            <div className="flex items-center gap-3 mt-1">
              <button
                type="button"
                onClick={lookupTrashDay}
                disabled={lookupLoading || !form.service.postalCode}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                {lookupLoading ? "Checking area..." : "Suggest trash day for my area"}
              </button>
              {suggestedTrashDay && (
                <span className="text-xs text-green-700">
                  Suggested: {suggestedTrashDay}
                </span>
              )}
            </div>
            {lookupError && (
              <p className="text-xs text-red-600 mt-1">{lookupError}</p>
            )}
          </div>
          <div>
            <label className="block text-sm mb-1">Preferred clean time</label>
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.preferredTimeWindow}
              onChange={(e) =>
                updateService({ preferredTimeWindow: e.target.value })
              }
            >
              <option value="">Select a window</option>
              <option>6AM – 9AM</option>
              <option>9AM – 12PM</option>
              <option>12PM – 3PM</option>
              <option>3PM – 6PM</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Start date</label>
            <input
              type="date"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={form.service.startDate}
              onChange={(e) => updateService({ startDate: e.target.value })}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderReviewStep = () => {
    if (!selectedPlan) return null;

    const { customer, service } = form;

    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Review your details</h2>
        <div className="space-y-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Plan</h3>
            <p className="text-sm">
              {selectedPlan.name} – ${selectedPlan.pricePerClean} / clean (
              {selectedPlan.frequencyLabel})
            </p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Contact</h3>
            <p className="text-sm">
              {customer.firstName} {customer.lastName}
            </p>
            <p className="text-sm">{customer.email}</p>
            <p className="text-sm">{customer.phone}</p>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Service details</h3>
            <p className="text-sm">
              {service.addressLine1}
              {service.addressLine2 && `, ${service.addressLine2}`}
            </p>
            <p className="text-sm">
              {service.city}, {service.state} {service.postalCode}
            </p>
            <p className="text-sm">
              Trash day: {service.trashDayOfWeek} — Preferred time:{" "}
              {service.preferredTimeWindow}
            </p>
            <p className="text-sm">First clean: {service.startDate}</p>
          </div>

          <p className="text-xs text-gray-500">
            By continuing, you agree to Bin Blast Co.&apos;s terms of service and
            authorize recurring charges based on your plan frequency.
          </p>
        </div>
      </div>
    );
  };

  const renderSuccessStep = () => (
    <div className="text-center py-10">
      <h2 className="text-2xl font-semibold mb-2">You&apos;re all set 🎉</h2>
      <p className="text-sm text-gray-600 mb-4">
        Your bin cleaning subscription is active. We&apos;ll send a confirmation
        email with your schedule.
      </p>
      <p className="text-sm text-gray-600 mb-6">
        Next, create your login so you can see your schedule and update your
        preferences anytime.
      </p>

      <a
        href={`/register?email=${encodeURIComponent(form.customer.email)}`}
        className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
      >
        Create my account
      </a>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-lg p-6 md:p-8">
      {renderStepIndicator()}

      {step === 1 && renderPlanStep()}
      {step === 2 && renderCustomerStep()}
      {step === 3 && renderServiceStep()}
      {step === 4 && renderReviewStep()}
      {step === 5 && renderSuccessStep()}

      {error && (
        <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {step < 5 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={`text-sm px-3 py-2 rounded-lg border ${
              step === 1
                ? "text-gray-400 border-gray-200 cursor-default"
                : "text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Back
          </button>

          <button
            type="button"
            onClick={step === 4 ? handleSubmit : handleNext}
            disabled={!canGoNext() || isSubmitting}
            className={`text-sm px-5 py-2.5 rounded-lg font-medium ${
              !canGoNext() || isSubmitting
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {step === 4
              ? isSubmitting
                ? "Processing..."
                : "Confirm & Pay"
              : "Next"}
          </button>
        </div>
      )}
    </div>
  );
};

