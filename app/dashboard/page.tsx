// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ScheduleCleaningForm } from "@/components/ScheduleCleaningForm";
import { SubscriptionManager } from "@/components/SubscriptionManager";
import Link from "next/link";

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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduledCleanings, setScheduledCleanings] = useState<ScheduledCleaning[]>([]);
  const [cleaningsLoading, setCleaningsLoading] = useState(true);
  const [billingPeriodEnd, setBillingPeriodEnd] = useState<Date | undefined>();

  useEffect(() => {
    async function loadUserData() {
      try {
        // Dynamically import Firebase to avoid SSR issues
        const { auth } = await import("@/lib/firebase");
        const { onAuthStateChanged } = await import("firebase/auth");
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore");

        if (!auth || !db) {
          throw new Error("Firebase is not configured");
        }

        // Wait for auth state
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (!firebaseUser) {
            router.push("/login");
            return;
          }

          setUserId(firebaseUser.uid);

          try {
            // Get user data from Firestore
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              setUser(userData);
            } else {
              // User document doesn't exist yet
              setUser({
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                lastName: firebaseUser.displayName?.split(" ")[1] || "",
                email: firebaseUser.email || "",
              });
            }

            // Load scheduled cleanings
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
            setScheduledCleanings(cleanings);
            setCleaningsLoading(false);
          } catch (err: any) {
            console.error("Error loading user data:", err);
            setError("Failed to load user data");
            setCleaningsLoading(false);
          } finally {
            setLoading(false);
          }
        });
      } catch (err: any) {
        console.error("Error initializing Firebase:", err);
        setError(err.message || "Failed to initialize");
        setLoading(false);
      }
    }

    loadUserData();
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
            <h1 className="section-title" style={{ textAlign: "left", marginBottom: "0.5rem" }}>
              Welcome back, {user.firstName}! 👋
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
                    {(user.stripeSubscriptionId || (user.paymentStatus === "paid" && user.stripeCustomerId)) && (
                      <SubscriptionManager
                        userId={userId}
                        currentPlanId={user.selectedPlan as any}
                        stripeSubscriptionId={user.stripeSubscriptionId || null}
                        stripeCustomerId={user.stripeCustomerId || null}
                        billingPeriodEnd={billingPeriodEnd}
                        onPlanChanged={() => {
                          // Reload user data after plan change
                          window.location.reload();
                        }}
                      />
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

