"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


import { useEffect, useMemo, useState } from "react";
import type { PlanId } from "@/lib/stripe-config";

type EditablePlan = {
  id: PlanId;
  label: string;
  priceSuffix: string;
  editable: boolean;
};

type PlanConfig = {
  id: PlanId;
  name: string;
  price: number;
  priceSuffix: string;
};

export function SubscriptionPricingSettings() {
  const [plans, setPlans] = useState<Record<string, PlanConfig>>({});
  const [editablePlans, setEditablePlans] = useState<EditablePlan[]>([]);
  const [draftPrices, setDraftPrices] = useState<Record<string, string>>({});
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPricing();
  }, []);

  async function loadPricing() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/admin/platform-pricing");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load pricing");
      }

      setPlans(data.plans || {});
      setEditablePlans(data.editablePlans || []);
      const nextDrafts: Record<string, string> = {};
      for (const item of data.editablePlans || []) {
        const plan = data.plans?.[item.id];
        if (plan && typeof plan.price === "number") {
          nextDrafts[item.id] = String(plan.price);
        }
      }
      setDraftPrices(nextDrafts);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load pricing");
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    return editablePlans.map((item) => {
      const plan = plans[item.id];
      return {
        ...item,
        price: plan?.price ?? 0,
      };
    });
  }, [editablePlans, plans]);

  async function savePlanPrice(planId: string) {
    const rawValue = draftPrices[planId];
    const parsedPrice = Number(rawValue);

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setError("Enter a valid price greater than 0.");
      return;
    }

    try {
      setSavingPlanId(planId);
      setError(null);
      setMessage(null);

      const response = await fetchWithAuth("/api/admin/platform-pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plans: {
            [planId]: { price: parsedPrice },
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save pricing");
      }

      setPlans(data.plans || {});
      setEditingPlanId(null);
      setMessage(data.message || "Pricing updated across the platform.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save pricing");
    } finally {
      setSavingPlanId(null);
    }
  }

  if (loading) {
    return <div style={{ color: "#6b7280" }}>Loading subscription pricing...</div>;
  }

  return (
    <div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
        Subscription Pricing
      </h3>
      <p style={{ color: "#6b7280", marginBottom: "1rem", lineHeight: 1.5 }}>
        These prices match your landing page and apply platform-wide for new signups, checkout, and plan displays.
      </p>

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534" }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {rows.map((item) => {
          const isEditing = editingPlanId === item.id;
          const isSaving = savingPlanId === item.id;

          return (
            <div
              key={item.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: "600", color: "#111827" }}>{item.label}</div>
                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  {item.editable ? `Billed ${item.priceSuffix}` : item.priceSuffix}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                {item.editable ? (
                  isEditing ? (
                    <>
                      <span style={{ color: "#6b7280", fontWeight: "600" }}>$</span>
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={draftPrices[item.id] ?? ""}
                        onChange={(e) =>
                          setDraftPrices((current) => ({
                            ...current,
                            [item.id]: e.target.value,
                          }))
                        }
                        style={{
                          width: "110px",
                          padding: "0.5rem 0.75rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                        }}
                      />
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => savePlanPrice(item.id)}
                        style={{
                          padding: "0.5rem 0.875rem",
                          background: isSaving ? "#9ca3af" : "#16a34a",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "8px",
                          fontSize: "0.8125rem",
                          fontWeight: "600",
                          cursor: isSaving ? "not-allowed" : "pointer",
                        }}
                      >
                        {isSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => {
                          setEditingPlanId(null);
                          setDraftPrices((current) => ({
                            ...current,
                            [item.id]: String(item.price),
                          }));
                          setError(null);
                        }}
                        style={{
                          padding: "0.5rem 0.875rem",
                          background: "#ffffff",
                          color: "#374151",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          fontSize: "0.8125rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ color: "#111827", fontWeight: "700" }}>
                        ${item.price}
                        <span style={{ color: "#6b7280", fontWeight: "500", marginLeft: "0.25rem" }}>
                          {item.priceSuffix}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanId(item.id);
                          setMessage(null);
                          setError(null);
                        }}
                        style={{
                          padding: "0.25rem 0.75rem",
                          background: "#f3f4f6",
                          border: "1px solid #e5e7eb",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        Edit
                      </button>
                    </>
                  )
                ) : (
                  <span style={{ color: "#6b7280", fontWeight: "600" }}>Custom Quote</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
