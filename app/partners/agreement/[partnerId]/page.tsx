// app/partners/agreement/[partnerId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface PartnerData {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  status: string;
}

export default function PartnerAgreementPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params?.partnerId as string;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);

  useEffect(() => {
    async function loadPartner() {
      if (!partnerId) {
        setError("Invalid partner ID");
        setLoading(false);
        return;
      }

      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;

        const db = await getDbInstance();
        if (!db) {
          setError("Database not available");
          setLoading(false);
          return;
        }

        const partnerRef = doc(db, "partners", partnerId);
        const partnerDoc = await getDoc(partnerRef);

        if (!partnerDoc.exists()) {
          setError("Partner not found");
          setLoading(false);
          return;
        }

        const data = partnerDoc.data();
        setPartnerData({
          id: partnerDoc.id,
          ...data,
        } as PartnerData);

        // Check if already accepted
        if (data.status === "active" && data.agreementAcceptedAt) {
          router.push("/partners/dashboard");
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading partner:", err);
        setError("Failed to load partner information");
        setLoading(false);
      }
    }

    loadPartner();
  }, [partnerId, router]);

  const handleAccept = async () => {
    if (!agreementAccepted || !partnerId) {
      setError("Please read and accept the agreement");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/partners/agreement/${partnerId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept agreement");
      }

      // Redirect to dashboard
      router.push("/partners/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to accept agreement. Please try again.");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center" }}>Loading...</div>
          </div>
        </main>
      </>
    );
  }

  if (error && !partnerData) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                Error
              </h1>
              <p style={{ color: "var(--text-light)" }}>{error}</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Bin Blast Co. Partner Agreement
            </h1>
            <p style={{ 
              fontSize: "1rem", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "2rem"
            }}>
              Welcome, {partnerData?.businessName}! Please review and accept the partner agreement to continue.
            </p>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2.5rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{
                maxHeight: "500px",
                overflowY: "auto",
                padding: "1.5rem",
                background: "#f9fafb",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                  Partner Agreement
                </h2>
                
                <div style={{ fontSize: "0.875rem", color: "#dc2626", marginBottom: "1rem", fontStyle: "italic" }}>
                  {/* TODO: Replace with attorney-reviewed Partner Agreement language */}
                  This is placeholder text. Replace with actual legal agreement reviewed by an attorney.
                </div>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    1. Revenue Share
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6", marginBottom: "0.5rem" }}>
                    Partners receive 60% of the gross booking amount for each customer booking that comes through their unique partner link. Bin Blast Co. retains 40% as platform fee.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6" }}>
                    Revenue share is calculated automatically and tracked in your partner dashboard. Payouts are processed monthly on the 25th of each month for the previous month's earnings.
                  </p>
                </section>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    2. Customer Ownership / Non-Circumvention
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6", marginBottom: "0.5rem" }}>
                    Customers who book through your partner link are customers of Bin Blast Co. Partners agree not to circumvent Bin Blast Co. by directly soliciting these customers for competing bin cleaning services.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6" }}>
                    Partners may promote Bin Blast Co. services alongside their own services, but must use the provided partner link for all Bin Blast Co. bookings.
                  </p>
                </section>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    3. Brand Standards
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6", marginBottom: "0.5rem" }}>
                    Partners must represent Bin Blast Co. accurately and professionally. Partners may not make false claims about Bin Blast Co. services, pricing, or availability.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6" }}>
                    Partners must use only approved marketing materials and partner links provided by Bin Blast Co. Unauthorized use of Bin Blast Co. branding or trademarks is prohibited.
                  </p>
                </section>

                <section style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    4. Termination
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6", marginBottom: "0.5rem" }}>
                    Either party may terminate this agreement with 30 days written notice. Bin Blast Co. reserves the right to immediately suspend or terminate partnerships for violations of this agreement.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6" }}>
                    Upon termination, partners will receive final payouts for completed bookings within 60 days. Active customer subscriptions will continue to be serviced by Bin Blast Co.
                  </p>
                </section>

                <section>
                  <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    5. General Terms
                  </h3>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6", marginBottom: "0.5rem" }}>
                    This agreement is governed by the laws of the state where Bin Blast Co. operates. Partners are independent contractors, not employees of Bin Blast Co.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "var(--text-light)", lineHeight: "1.6" }}>
                    Partners are responsible for their own taxes and compliance with local business regulations. Bin Blast Co. provides no benefits, insurance, or employment protections.
                  </p>
                </section>
              </div>

              <div style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                marginBottom: "1.5rem"
              }}>
                <label style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={agreementAccepted}
                    onChange={(e) => setAgreementAccepted(e.target.checked)}
                    style={{ marginTop: "0.25rem", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                    I have read and agree to the Bin Blast Co. Partner Agreement. *
                  </span>
                </label>
              </div>

              {error && (
                <div style={{
                  padding: "0.75rem 1rem",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "8px",
                  color: "#dc2626",
                  fontSize: "0.875rem",
                  marginBottom: "1rem"
                }}>
                  {error}
                </div>
              )}

              <button
                onClick={handleAccept}
                disabled={!agreementAccepted || submitting}
                className={`btn btn-primary ${(!agreementAccepted || submitting) ? "disabled" : ""}`}
                style={{
                  width: "100%",
                  cursor: (!agreementAccepted || submitting) ? "not-allowed" : "pointer",
                  opacity: (!agreementAccepted || submitting) ? 0.6 : 1
                }}
              >
                {submitting ? "Processing..." : "Accept & Set Up My Dashboard"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
