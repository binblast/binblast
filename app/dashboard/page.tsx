// app/dashboard/page.tsx
"use client";

import { useEffect, useState, Component, ErrorInfo, ReactNode, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScheduleCleaningForm } from "@/components/ScheduleCleaningForm";
import { SubscriptionManagerWrapper } from "@/components/SubscriptionManagerWrapper";
import { PlanId } from "@/lib/stripe-config";
import Image from "next/image";
import Link from "next/link";

// Error boundary to catch component rendering errors
class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; onRetry?: () => void }> {
  state = { hasError: false, error: null as Error | null, retryCount: 0 };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo);
    // Don't let errors crash the entire page
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Log the error but don't crash the page
      if (this.state.error) {
        console.error("[ErrorBoundary] Caught error:", this.state.error.message);
      }
      // If it's a Firebase error, try to show fallback with retry
      if (this.state.error?.message?.includes("apiKey") || this.state.error?.message?.includes("authenticator")) {
        return this.props.fallback || (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
            <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              Unable to load subscription manager.
            </p>
            <button
              onClick={this.handleRetry}
              className="btn btn-primary"
              style={{ fontSize: "0.875rem", padding: "0.5rem 1rem", marginRight: "0.5rem" }}
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="btn"
              style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
            >
              Refresh Page
            </button>
          </div>
        );
      }
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  selectedPlan?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string;
  paymentStatus?: string;
  createdAt?: any;
}

const PLAN_NAMES: Record<string, string> = {
  "one-time": "Monthly Clean",
  "twice-month": "Bi-Weekly Clean (2x/Month)",
  "bi-monthly": "Bi-Monthly Plan – Yearly Package",
  "quarterly": "Quarterly Plan – Yearly Package",
  "commercial": "Commercial & HOA Plans",
};

interface ScheduledCleaning {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  trashDay: string;
  notes?: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: any;
}

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<UserData | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledCleanings, setScheduledCleanings] = useState<ScheduledCleaning[]>([]);
  const [cleaningsLoading, setCleaningsLoading] = useState(true);
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<Date | undefined>();
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Handle Stripe Checkout callback
  useEffect(() => {
    const subscriptionChange = searchParams.get("subscription_change");
    const checkoutSessionId = searchParams.get("payment_intent");
    
    if (subscriptionChange === "success" && checkoutSessionId && userId) {
      // Complete the subscription change after payment
      (async () => {
        try {
          // Get the new plan ID from session storage or URL params
          const storedNewPlanId = sessionStorage.getItem("pendingPlanChange");
          const storedSubscriptionId = sessionStorage.getItem("pendingSubscriptionId");
          
          if (storedNewPlanId && storedSubscriptionId) {
            const response = await fetch("/api/stripe/complete-subscription-change", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                checkoutSessionId,
                userId,
                newPlanId: storedNewPlanId,
                subscriptionId: storedSubscriptionId,
              }),
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
              // Clear stored values
              sessionStorage.removeItem("pendingPlanChange");
              sessionStorage.removeItem("pendingSubscriptionId");
              
              // Reload page to show updated subscription
              window.location.href = "/dashboard";
            } else {
              console.error("Failed to complete subscription change:", data.error);
              alert("Payment succeeded but failed to update subscription. Please contact support.");
            }
          }
        } catch (err) {
          console.error("Error completing subscription change:", err);
          alert("Payment succeeded but failed to update subscription. Please contact support.");
        }
      })();
    } else if (subscriptionChange === "cancelled") {
      // Clear stored values if cancelled
      sessionStorage.removeItem("pendingPlanChange");
      sessionStorage.removeItem("pendingSubscriptionId");
      // Remove query params
      router.replace("/dashboard");
    }
  }, [searchParams, userId, router]);

  // Initialize Firebase EARLY in a separate effect to ensure it's ready before any chunks load
  useEffect(() => {
    async function initFirebase() {
      try {
        // Import and initialize Firebase immediately
        const firebaseModule = await import("@/lib/firebase");
        const auth = await firebaseModule.getAuthInstance();
        const db = await firebaseModule.getDbInstance();
        
        // Ensure Firebase is fully initialized
        if (auth && db) {
          console.log("[Dashboard] Firebase pre-initialized successfully");
          setFirebaseReady(true);
        } else {
          console.warn("[Dashboard] Firebase initialized but auth/db are null");
          setFirebaseReady(true); // Allow page to load anyway
        }
      } catch (error: any) {
        console.error("[Dashboard] Firebase pre-initialization error:", error);
        setFirebaseReady(true); // Set to true anyway to allow page to load
      }
    }
    // Initialize immediately, don't wait
    initFirebase();
  }, []);

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    async function loadUserData() {
      try {
        console.log("[Dashboard] Starting to load user data...");
        
        // Dynamically import Firebase to avoid SSR issues
        // Initialize Firebase first
        await import("@/lib/firebase");
        const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        const db = await getDbInstance();
        const { onAuthStateChanged } = await import("firebase/auth");
        const { doc, getDoc } = await import("firebase/firestore");

        console.log("[Dashboard] Firebase imported:", { auth: !!auth, db: !!db });

        if (!auth || !db) {
          console.error("[Dashboard] Firebase is not configured - auth or db is undefined");
          if (mounted) {
            setError("Firebase is not configured. Please check your environment variables. Auth: " + (auth ? "OK" : "MISSING") + ", DB: " + (db ? "OK" : "MISSING"));
            setLoading(false);
          }
          return;
        }

        // Wait for auth state
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          console.log("[Dashboard] Auth state changed:", { user: !!firebaseUser, uid: firebaseUser?.uid });
          
          if (!firebaseUser) {
            console.log("[Dashboard] No user, redirecting to login");
            if (mounted) {
              router.push("/login");
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
              console.log("[Dashboard] User data loaded:", { email: userData.email, plan: userData.selectedPlan });
              setUser(userData);
            } else {
              // User document doesn't exist yet
              console.log("[Dashboard] User document doesn't exist, creating default");
              setUser({
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                lastName: firebaseUser.displayName?.split(" ")[1] || "",
                email: firebaseUser.email || "",
              });
            }

            // Load scheduled cleanings
            try {
              const { collection, query, where, getDocs, orderBy } = await import("firebase/firestore");
              const cleaningsQuery = query(
                collection(db, "scheduledCleanings"),
                where("userId", "==", firebaseUser.uid),
                orderBy("scheduledDate", "desc")
              );
              const cleaningsSnapshot = await getDocs(cleaningsQuery);
              const cleanings: ScheduledCleaning[] = [];
              cleaningsSnapshot.forEach((doc) => {
                cleanings.push({
                  id: doc.id,
                  ...doc.data(),
                } as ScheduledCleaning);
              });
              if (mounted) {
                setScheduledCleanings(cleanings);
                setCleaningsLoading(false);
              }
            } catch (cleaningsErr: any) {
              console.error("[Dashboard] Error loading cleanings:", cleaningsErr);
              if (mounted) {
                setCleaningsLoading(false);
              }
            }
          } catch (err: any) {
            console.error("[Dashboard] Error loading user data:", err);
            if (mounted) {
              setError("Failed to load user data: " + (err.message || "Unknown error"));
              setCleaningsLoading(false);
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        });
      } catch (err: any) {
        console.error("[Dashboard] Error initializing Firebase:", err);
        if (mounted) {
          setError(err.message || "Failed to initialize: " + String(err));
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
              <p style={{ color: "var(--text-light)" }}>Loading your dashboard...</p>
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
              <Link href="/login" className="btn btn-primary">Go to Login</Link>
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
                    <h1 className="section-title" style={{ textAlign: "left", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", fontSize: "clamp(1.5rem, 4vw, 2rem)" }}>
                      <span>Welcome back, {user.firstName}!</span>
                      <Image 
                        src="/logo.png" 
                        alt="Bin Blast Co. Logo" 
                        width={32} 
                        height={32}
                        style={{ objectFit: "contain", opacity: 0.8, height: "1em", width: "auto", verticalAlign: "middle", flexShrink: 0 }}
                      />
                    </h1>
            <p style={{ color: "var(--text-light)", marginBottom: "2rem" }}>
              Here&apos;s your account information and selected plan.
            </p>

            {/* Account Info Card */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                Account Information
              </h2>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>Name</div>
                  <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                    {user.firstName} {user.lastName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>Email</div>
                  <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                    {user.email}
                  </div>
                </div>
                {user.phone && (
                  <div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>Phone</div>
                    <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                      {user.phone}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Subscription & Plan Card */}
            {user.selectedPlan && (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb",
                marginBottom: "1.5rem"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                  Subscription & Plan
                </h2>
                <div style={{
                  padding: "1rem 1.5rem",
                  background: user.paymentStatus === "paid" ? "#ecfdf5" : "#fef3c7",
                  borderRadius: "12px",
                  border: `1px solid ${user.paymentStatus === "paid" ? "#16a34a" : "#f59e0b"}`,
                  marginBottom: "1rem"
                }}>
                  <p style={{ margin: 0, fontSize: "1rem", color: user.paymentStatus === "paid" ? "#047857" : "#92400e", fontWeight: "600" }}>
                    {PLAN_NAMES[user.selectedPlan] || user.selectedPlan}
                  </p>
                </div>
                
                {/* Payment Status */}
                {user.paymentStatus && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>Payment Status</div>
                    <div style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: "500", 
                      color: user.paymentStatus === "paid" ? "#047857" : "#dc2626",
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "6px",
                      background: user.paymentStatus === "paid" ? "#d1fae5" : "#fee2e2"
                    }}>
                      {user.paymentStatus === "paid" ? "✓ Paid" : "Pending"}
                    </div>
                  </div>
                )}

                {/* Subscription Status */}
                {user.subscriptionStatus && user.subscriptionStatus !== "none" && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>Subscription Status</div>
                    <div style={{ 
                      fontSize: "0.95rem", 
                      fontWeight: "500", 
                      color: user.subscriptionStatus === "active" ? "#047857" : "#dc2626",
                      display: "inline-block",
                      padding: "0.25rem 0.75rem",
                      borderRadius: "6px",
                      background: user.subscriptionStatus === "active" ? "#d1fae5" : "#fee2e2",
                      textTransform: "capitalize"
                    }}>
                      {user.subscriptionStatus === "active" ? "✓ Active" : user.subscriptionStatus}
                    </div>
                  </div>
                )}

                {/* Stripe Customer ID (for support/debugging) */}
                {user.stripeCustomerId && (
                  <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-light)" }}>
                      Stripe Customer ID: <code style={{ fontSize: "0.7rem", color: "#6b7280" }}>{user.stripeCustomerId}</code>
                    </div>
                  </div>
                )}

                {!user.paymentStatus || user.paymentStatus === "pending" ? (
                  <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--text-light)" }}>
                    Complete your payment to activate your subscription.
                  </p>
                ) : (
                  <>
                    <p style={{ marginTop: "1rem", fontSize: "0.875rem", color: "var(--text-light)" }}>
                      Your subscription is active. You can schedule cleanings below.
                    </p>
                    {user.selectedPlan && 
                     (user.stripeSubscriptionId || (user.paymentStatus === "paid" && user.stripeCustomerId)) && 
                     ["one-time", "twice-month", "bi-monthly", "quarterly"].includes(user.selectedPlan) && userId && (
                      <ErrorBoundary 
                        fallback={
                          <div style={{ marginTop: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
                            <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                              Unable to load subscription manager. The page will continue to work normally.
                            </p>
                            <button
                              onClick={() => window.location.reload()}
                              className="btn btn-primary"
                              style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
                            >
                              Refresh Page
                            </button>
                          </div>
                        }
                      >
                        <Suspense fallback={null}>
                          <SubscriptionManagerWrapper
                          userId={userId}
                          currentPlanId={user.selectedPlan as PlanId}
                          stripeSubscriptionId={user.stripeSubscriptionId || null}
                          stripeCustomerId={user.stripeCustomerId || null}
                            billingPeriodEnd={undefined}
                          onPlanChanged={() => {
                            // Reload user data after plan change
                            window.location.reload();
                          }}
                        />
                        </Suspense>
                      </ErrorBoundary>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Next Steps */}
            {!user.selectedPlan && (
              <div style={{
                background: "#eff6ff",
                borderRadius: "20px",
                padding: "2rem",
                border: "1px solid #bfdbfe",
                marginBottom: "1.5rem"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "#1e40af" }}>
                  Next Steps
                </h2>
                <p style={{ color: "#1e3a8a", marginBottom: "1.5rem" }}>
                  Your account has been created successfully! To complete your subscription setup, please select a plan.
                </p>
                <Link href="/#pricing" className="btn btn-primary">
                  Choose a Plan
                </Link>
              </div>
            )}

            {/* Schedule Cleaning Form */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                Schedule a Cleaning
              </h2>
              <ScheduleCleaningForm
                userId={userId}
                userEmail={user.email}
                onScheduleCreated={() => {
                  // Reload cleanings
                  window.location.reload();
                }}
              />
            </div>

            {/* Scheduled Cleanings */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                Your Scheduled Cleanings
              </h2>
              
              {cleaningsLoading ? (
                <p style={{ color: "var(--text-light)" }}>Loading scheduled cleanings...</p>
              ) : scheduledCleanings.length === 0 ? (
                <p style={{ color: "var(--text-light)" }}>No scheduled cleanings yet. Schedule your first cleaning above!</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {scheduledCleanings.map((cleaning) => {
                    const cleaningDate = new Date(cleaning.scheduledDate);
                    const isPast = cleaningDate < new Date();
                    const statusColor = cleaning.status === "completed" 
                      ? "#16a34a" 
                      : cleaning.status === "cancelled"
                      ? "#dc2626"
                      : isPast
                      ? "#f59e0b"
                      : "#3b82f6";

                    return (
                      <div
                        key={cleaning.id}
                        style={{
                          padding: "1.25rem",
                          background: "#f9fafb",
                          borderRadius: "12px",
                          border: `1px solid ${statusColor}20`,
                          borderLeft: `4px solid ${statusColor}`
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                          <div>
                            <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                              {cleaningDate.toLocaleDateString("en-US", { 
                                weekday: "long", 
                                month: "long", 
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "var(--text-light)" }}>
                              {cleaning.scheduledTime}
                            </div>
                          </div>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            background: `${statusColor}20`,
                            color: statusColor,
                            textTransform: "capitalize"
                          }}>
                            {cleaning.status}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                          <strong>Address:</strong> {cleaning.addressLine1}
                          {cleaning.addressLine2 && `, ${cleaning.addressLine2}`}
                          <br />
                          {cleaning.city}, {cleaning.state} {cleaning.zipCode}
                        </div>
                        {cleaning.trashDay && (
                          <div style={{ fontSize: "0.875rem", color: "var(--text-light)" }}>
                            <strong>Trash Day:</strong> {cleaning.trashDay}
                          </div>
                        )}
                        {cleaning.notes && (
                          <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginTop: "0.5rem", fontStyle: "italic" }}>
                            <strong>Notes:</strong> {cleaning.notes}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Info Block */}
            <div style={{
              background: "#f0f9ff",
              borderRadius: "20px",
              padding: "1.5rem",
              border: "1px solid #bae6fd"
            }}>
              <p style={{ fontSize: "0.875rem", color: "#0c4a6e", margin: 0 }}>
                <strong>How it works:</strong> Schedule your cleaning based on your trash pickup day. We&apos;ll clean your bins on the same day as trash pickup, or within 24-48 hours after. All scheduled cleanings are saved here for your reference.
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center", padding: "3rem 0" }}>
              <p style={{ color: "var(--text-light)" }}>Loading your dashboard...</p>
            </div>
          </div>
        </main>
      </>
    }>
      <DashboardPageContent />
    </Suspense>
  );
}

