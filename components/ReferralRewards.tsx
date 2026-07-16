// components/ReferralRewards.tsx
"use client";

import { useState, useEffect } from "react";
import { useFirebase } from "@/lib/firebase-context";
import { ReferralCodeDisplay } from "@/components/ReferralCodeDisplay";

interface ReferralRewardsProps {
  userId: string;
}

export function ReferralRewards({ userId }: ReferralRewardsProps) {
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [creditCount, setCreditCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { isReady: firebaseReady } = useFirebase();

  useEffect(() => {
    if (!firebaseReady || !userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadReferralData() {
      try {
        const statsResponse = await fetch(
          `/api/referral/stats?userId=${encodeURIComponent(userId)}&syncPending=1`
        );
        const statsData = await statsResponse.json();

        if (statsResponse.ok) {
          setReferralCount(statsData.completedReferrals || statsData.referralCount || 0);
          setTotalCredits(Number(statsData.totalCredits) || 0);
          setCreditCount(Number(statsData.creditCount) || 0);
        }

        const { getDbInstance } = await import("@/lib/firebase");
        const db = await getDbInstance();
        if (!db) return;

        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;
        const userDoc = await getDoc(doc(db, "users", userId));

        if (userDoc.exists()) {
          const code = userDoc.data().referralCode;
          if (!code || code.trim() === "") {
            console.warn(
              "[ReferralRewards] User does not have a referral code. Referral codes are only generated during initial registration."
            );
          }
          setReferralCode(code || "");
        }
      } catch (error) {
        console.error("Error loading referral data:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadReferralData();

    return () => {
      mounted = false;
    };
  }, [firebaseReady, userId]);

  const referralUrl =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/?ref=${referralCode}#pricing`
      : "";

  const handleCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ color: "var(--text-light)" }}>Loading referral information...</p>
      </div>
    );
  }

  return (
    <div className="customer-dash-card referral-card">
      <h2 className="customer-dash-card__title" style={{ marginBottom: "0.5rem" }}>
        Referral Rewards
      </h2>
      <p className="customer-dash-card__subtitle" style={{ marginBottom: "1.5rem" }}>
        Share your link and earn $10 every time a friend completes their first paid
        service. Your friend also gets $10 off at signup.
      </p>

      {!referralCode && (
        <div
          style={{
            padding: "1rem",
            background: "#fef3c7",
            borderRadius: "12px",
            marginBottom: "1rem",
            border: "1px solid #f59e0b",
          }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "#92400e",
              margin: 0,
              fontWeight: "600",
            }}
          >
            No referral code found. Referral codes are generated when you first sign
            up. If you believe this is an error, please contact support.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            padding: "1rem",
            background: "#f0f9ff",
            borderRadius: "12px",
            border: "1px solid #bae6fd",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.75rem", color: "#0369a1", fontWeight: "600" }}>
            Completed Referrals
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "1.5rem", fontWeight: "700", color: "#0c4a6e" }}>
            {referralCount}
          </p>
        </div>

        <div
          style={{
            padding: "1rem",
            background: totalCredits > 0 ? "#ecfdf5" : "#f9fafb",
            borderRadius: "12px",
            border: `1px solid ${totalCredits > 0 ? "#86efac" : "#e5e7eb"}`,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              color: totalCredits > 0 ? "#047857" : "#6b7280",
              fontWeight: "600",
            }}
          >
            Available Credit Balance
          </p>
          <p
            style={{
              margin: "0.35rem 0 0",
              fontSize: "1.5rem",
              fontWeight: "700",
              color: totalCredits > 0 ? "#047857" : "#374151",
            }}
          >
            ${totalCredits.toFixed(2)}
          </p>
          {creditCount > 0 && (
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.75rem", color: "#6b7280" }}>
              {creditCount} unused {creditCount === 1 ? "credit" : "credits"}
            </p>
          )}
        </div>
      </div>

      {totalCredits > 0 && (
        <div
          style={{
            padding: "1rem 1.25rem",
            background: "#ecfdf5",
            borderRadius: "12px",
            border: "1px solid #86efac",
            marginBottom: "1.5rem",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.9rem", color: "#047857", fontWeight: "600" }}>
            You have ${totalCredits.toFixed(2)} ready to use.
          </p>
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#065f46", lineHeight: 1.6 }}>
            Up to $10 is applied automatically on each subscription renewal while you have a
            credit balance — no checkbox needed.
          </p>
        </div>
      )}

      <div
        style={{
          padding: "1.25rem",
          background: "#f8fafc",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            margin: "0 0 0.75rem",
            fontSize: "1rem",
            fontWeight: "700",
            color: "var(--text-dark)",
          }}
        >
          How the program works
        </h3>
        <ol
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            color: "#475569",
            fontSize: "0.875rem",
            lineHeight: 1.7,
          }}
        >
          <li>Share your referral link or code with a friend.</li>
          <li>They sign up and complete their first paid service using your link.</li>
          <li>They receive $10 off at checkout when they use your code.</li>
          <li>You both receive a $10 credit in your account after their first payment.</li>
          <li>Credits stay in your account until used — they do not expire.</li>
          <li>
            <strong>Auto-applied on renewal:</strong> $10 comes off each subscription
            renewal automatically when you have credits available.
          </li>
        </ol>
      </div>

      <div
        style={{
          padding: "1.25rem",
          background: "#fffbeb",
          borderRadius: "12px",
          border: "1px solid #fde68a",
          marginBottom: referralCode ? "1.5rem" : 0,
        }}
      >
        <h3
          style={{
            margin: "0 0 0.75rem",
            fontSize: "1rem",
            fontWeight: "700",
            color: "#92400e",
          }}
        >
          Where credits go and how to use them
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "1.25rem",
            color: "#78350f",
            fontSize: "0.875rem",
            lineHeight: 1.7,
          }}
        >
          <li>
            <strong>Stored in your account:</strong> Credits appear here and in Referral
            History after a friend pays.
          </li>
          <li>
            <strong>Subscription renewals:</strong> $10 is applied automatically each billing
            cycle while you have unused credits.
          </li>
          <li>
            <strong>Extra cleanings:</strong> You can also apply a credit when buying a
            one-time cleaning from your dashboard.
          </li>
          <li>
            <strong>One credit per renewal:</strong> Each renewal uses up to $10 from your
            balance until credits run out.
          </li>
        </ul>
      </div>

      {referralCode && (
        <div
          style={{
            background: "#f0f9ff",
            borderRadius: "12px",
            padding: "1.5rem",
            border: "2px solid #bae6fd",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.875rem",
                color: "#0c4a6e",
                fontWeight: "600",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Your Referral Code
            </label>
            <div
              style={{
                padding: "0.75rem 1rem",
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #bae6fd",
              }}
            >
              <ReferralCodeDisplay code={referralCode} size="lg" showLegend grouped />
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                fontSize: "0.875rem",
                color: "#0c4a6e",
                fontWeight: "600",
                display: "block",
                marginBottom: "0.5rem",
              }}
            >
              Your Referral Link
            </label>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                type="text"
                readOnly
                value={referralUrl}
                style={{
                  flex: "1",
                  padding: "0.75rem 1rem",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #bae6fd",
                  fontSize: "0.875rem",
                  color: "#0369a1",
                  minWidth: "200px",
                  fontFamily: "monospace",
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: copied ? "#16a34a" : "#0369a1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {copied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
