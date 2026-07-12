"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

type PurchaseDetails = {
  quantity: number;
  totalBins: number;
  extraBinsTotal: number;
  amountPaid: string;
};

function ExtraBinSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [details, setDetails] = useState<PurchaseDetails | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing checkout session. Please contact support if you were charged.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function completePurchase() {
      try {
        const { getAuth } = await import("firebase/auth");
        const { getFirebaseApp } = await import("@/lib/firebase");
        const app = await getFirebaseApp();
        const auth = getAuth(app);
        const user = auth.currentUser;

        if (!user) {
          router.replace(`/login?redirect=${encodeURIComponent(`/dashboard/extra-bin/success?session_id=${sessionId}`)}`);
          return;
        }

        const token = await user.getIdToken();
        const response = await fetch(`/api/stripe/extra-bin/complete?session_id=${encodeURIComponent(sessionId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to confirm your extra bin purchase");
        }

        if (!cancelled) {
          setDetails({
            quantity: data.quantity,
            totalBins: data.totalBins,
            extraBinsTotal: data.extraBinsTotal,
            amountPaid: data.amountPaid,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to confirm your purchase";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    completePurchase();

    return () => {
      cancelled = true;
    };
  }, [router, sessionId]);

  return (
    <main style={{ minHeight: "100vh", background: "linear-gradient(180deg, #ecfdf5 0%, #f9fafb 45%)" }}>
      <Navbar />

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "3rem 1.5rem 4rem" }}>
        {loading && (
          <div style={{ textAlign: "center", color: "#6b7280", padding: "4rem 0" }}>
            Confirming your extra bin purchase...
          </div>
        )}

        {!loading && error && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              border: "1px solid #fecaca",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.06)",
            }}
          >
            <h1 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#991b1b", marginBottom: "0.75rem" }}>
              We could not confirm your purchase
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>{error}</p>
            <Link
              href="/dashboard"
              style={{
                display: "inline-block",
                background: "#16a34a",
                color: "#ffffff",
                padding: "0.75rem 1.25rem",
                borderRadius: "10px",
                fontWeight: "600",
                textDecoration: "none",
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        )}

        {!loading && !error && details && (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "2.5rem 2rem",
              border: "1px solid #bbf7d0",
              boxShadow: "0 12px 32px rgba(22, 163, 74, 0.12)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "#16a34a",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                margin: "0 auto 1.25rem",
              }}
            >
              ✓
            </div>

            <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#14532d", marginBottom: "0.5rem" }}>
              Extra Bin Purchase Complete
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "2rem", lineHeight: 1.6 }}>
              Your payment was processed and your account has been updated.
            </p>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                textAlign: "left",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "14px",
                  padding: "1rem 1.25rem",
                }}
              >
                <div style={{ fontSize: "0.875rem", color: "#166534", fontWeight: "600", marginBottom: "0.25rem" }}>
                  Added this purchase
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#14532d" }}>
                  {details.quantity} extra bin{details.quantity > 1 ? "s" : ""} · ${details.amountPaid}
                </div>
              </div>

              <div
                style={{
                  background: "#f9fafb",
                  border: "1px solid #e5e7eb",
                  borderRadius: "14px",
                  padding: "1rem 1.25rem",
                }}
              >
                <div style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: "600", marginBottom: "0.25rem" }}>
                  Your account now includes
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>
                  {details.totalBins} bin{details.totalBins > 1 ? "s" : ""} per cleaning
                </div>
                {details.extraBinsTotal > 0 && (
                  <div style={{ fontSize: "0.9rem", color: "#6b7280", marginTop: "0.35rem" }}>
                    {details.extraBinsTotal} extra bin{details.extraBinsTotal > 1 ? "s" : ""} beyond your included bin
                  </div>
                )}
              </div>
            </div>

            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Extra bins are charged at $10 per bin per cleaning visit. Your updated bin count will appear on your
              dashboard and be used for future scheduled cleanings.
            </p>

            <Link
              href="/dashboard"
              style={{
                display: "inline-block",
                background: "#16a34a",
                color: "#ffffff",
                padding: "0.85rem 1.5rem",
                borderRadius: "10px",
                fontWeight: "700",
                textDecoration: "none",
              }}
            >
              Go to My Dashboard
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function ExtraBinSuccessPage() {
  return (
    <Suspense
      fallback={
        <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#6b7280", padding: "4rem 1.5rem" }}>
            Loading purchase confirmation...
          </div>
        </main>
      }
    >
      <ExtraBinSuccessContent />
    </Suspense>
  );
}
