"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COMMERCIAL_BONUS_LABELS,
  type CommercialBonusType,
} from "@/lib/employee-compensation";
import { OperatorActionButton } from "@/components/OperatorDashboard/operator-ui";

interface CommercialCompensationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  operatorId?: string;
  onSaved: () => void;
}

type CompensationPayload = {
  containers: number;
  suggestedAmount: number;
  finalAmount: number;
  bonusDefaults: Record<CommercialBonusType, number>;
  maxCommercialJobBonus: number;
  breakdown: {
    baseAmount?: number;
    bonusTotal?: number;
    bonuses?: Partial<Record<CommercialBonusType, number>>;
    overrideAmount?: number | null;
    overrideReason?: string | null;
  };
};

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const BONUS_TYPES = Object.keys(COMMERCIAL_BONUS_LABELS) as CommercialBonusType[];

export function CommercialCompensationModal({
  isOpen,
  onClose,
  jobId,
  operatorId,
  onSaved,
}: CommercialCompensationModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<CompensationPayload | null>(null);
  const [bonusDraft, setBonusDraft] = useState<Record<string, string>>({});
  const [overrideAmount, setOverrideAmount] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [useOverride, setUseOverride] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;
    loadCompensation();
  }, [isOpen, jobId]);

  async function loadCompensation() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/operator/jobs/${jobId}/compensation`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load compensation");
      }

      setPayload(data);

      const nextBonusDraft: Record<string, string> = {};
      for (const type of BONUS_TYPES) {
        const applied = data.breakdown?.bonuses?.[type];
        nextBonusDraft[type] =
          applied != null && applied > 0 ? String(applied) : "";
      }
      setBonusDraft(nextBonusDraft);

      const existingOverride = data.breakdown?.overrideAmount;
      setUseOverride(existingOverride != null);
      setOverrideAmount(existingOverride != null ? String(existingOverride) : "");
      setOverrideReason(data.breakdown?.overrideReason || "");
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load compensation");
    } finally {
      setLoading(false);
    }
  }

  const liveTotals = useMemo(() => {
    if (!payload) return { base: 0, bonuses: 0, suggested: 0, final: 0 };

    const base = payload.breakdown.baseAmount ?? 0;
    const bonusValues = BONUS_TYPES.map((type) => Number(bonusDraft[type] || 0)).filter(
      (value) => Number.isFinite(value) && value > 0
    );
    let bonuses = bonusValues.reduce((sum, value) => sum + value, 0);
    if (payload.maxCommercialJobBonus > 0) {
      bonuses = Math.min(bonuses, payload.maxCommercialJobBonus);
    }

    const suggested = Math.round((base + bonuses) * 100) / 100;
    const parsedOverride = Number(overrideAmount);
    const final =
      useOverride && Number.isFinite(parsedOverride) && parsedOverride >= 0
        ? Math.round(parsedOverride * 100) / 100
        : suggested;

    return { base, bonuses, suggested, final };
  }, [bonusDraft, overrideAmount, payload, useOverride]);

  function applyBonusDefault(type: CommercialBonusType) {
    if (!payload) return;
    setBonusDraft((current) => ({
      ...current,
      [type]: String(payload.bonusDefaults[type] || 0),
    }));
  }

  async function handleSave() {
    if (!payload) return;

    try {
      setSaving(true);
      setError(null);

      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      const resolvedOperatorId = operatorId || auth?.currentUser?.uid || "operator";

      const bonuses: Partial<Record<CommercialBonusType, number>> = {};
      for (const type of BONUS_TYPES) {
        const value = Number(bonusDraft[type]);
        if (Number.isFinite(value) && value > 0) {
          bonuses[type] = value;
        }
      }

      const response = await fetch(`/api/operator/jobs/${jobId}/compensation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: resolvedOperatorId,
          bonuses,
          overrideAmount: useOverride ? Number(overrideAmount) : null,
          overrideReason: useOverride ? overrideReason : null,
          clearOverride: !useOverride,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save compensation");
      }

      onSaved();
      onClose();
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save compensation");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "640px",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.125rem", fontWeight: "700" }}>
          Commercial & HOA Compensation
        </h3>
        <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.5 }}>
          Employee pay is based on containers cleaned, not customer price. Add bonuses or override
          pay for difficult jobs.
        </p>

        {loading && <div style={{ color: "#6b7280" }}>Loading compensation...</div>}

        {error && (
          <div
            style={{
              marginBottom: "1rem",
              padding: "0.75rem 1rem",
              background: "#fef2f2",
              color: "#b91c1c",
              borderRadius: "8px",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {payload && !loading && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Containers</div>
                <div style={{ fontWeight: "700" }}>{payload.containers}</div>
              </div>
              <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Base Pay</div>
                <div style={{ fontWeight: "700", color: "#111827" }}>{formatCurrency(liveTotals.base)}</div>
              </div>
              <div style={{ padding: "0.875rem", background: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Bonuses</div>
                <div style={{ fontWeight: "700", color: "#111827" }}>{formatCurrency(liveTotals.bonuses)}</div>
              </div>
              <div style={{ padding: "0.875rem", background: "#ecfdf5", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#047857" }}>Suggested Pay</div>
                <div style={{ fontWeight: "700", color: "#047857" }}>{formatCurrency(liveTotals.suggested)}</div>
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: "600", marginBottom: "0.75rem" }}>Optional Bonuses</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                {BONUS_TYPES.map((type) => (
                  <div
                    key={type}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto auto",
                      gap: "0.5rem",
                      alignItems: "center",
                    }}
                  >
                    <label style={{ fontSize: "0.8125rem", fontWeight: "600" }}>
                      {COMMERCIAL_BONUS_LABELS[type]}
                    </label>
                    <button
                      type="button"
                      onClick={() => applyBonusDefault(type)}
                      style={{
                        padding: "0.25rem 0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        background: "#ffffff",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      +{formatCurrency(payload.bonusDefaults[type] || 0)}
                    </button>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={bonusDraft[type] ?? ""}
                      onChange={(event) =>
                        setBonusDraft((current) => ({ ...current, [type]: event.target.value }))
                      }
                      placeholder="0.00"
                      style={{
                        width: "110px",
                        padding: "0.375rem 0.5rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                marginBottom: "1rem",
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600" }}>
                <input
                  type="checkbox"
                  checked={useOverride}
                  onChange={(event) => setUseOverride(event.target.checked)}
                />
                Manual Override
              </label>
              {useOverride && (
                <div style={{ marginTop: "0.75rem", display: "grid", gap: "0.625rem" }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overrideAmount}
                    onChange={(event) => setOverrideAmount(event.target.value)}
                    placeholder="Override amount"
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                    }}
                  />
                  <textarea
                    value={overrideReason}
                    onChange={(event) => setOverrideReason(event.target.value)}
                    placeholder="Reason for override (e.g. large property with excessive buildup)"
                    rows={3}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.75rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}
            </div>

            <div
              style={{
                marginBottom: "1.25rem",
                padding: "0.875rem 1rem",
                background: "#111827",
                color: "#ffffff",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontWeight: "600" }}>Final Employee Pay</span>
              <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#4ade80" }}>
                {formatCurrency(liveTotals.final)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <OperatorActionButton variant="ghost" size="sm" onClick={onClose}>
                Cancel
              </OperatorActionButton>
              <OperatorActionButton variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Compensation"}
              </OperatorActionButton>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
