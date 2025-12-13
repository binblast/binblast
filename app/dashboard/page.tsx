// app/dashboard/page.tsx
"use client";

import { useEffect, useState, Component, ErrorInfo, ReactNode, Suspense, useRef, useMemo, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ScheduleCleaningForm } from "@/components/ScheduleCleaningForm";
import { EditCleaningModal } from "@/components/EditCleaningModal";
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
import { EmployeeStatus } from "@/components/OperatorDashboard/EmployeeStatus";
import { LineChart, BarChart, PieChart } from "@/components/AdminDashboard/ChartComponents";
import { ChartModal } from "@/components/AdminDashboard/ChartModal";

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
  const [isOperator, setIsOperator] = useState(false);
  const [roleDetermined, setRoleDetermined] = useState(false); // Track if role has been determined
  
  // Admin state
  const [adminStats, setAdminStats] = useState({
    totalCustomers: 0,
    customersByPlan: {} as Record<string, number>,
    activePartners: 0,
    upcomingCleanings: 0,
    estimatedMonthlyRevenue: 0,
    activeSubscriptions: 0,
    monthlyRecurringRevenue: 0,
    completedCleaningsThisMonth: 0,
    completedCleaningsThisWeek: 0,
    activeEmployees: 0,
    customerGrowthRate: 0,
    averageRevenuePerCustomer: 0,
    customerRetentionRate: 0,
    revenueBySource: { direct: 0, partner: 0 },
    cleaningsStatus: { completed: 0, pending: 0, cancelled: 0 },
  });
  const [chartData, setChartData] = useState({
    revenueTrend: [] as Array<{ label: string; value: number }>,
    customerGrowth: [] as Array<{ label: string; value: number }>,
    weeklyCleanings: [] as Array<{ label: string; value: number }>,
    planDistribution: [] as Array<{ label: string; value: number }>,
    revenueByPlan: [] as Array<{ label: string; value: number }>,
  });
  const [chartModal, setChartModal] = useState<{
    isOpen: boolean;
    chartType: "line" | "bar" | "pie";
    title: string;
    data: Array<{ label: string; value: number; color?: string }>;
  }>({
    isOpen: false,
    chartType: "line",
    title: "",
    data: [],
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
  const [editingCleaning, setEditingCleaning] = useState<ScheduledCleaning | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customerFilter, setCustomerFilter] = useState<{ plan?: string; source?: string; search?: string }>({});
  
  // Operator state
  const [operatorStats, setOperatorStats] = useState({
    totalDirectCustomers: 0,
    totalCommercialCustomers: 0,
    upcomingCleanings: 0,
    cleaningsCompletedThisWeek: 0,
    openIssues: 0,
  });
  const [operatorDirectCustomers, setOperatorDirectCustomers] = useState<any[]>([]);
  const [operatorCommercialCustomers, setOperatorCommercialCustomers] = useState<any[]>([]);
  const [operatorAllCleanings, setOperatorAllCleanings] = useState<any[]>([]);
  
  // Extra bin state
  const [extraBinQuantity, setExtraBinQuantity] = useState(1);
  const [extraBinLoading, setExtraBinLoading] = useState(false);
  const [operatorLoading, setOperatorLoading] = useState(false);
  const [operatorCustomerSearch, setOperatorCustomerSearch] = useState("");
  const [operatorCustomerFilter, setOperatorCustomerFilter] = useState<{ plan?: string; status?: string }>({});
  const [operatorDateFilter, setOperatorDateFilter] = useState<string>("");
  const [operatorCityFilter, setOperatorCityFilter] = useState<string>("");
  const [operatorTypeFilter, setOperatorTypeFilter] = useState<string>("");
  const [operatorActiveTab, setOperatorActiveTab] = useState<"overview" | "employees" | "customers" | "schedule">("overview");
  const [adminActiveTab, setAdminActiveTab] = useState<"overview" | "customers" | "operations" | "financial" | "partners" | "analytics">("overview");
  
  // Refs for scroll targets
  const scheduleSectionRef = useRef<HTMLDivElement>(null);
  const planSectionRef = useRef<HTMLDivElement>(null);
  const rewardsSectionRef = useRef<HTMLDivElement>(null);
  const accountSectionRef = useRef<HTMLDivElement>(null);
  const overviewSectionRef = useRef<HTMLDivElement>(null);
  const customersSectionRef = useRef<HTMLDivElement>(null);
  const commercialSectionRef = useRef<HTMLDivElement>(null);
  
  // Ref to prevent multiple operator data loads
  const operatorDataLoadingRef = useRef(false);
  const operatorDataLoadedRef = useRef<string | null>(null); // Track userId for which data was loaded
  
  // Ref to prevent redirect loops
  const redirectingRef = useRef(false);

  // Handle Stripe Checkout callback
  useEffect(() => {
    const subscriptionChange = searchParams.get("subscription_change");
    const extraBin = searchParams.get("extra_bin");
    const sessionId = searchParams.get("session_id");
    const quantity = searchParams.get("quantity");

    if (extraBin === "success" && quantity) {
      console.log("[Dashboard] Extra bin checkout success detected.");
      router.replace("/dashboard", undefined);
      alert(`Successfully added ${quantity} extra bin${parseInt(quantity) > 1 ? 's' : ''}! Your payment has been processed.`);
      window.location.reload();
      return;
    }

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

  // Ref to track if auth listener is already set up
  const authListenerSetupRef = useRef(false);
  // Ref to track current user ID and role to prevent duplicate processing
  const currentUserRef = useRef<{ uid: string; role: string | undefined } | null>(null);

  // Load user data
  useEffect(() => {
    // Prevent multiple auth listener setups
    if (authListenerSetupRef.current) {
      return;
    }
    
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

        authListenerSetupRef.current = true; // Mark as set up
        
        unsubscribe = await onAuthStateChanged(async (firebaseUser) => {
          if (!firebaseUser) {
            if (mounted) {
              currentUserRef.current = null; // Clear user ref on logout
              setRoleDetermined(false); // Reset role determination on logout
              setIsAdmin(false);
              setIsOperator(false);
              setIsOwner(false);
              router.push("/login");
            }
            return;
          }

          if (!mounted) return;
          
          // CRITICAL: Prevent processing the same user multiple times
          // This stops the infinite loop by checking if we've already processed this user
          if (currentUserRef.current?.uid === firebaseUser.uid) {
            console.log("[Dashboard] User already processed, skipping:", firebaseUser.uid);
            return;
          }

          setUserId(firebaseUser.uid);

          try {
            const userDocRef = doc(db, "users", firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!mounted) return;

            if (userDoc.exists()) {
              const userData = userDoc.data() as UserData;
              
              // CRITICAL: Store user info in ref BEFORE updating state
              // This prevents the callback from running again for the same user
              const userRole = userData.role || "customer";
              currentUserRef.current = {
                uid: firebaseUser.uid,
                role: userRole
              };
              
              setUser(userData);
              
              // Determine roles ONCE and update state atomically
              const newIsAdmin = (userRole === "admin") || (userData.email === ADMIN_EMAIL);
              const newIsOperator = userRole === "operator";
              
              // Only update state if values actually changed
              setIsAdmin((prev) => {
                if (prev !== newIsAdmin) {
                  return newIsAdmin;
                }
                return prev;
              });
              setIsOperator((prev) => {
                if (prev !== newIsOperator) {
                  // Reset loaded flag when operator status changes
                  operatorDataLoadedRef.current = null;
                  return newIsOperator;
                }
                return prev;
              });
              
              // Mark role as determined AFTER state updates
              setRoleDetermined(true);
              
              // If user is an operator, don't check for partner redirects
              if (newIsOperator) {
                // Operator stays on dashboard - no redirect needed
                redirectingRef.current = false; // Reset redirect flag
              } else {
                // Check if user is a partner and redirect accordingly (unless admin or operator)
                // Prevent redirect loops by checking if we're already redirecting
                if (!redirectingRef.current) {
                  try {
                    const { getDashboardUrl } = await import("@/lib/partner-auth");
                    const dashboardUrl = await getDashboardUrl(firebaseUser.uid);
                    
                    // If user is a partner and not on admin email, redirect to partner dashboard
                    if (dashboardUrl !== "/dashboard" && firebaseUser.email !== ADMIN_EMAIL) {
                      if (mounted) {
                        redirectingRef.current = true; // Set flag before redirect
                        router.push(dashboardUrl);
                      }
                      return;
                    } else {
                      redirectingRef.current = false; // Reset if no redirect needed
                    }
                  } catch (partnerCheckErr) {
                    console.warn("[Dashboard] Error checking partner status:", partnerCheckErr);
                    redirectingRef.current = false; // Reset on error
                    // Continue with regular dashboard if partner check fails
                  }
                }
              }
            } else {
              // User document doesn't exist - set default values
              const userEmail = firebaseUser.email || "";
              currentUserRef.current = {
                uid: firebaseUser.uid,
                role: undefined
              };
              setUser({
                firstName: firebaseUser.displayName?.split(" ")[0] || "User",
                lastName: firebaseUser.displayName?.split(" ")[1] || "",
                email: userEmail,
              });
              setIsOwner(false);
              const defaultIsAdmin = userEmail === ADMIN_EMAIL;
              setIsAdmin((prev) => {
                if (prev !== defaultIsAdmin) {
                  return defaultIsAdmin;
                }
                return prev;
              });
              // Mark role as determined even if user doc doesn't exist
              setRoleDetermined(true);
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
              // Don't set roleDetermined on error - let it retry
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
      authListenerSetupRef.current = false; // Reset on cleanup
      currentUserRef.current = null; // Clear user ref on cleanup
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [router]); // Only depend on router, not on isAdmin/isOperator to prevent loops

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
        const partners: any[] = [];
        partnersSnapshot.forEach((doc) => {
          partners.push({ id: doc.id, ...doc.data() });
        });

        // Load employees
        const employeesQuery = query(
          collection(db, "users"),
          where("role", "==", "employee")
        );
        const employeesSnapshot = await getDocs(employeesQuery);
        const employees: any[] = [];
        employeesSnapshot.forEach((doc) => {
          employees.push({ id: doc.id, ...doc.data() });
        });

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
        // Query all cleanings and filter in memory to check both status and jobStatus
        const customerCompletedCounts: Record<string, number> = {};
        const allCleaningsForLoyaltyQuery = query(
          collection(db, "scheduledCleanings")
        );
        const allCleaningsForLoyaltySnapshot = await getDocs(allCleaningsForLoyaltyQuery);
        allCleaningsForLoyaltySnapshot.forEach((doc) => {
          const data = doc.data();
          // Check both status and jobStatus fields
          const isCompleted = data.status === "completed" || data.jobStatus === "completed";
          if (isCompleted && data.userId) {
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

        // Calculate enhanced metrics using admin-utils
        const {
          aggregateMetrics,
          calculateRevenueTrend,
          calculateCustomerGrowth,
          calculateWeeklyCleanings,
          calculatePlanDistribution,
          calculateRevenueByPlan,
        } = await import("@/lib/admin-utils");
        const enhancedMetrics = aggregateMetrics(
          enhancedCustomers,
          allCleaningsList,
          employees,
          partners
        );

        // Calculate chart data
        const revenueTrend = calculateRevenueTrend(allCleaningsList, 30);
        const customerGrowth = calculateCustomerGrowth(enhancedCustomers, 6);
        const weeklyCleanings = calculateWeeklyCleanings(allCleaningsList, 8);
        const planDistribution = calculatePlanDistribution(enhancedMetrics.customersByPlan, PLAN_NAMES);
        const revenueByPlan = calculateRevenueByPlan(enhancedCustomers, PLAN_NAMES);

        if (mounted) {
          setAdminStats({
            totalCustomers: enhancedMetrics.totalCustomers,
            customersByPlan: enhancedMetrics.customersByPlan,
            activePartners: enhancedMetrics.activePartners,
            upcomingCleanings: enhancedMetrics.upcomingCleanings,
            estimatedMonthlyRevenue: Math.round(enhancedMetrics.monthlyRecurringRevenue),
            activeSubscriptions: enhancedMetrics.activeSubscriptions,
            monthlyRecurringRevenue: enhancedMetrics.monthlyRecurringRevenue,
            completedCleaningsThisMonth: enhancedMetrics.completedCleaningsThisMonth,
            completedCleaningsThisWeek: enhancedMetrics.completedCleaningsThisWeek,
            activeEmployees: enhancedMetrics.activeEmployees,
            customerGrowthRate: enhancedMetrics.customerGrowthRate,
            averageRevenuePerCustomer: enhancedMetrics.averageRevenuePerCustomer,
            customerRetentionRate: enhancedMetrics.customerRetentionRate,
            revenueBySource: enhancedMetrics.revenueBySource,
            cleaningsStatus: enhancedMetrics.cleaningsStatus,
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
          setChartData({
            revenueTrend,
            customerGrowth,
            weeklyCleanings,
            planDistribution,
            revenueByPlan,
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

    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      if (mounted && isAdmin && userId) {
        loadAdminData();
      }
    }, 30000);

    // Set up real-time listeners for key collections
    let unsubscribeUsers: (() => void) | undefined;
    let unsubscribeCleanings: (() => void) | undefined;
    let unsubscribeClockIns: (() => void) | undefined;

    async function setupRealtimeListeners() {
      if (!isAdmin || !userId || !mounted) return;

      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, onSnapshot, orderBy } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Listen to users collection for new customers
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        unsubscribeUsers = onSnapshot(usersQuery, () => {
          if (mounted) {
            loadAdminData();
          }
        }, (error) => {
          console.error("[Dashboard] Error listening to users:", error);
        });

        // Listen to scheduledCleanings for new/completed cleanings
        const cleaningsQuery = query(collection(db, "scheduledCleanings"), orderBy("scheduledDate", "asc"));
        unsubscribeCleanings = onSnapshot(cleaningsQuery, () => {
          if (mounted) {
            loadAdminData();
          }
        }, (error) => {
          console.error("[Dashboard] Error listening to cleanings:", error);
        });

        // Listen to clockIns for employee activity
        const clockInsQuery = query(collection(db, "clockIns"), orderBy("clockInTime", "desc"));
        unsubscribeClockIns = onSnapshot(clockInsQuery, () => {
          if (mounted) {
            loadAdminData();
          }
        }, (error) => {
          console.error("[Dashboard] Error listening to clockIns:", error);
        });
      } catch (error) {
        console.error("[Dashboard] Error setting up real-time listeners:", error);
      }
    }

    setupRealtimeListeners();

    return () => {
      mounted = false;
      clearInterval(refreshInterval);
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeCleanings) unsubscribeCleanings();
      if (unsubscribeClockIns) unsubscribeClockIns();
    };
  }, [isAdmin, userId]);

  // Load operator data
  useEffect(() => {
    // Early return if not operator or no userId
    if (!isOperator || !userId) {
      // Only reset operator data if it was previously loaded (to prevent unnecessary state updates)
      if (!isOperator && operatorDataLoadedRef.current) {
        setOperatorDirectCustomers([]);
        setOperatorCommercialCustomers([]);
        setOperatorAllCleanings([]);
        setOperatorStats({
          totalDirectCustomers: 0,
          totalCommercialCustomers: 0,
          upcomingCleanings: 0,
          cleaningsCompletedThisWeek: 0,
          openIssues: 0,
        });
        operatorDataLoadingRef.current = false;
        operatorDataLoadedRef.current = null;
      }
      return;
    }
    
    // CRITICAL: Prevent re-loading if data is already loaded for this userId
    // This prevents infinite loops when component re-renders
    if (operatorDataLoadedRef.current === userId) {
      console.log("[Operator] Data already loaded for userId:", userId);
      return;
    }
    
    // Prevent multiple simultaneous loads
    if (operatorDataLoadingRef.current) {
      console.log("[Operator] Data load already in progress, skipping...");
      return;
    }
    
    let mounted = true;
    
    async function loadOperatorData() {
      operatorDataLoadingRef.current = true;
      setOperatorLoading(true);
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where, orderBy } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load all users (direct customers only - exclude partner customers)
        const usersSnapshot = await getDocs(collection(db, "users"));
        const directCustomers: any[] = [];
        const commercialCustomers: any[] = [];
        const partnerCustomerEmails = new Set<string>();

        // Load partner bookings to identify partner customers
        try {
          const partnerBookingsSnapshot = await getDocs(collection(db, "partnerBookings"));
          partnerBookingsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.customerEmail) {
              partnerCustomerEmails.add(data.customerEmail.toLowerCase());
            }
          });
        } catch (err) {
          console.warn("[Operator] Could not load partner bookings:", err);
        }

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          const email = (data.email || "").toLowerCase();
          
          // Only include direct customers (not partner customers)
          if (!partnerCustomerEmails.has(email)) {
            const customer = {
              id: doc.id,
              firstName: data.firstName || "",
              lastName: data.lastName || "",
              email: data.email || "",
              phone: data.phone || "",
              addressLine1: data.addressLine1 || "",
              city: data.city || "",
              state: data.state || "",
              zipCode: data.zipCode || "",
              selectedPlan: data.selectedPlan || "",
              subscriptionStatus: data.subscriptionStatus || "none",
              paymentStatus: data.paymentStatus || "pending",
              loyaltyRanking: data.loyaltyRanking || "Getting Started",
              internalNotes: data.internalNotes || "",
              servicePaused: data.servicePaused || false,
            };

            if (data.selectedPlan === "commercial" || data.selectedPlan?.includes("commercial") || data.selectedPlan?.includes("HOA")) {
              commercialCustomers.push({
                ...customer,
                businessName: data.businessName || `${data.firstName} ${data.lastName}`,
                contactPerson: `${data.firstName} ${data.lastName}`,
                binsCount: data.binsCount || 1,
                frequency: data.selectedPlan || "monthly",
                specialInstructions: data.specialInstructions || "",
              });
            } else {
              directCustomers.push(customer);
            }
          }
        });

        // Load all scheduled cleanings
        const cleaningsSnapshot = await getDocs(query(
          collection(db, "scheduledCleanings"),
          orderBy("scheduledDate", "asc")
        ));
        const allCleanings: any[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);

        let upcomingCount = 0;
        let completedThisWeek = 0;

        cleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          const cleaningDate = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate);
          
          const cleaning = {
            id: doc.id,
            userId: data.userId || "",
            customerName: data.userName || "",
            customerEmail: data.userEmail || "",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            city: data.city || "",
            state: data.state || "",
            zipCode: data.zipCode || "",
            scheduledDate: cleaningDate,
            scheduledTime: data.scheduledTime || "TBD",
            planType: data.planType || "",
            status: data.status || "scheduled",
            notes: data.notes || "",
            internalNotes: data.internalNotes || "",
            completedAt: data.completedAt || null,
            isCommercial: data.planType === "commercial" || data.planType?.includes("commercial"),
          };

          allCleanings.push(cleaning);

          // Count upcoming cleanings (today + next 7 days)
          if (cleaningDate >= today && cleaningDate <= sevenDaysFromNow && cleaning.status !== "cancelled") {
            upcomingCount++;
          }

          // Count completed this week (check both status and jobStatus)
          const isCompleted = cleaning.status === "completed" || (cleaning as any).jobStatus === "completed";
          if (isCompleted && cleaning.completedAt) {
            const completedDate = cleaning.completedAt?.toDate?.() || new Date(cleaning.completedAt);
            if (completedDate >= weekStart && completedDate < weekEnd) {
              completedThisWeek++;
            }
          }
        });

        // Load internal issues/notes (could be stored in a separate collection or as part of customer data)
        // For now, count customers with internal notes as "open issues"
        const openIssues = directCustomers.filter(c => c.internalNotes && c.internalNotes.trim().length > 0).length +
                          commercialCustomers.filter(c => c.specialInstructions && c.specialInstructions.trim().length > 0).length;

        if (mounted) {
          setOperatorDirectCustomers(directCustomers);
          setOperatorCommercialCustomers(commercialCustomers);
          setOperatorAllCleanings(allCleanings);
          setOperatorStats({
            totalDirectCustomers: directCustomers.length,
            totalCommercialCustomers: commercialCustomers.length,
            upcomingCleanings: upcomingCount,
            cleaningsCompletedThisWeek: completedThisWeek,
            openIssues,
          });
          setOperatorLoading(false);
          operatorDataLoadingRef.current = false;
          operatorDataLoadedRef.current = userId; // Mark as loaded for this userId
        }
      } catch (err: any) {
        console.error("[Dashboard] Error loading operator data:", err);
        if (mounted) {
          setOperatorLoading(false);
          operatorDataLoadingRef.current = false;
          // Don't set loaded flag on error, so it can retry
        }
      }
    }

    loadOperatorData();
    return () => { 
      mounted = false;
      // Don't reset loading ref in cleanup - let it complete
      // Only reset if userId changes or isOperator becomes false
    };
  }, [isOperator, userId]);

  // Helper functions
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Compute filtered customers for admin view
  const filteredCustomers = useMemo(() => {
    if (!roleDetermined || !isAdmin) return [];
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
  }, [roleDetermined, isAdmin, allCustomers, customerFilter.search, customerFilter.plan, customerFilter.source]);

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
    // Exclude completed jobs from upcoming (check both status and jobStatus)
    const isCompleted = c.status === "completed" || (c as any).jobStatus === "completed";
    return date >= new Date() && c.status !== "cancelled" && !isCompleted;
  });
  const upcomingCleanings = filteredUpcoming.sort((a, b) => {
    return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
  });

  const filteredPast = scheduledCleanings.filter(c => {
    const date = new Date(c.scheduledDate);
    // Check both status and jobStatus fields for compatibility
    const isCompleted = c.status === "completed" || (c as any).jobStatus === "completed";
    return date < new Date() || isCompleted || c.status === "cancelled";
  });
  const pastCleanings = filteredPast.sort((a, b) => {
    return new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime();
  });

  // Helper function to safely convert scheduledDate to Date object
  const getCleaningDate = useCallback((cleaning: any): Date => {
    if (!cleaning || !cleaning.scheduledDate) return new Date();
    // If it's already a Date object, return it
    if (cleaning.scheduledDate instanceof Date) {
      // Check if it's a valid date
      if (isNaN(cleaning.scheduledDate.getTime())) return new Date();
      return cleaning.scheduledDate;
    }
    // If it has toDate method (Firestore timestamp), use it
    if (typeof cleaning.scheduledDate.toDate === 'function') {
      try {
        const date = cleaning.scheduledDate.toDate();
        if (isNaN(date.getTime())) return new Date();
        return date;
      } catch (e) {
        return new Date();
      }
    }
    // Otherwise, try to create a Date from it
    try {
      const date = new Date(cleaning.scheduledDate);
      if (isNaN(date.getTime())) return new Date();
      return date;
    } catch (e) {
      return new Date();
    }
  }, []);

  // Compute subscription manager visibility (must be before early returns)
  const validPlans = ["one-time", "twice-month", "bi-monthly", "quarterly"];
  const hasValidPlan = Boolean(user?.selectedPlan && validPlans.includes(user.selectedPlan));
  const hasStripeSubscription = Boolean(user?.stripeSubscriptionId);
  const hasPaidStatus = Boolean(user?.paymentStatus === "paid" && user?.stripeCustomerId);
  const hasValidSubscription = Boolean(hasStripeSubscription || hasPaidStatus);
  const hasUserId = Boolean(userId);
  const isFirebaseReady = Boolean(firebaseReady);
  const shouldShowSubscriptionManager = Boolean(hasValidPlan && hasValidSubscription && hasUserId && isFirebaseReady);

  // Compute filtered customers for operator view (must be before early returns)
  const filteredDirectCustomers = useMemo(() => {
    if (!roleDetermined || !isOperator) return [];
    let filtered = operatorDirectCustomers;
    
    if (operatorCustomerSearch) {
      const search = operatorCustomerSearch.toLowerCase();
      filtered = filtered.filter(c => 
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        (c.email || "").toLowerCase().includes(search) ||
        (c.addressLine1 || "").toLowerCase().includes(search) ||
        (c.city || "").toLowerCase().includes(search)
      );
    }
    
    if (operatorCustomerFilter.plan) {
      filtered = filtered.filter(c => c.selectedPlan === operatorCustomerFilter.plan);
    }
    
    if (operatorCustomerFilter.status) {
      if (operatorCustomerFilter.status === "active") {
        filtered = filtered.filter(c => c.subscriptionStatus === "active" && !c.servicePaused);
      } else if (operatorCustomerFilter.status === "paused") {
        filtered = filtered.filter(c => c.servicePaused);
      } else if (operatorCustomerFilter.status === "canceled") {
        filtered = filtered.filter(c => c.subscriptionStatus === "cancelled" || c.subscriptionStatus === "canceled");
      }
    }
    
    return filtered;
  }, [roleDetermined, isOperator, operatorDirectCustomers, operatorCustomerSearch, operatorCustomerFilter]);

  const filteredCleanings = useMemo(() => {
    if (!roleDetermined || !isOperator) return [];
    let filtered = operatorAllCleanings;
    
    if (operatorDateFilter) {
      try {
        const filterDate = new Date(operatorDateFilter);
        if (!isNaN(filterDate.getTime())) {
          filterDate.setHours(0, 0, 0, 0);
          const filterDateEnd = new Date(filterDate);
          filterDateEnd.setHours(23, 59, 59, 999);
          filtered = filtered.filter(c => {
            const cleaningDate = getCleaningDate(c);
            return cleaningDate >= filterDate && cleaningDate <= filterDateEnd;
          });
        }
      } catch (e) {
        console.warn("[Operator] Invalid date filter:", operatorDateFilter);
      }
    }
    
    if (operatorCityFilter) {
      filtered = filtered.filter(c => (c.city || "").toLowerCase().includes(operatorCityFilter.toLowerCase()));
    }
    
    if (operatorTypeFilter) {
      if (operatorTypeFilter === "commercial") {
        filtered = filtered.filter(c => c.isCommercial);
      } else if (operatorTypeFilter === "residential") {
        filtered = filtered.filter(c => !c.isCommercial);
      }
    }
    
    return filtered;
  }, [roleDetermined, isOperator, operatorAllCleanings, operatorDateFilter, operatorCityFilter, operatorTypeFilter, getCleaningDate]);

  const cleaningsByDate = useMemo(() => {
    if (!roleDetermined || !isOperator) return {};
    const grouped: Record<string, any[]> = {};
    filteredCleanings.forEach(cleaning => {
      const date = getCleaningDate(cleaning);
      const dateKey = date.toISOString().split('T')[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(cleaning);
    });
    return grouped;
  }, [roleDetermined, isOperator, filteredCleanings, getCleaningDate]);

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

  // Show loading state until role is determined
  if (loading || !roleDetermined || !userId) {
    return (
      <>
        <Navbar />
        <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "3rem 0" }}>
            <p style={{ color: "#6b7280" }}>Loading dashboard...</p>
          </div>
        </main>
      </>
    );
  }

  // Operator Dashboard
  // Only render if operator and we have userId (prevents rendering before auth is ready)
  if (isOperator && userId && roleDetermined) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
              
              {/* Operator Header */}
              <div style={{ marginBottom: "2rem" }}>
                <h1 style={{ 
                  fontSize: "clamp(2rem, 5vw, 2.5rem)", 
                  fontWeight: "700", 
                  color: "var(--text-dark)",
                  marginBottom: "0.5rem"
                }}>
                  Operator Dashboard
                </h1>
                <p style={{ 
                  fontSize: "1rem", 
                  color: "#6b7280", 
                  marginBottom: "1.5rem"
                }}>
                  Day-to-day operations and customer management
                </p>
              </div>

              {operatorLoading ? (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <p style={{ color: "#6b7280" }}>Loading operator dashboard...</p>
                </div>
              ) : (
                <>
                  {/* Sticky Tab Navigation */}
                  <div style={{
                    position: "sticky",
                    top: "80px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "0.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb",
                    zIndex: 100,
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap"
                  }}>
                    <button
                      onClick={() => setOperatorActiveTab("overview")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: operatorActiveTab === "overview" ? "#16a34a" : "transparent",
                        color: operatorActiveTab === "overview" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setOperatorActiveTab("employees")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: operatorActiveTab === "employees" ? "#16a34a" : "transparent",
                        color: operatorActiveTab === "employees" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Employees
                    </button>
                    <button
                      onClick={() => setOperatorActiveTab("customers")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: operatorActiveTab === "customers" ? "#16a34a" : "transparent",
                        color: operatorActiveTab === "customers" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Customers
                    </button>
                    <button
                      onClick={() => setOperatorActiveTab("schedule")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: operatorActiveTab === "schedule" ? "#16a34a" : "transparent",
                        color: operatorActiveTab === "schedule" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Schedule
                    </button>
                  </div>

                  {/* Unified Card Container */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "2rem",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb"
                  }}>
                    {/* TAB: Overview */}
                    {operatorActiveTab === "overview" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                      Operations Overview
                    </h2>
                    <div style={{ 
                      display: "grid", 
                      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                      gap: "1rem",
                          marginBottom: "1.5rem"
                    }}>
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Direct Customers</div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {operatorStats.totalDirectCustomers}
                        </div>
                      </div>
                      
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Commercial Accounts</div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {operatorStats.totalCommercialCustomers}
                        </div>
                      </div>
                      
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Upcoming Cleanings</div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {operatorStats.upcomingCleanings}
                        </div>
                      </div>
                      
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Completed This Week</div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {operatorStats.cleaningsCompletedThisWeek}
                        </div>
                      </div>
                      
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Open Issues</div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {operatorStats.openIssues}
                        </div>
                      </div>
                    </div>
                  </div>
                    )}

                    {/* TAB: Employees */}
                    {operatorActiveTab === "employees" && (
                      <div>
                        <EmployeeStatus userId={userId} />
                      </div>
                    )}

                    {/* TAB: Customers */}
                    {operatorActiveTab === "customers" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                      Direct Customers
                    </h2>
                    
                    {/* Search and Filters */}
                    <div style={{ 
                      display: "flex", 
                      gap: "1rem", 
                      marginBottom: "1rem",
                      flexWrap: "wrap"
                    }}>
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={operatorCustomerSearch}
                        onChange={(e) => setOperatorCustomerSearch(e.target.value)}
                        style={{
                          flex: "1",
                          minWidth: "200px",
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem"
                        }}
                      />
                      <select
                        value={operatorCustomerFilter.plan || ""}
                        onChange={(e) => setOperatorCustomerFilter({ ...operatorCustomerFilter, plan: e.target.value || undefined })}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          background: "#ffffff"
                        }}
                      >
                        <option value="">All Plans</option>
                        <option value="one-time">Monthly Clean</option>
                        <option value="twice-month">Bi-Weekly</option>
                        <option value="bi-monthly">Bi-Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                      <select
                        value={operatorCustomerFilter.status || ""}
                        onChange={(e) => setOperatorCustomerFilter({ ...operatorCustomerFilter, status: e.target.value || undefined })}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          background: "#ffffff"
                        }}
                      >
                        <option value="">All Status</option>
                        <option value="active">Active</option>
                        <option value="paused">Paused</option>
                        <option value="canceled">Canceled</option>
                      </select>
                    </div>

                    {/* Customers Table */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      overflow: "hidden",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb"
                    }}>
                      {filteredDirectCustomers.length === 0 ? (
                        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                          No customers found.
                        </div>
                      ) : (
                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Address</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Plan</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Loyalty</th>
                                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Cleaning</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredDirectCustomers.map((customer) => {
                                const customerEmailLower = (customer.email || "").toLowerCase();
                                const nextCleaning = operatorAllCleanings
                                  .filter(c => {
                                    const cleaningEmailLower = (c.customerEmail || "").toLowerCase();
                                    return cleaningEmailLower === customerEmailLower && 
                                           c.status !== "cancelled" && 
                                           c.status !== "completed";
                                  })
                                  .sort((a, b) => {
                                    const dateA = getCleaningDate(a);
                                    const dateB = getCleaningDate(b);
                                    return dateA.getTime() - dateB.getTime();
                                  })[0];
                                
                                return (
                                  <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem" }}>
                                      {customer.firstName} {customer.lastName}
                                    </td>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                                      {customer.email}
                                    </td>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                                      {customer.addressLine1 ? `${customer.addressLine1}, ${customer.city}` : customer.city || "N/A"}
                                    </td>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem" }}>
                                      {PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan || "N/A"}
                                    </td>
                                    <td style={{ padding: "1rem" }}>
                                      <span style={{
                                        padding: "0.25rem 0.75rem",
                                        borderRadius: "999px",
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        background: customer.servicePaused ? "#fef3c7" : customer.subscriptionStatus === "active" ? "#d1fae5" : "#fee2e2",
                                        color: customer.servicePaused ? "#92400e" : customer.subscriptionStatus === "active" ? "#065f46" : "#991b1b"
                                      }}>
                                        {customer.servicePaused ? "Paused" : customer.subscriptionStatus === "active" ? "Active" : "Inactive"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                                      {customer.loyaltyRanking || "Getting Started"}
                                    </td>
                                    <td style={{ padding: "1rem", fontSize: "0.95rem", color: "#6b7280" }}>
                                      {nextCleaning ? (
                                        <>
                                          {getCleaningDate(nextCleaning).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                          <br />
                                          <span style={{ fontSize: "0.75rem" }}>{nextCleaning.scheduledTime || "TBD"}</span>
                                        </>
                                      ) : "None scheduled"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                  </div>

                        {/* Commercial Accounts Section */}
                        <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                      Commercial Accounts
                          </h3>
                    
                    {operatorCommercialCustomers.length === 0 ? (
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "2rem",
                        textAlign: "center",
                        color: "#6b7280",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb"
                      }}>
                        No commercial accounts found.
                      </div>
                    ) : (
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "1rem"
                      }}>
                        {operatorCommercialCustomers.map((account) => {
                          const accountEmailLower = (account.email || "").toLowerCase();
                          const nextService = operatorAllCleanings
                            .filter(c => {
                              const cleaningEmailLower = (c.customerEmail || "").toLowerCase();
                              return cleaningEmailLower === accountEmailLower && 
                                     c.status !== "cancelled" && 
                                     c.status !== "completed";
                            })
                            .sort((a, b) => {
                              const dateA = getCleaningDate(a);
                              const dateB = getCleaningDate(b);
                              return dateA.getTime() - dateB.getTime();
                            })[0];
                          
                          return (
                            <div key={account.id} style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                              border: "1px solid #e5e7eb"
                            }}>
                              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                                {account.businessName}
                              </h3>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
                                <div>{account.contactPerson}</div>
                                <div>{account.email}</div>
                                {account.phone && <div>{account.phone}</div>}
                              </div>
                              <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                                <strong>Bins:</strong> {account.binsCount}
                              </div>
                              <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                                <strong>Frequency:</strong> {account.frequency}
                              </div>
                              <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                                <strong>Next Service:</strong> {nextService ? (
                                  getCleaningDate(nextService).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                ) : "Not scheduled"}
                              </div>
                              {account.specialInstructions && (
                                <div style={{ fontSize: "0.875rem", marginTop: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "8px" }}>
                                  <strong>Notes:</strong> {account.specialInstructions}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                      </div>
                    )}

                    {/* TAB: Schedule */}
                    {operatorActiveTab === "schedule" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                      Schedule & Route Board
                    </h2>
                    
                    {/* Filters */}
                    <div style={{ 
                      display: "flex", 
                      gap: "1rem", 
                      marginBottom: "1rem",
                      flexWrap: "wrap"
                    }}>
                      <input
                        type="date"
                        value={operatorDateFilter}
                        onChange={(e) => setOperatorDateFilter(e.target.value)}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem"
                        }}
                      />
                      <input
                        type="text"
                        placeholder="Filter by city..."
                        value={operatorCityFilter}
                        onChange={(e) => setOperatorCityFilter(e.target.value)}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem"
                        }}
                      />
                      <select
                        value={operatorTypeFilter}
                        onChange={(e) => setOperatorTypeFilter(e.target.value)}
                        style={{
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          background: "#ffffff"
                        }}
                      >
                        <option value="">All Types</option>
                        <option value="commercial">Commercial</option>
                        <option value="residential">Residential</option>
                      </select>
                    </div>

                    {/* Schedule by Date */}
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                      border: "1px solid #e5e7eb"
                    }}>
                      {Object.keys(cleaningsByDate).length === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                          No cleanings scheduled.
                        </div>
                      ) : (
                        Object.keys(cleaningsByDate).sort().map(dateKey => {
                          const cleanings = cleaningsByDate[dateKey];
                          const date = new Date(dateKey);
                          
                          return (
                            <div key={dateKey} style={{ marginBottom: "2rem" }}>
                              <h3 style={{ 
                                fontSize: "1.125rem", 
                                fontWeight: "600", 
                                marginBottom: "1rem",
                                color: "var(--text-dark)",
                                paddingBottom: "0.5rem",
                                borderBottom: "2px solid #e5e7eb"
                              }}>
                                {date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                              </h3>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                {cleanings.map(cleaning => {
                                  const isCompleted = cleaning.status === "completed" || (cleaning as any).jobStatus === "completed";
                                  const isCancelled = cleaning.status === "cancelled";
                                  return (
                                  <div key={cleaning.id} style={{
                                    padding: "1rem",
                                    background: isCompleted ? "#f0fdf4" : isCancelled ? "#fef2f2" : "#f0f9ff",
                                    borderRadius: "8px",
                                    border: `1px solid ${isCompleted ? "#bbf7d0" : isCancelled ? "#fecaca" : "#bae6fd"}`,
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "start"
                                  }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "var(--text-dark)" }}>
                                        {cleaning.customerName || cleaning.customerEmail}
                                      </div>
                                      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                        {cleaning.addressLine1}, {cleaning.city}
                                      </div>
                                      <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                                        {PLAN_NAMES[cleaning.planType] || cleaning.planType || "N/A"} • {cleaning.scheduledTime || "TBD"}
                                      </div>
                                      {cleaning.internalNotes && (
                                        <div style={{ fontSize: "0.875rem", marginTop: "0.5rem", padding: "0.5rem", background: "#ffffff", borderRadius: "4px" }}>
                                          <strong>Notes:</strong> {cleaning.internalNotes}
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <span style={{
                                        padding: "0.25rem 0.75rem",
                                        borderRadius: "999px",
                                        fontSize: "0.75rem",
                                        fontWeight: "600",
                                        textTransform: "capitalize",
                                        background: isCompleted ? "#d1fae5" : isCancelled ? "#fee2e2" : "#dbeafe",
                                        color: isCompleted ? "#065f46" : isCancelled ? "#991b1b" : "#1e40af"
                                      }}>
                                        {cleaning.status || (cleaning as any).jobStatus || "scheduled"}
                                      </span>
                                    </div>
                                  </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                    )}

                    {/* Additional sections in Overview tab */}
                    {operatorActiveTab === "overview" && (
                      <>
                        {/* Customer Loyalty & Rankings */}
                        <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                      Customer Loyalty & Rankings
                          </h3>
                    
                    <div style={{
                            background: "#f9fafb",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                        {operatorDirectCustomers
                          .filter(c => c.loyaltyRanking && c.loyaltyRanking !== "Getting Started")
                          .sort((a, b) => {
                            const levels = ["Bin Royalty", "Sanitation Superstar", "Sparkle Specialist", "Bin Boss", "Clean Freak", "Getting Started"];
                            return levels.indexOf(a.loyaltyRanking || "Getting Started") - levels.indexOf(b.loyaltyRanking || "Getting Started");
                          })
                          .slice(0, 20)
                          .map(customer => {
                            const customerEmailLower = (customer.email || "").toLowerCase();
                            const completedCount = operatorAllCleanings.filter(c => {
                              const cleaningEmailLower = (c.customerEmail || "").toLowerCase();
                                    const isCompleted = c.status === "completed" || (c as any).jobStatus === "completed";
                                    return cleaningEmailLower === customerEmailLower && isCompleted;
                            }).length;
                            
                            return (
                              <div key={customer.id} style={{
                                padding: "1rem",
                                      background: "#ffffff",
                                borderRadius: "8px",
                                border: "1px solid #e5e7eb"
                              }}>
                                <div style={{ fontWeight: "600", marginBottom: "0.25rem", color: "var(--text-dark)" }}>
                                  {customer.firstName} {customer.lastName}
                                </div>
                                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                                  {customer.loyaltyRanking}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                                  {completedCount} completed cleanings
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      {filteredDirectCustomers.filter(c => c.loyaltyRanking && c.loyaltyRanking !== "Getting Started").length === 0 && (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                          No loyalty rankings available.
                        </div>
                      )}
                    </div>
                  </div>

                        {/* Internal Issues & Notes */}
                        <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
                          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                      Internal Issues & Notes
                          </h3>
                    
                    <div style={{
                            background: "#f9fafb",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      {operatorStats.openIssues === 0 ? (
                        <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
                          No open issues or notes.
                        </div>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                          {operatorDirectCustomers
                            .filter(c => c.internalNotes && c.internalNotes.trim().length > 0)
                            .map(customer => (
                              <div key={customer.id} style={{
                                padding: "1rem",
                                background: "#fef3c7",
                                borderRadius: "8px",
                                border: "1px solid #fde68a"
                              }}>
                                <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                                  {customer.firstName} {customer.lastName} ({customer.email})
                                </div>
                                <div style={{ fontSize: "0.875rem", color: "#92400e" }}>
                                  {customer.internalNotes}
                                </div>
                              </div>
                            ))}
                          {operatorCommercialCustomers
                            .filter(c => c.specialInstructions && c.specialInstructions.trim().length > 0)
                            .map(account => (
                              <div key={account.id} style={{
                                padding: "1rem",
                                background: "#fef3c7",
                                borderRadius: "8px",
                                border: "1px solid #fde68a"
                              }}>
                                <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                                  {account.businessName} ({account.email})
                                </div>
                                <div style={{ fontSize: "0.875rem", color: "#92400e" }}>
                                  {account.specialInstructions}
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </main>
      </>
    );
  }

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

              {/* Admin Tab Navigation */}
              {isAdmin && !isOwner && (
                <>
                  {/* Sticky Tab Navigation */}
                  <div style={{
                    position: "sticky",
                    top: "80px",
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "0.5rem",
                    marginBottom: "1.5rem",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb",
                    zIndex: 100,
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap"
                  }}>
                    <button
                      onClick={() => setAdminActiveTab("overview")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "overview" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "overview" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Overview
                    </button>
                    <button
                      onClick={() => setAdminActiveTab("customers")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "customers" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "customers" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Customers
                    </button>
                    <button
                      onClick={() => setAdminActiveTab("operations")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "operations" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "operations" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Operations
                    </button>
                    <button
                      onClick={() => setAdminActiveTab("financial")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "financial" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "financial" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Financial
                    </button>
                    <button
                      onClick={() => setAdminActiveTab("partners")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "partners" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "partners" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Partners
                    </button>
                    <button
                      onClick={() => setAdminActiveTab("analytics")}
                      style={{
                        flex: "1",
                        minWidth: "120px",
                        padding: "0.75rem 1.5rem",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: adminActiveTab === "analytics" ? "#16a34a" : "transparent",
                        color: adminActiveTab === "analytics" ? "#ffffff" : "#6b7280",
                        transition: "all 0.2s"
                      }}
                    >
                      Analytics
                    </button>
                    <a
                      href="/employee/register"
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: "#16a34a",
                        color: "#ffffff",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "600",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        transition: "background 0.2s",
                        fontSize: "0.95rem",
                        whiteSpace: "nowrap"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#15803d";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#16a34a";
                      }}
                    >
                      + Register Employee
                    </a>
                  </div>

                  {/* Unified Card Container */}
                  <div style={{
                    background: "#ffffff",
                    borderRadius: "20px",
                    padding: "2rem",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                    border: "1px solid #e5e7eb"
                  }}>
                    {/* TAB: Overview */}
                    {adminActiveTab === "overview" && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0 }}>
                            Business Overview
                          </h2>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <div style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "#16a34a",
                              animation: "pulse 2s infinite"
                            }} />
                            <span>Live updates enabled</span>
                          </div>
                        </div>
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

                      {/* Monthly Recurring Revenue */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Monthly Recurring Revenue
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                          {"$" + Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue).toLocaleString()}
                        </div>
                      </div>

                      {/* Active Subscriptions */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Active Subscriptions
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {adminStats.activeSubscriptions || 0}
                        </div>
                      </div>

                      {/* Completed Cleanings This Month */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Completed This Month
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                          {adminStats.completedCleaningsThisMonth || 0}
                        </div>
                      </div>

                      {/* Completed Cleanings This Week */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Completed This Week
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                          {adminStats.completedCleaningsThisWeek || 0}
                        </div>
                      </div>

                      {/* Active Employees */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Active Employees
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                          {adminStats.activeEmployees || 0}
                        </div>
                      </div>

                      {/* Average Revenue Per Customer */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Avg Revenue Per Customer
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                          {"$" + Math.round(adminStats.averageRevenuePerCustomer || 0).toLocaleString()}
                        </div>
                      </div>

                      {/* Customer Growth Rate */}
                      {adminStats.customerGrowthRate !== 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                        }}>
                          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            Customer Growth Rate
                          </div>
                          <div style={{ fontSize: "2rem", fontWeight: "700", color: adminStats.customerGrowthRate >= 0 ? "#16a34a" : "#dc2626" }}>
                            {adminStats.customerGrowthRate >= 0 ? "+" : ""}{adminStats.customerGrowthRate.toFixed(1)}%
                          </div>
                        </div>
                      )}

                      {/* Customer Retention Rate */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                          Customer Retention Rate
                        </div>
                        <div style={{ fontSize: "2rem", fontWeight: "700", color: adminStats.customerRetentionRate >= 80 ? "#16a34a" : adminStats.customerRetentionRate >= 60 ? "#f59e0b" : "#dc2626" }}>
                          {adminStats.customerRetentionRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Stats Grid */}
                  {!adminLoading && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                      gap: "1rem",
                      marginBottom: "2rem"
                    }}>
                      {/* Revenue by Source */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                          Revenue by Source
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Direct</span>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                              ${Math.round(adminStats.revenueBySource?.direct || 0).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Partner</span>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                              ${Math.round(adminStats.revenueBySource?.partner || 0).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cleanings Status */}
                      <div style={{
                        background: "#ffffff",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        border: "1px solid #e5e7eb",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                      }}>
                        <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                          Cleanings Status
                        </h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Completed</span>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#16a34a" }}>
                              {adminStats.cleaningsStatus?.completed || 0}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Pending</span>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#f59e0b" }}>
                              {adminStats.cleaningsStatus?.pending || 0}
                            </span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Cancelled</span>
                            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#dc2626" }}>
                              {adminStats.cleaningsStatus?.cancelled || 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Charts Section */}
                  {!adminLoading && (
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                      gap: "1.5rem",
                      marginBottom: "2rem"
                    }}>
                      {/* Revenue Trend Chart */}
                      {chartData.revenueTrend.length > 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        >
                          <LineChart
                            data={chartData.revenueTrend}
                            height={200}
                            title="Revenue Trend (Last 30 Days)"
                            onClick={() => setChartModal({
                              isOpen: true,
                              chartType: "line",
                              title: "Revenue Trend (Last 30 Days)",
                              data: chartData.revenueTrend,
                            })}
                          />
                        </div>
                      )}

                      {/* Customer Growth Chart */}
                      {chartData.customerGrowth.length > 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        >
                          <LineChart
                            data={chartData.customerGrowth}
                            height={200}
                            title="Customer Growth (Last 6 Months)"
                            onClick={() => setChartModal({
                              isOpen: true,
                              chartType: "line",
                              title: "Customer Growth (Last 6 Months)",
                              data: chartData.customerGrowth,
                            })}
                          />
                        </div>
                      )}

                      {/* Weekly Cleanings Chart */}
                      {chartData.weeklyCleanings.length > 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        >
                          <BarChart
                            data={chartData.weeklyCleanings}
                            height={200}
                            title="Cleanings Completed (Weekly)"
                            onClick={() => setChartModal({
                              isOpen: true,
                              chartType: "bar",
                              title: "Cleanings Completed (Weekly)",
                              data: chartData.weeklyCleanings,
                            })}
                          />
                        </div>
                      )}

                      {/* Plan Distribution Chart */}
                      {chartData.planDistribution.length > 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        >
                          <PieChart
                            data={chartData.planDistribution}
                            size={200}
                            title="Customers by Plan"
                            onClick={() => setChartModal({
                              isOpen: true,
                              chartType: "pie",
                              title: "Customers by Plan",
                              data: chartData.planDistribution,
                            })}
                          />
                        </div>
                      )}

                      {/* Revenue by Plan Chart */}
                      {chartData.revenueByPlan.length > 0 && (
                        <div style={{
                          background: "#ffffff",
                          borderRadius: "12px",
                          padding: "1.5rem",
                          border: "1px solid #e5e7eb",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                          transition: "box-shadow 0.2s, transform 0.2s",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                          e.currentTarget.style.transform = "translateY(0)";
                        }}
                        >
                          <BarChart
                            data={chartData.revenueByPlan.map(p => ({ ...p, color: "#16a34a" }))}
                            height={200}
                            title="Revenue by Plan Type"
                            onClick={() => setChartModal({
                              isOpen: true,
                              chartType: "bar",
                              title: "Revenue by Plan Type",
                              data: chartData.revenueByPlan.map(p => ({ ...p, color: "#16a34a" })),
                            })}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Customers by Plan (Legacy View) */}
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

                    {/* TAB: Customers */}
                    {adminActiveTab === "customers" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem" }}>
                          Customers
                        </h2>

                        {/* Customer Insights */}
                        {!adminLoading && (
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                            gap: "1rem",
                            marginBottom: "2rem"
                          }}>
                            {/* High-Value Customers */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                            }}>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                High-Value Customers
                              </div>
                              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                                {allCustomers.filter((c: any) => c.completedCleanings >= 10).length}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                10+ cleanings
                              </div>
                            </div>

                            {/* Inactive Customers */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                            }}>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Inactive Customers
                              </div>
                              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#dc2626" }}>
                                {allCustomers.filter((c: any) => c.subscriptionStatus !== "active").length}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                Not active
                              </div>
                            </div>

                            {/* New Customers (This Month) */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                            }}>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                New This Month
                              </div>
                              <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                {allCustomers.filter((c: any) => {
                                  const createdAt = c.createdAt?.toDate?.() || new Date(c.createdAt || 0);
                                  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                                  return createdAt >= startOfMonth;
                                }).length}
                              </div>
                            </div>

                            {/* Churn Risk */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                            }}>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                Churn Risk
                              </div>
                              <div style={{ fontSize: "2rem", fontWeight: "700", color: "#f59e0b" }}>
                                {allCustomers.filter((c: any) => {
                                  const lastCleaning = allCleanings
                                    .filter((cl: any) => cl.userId === c.id && (cl.status === "completed" || cl.jobStatus === "completed"))
                                    .sort((a: any, b: any) => {
                                      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt || 0);
                                      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt || 0);
                                      return dateB.getTime() - dateA.getTime();
                                    })[0];
                                  if (!lastCleaning) return c.subscriptionStatus !== "active";
                                  const lastDate = lastCleaning.completedAt?.toDate?.() || new Date(lastCleaning.completedAt || 0);
                                  const daysSince = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                                  return daysSince > 60 && c.subscriptionStatus === "active";
                                }).length}
                              </div>
                              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                No cleaning in 60+ days
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Loyalty Level Distribution */}
                        {!adminLoading && (
                          <div style={{
                            background: "#ffffff",
                            borderRadius: "12px",
                            padding: "1.5rem",
                            border: "1px solid #e5e7eb",
                            marginBottom: "2rem"
                          }}>
                            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                              Loyalty Level Distribution
                            </h3>
                            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                              {["Getting Started", "Clean Freak", "Bin Boss", "Sparkle Specialist", "Sanitation Superstar", "Bin Royalty"].map((level) => {
                                const count = allCustomers.filter((c: any) => c.loyaltyLevel === level).length;
                                return (
                                  <div key={level} style={{
                                    padding: "0.75rem 1rem",
                                    background: "#f9fafb",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    flex: "1",
                                    minWidth: "150px"
                                  }}>
                                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                      {level}
                                    </div>
                                    <div style={{ fontSize: "1.25rem", fontWeight: "600", color: "var(--text-dark)" }}>
                                      {count}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

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
                          <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                              No customers found matching your filters.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.slice(0, 50).map((customer: any) => {
                            // Calculate churn risk
                            const lastCleaning = allCleanings
                              .filter((cl: any) => cl.userId === customer.id && (cl.status === "completed" || cl.jobStatus === "completed"))
                              .sort((a: any, b: any) => {
                                const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt || 0);
                                const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt || 0);
                                return dateB.getTime() - dateA.getTime();
                              })[0];
                            
                            let riskLevel = "Low";
                            let riskColor = "#16a34a";
                            if (customer.subscriptionStatus !== "active") {
                              riskLevel = "High";
                              riskColor = "#dc2626";
                            } else if (lastCleaning) {
                              const lastDate = lastCleaning.completedAt?.toDate?.() || new Date(lastCleaning.completedAt || 0);
                              const daysSince = (new Date().getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
                              if (daysSince > 60) {
                                riskLevel = "High";
                                riskColor = "#dc2626";
                              } else if (daysSince > 30) {
                                riskLevel = "Medium";
                                riskColor = "#f59e0b";
                              }
                            } else if (customer.subscriptionStatus === "active") {
                              riskLevel = "Medium";
                              riskColor = "#f59e0b";
                            }

                            return (
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
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                                  <span style={{
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    background: riskColor === "#16a34a" ? "#d1fae5" : riskColor === "#f59e0b" ? "#fef3c7" : "#fee2e2",
                                    color: riskColor
                                  }}>
                                    {riskLevel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                      </div>
                    )}

                    {/* TAB: Financial */}
                    {adminActiveTab === "financial" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem" }}>
                          Financial Overview
                        </h2>
                        
                        {adminLoading ? (
                          <p style={{ color: "#6b7280" }}>Loading financial data...</p>
                        ) : (
                          <>
                            {/* Revenue Overview */}
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: "1rem",
                              marginBottom: "2rem"
                            }}>
                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Monthly Recurring Revenue
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                                  ${Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue).toLocaleString()}
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Total Revenue (Est.)
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                                  ${Math.round((adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) * 12).toLocaleString()}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                  Annual projection
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Direct Revenue
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                  ${Math.round(adminStats.revenueBySource?.direct || 0).toLocaleString()}
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Partner Revenue
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                  ${Math.round(adminStats.revenueBySource?.partner || 0).toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {/* Payouts Section */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              marginBottom: "2rem"
                            }}>
                              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                                Payouts
                              </h3>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "1rem"
                              }}>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Employee Payouts (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                    ${(adminStats.completedCleaningsThisMonth * 10).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                    Based on {adminStats.completedCleaningsThisMonth} completed cleanings @ $10/job
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Partner Payouts (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                    ${Math.round((adminStats.revenueBySource?.partner || 0) * 0.6).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                    60% of partner revenue
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Total Payouts (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#dc2626" }}>
                                    ${((adminStats.completedCleaningsThisMonth * 10) + Math.round((adminStats.revenueBySource?.partner || 0) * 0.6)).toLocaleString()}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Profit Analysis */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              marginBottom: "2rem"
                            }}>
                              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                                Profit Analysis
                              </h3>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "1rem"
                              }}>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Gross Revenue
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Total Expenses
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#dc2626" }}>
                                    ${((adminStats.completedCleaningsThisMonth * 10) + Math.round((adminStats.revenueBySource?.partner || 0) * 0.6)).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Net Profit (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${(Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) - ((adminStats.completedCleaningsThisMonth * 10) + Math.round((adminStats.revenueBySource?.partner || 0) * 0.6))).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Profit Margin
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    {adminStats.monthlyRecurringRevenue > 0 ? Math.round(((Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) - ((adminStats.completedCleaningsThisMonth * 10) + Math.round((adminStats.revenueBySource?.partner || 0) * 0.6))) / Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue)) * 100) : 0}%
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Revenue by Plan Chart */}
                            {chartData.revenueByPlan.length > 0 && (
                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                marginBottom: "2rem",
                                transition: "box-shadow 0.2s, transform 0.2s",
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                              >
                                <BarChart
                                  data={chartData.revenueByPlan.map(p => ({ ...p, color: "#16a34a" }))}
                                  height={250}
                                  title="Revenue by Plan Type"
                                  onClick={() => setChartModal({
                                    isOpen: true,
                                    chartType: "bar",
                                    title: "Revenue by Plan Type",
                                    data: chartData.revenueByPlan.map(p => ({ ...p, color: "#16a34a" })),
                                  })}
                                />
                              </div>
                            )}

                            {/* Revenue Trend Chart */}
                            {chartData.revenueTrend.length > 0 && (
                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                transition: "box-shadow 0.2s, transform 0.2s",
                                cursor: "pointer"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                                e.currentTarget.style.transform = "translateY(-2px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                                e.currentTarget.style.transform = "translateY(0)";
                              }}
                              >
                                <LineChart
                                  data={chartData.revenueTrend}
                                  height={250}
                                  title="Revenue Trend (Last 30 Days)"
                                  onClick={() => setChartModal({
                                    isOpen: true,
                                    chartType: "line",
                                    title: "Revenue Trend (Last 30 Days)",
                                    data: chartData.revenueTrend,
                                  })}
                                />
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* TAB: Partners */}
                    {adminActiveTab === "partners" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem" }}>
                          Partner Management
                        </h2>
                        <AdminPartnerApplications />
                        <AdminPartnerManagement />
                      </div>
                    )}

                    {/* TAB: Analytics */}
                    {adminActiveTab === "analytics" && (
                      <div>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "1.5rem" }}>
                          Analytics & Reports
                        </h2>
                        
                        {adminLoading ? (
                          <p style={{ color: "#6b7280" }}>Loading analytics...</p>
                        ) : (
                          <>
                            {/* Growth Metrics */}
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: "1rem",
                              marginBottom: "2rem"
                            }}>
                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Customer Growth Rate
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: adminStats.customerGrowthRate >= 0 ? "#16a34a" : "#dc2626" }}>
                                  {adminStats.customerGrowthRate >= 0 ? "+" : ""}{adminStats.customerGrowthRate.toFixed(1)}%
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Revenue Growth Rate
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                                  {adminStats.monthlyRecurringRevenue > 0 ? "+" : ""}{((adminStats.completedCleaningsThisMonth / Math.max(adminStats.completedCleaningsThisMonth - 10, 1)) - 1) * 100 > 0 ? Math.round(((adminStats.completedCleaningsThisMonth / Math.max(adminStats.completedCleaningsThisMonth - 10, 1)) - 1) * 100) : 0}%
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                  Based on cleanings
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Cleanings Growth Rate
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
                                  {adminStats.completedCleaningsThisWeek > 0 ? "+" : ""}{adminStats.completedCleaningsThisWeek > 0 ? Math.round(((adminStats.completedCleaningsThisWeek / Math.max(adminStats.completedCleaningsThisWeek - 5, 1)) - 1) * 100) : 0}%
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                  Week over week
                                </div>
                              </div>

                              <div style={{
                                background: "#ffffff",
                                borderRadius: "12px",
                                padding: "1.5rem",
                                border: "1px solid #e5e7eb",
                                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)"
                              }}>
                                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                  Customer Retention Rate
                                </div>
                                <div style={{ fontSize: "2rem", fontWeight: "700", color: adminStats.customerRetentionRate >= 80 ? "#16a34a" : adminStats.customerRetentionRate >= 60 ? "#f59e0b" : "#dc2626" }}>
                                  {adminStats.customerRetentionRate.toFixed(1)}%
                                </div>
                              </div>
                            </div>

                            {/* Charts Section */}
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                              gap: "1.5rem",
                              marginBottom: "2rem"
                            }}>
                              {/* Customer Growth Chart */}
                              {chartData.customerGrowth.length > 0 && (
                                <div style={{
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  padding: "1.5rem",
                                  border: "1px solid #e5e7eb",
                                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                                  transition: "box-shadow 0.2s, transform 0.2s",
                                  cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                                >
                                  <LineChart
                                    data={chartData.customerGrowth}
                                    height={250}
                                    title="Customer Growth Trend (Last 6 Months)"
                                    onClick={() => setChartModal({
                                      isOpen: true,
                                      chartType: "line",
                                      title: "Customer Growth Trend (Last 6 Months)",
                                      data: chartData.customerGrowth,
                                    })}
                                  />
                                </div>
                              )}

                              {/* Weekly Cleanings Chart */}
                              {chartData.weeklyCleanings.length > 0 && (
                                <div style={{
                                  background: "#ffffff",
                                  borderRadius: "12px",
                                  padding: "1.5rem",
                                  border: "1px solid #e5e7eb",
                                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                                  transition: "box-shadow 0.2s, transform 0.2s",
                                  cursor: "pointer"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                                  e.currentTarget.style.transform = "translateY(-2px)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.05)";
                                  e.currentTarget.style.transform = "translateY(0)";
                                }}
                                >
                                  <BarChart
                                    data={chartData.weeklyCleanings}
                                    height={250}
                                    title="Cleanings Completed (Weekly Trend)"
                                    onClick={() => setChartModal({
                                      isOpen: true,
                                      chartType: "bar",
                                      title: "Cleanings Completed (Weekly Trend)",
                                      data: chartData.weeklyCleanings,
                                    })}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Monthly Trends */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb",
                              marginBottom: "2rem"
                            }}>
                              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                                Monthly Performance Summary
                              </h3>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                                gap: "1rem"
                              }}>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Customers
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                    {adminStats.totalCustomers}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Cleanings (MTD)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    {adminStats.completedCleaningsThisMonth}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Revenue (MRR)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round(adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue).toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Active Subscriptions
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                                    {adminStats.activeSubscriptions}
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Avg Revenue/Customer
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round(adminStats.averageRevenuePerCustomer || 0)}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Forecast Section */}
                            <div style={{
                              background: "#ffffff",
                              borderRadius: "12px",
                              padding: "1.5rem",
                              border: "1px solid #e5e7eb"
                            }}>
                              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "1rem" }}>
                                Revenue Forecast
                              </h3>
                              <div style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "1rem"
                              }}>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Next Month (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round((adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) * 1.05).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                    +5% growth assumption
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Next Quarter (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round((adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) * 3.15).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                    3 months projection
                                  </div>
                                </div>
                                <div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600", textTransform: "uppercase" }}>
                                    Annual (Est.)
                                  </div>
                                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
                                    ${Math.round((adminStats.monthlyRecurringRevenue || adminStats.estimatedMonthlyRevenue) * 12).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                                    Based on current MRR
                                  </div>
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
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
            </div>

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
                  Pick your preferred cleaning day and confirm your address below.
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
                  We&apos;ll arrive on or shortly after your preferred cleaning day.
                </p>
                <p style={{ 
                  fontSize: "0.875rem", 
                  color: "#dc2626", 
                  marginTop: "0.5rem",
                  fontWeight: "500"
                }}>
                  Important: Please ensure your trash can is empty for faster, more effective cleaning.
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

                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", border: "1px solid #d1d5db", borderRadius: "8px", padding: "0.25rem" }}>
                    <button
                          type="button"
                          onClick={() => setExtraBinQuantity(Math.max(1, extraBinQuantity - 1))}
                          disabled={extraBinQuantity <= 1}
                      style={{
                            fontSize: "1rem",
                            color: extraBinQuantity <= 1 ? "#9ca3af" : "#6b7280",
                            background: "transparent",
                            border: "none",
                            borderRadius: "4px",
                            padding: "0.25rem 0.5rem",
                            cursor: extraBinQuantity <= 1 ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            minWidth: "32px",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            if (extraBinQuantity > 1) {
                              e.currentTarget.style.background = "#f3f4f6";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          −
                        </button>
                        <span style={{ 
                        fontSize: "0.875rem",
                          fontWeight: "600", 
                          color: "#111827",
                          minWidth: "40px",
                          textAlign: "center"
                        }}>
                          {extraBinQuantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraBinQuantity(extraBinQuantity + 1)}
                          style={{
                            fontSize: "1rem",
                        color: "#6b7280",
                            background: "transparent",
                            border: "none",
                            borderRadius: "4px",
                            padding: "0.25rem 0.5rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            minWidth: "32px",
                            transition: "all 0.2s"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f3f4f6";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={async () => {
                          if (!userId) {
                            alert("Please log in to add extra bins");
                            return;
                          }
                          setExtraBinLoading(true);
                          try {
                            const response = await fetch("/api/stripe/extra-bin", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                userId,
                                quantity: extraBinQuantity,
                              }),
                            });

                            const data = await response.json();

                            if (!response.ok) {
                              throw new Error(data.error || "Failed to create checkout session");
                            }

                            if (data.url) {
                              window.location.href = data.url;
                            } else {
                              throw new Error("No checkout URL returned");
                            }
                          } catch (error: any) {
                            console.error("Error creating extra bin checkout:", error);
                            alert(error.message || "Failed to start checkout. Please try again.");
                            setExtraBinLoading(false);
                          }
                        }}
                        disabled={extraBinLoading}
                        style={{
                          fontSize: "0.875rem",
                          color: extraBinLoading ? "#9ca3af" : "#6b7280",
                        background: "transparent",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        padding: "0.5rem 1rem",
                          cursor: extraBinLoading ? "not-allowed" : "pointer",
                        fontWeight: "600",
                        transition: "all 0.2s"
                      }}
                      onMouseEnter={(e) => {
                          if (!extraBinLoading) {
                        e.currentTarget.style.borderColor = "#6b7280";
                          }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#d1d5db";
                      }}
                    >
                        {extraBinLoading ? "Processing..." : `Add ${extraBinQuantity} Extra Bin${extraBinQuantity > 1 ? 's' : ''} ($${(extraBinQuantity * 10).toFixed(2)})`}
                    </button>
                    </div>
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

            {/* (E) Upcoming & Past Cleanings */}
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
                        const cleaningDate = getCleaningDate(cleaning);
                        const customer = isAdmin ? allCustomers.find((c: any) => c.id === cleaning.userId) : null;
                        const isCompleted = cleaning.status === "completed" || (cleaning as any).jobStatus === "completed";
                        const canEdit = !isAdmin && !isCompleted && cleaning.status !== "cancelled" && cleaningDate.getTime() > new Date().getTime() + (12 * 60 * 60 * 1000);
                        
                        return (
                          <div
                            key={cleaning.id}
                            style={{
                              padding: "1.5rem",
                              background: isCompleted ? "#f0fdf4" : "#f0f9ff",
                              borderRadius: "12px",
                              border: `2px solid ${isCompleted ? "#bbf7d0" : "#bae6fd"}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "start",
                              flexWrap: "wrap",
                              gap: "1rem"
                            }}
                          >
                            <div style={{ flex: 1, minWidth: "200px" }}>
                              <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.5rem" }}>
                                {cleaningDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                              </div>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                <strong>Time Window:</strong> {cleaning.scheduledTime || "TBD"}
                              </div>
                              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                <strong>Address:</strong> {cleaning.addressLine1}{cleaning.addressLine2 ? `, ${cleaning.addressLine2}` : ""}, {cleaning.city}, {cleaning.state} {cleaning.zipCode}
                              </div>
                              {cleaning.preferredCleaningDay && (
                                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                                  <strong>Preferred Cleaning Day:</strong> {cleaning.preferredCleaningDay}
                                </div>
                              )}
                              {customer && (
                                <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                                  {customer.selectedPlan ? (PLAN_NAMES[customer.selectedPlan] || customer.selectedPlan) : "No plan"} • {customer.source === "partner" ? "Partner" : "Direct"}
                                </div>
                              )}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                              {canEdit && (
                                <button
                                  onClick={() => {
                                    setEditingCleaning(cleaning);
                                    setIsEditModalOpen(true);
                                  }}
                                  style={{
                                    padding: "0.5rem 1rem",
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    transition: "all 0.2s"
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#15803d";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#16a34a";
                                  }}
                                >
                                  Edit
                                </button>
                              )}
                              {!canEdit && !isCompleted && cleaning.status !== "cancelled" && (
                                <div style={{ fontSize: "0.75rem", color: "#dc2626", textAlign: "right" }}>
                                  Editing not available within 12 hours of service
                                </div>
                              )}
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
                        const isCompleted = cleaning.status === "completed" || (cleaning as any).jobStatus === "completed";
                        const statusColor = isCompleted ? "#16a34a" : "#dc2626";
                        return (
                          <div
                            key={cleaning.id}
                            style={{
                              padding: "1rem",
                              background: isCompleted ? "#f0fdf4" : "#fef2f2",
                              borderRadius: "8px",
                              border: `1px solid ${isCompleted ? "#bbf7d0" : "#fecaca"}`,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center"
                            }}
                          >
                            <div>
                              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                                {cleaningDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
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
                              background: isCompleted ? "#d1fae5" : "#fee2e2",
                              color: statusColor
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

            {/* (F) Loyalty Badges - Hidden for admin */}
            {!isAdmin && userId && (
              <div ref={rewardsSectionRef} style={{ marginBottom: "2rem", scrollMarginTop: "100px" }}>
                <LoyaltyBadges userId={userId} />
              </div>
            )}

            {/* (G) Referral Rewards - Hidden for admin */}
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
      
      {/* Edit Cleaning Modal */}
      {editingCleaning && (
        <EditCleaningModal
          cleaning={editingCleaning}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingCleaning(null);
          }}
          onUpdated={() => {
            setIsEditModalOpen(false);
            setEditingCleaning(null);
            // Reload cleanings
            window.location.reload();
          }}
        />
      )}

      {/* Chart Modal */}
      <ChartModal
        isOpen={chartModal.isOpen}
        onClose={() => setChartModal({ ...chartModal, isOpen: false })}
        chartType={chartModal.chartType}
        title={chartModal.title}
        data={chartModal.data}
      />
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
