// app/dashboard/page.tsx
"use client";

import { useEffect, useState, Component, ErrorInfo, ReactNode, Suspense, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ScheduleCleaningForm } from "@/components/ScheduleCleaningForm";
import { SubscriptionManagerWrapper } from "@/components/SubscriptionManagerWrapper";
import { ReferralRewards } from "@/components/ReferralRewards";
import { ReferralHistory } from "@/components/ReferralHistory";
import { LoyaltyBadges } from "@/components/LoyaltyBadges";
import { AdminPartnerApplications } from "@/components/AdminPartnerApplications";
import { AdminPartnerManagement } from "@/components/AdminPartnerManagement";
import { PlanId } from "@/lib/stripe-config";
import Link from "next/link";
import { BusinessOverview } from "@/components/OwnerDashboard/BusinessOverview";
import { CustomerManagement } from "@/components/OwnerDashboard/CustomerManagement";
import { CleaningScheduleBoard } from "@/components/OwnerDashboard/CleaningScheduleBoard";
import { CommercialAccounts } from "@/components/OwnerDashboard/CommercialAccounts";
import { PartnerProgramManagement } from "@/components/OwnerDashboard/PartnerProgramManagement";
import { FinancialAnalytics } from "@/components/OwnerDashboard/FinancialAnalytics";
import { SystemControls } from "@/components/OwnerDashboard/SystemControls";

// CRITICAL: Dynamically import Navbar to prevent webpack from bundling firebase-context.tsx into page chunks
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

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
  role?: string; // "admin" | "customer" | "partner"
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

const ADMIN_EMAIL = "binblastcompany@gmail.com";

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  
  // Admin state
  const [adminStats, setAdminStats] = useState({
    totalCustomers: 0,
    customersByPlan: {} as Record<string, number>,
    activePartners: 0,
    upcomingCleanings: 0,
    estimatedMonthlyRevenue: 0,
  });
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [commercialCustomers, setCommercialCustomers] = useState<any[]>([]);
  const [allCleanings, setAllCleanings] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    creditsGranted: 0,
    creditsRedeemed: 0,
    topReferrers: [] as Array<{ name: string; email: string; count: number }>,
    loyaltyLevels: {} as Record<string, number>,
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<{ plan?: string; source?: string; search?: string }>({});
  
  // Refs for scroll targets
  const scheduleSectionRef = useRef<HTMLDivElement>(null);
  const planSectionRef = useRef<HTMLDivElement>(null);
  const rewardsSectionRef = useRef<HTMLDivElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);
  const overviewSectionRef = useRef<HTMLDivElement>(null);
  const customersSectionRef = useRef<HTMLDivElement>(null);
  const commercialSectionRef = useRef<HTMLDivElement>(null);

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
        const { getAuthInstance, getDbInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        let db = await getDbInstance();
        
        // Ensure Firebase is initialized before importing firestore
        if (!db) {
          throw new Error("Firebase is not initialized. Check environment variables.");
        }
        
        // CRITICAL: Use safe import wrapper to ensure Firebase app exists
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;

        if (!auth || !db) {
          if (mounted) {
            setError("Firebase is not configured");
            setLoading(false);
          }
          return;
        }

        unsubscribe = await onAuthStateChanged(async (firebaseUser) => {
          if (!firebaseUser) {
            if (mounted) {
              router.push("/login");
            }
            return;
          }

          if (!mounted) return;
          setUserId(firebaseUser.uid);

          // Check if user is a partner and redirect accordingly (unless admin)
          try {
            const { getDashboardUrl } = await import("@/lib/partner-auth");
            const dashboardUrl = await getDashboardUrl(firebaseUser.uid);
            
            // If user is a partner and not on admin email, redirect to partner dashboard
            if (dashboardUrl !== "/dashboard" && firebaseUser.email !== ADMIN_EMAIL) {
              if (mounted) {
                router.push(dashboardUrl);
              }
              return;
            }
          } catch (partnerCheckErr) {
            console.warn("[Dashboard] Error checking partner status:", partnerCheckErr);
            // Continue with regular dashboard if partner check fails
          }

          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!mounted) return;

            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              setUser(userData);
              // Check for admin role OR admin email (backward compatibility)
              setIsAdmin((userData.role === "admin") || (userData.email === ADMIN_EMAIL));
            } else {
              const userEmail = firebaseUser.email || "";
              setUser({
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                lastName: firebaseUser.displayName?.split(" ")[1] || "",
                email: userEmail,
              });
              setIsOwner(false);
              setIsAdmin(userEmail === ADMIN_EMAIL);
            }

            // Load scheduled cleanings
            try {
              // Ensure db is still available before importing firestore
              if (!db) {
                const dbInstance = await getDbInstance();
                if (!dbInstance) {
                  throw new Error("Firebase Firestore is not available");
                }
                db = dbInstance;
              }
              // CRITICAL: Use safe import wrapper to ensure Firebase app exists
              const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
              const firestore = await safeImportFirestore();
              const { collection, query, where, getDocs, orderBy } = firestore;
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

  // Load admin data
  useEffect(() => {
    if (!isAdmin || !userId) {
      return;
    }
    
    let mounted = true;
    async function loadAdminData() {
      setAdminLoading(true);
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where, orderBy } = firestore;
        
        const db = await getDbInstance();
        if (!db) return;

        // Load all users (customers)
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const usersSnapshot = await getDocs(usersQuery);
        const customers: any[] = [];
        const planCounts: Record<string, number> = {};
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          customers.push({ id: doc.id, ...data });
          if (data.selectedPlan) {
            planCounts[data.selectedPlan] = (planCounts[data.selectedPlan] || 0) + 1;
          }
        });

        // Load partners
        const partnersQuery = query(
          collection(db, "partners"),
          where("status", "==", "active")
        );
        const partnersSnapshot = await getDocs(partnersQuery);
        const activePartners = partnersSnapshot.size;

        // Load upcoming cleanings (next 7 days)
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        const cleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          orderBy("scheduledDate", "asc")
        );
        const cleaningsSnapshot = await getDocs(cleaningsQuery);
        const allCleaningsList: any[] = [];
        let upcomingCount = 0;
        
        cleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          const cleaningDate = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate);
          if (cleaningDate >= new Date() && cleaningDate <= sevenDaysFromNow && data.status !== "cancelled") {
            upcomingCount++;
          }
          allCleaningsList.push({ id: doc.id, ...data });
        });

        // Load partner bookings to determine customer source
        const partnerBookingsQuery = query(collection(db, "partnerBookings"));
        const partnerBookingsSnapshot = await getDocs(partnerBookingsQuery);
        const partnerCustomerEmails = new Set<string>();
        partnerBookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.customerEmail) {
            partnerCustomerEmails.add(data.customerEmail);
          }
        });

        // Load completed cleanings count for each customer (for loyalty levels)
        const customerCompletedCounts: Record<string, number> = {};
        const completedCleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("status", "==", "completed")
        );
        const completedCleaningsSnapshot = await getDocs(completedCleaningsQuery);
        completedCleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId) {
            customerCompletedCounts[data.userId] = (customerCompletedCounts[data.userId] || 0) + 1;
          }
        });

        // Determine loyalty level based on completed cleanings
        const getLoyaltyLevel = (completedCount: number): string => {
          if (completedCount >= 50) return "Bin Royalty";
          if (completedCount >= 30) return "Sanitation Superstar";
          if (completedCount >= 15) return "Sparkle Specialist";
          if (completedCount >= 5) return "Bin Boss";
          if (completedCount >= 1) return "Clean Freak";
          return "Getting Started";
        };

        // Enhance customers with source info and loyalty level
        const enhancedCustomers = customers.map(customer => ({
          ...customer,
          source: partnerCustomerEmails.has(customer.email) ? "partner" : "direct",
          partnerName: null, // Could be enhanced later
          completedCleanings: customerCompletedCounts[customer.id] || 0,
          loyaltyLevel: getLoyaltyLevel(customerCompletedCounts[customer.id] || 0),
        }));

        // Filter commercial customers
        const commercial = enhancedCustomers.filter(c => 
          c.selectedPlan === "commercial" || c.selectedPlan?.includes("commercial") || c.selectedPlan?.includes("HOA")
        );

        // Calculate estimated monthly revenue (simplified)
        const planPrices: Record<string, number> = {
          "one-time": 25,
          "twice-month": 45,
          "bi-monthly": 20,
          "quarterly": 15,
          "commercial": 100, // Estimate
        };
        let estimatedRevenue = 0;
        enhancedCustomers.forEach(customer => {
          if (customer.subscriptionStatus === "active" && customer.selectedPlan) {
            const price = planPrices[customer.selectedPlan] || 25;
            const multiplier = customer.selectedPlan === "twice-month" ? 2 : customer.selectedPlan === "bi-monthly" ? 0.5 : customer.selectedPlan === "quarterly" ? 0.25 : 1;
            estimatedRevenue += price * multiplier;
          }
        });

        // Load referral stats
        let totalReferrals = 0;
        let creditsGranted = 0;
        let creditsRedeemed = 0;
        const referrerCounts: Record<string, { name: string; email: string; count: number }> = {};
        const loyaltyLevels: Record<string, number> = {};

        customers.forEach(customer => {
          if (customer.referralCount) {
            totalReferrals += customer.referralCount;
            const key = customer.referralCode || customer.email;
            if (!referrerCounts[key]) {
              referrerCounts[key] = {
                name: `${customer.firstName} ${customer.lastName}`,
                email: customer.email,
                count: 0,
              };
            }
            referrerCounts[key].count += customer.referralCount;
          }
          // Simple loyalty level based on referral count
          const level = customer.referralCount >= 10 ? "Level 3" : customer.referralCount >= 5 ? "Level 2" : customer.referralCount >= 1 ? "Level 1" : "Level 0";
          loyaltyLevels[level] = (loyaltyLevels[level] || 0) + 1;
        });

        const topReferrers = Object.values(referrerCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        if (mounted) {
          setAdminStats({
            totalCustomers: customers.length,
            customersByPlan: planCounts,
            activePartners,
            upcomingCleanings: upcomingCount,
            estimatedMonthlyRevenue: Math.round(estimatedRevenue),
          });
          setAllCustomers(enhancedCustomers);
          setCommercialCustomers(commercial);
          setAllCleanings(allCleaningsList);
          setReferralStats({
            totalReferrals,
            creditsGranted: totalReferrals * 10, // Assume 10 credits per referral
            creditsRedeemed: 0, // Would need to track this separately
            topReferrers,
            loyaltyLevels,
          });
          setAdminLoading(false);
        }
      } catch (err: any) {
        console.error("[Dashboard] Error loading admin data:", err);
        if (mounted) {
          setAdminLoading(false);
        }
      }
    }

    loadAdminData();
    return () => { mounted = false; };
  }, [isAdmin, userId]);

  // Helper functions
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Compute filtered customers for admin view
  const filteredCustomers = useMemo(() => {
    if (!isAdmin) return [];
    const searchTerm = customerFilter.search || "";
    const planFilter = customerFilter.plan || "";
    const sourceFilter = customerFilter.source || "";
    
    return allCustomers.filter((customer: any) => {
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const firstName = customer.firstName || "";
        const lastName = customer.lastName || "";
        const name = (firstName + " " + lastName).toLowerCase();
        const email = (customer.email || "").toLowerCase();
        if (!name.includes(search) && !email.includes(search)) return false;
      }
      if (planFilter && customer.selectedPlan !== planFilter) return false;
      if (sourceFilter && customer.source !== sourceFilter) return false;
      return true;
    });
  }, [isAdmin, allCustomers, customerFilter.search, customerFilter.plan, customerFilter.source]);

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
  
  const filteredUpcoming = scheduledCleanings.filter(c => {
    const date = new Date(c.scheduledDate);
    return date >= new Date() && c.status !== "cancelled";
  });
  const upcomingCleanings = filteredUpcoming.sort((a, b) => {
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  const filteredPast = scheduledCleanings.filter(c => {
    const date = new Date(c.scheduledDate);
    return date < new Date() || c.status === "completed" || c.status === "cancelled";
  });
  const pastCleanings = filteredPast.sort((a, b) => {
    return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
  });

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

  // Compute subscription manager visibility
  const validPlans = ["one-time", "twice-month", "bi-monthly", "quarterly"];
  const hasValidPlan = Boolean(user.selectedPlan && validPlans.includes(user.selectedPlan));
  const hasStripeSubscription = Boolean(user.stripeSubscriptionId);
  const hasPaidStatus = Boolean(user.paymentStatus === "paid" && user.stripeCustomerId);
  const hasValidSubscription = Boolean(hasStripeSubscription || hasPaidStatus);
  const hasUserId = Boolean(userId);
  const isFirebaseReady = Boolean(firebaseReady);
  const shouldShowSubscriptionManager = Boolean(hasValidPlan && hasValidSubscription && hasUserId && isFirebaseReady);

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
                {isOwner ? "Owner Dashboard - Complete business control center" : isAdmin ? "Admin Dashboard - Manage your business operations" : "Here's a quick look at your bin cleaning status."}
              </p>

              {/* Admin Navigation */}
              {isAdmin && (
                <div style={{
                  marginBottom: "2rem",
                  padding: "1rem",
                  background: "#ffffff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  display: "flex",
                  gap: "0.75rem",
                  flexWrap: "wrap"
                }}>
                  <button
                    onClick={() => scrollToSection(overviewSectionRef)}
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#374151",
                      fontWeight: "500"
                    }}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => scrollToSection(customersSectionRef)}
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#374151",
                      fontWeight: "500"
                    }}
                  >
                    Customers
                  </button>
                  <button
                    onClick={() => scrollToSection(commercialSectionRef)}
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#374151",
                      fontWeight: "500"
                    }}
                  >
                    Commercial Accounts
                  </button>
                  <button
                    onClick={() => scrollToSection(scheduleSectionRef)}
                    style={{
                      fontSize: "0.875rem",
                      padding: "0.5rem 1rem",
                      background: "transparent",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#374151",
                      fontWeight: "500"
                    }}
                  >
                    Schedule
                  </button>
                </div>
              )}

              {/* Owner Dashboard - Complete Business Control Center */}
              {isOwner && userId && (
                <div style={{ marginBottom: "3rem" }}>
                  <BusinessOverview userId={userId} />
                  <CustomerManagement userId={userId} />
                  <CleaningScheduleBoard userId={userId} />
                  <CommercialAccounts userId={userId} />
                  <PartnerProgramManagement userId={userId} />
                  <FinancialAnalytics userId={userId} />
                  <SystemControls userId={userId} />
                </div>
              )}

              {/* Admin Overview Cards */}
              {isAdmin && !isOwner && (
                <div ref={overviewSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1rem" }}>
                    Overview
                  </h2>
                  {adminLoading ? (
                    <p style={{ color: "#6b7280" }}>Loading admin statistics...</p>
                  ) : (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: "1rem",
                      marginBottom: "2rem"
                    }}>
                      {/* Total Active Customers */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Total Active Customers
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {adminStats.totalCustomers}
                        </div>
                      </div>

                      {/* Active Partners */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Active Partners
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {adminStats.activePartners}
                        </div>
                      </div>

                      {/* Upcoming Cleanings */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Upcoming Cleanings (7 days)
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {adminStats.upcomingCleanings}
                        </div>
                      </div>

                      {/* Estimated Monthly Revenue */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Est. Monthly Revenue
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                          {"$" + adminStats.estimatedMonthlyRevenue.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customers by Plan */}
                  {Object.keys(adminStats.customersByPlan).length > 0 && (
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid #e5e7eb",
                      marginBottom: "2rem"
                    }}>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                        Customers by Plan
                      </h3>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {Object.entries(adminStats.customersByPlan).map(([plan, count]) => (
                          <div key={plan} style={{
                            padding: "0.75rem 1rem",
                            background: "#f9fafb",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb"
                          }}>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                              {PLAN_NAMES[plan] || plan}
                            </div>
                            <div style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)" }}>
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin Partner Applications Section */}
                  <AdminPartnerApplications />
                  <AdminPartnerManagement />
                </div>
              )}

              {/* Status Summary Card - Hidden for admin */}
            {!isAdmin && (
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
            )}
            </div>

            {/* (A) Hero Welcome + Status Summary - Closing div */}
            </div>

            {/* (B) Quick Action Buttons Row - Hidden for admin */}
            {!isAdmin && (
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
            )}

            {/* Admin: Customers & Tiers Section */}
            {isAdmin && (
              <div ref={customersSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1.5rem" }}>
                    Customers
                  </h2>

                  {/* Filters */}
                  <div style={{
                    display: "flex",
                    gap: "1rem",
                    marginBottom: "1.5rem",
                    flexWrap: "wrap",
                    alignItems: "center"
                  }}>
                    <input
                      type="text"
                      placeholder="Search by name or email..."
                      value={customerFilter.search || ""}
                      onChange={(e) => setCustomerFilter({ ...customerFilter, search: e.target.value })}
                      style={{
                        flex: "1",
                        minWidth: "200px",
                        padding: "0.5rem 1rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "0.875rem"
                      }}
                    />
                    <select
                      value={customerFilter.plan || ""}
                      onChange={(e) => setCustomerFilter({ ...customerFilter, plan: e.target.value || undefined })}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        background: "#ffffff"
                      }}
                    >
                      <option value="">All Plans</option>
                      {Object.entries(PLAN_NAMES).map(([id, name]) => (
                        <option key={id} value={id}>{name}</option>
                      ))}
                    </select>
                    <select
                      value={customerFilter.source || ""}
                      onChange={(e) => setCustomerFilter({ ...customerFilter, source: e.target.value || undefined })}
                      style={{
                        padding: "0.5rem 1rem",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        background: "#ffffff"
                      }}
                    >
                      <option value="">All Sources</option>
                      <option value="direct">Direct</option>
                      <option value="partner">Partner</option>
                    </select>
                  </div>

                  {/* Customers Table */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Plan</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Source</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Ranking/Loyalty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                              No customers found matching your filters.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.slice(0, 50).map((customer: any) => (
                            <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                                {customer.firstName} {customer.lastName}
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                {customer.email}
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                {customer.selectedPlan ? (PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan) : "No plan"}
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                <span style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  background: customer.source === "partner" ? "#dbeafe" : "#f3f4f6",
                                  color: customer.source === "partner" ? "#1e40af" : "#6b7280"
                                }}>
                                  {customer.source === "partner" ? "Partner" : "Direct"}
                                </span>
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                                <span style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  background: customer.subscriptionStatus === "active" ? "#d1fae5" : "#fef3c7",
                                  color: customer.subscriptionStatus === "active" ? "#065f46" : "#92400e"
                                }}>
                                  {customer.subscriptionStatus === "active" ? "Active" : customer.subscriptionStatus || "Inactive"}
                                </span>
                              </td>
                              <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                                <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                                  {customer.loyaltyLevel || "Getting Started"}
                                </div>
                                <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
                                  {customer.completedCleanings || 0} cleanings
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Admin: Commercial Accounts Section */}
            {isAdmin && (
              <div ref={commercialSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1.5rem" }}>
                    Commercial Accounts
                  </h2>
                  {commercialCustomers.length === 0 ? (
                    <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      No commercial accounts found.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {commercialCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          style={{
                            padding: "1.5rem",
                            background: "#f9fafb",
                            borderRadius: "12px",
                            border: "1px solid #e5e7eb"
                          }}
                        >
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600", textTransform: "uppercase" }}>
                                Business Name
                              </div>
                              <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                                {customer.firstName} {customer.lastName}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600", textTransform: "uppercase" }}>
                                Contact Email
                              </div>
                              <div style={{ fontSize: "1rem", color: "var(--text-dark)" }}>
                                {customer.email}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600", textTransform: "uppercase" }}>
                                Plan Type
                              </div>
                              <div style={{ fontSize: "1rem", color: "var(--text-dark)" }}>
                                {PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan || "N/A"}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", fontWeight: "600", textTransform: "uppercase" }}>
                                Status
                              </div>
                              <div>
                                <span style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  background: customer.subscriptionStatus === "active" ? "#d1fae5" : "#fef3c7",
                                  color: customer.subscriptionStatus === "active" ? "#065f46" : "#92400e"
                                }}>
                                  {customer.subscriptionStatus === "active" ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </div>
                          {customer.phone && (
                            <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                              <strong>Phone:</strong> {customer.phone}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* (C) Schedule a Cleaning - Hidden for admin */}
            {!isAdmin && (
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
            )}

            {/* (D) Subscription & Plan Card - Hidden for admin */}
            {!isAdmin && user.selectedPlan && (
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
                      {user.paymentStatus === "paid" ? "Paid" : "Pending Payment"}
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

            {/* Next Steps (if no plan) - Hidden for admin */}
            {!isAdmin && !user.selectedPlan && (
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

            {/* (E) Loyalty Badges - Hidden for admin */}
            {!isAdmin && userId && (
              <div ref={rewardsSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <LoyaltyBadges userId={userId} />
              </div>
            )}

            {/* (F) Referral Rewards - Hidden for admin */}
            {!isAdmin && userId && (
              <div style={{ marginBottom: "2rem" }}>
                <ReferralRewards userId={userId} />
                <ReferralHistory userId={userId} />
            </div>
            )}

            {/* Admin: Referral & Loyalty Snapshot */}
            {isAdmin && (
              <div style={{ marginBottom: "2rem" }}>
                <div style={{
                  background: "#ffffff",
                  borderRadius: "20px",
                  padding: "2.5rem",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                  border: "1px solid #e5e7eb"
                }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1.5rem" }}>
                    Referral & Loyalty Overview
                  </h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                    <div style={{
                      padding: "1.5rem",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                        Total Referrals
                      </div>
                      <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                        {referralStats.totalReferrals}
                      </div>
                    </div>
                    <div style={{
                      padding: "1.5rem",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                        Credits Granted
                      </div>
                      <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                        {referralStats.creditsGranted}
                      </div>
                    </div>
                    <div style={{
                      padding: "1.5rem",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                        Credits Redeemed
                      </div>
                      <div style={{ fontSize: "2rem", fontWeight: "700", color: "#dc2626" }}>
                        {referralStats.creditsRedeemed}
                      </div>
                    </div>
                  </div>

                  {/* Top Referrers */}
                  {referralStats.topReferrers.length > 0 && (
                    <div style={{ marginBottom: "2rem" }}>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                        Top Referrers
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {referralStats.topReferrers.map((referrer, index) => (
                          <div
                            key={index}
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
                              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                                {referrer.name}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                {referrer.email}
                              </div>
                            </div>
                            <div style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "999px",
                              fontSize: "0.875rem",
                              fontWeight: "600",
                              background: "#dbeafe",
                              color: "#1e40af"
                            }}>
                              {referrer.count} referrals
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Loyalty Levels */}
                  {Object.keys(referralStats.loyaltyLevels).length > 0 && (
                    <div>
                      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                        Customers by Loyalty Level
                      </h3>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {Object.entries(referralStats.loyaltyLevels).map(([level, count]) => (
                          <div
                            key={level}
                            style={{
                              padding: "1rem 1.5rem",
                              background: "#f9fafb",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb"
                            }}
                          >
                            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                              {level}
                            </div>
                            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                              {count}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
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
                  {isAdmin ? "All Cleanings / Route Schedule" : "Your Cleanings"}
              </h2>
              
                {/* Upcoming */}
                <div style={{ marginBottom: "2rem" }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                    {isAdmin ? "Today's Cleanings" : "Upcoming"}
                  </h3>
              {cleaningsLoading ? (
                    <p style={{ color: "#6b7280" }}>Loading scheduled cleanings...</p>
                  ) : (isAdmin ? allCleanings.filter(c => {
                    const date = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const cleaningDate = new Date(date);
                    cleaningDate.setHours(0, 0, 0, 0);
                    return cleaningDate.getTime() === today.getTime() && c.status !== "cancelled";
                  }) : upcomingCleanings).length === 0 ? (
                    <div style={{
                      padding: "2rem",
                      background: "#f9fafb",
                      borderRadius: "12px",
                      textAlign: "center",
                      border: "1px dashed #d1d5db"
                    }}>
                      <p style={{ color: "#6b7280", margin: 0 }}>
                        {isAdmin ? "No cleanings scheduled for today." : "No cleanings scheduled yet. Use the Schedule button above to book your first cleaning."}
                      </p>
                    </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      {(isAdmin ? allCleanings.filter(c => {
                        const date = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const cleaningDate = new Date(date);
                        cleaningDate.setHours(0, 0, 0, 0);
                        return cleaningDate.getTime() === today.getTime() && c.status !== "cancelled";
                      }).slice(0, 20) : upcomingCleanings).map((cleaning) => {
                    const cleaningDate = cleaning.scheduledDate?.toDate?.() || new Date(cleaning.scheduledDate);
                    // Find customer info for admin view
                    const customer = isAdmin && cleaning.userId 
                      ? allCustomers.find(c => c.id === cleaning.userId)
                      : null;
                    
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
                          <div style={{ flex: 1 }}>
                            {isAdmin && customer && (
                              <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.5rem" }}>
                                {customer.firstName} {customer.lastName}
                              </div>
                            )}
                            <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                              {cleaningDate.toLocaleDateString("en-US", { 
                                weekday: "long", 
                                month: "long", 
                                day: "numeric",
                                year: "numeric"
                              })}
                            </div>
                                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                              {cleaning.scheduledTime || "TBD"}
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
                                {cleaning.status || "Scheduled"}
                          </span>
                        </div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                          <strong>Address:</strong> {cleaning.addressLine1}
                          {cleaning.addressLine2 && `, ${cleaning.addressLine2}`}
                          <br />
                          {cleaning.city}, {cleaning.state} {cleaning.zipCode}
                        </div>
                        {isAdmin && customer && (
                          <div style={{ display: "flex", gap: "1rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                              <strong>Plan:</strong> {customer.selectedPlan ? (PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan) : "N/A"}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                              <strong>Source:</strong> <span style={{
                                padding: "0.125rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: customer.source === "partner" ? "#dbeafe" : "#f3f4f6",
                                color: customer.source === "partner" ? "#1e40af" : "#6b7280"
                              }}>
                                {customer.source === "partner" ? "Partner" : "Direct"}
                              </span>
                            </div>
                          </div>
                        )}
                        {cleaning.trashDay && (
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.5rem" }}>
                            <strong>Trash Day:</strong> {cleaning.trashDay}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

                {/* Admin: Next 7 Days */}
                {isAdmin && (
                  <div style={{ marginBottom: "2rem" }}>
                    <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                      Next 7 Days
                    </h3>
                    {allCleanings.filter(c => {
                      const date = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
                      const today = new Date();
                      const sevenDaysFromNow = new Date();
                      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                      return date >= today && date <= sevenDaysFromNow && c.status !== "cancelled";
                    }).length === 0 ? (
                      <div style={{
                        padding: "2rem",
                        background: "#f9fafb",
                        borderRadius: "12px",
                        textAlign: "center",
                        border: "1px dashed #d1d5db"
                      }}>
                        <p style={{ color: "#6b7280", margin: 0 }}>
                          No cleanings scheduled for the next 7 days.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {allCleanings
                          .filter(c => {
                            const date = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
                            const today = new Date();
                            const sevenDaysFromNow = new Date();
                            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                            return date >= today && date <= sevenDaysFromNow && c.status !== "cancelled";
                          })
                          .sort((a, b) => {
                            const dateA = a.scheduledDate?.toDate?.() || new Date(a.scheduledDate);
                            const dateB = b.scheduledDate?.toDate?.() || new Date(b.scheduledDate);
                            return dateA.getTime() - dateB.getTime();
                          })
                          .slice(0, 30)
                          .map((cleaning) => {
                            const cleaningDate = cleaning.scheduledDate?.toDate?.() || new Date(cleaning.scheduledDate);
                            const customer = cleaning.userId ? allCustomers.find(c => c.id === cleaning.userId) : null;
                            return (
                              <div
                                key={cleaning.id}
                                style={{
                                  padding: "1rem",
                                  background: "#f0f9ff",
                                  borderRadius: "8px",
                                  border: "1px solid #bae6fd",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center"
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  {customer && (
                                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                                      {customer.firstName} {customer.lastName}
                                    </div>
                                  )}
                                  <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                                    {cleaningDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                    {cleaning.addressLine1}, {cleaning.city}
                                  </div>
                                  {customer && (
                                    <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.25rem" }}>
                                      {customer.selectedPlan ? (PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan) : "No plan"} • {customer.source === "partner" ? "Partner" : "Direct"}
                                    </div>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                  {cleaning.scheduledTime || "TBD"}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    )}
                  </div>
                )}

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
