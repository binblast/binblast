// app/dashboard/page.tsx
"use client";

import { useEffect, useState, Component, ErrorInfo, ReactNode, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScheduleCleaningForm } from "@/components/ScheduleCleaningForm";
import { SubscriptionManagerWrapper } from "@/components/SubscriptionManagerWrapper";
import { ReferralRewards } from "@/components/ReferralRewards";
import { LoyaltyBadges } from "@/components/LoyaltyBadges";
import { PlanId } from "@/lib/stripe-config";
import Link from "next/link";

// Error boundary to catch component rendering errors
class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode; onRetry?: () => void }> {
  state = { hasError: false, error: null as Error | null, retryCount: 0 };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Component error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, retryCount: this.state.retryCount + 1 });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.state.error) {
        console.error("[ErrorBoundary] Caught error:", this.state.error.message);
      }
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

const PLAN_DESCRIPTIONS: Record<string, string> = {
  "one-time": "1 professional bin cleaning every month.",
  "twice-month": "2 professional bin cleanings every month.",
  "bi-monthly": "6 professional bin cleanings per year.",
  "quarterly": "4 professional bin cleanings per year.",
  "commercial": "Custom cleaning schedule for your business.",
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
  const [accountInfoExpanded, setAccountInfoExpanded] = useState(false);
  
  // Refs for scroll targets
  const scheduleSectionRef = useRef<HTMLDivElement>(null);
  const planSectionRef = useRef<HTMLDivElement>(null);
  const rewardsSectionRef = useRef<HTMLDivElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);

  // Handle Stripe Checkout callback
  useEffect(() => {
    const subscriptionChange = searchParams.get("subscription_change");
    const sessionId = searchParams.get("session_id");

    if (subscriptionChange === "success" && sessionId) {
      console.log("[Dashboard] Stripe Checkout success detected. Completing subscription change...");
      router.replace("/dashboard", undefined);

      const pendingChange = sessionStorage.getItem("pendingSubscriptionChange");
      if (pendingChange) {
        const { userId, newPlanId, subscriptionId } = JSON.parse(pendingChange);
        
        fetch("/api/stripe/complete-subscription-change", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert("Subscription upgrade completed successfully!");
            sessionStorage.removeItem("pendingSubscriptionChange");
            window.location.reload();
          } else {
            alert(`Failed to complete subscription upgrade: ${data.error}`);
          }
        })
        .catch(err => {
          console.error("[Dashboard] Error completing subscription change:", err);
          alert("An error occurred while finalizing your subscription upgrade.");
        });
      } else {
        window.location.reload();
      }
    } else if (subscriptionChange === "cancelled") {
      router.replace("/dashboard", undefined);
      alert("Subscription change cancelled.");
      sessionStorage.removeItem("pendingSubscriptionChange");
    }
  }, [searchParams, router]);

  // Initialize Firebase
  useEffect(() => {
    let isMounted = true;
    async function initFirebase() {
      try {
        const firebaseModule = await import("@/lib/firebase");
        const auth = await firebaseModule.getAuthInstance();
        const db = await firebaseModule.getDbInstance();
        
        if (isMounted) {
          if (auth && db) {
            console.log("[Dashboard] Firebase pre-initialized successfully");
            setFirebaseReady(true);
          } else {
            setFirebaseReady(true);
          }
        }
      } catch (error: any) {
        if (isMounted) {
          console.error("[Dashboard] Firebase pre-initialization error:", error);
          setFirebaseReady(true);
        }
      }
    }
    initFirebase();
    return () => { isMounted = false; };
  }, []);

  // Load user data
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;
    
    async function loadUserData() {
      try {
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

        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            if (mounted) {
              router.push("/login");
            }
            return;
          }

          if (!mounted) return;
          setUserId(firebaseUser.uid);

          try {
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

  // Helper functions
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Get next cleaning
  const getNextCleaning = () => {
    const now = new Date();
    const upcoming = scheduledCleanings
      .filter(c => {
        const date = new Date(c.scheduledDate);
        return date >= now && c.status !== "cancelled";
      })
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())[0];
    return upcoming;
  };

  const nextCleaning = getNextCleaning();
  const upcomingCleanings = scheduledCleanings.filter(c => {
    const date = new Date(c.scheduledDate);
    return date >= new Date() && c.status !== "cancelled";
  }).sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

  const pastCleanings = scheduledCleanings.filter(c => {
    const date = new Date(c.scheduledDate);
    return date < new Date() || c.status === "completed" || c.status === "cancelled";
  }).sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime());

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

  const shouldShowSubscriptionManager = user.selectedPlan && 
    (user.stripeSubscriptionId || (user.paymentStatus === "paid" && user.stripeCustomerId)) && 
    ["one-time", "twice-month", "bi-monthly", "quarterly"].includes(user.selectedPlan) && 
    userId && firebaseReady;

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            
            {/* (A) Hero Welcome + Status Summary */}
            <div style={{ marginBottom: "2rem" }}>
              <h1 style={{ 
                fontSize: "clamp(2rem, 5vw, 2.5rem)", 
                fontWeight: "700", 
                color: "var(--text-dark)",
                marginBottom: "0.5rem"
              }}>
                Welcome back, {user.firstName}!
              </h1>
              <p style={{ 
                fontSize: "1rem", 
                color: "#6b7280", 
                marginBottom: "1.5rem"
              }}>
                Here&apos;s a quick look at your bin cleaning status.
              </p>

              {/* Status Summary Card */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                border: "1px solid #e5e7eb",
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem"
              }}>
                {/* Next Cleaning */}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Next Cleaning
                  </div>
                  {nextCleaning ? (
                    <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)" }}>
                      {new Date(nextCleaning.scheduledDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  ) : (
                    <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#6b7280", marginBottom: "0.5rem" }}>
                      No cleaning scheduled
                    </div>
                  )}
                  {!nextCleaning && (
                    <button
                      onClick={() => scrollToSection(scheduleSectionRef)}
                      style={{
                        fontSize: "0.875rem",
                        color: "#16a34a",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        fontWeight: "600",
                        textDecoration: "underline"
                      }}
                    >
                      Schedule Now →
                    </button>
                  )}
                </div>

                {/* Plan */}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Plan
                  </div>
                  {user.selectedPlan ? (
                    <>
                      <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                        {PLAN_NAMES[user.selectedPlan] || user.selectedPlan}
                      </div>
                      <div style={{ 
                        fontSize: "0.875rem", 
                        color: user.subscriptionStatus === "active" ? "#16a34a" : "#6b7280",
                        fontWeight: "500"
                      }}>
                        {user.subscriptionStatus === "active" ? "Active" : "Inactive"}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#6b7280" }}>
                      No plan selected
                    </div>
                  )}
                </div>

                {/* Payments */}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Payments
                  </div>
                  <div style={{ 
                    fontSize: "1.125rem", 
                    fontWeight: "600", 
                    color: user.paymentStatus === "paid" ? "#16a34a" : "#dc2626"
                  }}>
                    {user.paymentStatus === "paid" ? "Paid" : user.paymentStatus === "pending" ? "Pending" : "Past Due"}
                  </div>
                </div>
              </div>
            </div>

            {/* (B) Quick Action Buttons Row */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "1rem"
              }}>
                <button
                  onClick={() => scrollToSection(scheduleSectionRef)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "1.25rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>Schedule Cleaning</span>
                </button>

                <button
                  onClick={() => scrollToSection(planSectionRef)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "1.25rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>Manage Plan</span>
                </button>

                <button
                  onClick={() => scrollToSection(rewardsSectionRef)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "1.25rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>View Rewards</span>
                </button>

                <button
                  onClick={() => scrollToSection(accountSectionRef)}
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "12px",
                    padding: "1.25rem 1rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.5rem",
                    transition: "all 0.2s",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                  }}
                >
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>Update Info</span>
                </button>
              </div>
            </div>

            {/* (C) Schedule a Cleaning */}
            <div ref={scheduleSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "0.5rem" }}>
                  Schedule a Cleaning
                </h2>
                <p style={{ 
                  fontSize: "0.95rem", 
                  color: "#6b7280", 
                  marginBottom: "2rem"
                }}>
                  Pick your trash day and confirm your address below.
                </p>
                <ScheduleCleaningForm
                  userId={userId}
                  userEmail={user.email}
                  onScheduleCreated={() => {
                    window.location.reload();
                  }}
                />
                <p style={{ 
                  fontSize: "0.875rem", 
                  color: "#6b7280", 
                  marginTop: "1rem",
                  fontStyle: "italic"
                }}>
                  We&apos;ll arrive on or shortly after your selected trash day.
                </p>
              </div>
            </div>

            {/* (D) Subscription & Plan Card */}
            {user.selectedPlan && (
              <div ref={planSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1rem" }}>
                    Your Plan
                  </h2>

                  <div style={{
                    padding: "1.5rem",
                    background: user.paymentStatus === "paid" ? "#ecfdf5" : "#fef3c7",
                    borderRadius: "12px",
                    border: `2px solid ${user.paymentStatus === "paid" ? "#16a34a" : "#f59e0b"}`,
                    marginBottom: "1.5rem"
                  }}>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: user.paymentStatus === "paid" ? "#047857" : "#92400e", marginBottom: "0.5rem" }}>
                      {PLAN_NAMES[user.selectedPlan] || user.selectedPlan}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: user.paymentStatus === "paid" ? "#065f46" : "#78350f", marginBottom: "1rem" }}>
                      {PLAN_DESCRIPTIONS[user.selectedPlan] || "Professional bin cleaning service."}
                    </div>
                    <div style={{ 
                      display: "inline-block",
                      padding: "0.375rem 0.875rem",
                      borderRadius: "999px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      background: user.paymentStatus === "paid" ? "#16a34a" : "#f59e0b",
                      color: "#ffffff"
                    }}>
                      {user.paymentStatus === "paid" ? "✓ Paid" : "Pending Payment"}
                    </div>
                  </div>

                  {shouldShowSubscriptionManager && (
                    <div style={{ marginTop: "1.5rem" }}>
                      <ErrorBoundary fallback={null}>
                        <Suspense fallback={null}>
                          <SubscriptionManagerWrapper
                            userId={userId}
                            currentPlanId={user.selectedPlan as PlanId}
                            stripeSubscriptionId={user.stripeSubscriptionId || null}
                            stripeCustomerId={user.stripeCustomerId || null}
                            billingPeriodEnd={undefined}
                            onPlanChanged={() => {
                              window.location.reload();
                            }}
                          />
                        </Suspense>
                      </ErrorBoundary>
                    </div>
                  )}

                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => scrollToSection(planSectionRef)}
                      style={{
                        fontSize: "0.875rem",
                        color: "#16a34a",
                        background: "transparent",
                        border: "1px solid #16a34a",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#16a34a";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#16a34a";
                      }}
                    >
                      Change Plan
                    </button>
                    <button
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        background: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#6b7280";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                    >
                      Add an Extra Bin
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Next Steps (if no plan) */}
            {!user.selectedPlan && (
              <div style={{
                background: "#eff6ff",
                borderRadius: "20px",
                padding: "2rem",
                border: "1px solid #bfdbfe",
                marginBottom: "2rem"
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

            {/* (E) Loyalty Badges */}
            {userId && (
              <div ref={rewardsSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <LoyaltyBadges userId={userId} />
              </div>
            )}

            {/* (F) Referral Rewards */}
            {userId && (
              <div style={{ marginBottom: "2rem" }}>
                <ReferralRewards userId={userId} />
              </div>
            )}

            {/* (G) Upcoming & Past Cleanings */}
            <div style={{ marginBottom: "2rem" }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1.5rem" }}>
                  Your Cleanings
                </h2>

                {/* Upcoming */}
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                    Upcoming
                  </h3>
                  {cleaningsLoading ? (
                    <p style={{ color: "#6b7280" }}>Loading scheduled cleanings...</p>
                  ) : upcomingCleanings.length === 0 ? (
                    <div style={{
                      padding: "2rem",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      textAlign: "center",
                      border: "1px dashed #d1d5db"
                    }}>
                      <p style={{ color: "#6b7280", margin: 0 }}>
                        No cleanings scheduled yet. Use the Schedule button above to book your first cleaning.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {upcomingCleanings.map((cleaning) => {
                        const cleaningDate = new Date(cleaning.scheduledDate);
                        return (
                          <div
                            key={cleaning.id}
                            style={{
                              padding: "1.25rem",
                              background: "#f0f9ff",
                              borderRadius: "12px",
                              border: "1px solid #bae6fd"
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
                                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                  {cleaning.scheduledTime}
                                </div>
                              </div>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "999px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: "#3b82f620",
                                color: "#3b82f6",
                                textTransform: "capitalize"
                              }}>
                                Scheduled
                              </span>
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                              <strong>Address:</strong> {cleaning.addressLine1}
                              {cleaning.addressLine2 && `, ${cleaning.addressLine2}`}
                              <br />
                              {cleaning.city}, {cleaning.state} {cleaning.zipCode}
                            </div>
                            {cleaning.trashDay && (
                              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                <strong>Trash Day:</strong> {cleaning.trashDay}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* History */}
                {pastCleanings.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                      History
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      {pastCleanings.slice(0, 5).map((cleaning) => {
                        const cleaningDate = new Date(cleaning.scheduledDate);
                        const statusColor = cleaning.status === "completed" ? "#16a34a" : "#dc2626";
                        return (
                          <div
                            key={cleaning.id}
                            style={{
                              padding: "1rem",
                              background: "#f9fafb",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.875rem", fontWeight: "500", color: "var(--text-dark)" }}>
                                {cleaningDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                {cleaning.addressLine1}, {cleaning.city}
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
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* (H) Account Information (Collapsible) */}
            <div ref={accountSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <button
                  onClick={() => setAccountInfoExpanded(!accountInfoExpanded)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)", margin: 0 }}>
                    Account Information
                  </h2>
                  <span style={{ fontSize: "1.25rem", color: "#6b7280" }}>
                    {accountInfoExpanded ? "−" : "+"}
                  </span>
                </button>

                {accountInfoExpanded && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ display: "grid", gap: "1.25rem" }}>
                      <div>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "500" }}>Name</div>
                        <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                          {user.firstName} {user.lastName}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "500" }}>Email</div>
                        <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                          {user.email}
                        </div>
                      </div>
                      {user.phone && (
                        <div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "500" }}>Phone</div>
                          <div style={{ fontSize: "1rem", fontWeight: "500", color: "var(--text-dark)" }}>
                            {user.phone}
                          </div>
                        </div>
                      )}
                    </div>
                    <button
                      style={{
                        marginTop: "1.5rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        background: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                        cursor: "pointer",
                        fontWeight: "500"
                      }}
                    >
                      Edit Account Info
                    </button>
                  </div>
                )}
              </div>
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
