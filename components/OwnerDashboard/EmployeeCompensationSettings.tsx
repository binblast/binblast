"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


import { useEffect, useMemo, useState } from "react";
import type { CompensationPayModel, CompensationSettings, CommercialBonusType } from "@/lib/employee-compensation";
import { COMMERCIAL_BONUS_LABELS } from "@/lib/employee-compensation";

type PreviewRow = { bins: number; amount: number };
type CommercialPreviewRow = { containers: number; amount: number };

const COMMERCIAL_BONUS_TYPES = Object.keys(COMMERCIAL_BONUS_LABELS) as CommercialBonusType[];

const PAY_MODEL_LABELS: Record<CompensationPayModel, string> = {
  per_bin: "Per Bin (Active)",
  hourly: "Hourly (Operators)",
  per_job: "Per Job (Coming Soon)",
  flat_daily: "Flat Daily Rate (Coming Soon)",
  commission_percentage: "Commission % (Coming Soon)",
};

const FIELD_GROUPS: Array<{
  title: string;
  description: string;
  fields: Array<{
    key: string;
    label: string;
    helper?: string;
    future?: boolean;
    type?: "number" | "boolean";
  }>;
}> = [
  {
    title: "Residential Pay",
    description: "Default launch model: $8 first bin + $2 each additional bin.",
    fields: [
      { key: "residentialFirstBinPay", label: "First Bin Pay" },
      { key: "residentialAdditionalBinPay", label: "Additional Bin Pay" },
    ],
  },
  {
    title: "Commercial & HOA Pay",
    description: "Same per-container model as residential: $8 first + $2 each additional.",
    fields: [
      { key: "commercialFirstContainerPay", label: "First Container Pay" },
      { key: "commercialAdditionalContainerPay", label: "Additional Container Pay" },
    ],
  },
  {
    title: "Other Job Types",
    description: "Separate from customer pricing — employee pay only.",
    fields: [{ key: "dumpsterPay", label: "Dumpster Pay" }],
  },
  {
    title: "Commercial Bonus Defaults",
    description: "Default bonus amounts managers can apply to commercial/HOA jobs.",
    fields: COMMERCIAL_BONUS_TYPES.map((type) => ({
      key: `bonus_${type}`,
      label: COMMERCIAL_BONUS_LABELS[type],
    })),
  },
  {
    title: "Commercial Controls",
    description: "Limits and approval rules for commercial compensation.",
    fields: [
      { key: "maxCommercialJobBonus", label: "Maximum Bonus Per Job" },
      {
        key: "commercialManagerApprovalRequired",
        label: "Manager Approval Required (Commercial)",
        type: "boolean",
      },
    ],
  },
  {
    title: "Operator Hourly Pay",
    description: "Hourly rate for operators/managers on the operations dashboard. Hours are locked to clock in/out records.",
    fields: [{ key: "hourlyRate", label: "Operator Hourly Rate" }],
  },
  {
    title: "Future Pay Models",
    description: "Saved now; applied when those models are enabled.",
    fields: [
      { key: "flatDailyRate", label: "Flat Daily Rate", future: true },
    ],
  },
  {
    title: "Bonuses",
    description: "Bonus amounts for future payroll automation.",
    fields: [
      { key: "weeklyBonus", label: "Weekly Bonus", future: true },
      { key: "monthlyBonus", label: "Monthly Bonus", future: true },
      { key: "holidayBonus", label: "Holiday Bonus", future: true },
      { key: "referralBonus", label: "Referral Bonus", future: true },
      { key: "performanceBonus", label: "Performance Bonus", future: true },
      { key: "maxDailyBonus", label: "Maximum Daily Bonus", future: true },
    ],
  },
  {
    title: "Completion Rules",
    description: "Optional gates before compensation is generated.",
    fields: [
      {
        key: "customerSignatureRequired",
        label: "Customer Signature Required",
        type: "boolean",
      },
      {
        key: "managerApprovalRequired",
        label: "Manager Approval Required",
        type: "boolean",
      },
    ],
  },
];

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function EmployeeCompensationSettings() {
  const [settings, setSettings] = useState<CompensationSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [commercialPreview, setCommercialPreview] = useState<CommercialPreviewRow[]>([]);
  const [payModels, setPayModels] = useState<CompensationPayModel[]>(["per_bin"]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/admin/compensation-settings");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load compensation settings");
      }

      setSettings(data.settings);
      setPreview(data.preview || []);
      setCommercialPreview(data.commercialPreview || []);
      setPayModels(data.payModels || ["per_bin"]);
      setDraft(settingsToDraft(data.settings));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load compensation settings");
    } finally {
      setLoading(false);
    }
  }

  function settingsToDraft(nextSettings: CompensationSettings): Record<string, string> {
    const nextDraft: Record<string, string> = {};
    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const key = String(field.key);
        if (key.startsWith("bonus_")) {
          const bonusType = key.replace("bonus_", "") as CommercialBonusType;
          nextDraft[key] = String(nextSettings.commercialBonusDefaults[bonusType] ?? 0);
          continue;
        }

        const value = nextSettings[field.key as keyof CompensationSettings];
        if (typeof value === "boolean") {
          nextDraft[key] = value ? "true" : "false";
        } else if (typeof value === "number") {
          nextDraft[key] = String(value);
        }
      }
    }
    nextDraft.payModel = nextSettings.payModel;
    return nextDraft;
  }

  const livePreview = useMemo(() => {
    const first = Number(draft.residentialFirstBinPay);
    const additional = Number(draft.residentialAdditionalBinPay);
    if (!Number.isFinite(first) || !Number.isFinite(additional) || first <= 0 || additional < 0) {
      return preview;
    }

    return Array.from({ length: 6 }, (_, index) => {
      const bins = index + 1;
      const amount = Math.round((first + Math.max(0, bins - 1) * additional) * 100) / 100;
      return { bins, amount };
    });
  }, [draft.residentialAdditionalBinPay, draft.residentialFirstBinPay, preview]);

  const liveCommercialPreview = useMemo(() => {
    const first = Number(draft.commercialFirstContainerPay);
    const additional = Number(draft.commercialAdditionalContainerPay);
    if (!Number.isFinite(first) || !Number.isFinite(additional) || first <= 0 || additional < 0) {
      return commercialPreview;
    }

    return [1, 2, 3, 5, 10, 20, 50].map((containers) => ({
      containers,
      amount: Math.round((first + Math.max(0, containers - 1) * additional) * 100) / 100,
    }));
  }, [
    commercialPreview,
    draft.commercialAdditionalContainerPay,
    draft.commercialFirstContainerPay,
  ]);

  function updateDraft(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function buildSettingsFromDraft(): CompensationSettings | null {
    if (!settings) return null;

    const next: CompensationSettings = {
      ...settings,
      commercialBonusDefaults: { ...settings.commercialBonusDefaults },
    };

    for (const group of FIELD_GROUPS) {
      for (const field of group.fields) {
        const key = String(field.key);

        if (key.startsWith("bonus_")) {
          const bonusType = key.replace("bonus_", "") as CommercialBonusType;
          const parsed = Number(draft[key]);
          if (!Number.isFinite(parsed) || parsed < 0) return null;
          next.commercialBonusDefaults[bonusType] = parsed;
          continue;
        }

        if (field.type === "boolean") {
          if (field.key === "customerSignatureRequired") {
            next.customerSignatureRequired = draft[key] === "true";
          } else if (field.key === "managerApprovalRequired") {
            next.managerApprovalRequired = draft[key] === "true";
          } else if (field.key === "commercialManagerApprovalRequired") {
            next.commercialManagerApprovalRequired = draft[key] === "true";
          }
          continue;
        }

        const parsed = Number(draft[key]);
        if (!Number.isFinite(parsed) || parsed < 0) {
          return null;
        }

        switch (field.key) {
          case "residentialFirstBinPay":
            next.residentialFirstBinPay = parsed;
            break;
          case "residentialAdditionalBinPay":
            next.residentialAdditionalBinPay = parsed;
            break;
          case "commercialFirstContainerPay":
            next.commercialFirstContainerPay = parsed;
            break;
          case "commercialAdditionalContainerPay":
            next.commercialAdditionalContainerPay = parsed;
            break;
          case "dumpsterPay":
            next.dumpsterPay = parsed;
            break;
          case "hourlyRate":
            next.hourlyRate = parsed;
            break;
          case "flatDailyRate":
            next.flatDailyRate = parsed;
            break;
          case "weeklyBonus":
            next.weeklyBonus = parsed;
            break;
          case "monthlyBonus":
            next.monthlyBonus = parsed;
            break;
          case "holidayBonus":
            next.holidayBonus = parsed;
            break;
          case "referralBonus":
            next.referralBonus = parsed;
            break;
          case "performanceBonus":
            next.performanceBonus = parsed;
            break;
          case "maxDailyBonus":
            next.maxDailyBonus = parsed;
            break;
          case "maxCommercialJobBonus":
            next.maxCommercialJobBonus = parsed;
            break;
        }
      }
    }

    const payModel = draft.payModel as CompensationPayModel;
    next.payModel = payModels.includes(payModel) ? payModel : "per_bin";
    return next;
  }

  async function saveSettings() {
    const nextSettings = buildSettingsFromDraft();
    if (!nextSettings) {
      setError("Enter valid compensation values.");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const response = await fetchWithAuth("/api/admin/compensation-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: nextSettings }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save compensation settings");
      }

      setSettings(data.settings);
      setPreview(data.preview || []);
      setCommercialPreview(data.commercialPreview || []);
      setDraft(settingsToDraft(data.settings));
      setMessage(data.message || "Compensation settings saved.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save compensation settings");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ color: "#6b7280" }}>Loading employee compensation...</div>;
  }

  return (
    <div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        Employee Compensation
      </h3>
      <p style={{ color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.5 }}>
        Manage employee pay independently from customer pricing. Changes apply to future completed jobs
        immediately — no code changes required.
      </p>

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: "8px",
            background: "#ecfdf5",
            color: "#047857",
            fontSize: "0.875rem",
          }}
        >
          {message}
        </div>
      )}

      <div
        className="compensation-layout"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.4fr) minmax(280px, 0.8fr)",
          gap: "1.5rem",
          alignItems: "start",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div
            style={{
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "8px",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Pay Model</div>
            <select
              value={draft.payModel || "per_bin"}
              onChange={(event) => updateDraft("payModel", event.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
              }}
            >
              {payModels.map((model) => (
                <option key={model} value={model}>
                  {PAY_MODEL_LABELS[model]}
                </option>
              ))}
            </select>
          </div>

          {FIELD_GROUPS.map((group) => (
            <div
              key={group.title}
              style={{
                padding: "1rem",
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{group.title}</div>
              <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "1rem" }}>
                {group.description}
              </div>

              <div style={{ display: "grid", gap: "0.875rem" }}>
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        marginBottom: "0.375rem",
                      }}
                    >
                      {field.label}
                      {field.future && (
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: "600",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            padding: "0.125rem 0.375rem",
                            borderRadius: "999px",
                          }}
                        >
                          Future
                        </span>
                      )}
                    </label>

                    {field.type === "boolean" ? (
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input
                          type="checkbox"
                          checked={draft[field.key] === "true"}
                          onChange={(event) =>
                            updateDraft(field.key, event.target.checked ? "true" : "false")
                          }
                        />
                        <span style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
                          {field.helper || "Enable requirement"}
                        </span>
                      </label>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: "#6b7280" }}>$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft[field.key] ?? "0"}
                          onChange={(event) => updateDraft(field.key, event.target.value)}
                          style={{
                            width: "100%",
                            padding: "0.5rem 0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={saveSettings}
            disabled={saving}
            style={{
              alignSelf: "flex-start",
              padding: "0.75rem 1.25rem",
              background: saving ? "#9ca3af" : "#111827",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Saving..." : "Save Compensation Settings"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div
            style={{
              position: "sticky",
              top: "1rem",
              padding: "1.25rem",
              background: "#111827",
              color: "#ffffff",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem" }}>
              Residential Preview
            </div>
            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "1rem" }}>
              Per-bin model (updates live)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {livePreview.map((row) => (
                <div
                  key={row.bins}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "0.9375rem",
                  }}
                >
                  <span>
                    {row.bins} Bin{row.bins === 1 ? "" : "s"}
                  </span>
                  <span style={{ fontWeight: "700", color: "#4ade80" }}>{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "1.25rem",
              background: "#1e3a5f",
              color: "#ffffff",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem" }}>
              Commercial & HOA Preview
            </div>
            <div style={{ fontSize: "0.75rem", color: "#bfdbfe", marginBottom: "1rem" }}>
              Per-container model (updates live)
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {liveCommercialPreview.map((row) => (
                <div
                  key={row.containers}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    fontSize: "0.9375rem",
                  }}
                >
                  <span>
                    {row.containers} Container{row.containers === 1 ? "" : "s"}
                  </span>
                  <span style={{ fontWeight: "700", color: "#93c5fd" }}>{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: "1rem",
                paddingTop: "1rem",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                fontSize: "0.75rem",
                color: "#bfdbfe",
                lineHeight: 1.5,
              }}
            >
              Formula: First Container + ((Total Containers − 1) × Additional Container). Never tied
              to customer pricing.
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "2rem",
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          border: "1px dashed #d1d5db",
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
          Commercial Compensation Profiles (Coming Soon)
        </div>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
          Future profiles for Commercial Standard, HOA Communities, Apartment Complexes, Dumpster
          Cleaning, Municipal Contracts, and Industrial Facilities will plug into the same engine.
        </p>
      </div>

      <div
        style={{
          marginTop: "1rem",
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          border: "1px dashed #d1d5db",
        }}
      >
        <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>AI Recommendations (Coming Soon)</div>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>
          Productivity, quality, and top-performer bonus suggestions will appear here based on employee
          performance trends.
        </p>
      </div>
    </div>
  );
}
