// app/subscription/page.tsx
"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import { PlanId } from "@/lib/stripe-config";

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  selectedPlan?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  paymentStatus?: string;
}

function SubscriptionPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<Date | undefined>();

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    async function loadUserData() {
      try {
        // Dynamically import Firebase
        await import("@/lib/firebase");
        const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        const db = await getDbInstance();
        const { onAuthStateChanged } = await import("firebase/auth");
        const { doc, getDoc } = await import("firebase/firestore");

        if (!auth || !db) {
          if (mounted) {
            setError("Firebase is not configured");
            setLoading(false);
          }
          return;
        }

        // Wait for auth state
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            if (mounted) {
              router.push("/login?callbackUrl=/subscription");
            }
            return;
          }

          if (!mounted) return;

          setUserId(firebaseUser.uid);

          try {
            // Get user data from Firestore
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!mounted) return;

            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              setUser(userData);
            } else {
              setUser({
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                lastName: firebaseUser.displayName?.split(" ")[1] || "",
                email: firebaseUser.email || "",
              });
            }
          } catch (err: any) {
            console.error("[SubscriptionPage] Error loading user data:", err);
            if (mounted) {
              setError("Failed to load user data: " + (err.message || "Unknown error"));
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        });
      } catch (err: any) {
        console.error("[SubscriptionPage] Error initializing Firebase:", err);
        if (mounted) {
          setError(err.message || "Failed to initialize");
          setLoading(false);
        }
      }
    }

    loadUserData();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <p style={{ color: "var(--text-light)" }}>Loading subscription management...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", padding: "3rem 0" }}>
              <h1 className="section-title" style={{ marginBottom: "1rem" }}>Error</h1>
              <p style={{ color: "var(--text-light)", marginBottom: "2rem" }}>
                {error || "Failed to load your account information"}
              </p>
              <button onClick={() => router.push("/dashboard")} className="btn btn-primary">
                Back to Dashboard
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Check if user can manage subscriptions
  const canManage = user.selectedPlan && 
    (user.stripeSubscriptionId || (user.paymentStatus === "paid" && user.stripeCustomerId)) && 
    ["one-time", "twice-month", "bi-monthly", "quarterly"].includes(user.selectedPlan) && 
    userId;

  if (!canManage) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center", padding: "3rem 0" }}>
              <h1 className="section-title" style={{ marginBottom: "1rem" }}>Subscription Management</h1>
              <p style={{ color: "var(--text-light)", marginBottom: "2rem" }}>
                Subscription management is not available for your current plan.
              </p>
              <button onClick={() => router.push("/dashboard")} className="btn btn-primary">
                Back to Dashboard
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
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={() => router.push("/dashboard")}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-light)",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem"
                }}
              >
                ← Back to Dashboard
              </button>
              <h1 className="section-title" style={{ textAlign: "left", marginBottom: "0.5rem" }}>
                Manage Your Subscription
              </h1>
              <p style={{ color: "var(--text-light)", marginBottom: "2rem" }}>
                Change your subscription plan or manage your billing.
              </p>
            </div>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb",
            }}>
              <SubscriptionManager
                userId={userId}
                currentPlanId={user.selectedPlan as PlanId}
                stripeSubscriptionId={user.stripeSubscriptionId || null}
                stripeCustomerId={user.stripeCustomerId || null}
                billingPeriodEnd={billingPeriodEnd}
                onPlanChanged={() => {
                  // Redirect back to dashboard after plan change
                  router.push("/dashboard");
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function SubscriptionPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <p style={{ color: "var(--text-light)" }}>Loading subscription management...</p>
            </div>
          </div>
        </main>
      </>
    }>
      <SubscriptionPageContent />
    </Suspense>
  );
}

