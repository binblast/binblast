// components/ReferralRewards.tsx
"use client";

import { useState, useEffect } from "react";
import { getDbInstance } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";

interface ReferralRewardsProps {
  userId: string;
}

export function ReferralRewards({ userId }: ReferralRewardsProps) {
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralCount, setReferralCount] = useState<number>(0);
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReferralData() {
      try {
        const db = await getDbInstance();
        if (!db || !userId) return;

        const userDocRef = doc(db, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          let code = userData.referralCode;
          const count = userData.referralCount || 0;

          // Generate referral code if it doesn't exist
          if (!code) {
            // Create a unique code based on user ID (first 8 chars) + random 4 chars
            const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
            code = userId.substring(0, 8).toUpperCase() + randomChars;
            
            // Save to Firestore
            await updateDoc(userDocRef, {
              referralCode: code,
              updatedAt: serverTimestamp(),
            });
          }

          setReferralCode(code);
          setReferralCount(count);

          // Load unused credits
          try {
            const { collection, query, where, getDocs } = await import("firebase/firestore");
            const creditsQuery = query(
              collection(db, "credits"),
              where("userId", "==", userId),
              where("used", "==", false)
            );
            const creditsSnapshot = await getDocs(creditsQuery);
            
            let total = 0;
            creditsSnapshot.forEach((creditDoc) => {
              const creditData = creditDoc.data();
              total += creditData.amount || 0;
            });
            
            setTotalCredits(total);
          } catch (creditError) {
            console.error("Error loading credits:", creditError);
          }
        }
      } catch (error) {
        console.error("Error loading referral data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadReferralData();
    }
  }, [userId]);

  const referralUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/register?ref=${referralCode}`
    : "";

  const handleCopy = async () => {
    if (referralUrl) {
      try {
        await navigator.clipboard.writeText(referralUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <p style={{ color: "var(--text-light)" }}>Loading referral information...</p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2.5rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      marginBottom: "1.5rem"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "0.5rem" }}>
        Referral Rewards
      </h2>
      <p style={{ 
        fontSize: "0.95rem", 
        color: "#6b7280", 
        marginBottom: "1.5rem"
      }}>
        Share your link and both you and your friend get $10 off your next service.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{
          padding: "0.75rem 1rem",
          background: "#f0f9ff",
          borderRadius: "12px",
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "#0369a1",
          border: "1px solid #bae6fd"
        }}>
          {referralCount === 0 
            ? "0 referrals so far — your next $10 reward is waiting."
            : `${referralCount} ${referralCount === 1 ? "referral" : "referrals"} completed`}
        </div>
        {totalCredits > 0 && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "#ecfdf5",
            borderRadius: "12px",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "#047857",
            border: "1px solid #86efac"
          }}>
            You have ${totalCredits.toFixed(2)} in referral rewards ready to use on your next service.
          </div>
        )}
      </div>

      <div style={{
        background: "#f0f9ff",
        borderRadius: "12px",
        padding: "1.5rem",
        border: "2px solid #bae6fd",
        marginBottom: "1rem"
      }}>
        
        <div style={{ marginBottom: "1rem" }}>
          <label style={{ 
            fontSize: "0.875rem", 
            color: "#0c4a6e", 
            fontWeight: "600",
            display: "block",
            marginBottom: "0.5rem"
          }}>
            Your Referral Code:
          </label>
          <div style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap"
          }}>
            <code style={{
              padding: "0.75rem 1rem",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #bae6fd",
              fontSize: "1rem",
              fontWeight: "700",
              color: "#0369a1",
              letterSpacing: "0.05em",
              fontFamily: "monospace",
              flex: "1",
              minWidth: "200px"
            }}>
              {referralCode}
            </code>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label style={{ 
            fontSize: "0.875rem", 
            color: "#0c4a6e", 
            fontWeight: "600",
            display: "block",
            marginBottom: "0.5rem"
          }}>
            Your Referral Link:
          </label>
          <div style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
            flexWrap: "wrap"
          }}>
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
                fontFamily: "monospace"
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
                transition: "background 0.2s",
                whiteSpace: "nowrap"
              }}
              onMouseEnter={(e) => {
                if (!copied) {
                  e.currentTarget.style.background = "#075985";
                }
              }}
              onMouseLeave={(e) => {
                if (!copied) {
                  e.currentTarget.style.background = "#0369a1";
                }
              }}
            >
              {copied ? "✓ Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        <div style={{
          padding: "1rem",
          background: "#ffffff",
          borderRadius: "8px",
          border: "1px solid #bae6fd"
        }}>
          <p style={{ 
            fontSize: "0.875rem", 
            color: "#0c4a6e", 
            margin: 0,
            lineHeight: "1.6"
          }}>
            <strong>How it works:</strong> Share your referral link with friends. When they sign up using your link, 
            both you and your friend will receive $10 off your next service!
          </p>
        </div>
      </div>
    </div>
  );
}

