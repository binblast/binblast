// app/partner/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface PartnerInfo {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceArea: string;
  serviceType: string;
  referralCode: string;
}

function PartnerSignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerId = searchParams.get("partnerId");

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerInfo, setPartnerInfo] = useState<PartnerInfo | null>(null);
  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
    acceptAgreement: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (!partnerId) {
          setError("Missing partner ID. Please use the signup link provided.");
          setLoading(false);
          return;
        }
        
        if (auth?.currentUser) {
          const uid = auth.currentUser.uid;
          setUserId(uid);
          await loadPartnerInfo(partnerId, uid);
        } else {
          // User not logged in - check partner record and redirect to register with email pre-filled
          try {
            const { getDbInstance } = await import("@/lib/firebase");
            const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
            const firestore = await safeImportFirestore();
            const { doc, getDoc } = firestore;
            const db = await getDbInstance();
            
            if (db && partnerId) {
              const partnerRef = doc(db, "partners", partnerId);
              const partnerDoc = await getDoc(partnerRef);
              
              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                if (partnerData.status === "pending_agreement") {
                  // Redirect to register with email pre-filled
                  const email = partnerData.email || "";
                  router.push(`/register?redirect=/partner${partnerId ? `?partnerId=${partnerId}` : ""}&email=${encodeURIComponent(email)}`);
                  return;
                }
              }
            }
          } catch (err) {
            console.warn("[Partner Signup] Error checking partner:", err);
          }
          
          // Fallback: redirect to login
          router.push(`/login?redirect=/partner${partnerId ? `?partnerId=${partnerId}` : ""}`);
        }
        
        const unsubscribe = await onAuthStateChanged(async (user) => {
          if (user) {
            const uid = user.uid;
            setUserId(uid);
            if (partnerId) {
              await loadPartnerInfo(partnerId, uid);
            }
          } else {
            // User logged out - redirect to login
            router.push(`/login?redirect=/partner${partnerId ? `?partnerId=${partnerId}` : ""}`);
          }
        });
        
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [partnerId, router]);

  async function loadPartnerInfo(id: string, uid: string) {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, getDoc } = firestore;

      const db = await getDbInstance();
      if (!db) {
        setError("Firebase is not configured");
        setLoading(false);
        return;
      }

      const partnerRef = doc(db, "partners", id);
      const partnerDoc = await getDoc(partnerRef);

      if (!partnerDoc.exists()) {
        setError("Partner record not found. Please contact support.");
        setLoading(false);
        return;
      }

      const data = partnerDoc.data();
      
      // Check if partner is approved
      if (data.status !== "pending_agreement" && data.status !== "active") {
        setError("This partner account is not available for signup.");
        setLoading(false);
        return;
      }

      // Check if userId matches
      if (data.userId !== uid) {
        setError("This signup link is not for your account. Please use the correct link.");
        setLoading(false);
        return;
      }

      setPartnerInfo({
        id: partnerDoc.id,
        ...data,
      } as PartnerInfo);
      setLoading(false);
    } catch (err: any) {
      console.error("Error loading partner info:", err);
      setError(err.message || "Failed to load partner information");
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.acceptAgreement) {
      setError("You must accept the partner agreement to continue");
      return;
    }

    if (!partnerId || !userId) {
      setError("Missing required information");
      return;
    }

    setSubmitting(true);

    try {
      // Update partner status to active and record agreement acceptance
      const response = await fetch(`/api/partners/agreement/${partnerId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Wait a moment for Firestore to update, then redirect to partner dashboard
        // Use window.location to ensure a full page reload and fresh auth state
        setTimeout(() => {
          window.location.href = "/partners/dashboard";
        }, 500);
      } else {
        setError(data.error || "Failed to complete signup");
        setSubmitting(false);
      }
    } catch (err: any) {
      console.error("Error completing partner signup:", err);
      setError(err.message || "Failed to complete signup");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <p style={{ color: "#6b7280" }}>Loading...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error && !partnerInfo) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                Error
              </h1>
              <p style={{ color: "#dc2626", marginBottom: "2rem" }}>{error}</p>
              <button
                onClick={() => router.push("/login")}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#0369a1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Go to Login
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 style={{ fontSize: "clamp(1.75rem, 4vw, 2rem)", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-dark)", textAlign: "center" }}>
              Partner Account Signup
            </h1>
            <p style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "2rem", textAlign: "center" }}>
              Complete your partner account setup
            </p>

            {partnerInfo && (
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                  Partner Information
                </h2>
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Business Name</div>
                    <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{partnerInfo.businessName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Owner</div>
                    <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{partnerInfo.ownerName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Area</div>
                    <div style={{ color: "var(--text-dark)" }}>{partnerInfo.serviceArea}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Referral Code</div>
                    <div style={{ color: "#0369a1", fontWeight: "600", fontFamily: "monospace" }}>{partnerInfo.referralCode}</div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{
              background: "#ffffff",
              borderRadius: "16px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                Partner Agreement
              </h2>

              <div style={{
                background: "#f9fafb",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                border: "1px solid #e5e7eb",
                maxHeight: "300px",
                overflowY: "auto"
              }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-dark)", lineHeight: "1.6" }}>
                  <h3 style={{ fontWeight: "600", marginBottom: "0.75rem" }}>Revenue Share</h3>
                  <p style={{ marginBottom: "1rem" }}>
                    Partners receive 60% of revenue from customers who sign up using their referral link. The platform retains 40%.
                  </p>

                  <h3 style={{ fontWeight: "600", marginBottom: "0.75rem" }}>Customer Ownership</h3>
                  <p style={{ marginBottom: "1rem" }}>
                    Customers who sign up through your partner link are assigned to your account. You will have access to manage their subscriptions and cleaning schedules through your partner dashboard.
                  </p>

                  <h3 style={{ fontWeight: "600", marginBottom: "0.75rem" }}>Responsibilities</h3>
                  <p style={{ marginBottom: "1rem" }}>
                    Partners are responsible for promoting Bin Blast Co. services, managing customer relationships, and ensuring service quality in their designated service area.
                  </p>

                  <h3 style={{ fontWeight: "600", marginBottom: "0.75rem" }}>Payouts</h3>
                  <p style={{ marginBottom: "1rem" }}>
                    Partner earnings are processed monthly on the 25th of each month. Minimum payout threshold applies.
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formData.acceptAgreement}
                    onChange={(e) => setFormData({ ...formData, acceptAgreement: e.target.checked })}
                    style={{ marginTop: "0.25rem", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                    I have read and agree to the partner agreement terms and conditions.
                  </span>
                </label>
              </div>

              {error && (
                <div style={{
                  padding: "0.75rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  marginBottom: "1rem"
                }}>
                  <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  background: submitting ? "#9ca3af" : "#0369a1",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "1rem",
                  fontWeight: "600",
                  cursor: submitting ? "not-allowed" : "pointer",
                  minHeight: "44px"
                }}
              >
                {submitting ? "Completing Signup..." : "Accept Agreement & Complete Signup"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}

export default function PartnerSignupPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <p style={{ color: "#6b7280" }}>Loading...</p>
            </div>
          </div>
        </main>
      </>
    }>
      <PartnerSignupPageContent />
    </Suspense>
  );
}
