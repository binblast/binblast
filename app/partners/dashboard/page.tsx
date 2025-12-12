// app/partners/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  phone: string;
  serviceArea: string;
  serviceType: string;
  status: "pending_agreement" | "active" | "suspended";
  revenueSharePartner: number;
  revenueSharePlatform: number;
  referralCode: string;
  partnerCode?: string;
  bookingLinkSlug: string;
  websiteOrInstagram?: string;
  hasInsurance?: boolean;
  promotionMethod?: string;
  heardAboutUs?: string;
}

interface PartnerBooking {
  id: string;
  partnerId: string;
  customerName: string | null;
  customerEmail: string;
  planId: string | null;
  planName: string;
  bookingAmount: number; // in cents
  partnerShareAmount: number; // in cents
  status: "active" | "cancelled" | "refunded" | "trial";
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: any;
  updatedAt: any;
  nextServiceDate: any | null;
  firstServiceDate: any | null;
}

interface Customer {
  email: string;
  name: string | null;
  bookings: PartnerBooking[];
  nextServiceDate: Date | null;
  activeSubscriptions: number;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [upcomingCleanings, setUpcomingCleanings] = useState<Array<{ customer: string; date: Date; plan: string; address?: string }>>([]);
  const [stats, setStats] = useState({
    thisMonthEarnings: 0,
    totalCustomers: 0,
    activeSubscriptions: 0,
    nextPayoutDate: "Payouts processed on the 25th of each month",
  });
  const [copied, setCopied] = useState(false);
  const [copiedSignupLink, setCopiedSignupLink] = useState(false);
  const [showPlaybookScripts, setShowPlaybookScripts] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          setUserId(auth.currentUser.uid);
          loadPartnerData(auth.currentUser.uid);
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user) {
            setUserId(user.uid);
            loadPartnerData(user.uid);
          } else {
            router.push("/login?redirect=/partners/dashboard");
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
  }, [router]);

  async function loadPartnerData(uid: string) {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, query, where, getDocs, doc, getDoc } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      let partnersQuery = query(
        collection(db, "partners"),
        where("userId", "==", uid),
        where("status", "==", "active")
      );
      let partnersSnapshot = await getDocs(partnersQuery);

      if (partnersSnapshot.empty) {
        const { getAuthInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        const userEmail = auth?.currentUser?.email;
        
        if (userEmail) {
          const partnersByEmailQuery = query(
            collection(db, "partners"),
            where("email", "==", userEmail),
            where("status", "==", "active")
          );
          const partnersByEmailSnapshot = await getDocs(partnersByEmailQuery);
          
          if (!partnersByEmailSnapshot.empty) {
            partnersSnapshot = partnersByEmailSnapshot;
          }
        }
      }

      if (partnersSnapshot.empty) {
        let allPartnersQuery = query(
          collection(db, "partners"),
          where("userId", "==", uid)
        );
        let allPartnersSnapshot = await getDocs(allPartnersQuery);
        
        if (allPartnersSnapshot.empty) {
          const { getAuthInstance } = await import("@/lib/firebase");
          const auth = await getAuthInstance();
          const userEmail = auth?.currentUser?.email;
          
          if (userEmail) {
            allPartnersQuery = query(
              collection(db, "partners"),
              where("email", "==", userEmail)
            );
            allPartnersSnapshot = await getDocs(allPartnersQuery);
          }
        }
        
        if (!allPartnersSnapshot.empty) {
          const partnerData = allPartnersSnapshot.docs[0].data();
          if (partnerData.status === "pending_agreement") {
            router.push(`/partners/agreement/${allPartnersSnapshot.docs[0].id}`);
            return;
          }
        }
        
        setLoading(false);
        return;
      }

      const partnerDoc = partnersSnapshot.docs[0];
      const data = partnerDoc.data();
      
      if (data && partnerDoc.id) {
        setPartnerData({
          id: partnerDoc.id,
          ...data,
        } as PartnerData);
      } else {
        setLoading(false);
        return;
      }

      const bookingsQuery = query(
        collection(db, "partnerBookings"),
        where("partnerId", "==", partnerDoc.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList: PartnerBooking[] = [];
      const customerMap = new Map<string, Customer>();
      let thisMonthEarningsCents = 0;
      let activeSubscriptionsCount = 0;

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        const booking: PartnerBooking = {
          id: doc.id,
          ...bookingData,
        } as PartnerBooking;
        
        bookingsList.push(booking);

        const email = bookingData.customerEmail;
        if (email) {
          if (!customerMap.has(email)) {
            customerMap.set(email, {
              email,
              name: bookingData.customerName || null,
              bookings: [],
              nextServiceDate: null,
              activeSubscriptions: 0,
            });
          }
          const customer = customerMap.get(email)!;
          customer.bookings.push(booking);
          
          if (bookingData.nextServiceDate) {
            const nextDate = bookingData.nextServiceDate?.toDate?.() || new Date(bookingData.nextServiceDate?.seconds * 1000);
            if (!customer.nextServiceDate || nextDate < customer.nextServiceDate) {
              customer.nextServiceDate = nextDate;
            }
          }
          
          if (bookingData.status === "active") {
            customer.activeSubscriptions++;
            activeSubscriptionsCount++;
          }
        }

        const bookingDate = bookingData.createdAt?.toDate?.() || new Date(bookingData.createdAt?.seconds * 1000 || Date.now());
        if (bookingDate >= currentMonthStart && bookingData.status !== "refunded") {
          thisMonthEarningsCents += bookingData.partnerShareAmount || 0;
        }
      });

      bookingsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      const customersList = Array.from(customerMap.values()).sort((a, b) => {
        if (!a.nextServiceDate) return 1;
        if (!b.nextServiceDate) return -1;
        return a.nextServiceDate.getTime() - b.nextServiceDate.getTime();
      });

      const cleanings: Array<{ customer: string; date: Date; plan: string; address?: string }> = [];
      customersList.forEach(customer => {
        if (customer.nextServiceDate && customer.nextServiceDate >= now) {
          const activeBooking = customer.bookings.find(b => b.status === "active");
          if (activeBooking) {
            cleanings.push({
              customer: customer.name || customer.email.split("@")[0],
              date: customer.nextServiceDate,
              plan: activeBooking.planName || "N/A",
            });
          }
        }
      });
      cleanings.sort((a, b) => a.date.getTime() - b.date.getTime());

      setBookings(bookingsList);
      setCustomers(customersList);
      setUpcomingCleanings(cleanings);
      setStats({
        thisMonthEarnings: thisMonthEarningsCents,
        totalCustomers: customerMap.size,
        activeSubscriptions: activeSubscriptionsCount,
        nextPayoutDate: "Payouts processed on the 25th of each month",
      });

      setLoading(false);
    } catch (err) {
      console.error("Error loading partner data:", err);
      setLoading(false);
    }
  }

  const partnerLink = typeof window !== "undefined" 
    ? `${window.location.origin}/#pricing?partner=${partnerData?.referralCode || partnerData?.partnerCode || ""}`
    : "";

  const partnerSignupLink = typeof window !== "undefined" && partnerData
    ? `${window.location.origin}/partner?partnerId=${partnerData.id}`
    : "";

  const handleCopy = async () => {
    if (partnerLink) {
      try {
        await navigator.clipboard.writeText(partnerLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const handleCopySignupLink = async () => {
    if (partnerSignupLink) {
      try {
        await navigator.clipboard.writeText(partnerSignupLink);
        setCopiedSignupLink(true);
        setTimeout(() => setCopiedSignupLink(false), 2000);
      } catch (error) {
        console.error("Failed to copy:", error);
      }
    }
  };

  const generateQRCode = () => {
    if (!partnerLink) return;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(partnerLink)}`;
    setQrCodeUrl(qrUrl);
  };

  // Calculate next payout date
  const now = new Date();
  const currentDay = now.getDate();
  const nextPayoutDate = currentDay >= 25 
    ? new Date(now.getFullYear(), now.getMonth() + 1, 25)
    : new Date(now.getFullYear(), now.getMonth(), 25);
  const daysUntilPayout = Math.ceil((nextPayoutDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Group upcoming jobs by date
  const jobsToday = upcomingCleanings.filter(j => {
    const jobDate = new Date(j.date);
    return jobDate.toDateString() === now.toDateString();
  });
  const jobsTomorrow = upcomingCleanings.filter(j => {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(j.date).toDateString() === tomorrow.toDateString();
  });
  const jobsThisWeek = upcomingCleanings.filter(j => {
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const jobDate = new Date(j.date);
    return jobDate > now && jobDate <= weekFromNow && !jobsToday.includes(j) && !jobsTomorrow.includes(j);
  });

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

  if (!partnerData) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", background: "linear-gradient(to bottom right, #f9fafb, #eff6ff, #f9fafb)" }}>
        {/* Hero Section */}
        <div style={{
          position: "relative",
          background: "linear-gradient(to right, #2563eb, #1d4ed8, #4338ca)",
          color: "#ffffff",
          overflow: "hidden",
          padding: "4rem 0"
        }}>
          <div style={{
            position: "absolute",
            inset: 0,
            opacity: 0.2,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="container" style={{ position: "relative", zIndex: 10 }}>
            <div style={{ maxWidth: "900px" }}>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: "700", marginBottom: "1rem", letterSpacing: "-0.02em" }}>
                Welcome Back, {partnerData.businessName}
              </h1>
              <p style={{ fontSize: "1.25rem", color: "#bfdbfe", marginBottom: "1.5rem" }}>
                Here's how your Bin Blast Co. partnership is performing.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}>
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Active Partner</span>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  background: "rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(8px)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px"
                }}>
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{(partnerData.revenueSharePartner * 100).toFixed(0)}% Revenue Share</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container" style={{ padding: "2rem 1rem" }}>
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Analytics Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              {/* This Month's Earnings */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #dcfce7",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#86efac";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#dcfce7";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#dcfce7", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#16a34a", textTransform: "uppercase", letterSpacing: "0.05em" }}>This Month</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  ${(stats.thisMonthEarnings / 100).toFixed(2)}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Earnings this month</div>
              </div>

              {/* Total Customers */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #dbeafe",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#93c5fd";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#dbeafe";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#dbeafe", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.05em" }}>Customers</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {stats.totalCustomers}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total referred</div>
              </div>

              {/* Active Subscriptions */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #e9d5ff",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#c084fc";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#e9d5ff";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#e9d5ff", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#9333ea" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#9333ea", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active</span>
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {stats.activeSubscriptions}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Active subscriptions</div>
              </div>

              {/* Next Payout */}
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fed7aa",
                transition: "all 0.3s ease",
                cursor: "pointer"
              }} onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.12)";
                e.currentTarget.style.borderColor = "#fdba74";
              }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)";
                e.currentTarget.style.borderColor = "#fed7aa";
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#fed7aa", borderRadius: "12px" }}>
                    <svg style={{ width: "24px", height: "24px", color: "#ea580c" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#ea580c", textTransform: "uppercase", letterSpacing: "0.05em" }}>Payout</span>
                </div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
                  {daysUntilPayout} days
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
            </div>

            {/* Booking Link & Partner Signup Link Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              {/* Booking Link Card */}
              <div style={{
                background: "linear-gradient(to bottom right, #eff6ff, #dbeafe)",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #93c5fd"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>Your Booking Link</h2>
                  <div style={{ padding: "0.5rem", background: "#dbeafe", borderRadius: "8px" }}>
                    <svg style={{ width: "20px", height: "20px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={partnerLink}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "0.75rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #93c5fd",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                      color: "#1e40af"
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: copied ? "#16a34a" : "#2563eb",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!copied) e.currentTarget.style.background = "#1d4ed8";
                    }}
                    onMouseLeave={(e) => {
                      if (!copied) e.currentTarget.style.background = copied ? "#16a34a" : "#2563eb";
                    }}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <button
                    onClick={generateQRCode}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #93c5fd",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      color: "#1e40af",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#eff6ff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffffff";
                    }}
                  >
                    <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                  {qrCodeUrl && (
                    <div style={{ padding: "0.5rem", background: "#ffffff", borderRadius: "8px", border: "2px solid #93c5fd" }}>
                      <img src={qrCodeUrl} alt="QR Code" style={{ width: "64px", height: "64px" }} />
                    </div>
                  )}
                  <div style={{ flex: "1", fontSize: "0.75rem", color: "#475569", minWidth: "150px" }}>
                    Share this link with customers. All bookings are automatically tracked.
                  </div>
                </div>
              </div>

              {/* Partner Signup Link Card - Team Growth */}
              <div style={{
                background: "linear-gradient(to bottom right, #fef3c7, #fde68a)",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "2px solid #fcd34d"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>Team Growth</h2>
                    <p style={{ fontSize: "0.875rem", color: "#78350f" }}>Partner Signup Link</p>
                  </div>
                  <div style={{ padding: "0.5rem", background: "#fde68a", borderRadius: "8px" }}>
                    <svg style={{ width: "20px", height: "20px", color: "#d97706" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
                  <input
                    type="text"
                    readOnly
                    value={partnerSignupLink}
                    style={{
                      flex: "1",
                      minWidth: "200px",
                      padding: "0.75rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "2px solid #fcd34d",
                      fontSize: "0.875rem",
                      fontFamily: "monospace",
                      color: "#92400e"
                    }}
                  />
                  <button
                    onClick={handleCopySignupLink}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: copiedSignupLink ? "#16a34a" : "#d97706",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!copiedSignupLink) e.currentTarget.style.background = "#b45309";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = copiedSignupLink ? "#16a34a" : "#d97706";
                    }}
                  >
                    {copiedSignupLink ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: "0.75rem", color: "#78350f" }}>
                  Share this link with team members who need partner access. They'll be able to sign up and join your team.
                </p>
              </div>
            </div>

            {/* How to Sell - Playbook Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.5rem" }}>How to Sell Bin Blast Co.</h2>
                  <p style={{ color: "#6b7280" }}>A guided playbook to maximize your earnings</p>
                </div>
                <button style={{
                  padding: "0.5rem 1rem",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s ease"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}>
                  Download PDF
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}>
                  <div style={{ padding: "0.5rem", background: "#dbeafe", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: "#2563eb" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>Put on invoices</h3>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Add your booking link to every invoice and receipt</p>
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}>
                  <div style={{ padding: "0.5rem", background: "#dcfce7", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>Text after service</h3>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Send your link via text message after completing a service</p>
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}>
                  <div style={{ padding: "0.5rem", background: "#e9d5ff", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: "#9333ea" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>Add to website</h3>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Include your booking link on your website or service menu</p>
                  </div>
                </div>
                <div style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f9fafb";
                }}>
                  <div style={{ padding: "0.5rem", background: "#fed7aa", borderRadius: "8px", flexShrink: 0 }}>
                    <svg style={{ width: "20px", height: "20px", color: "#ea580c" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>Follow-up emails</h3>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Include your link in customer follow-up emails</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybookScripts(!showPlaybookScripts)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                  border: "none",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}
              >
                {showPlaybookScripts ? "Hide" : "Show"} Top Performing Sales Scripts
                <svg style={{ width: "20px", height: "20px", transform: showPlaybookScripts ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPlaybookScripts && (
                <div style={{
                  marginTop: "1.5rem",
                  padding: "1.5rem",
                  background: "linear-gradient(to bottom right, #eff6ff, #dbeafe)",
                  borderRadius: "12px",
                  border: "2px solid #93c5fd"
                }}>
                  <h3 style={{ fontWeight: "700", fontSize: "1.125rem", color: "#111827", marginBottom: "1rem" }}>Top Performing Sales Scripts</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px" }}>
                      <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>Script 1: After Service Completion</h4>
                      <p style={{ fontSize: "0.875rem", color: "#374151", fontStyle: "italic" }}>"Thanks for choosing us! Want to keep your bins clean year-round? Check out Bin Blast Co.'s subscription service - [your link]. They offer monthly and bi-weekly cleaning plans."</p>
                    </div>
                    <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px" }}>
                      <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>Script 2: Invoice Follow-up</h4>
                      <p style={{ fontSize: "0.875rem", color: "#374151", fontStyle: "italic" }}>"Your invoice is attached. As a bonus, here's a special link to Bin Blast Co.'s professional bin cleaning service: [your link]. They offer flexible plans perfect for maintaining clean bins between our visits."</p>
                    </div>
                    <div style={{ padding: "1rem", background: "#ffffff", borderRadius: "8px" }}>
                      <h4 style={{ fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>Script 3: Social Media Post</h4>
                      <p style={{ fontSize: "0.875rem", color: "#374151", fontStyle: "italic" }}>"Partnered with Bin Blast Co. to offer you the best bin cleaning service! Use my link to get started: [your link]. They handle everything - you just enjoy clean bins!"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Jobs Calendar */}
            {(jobsToday.length > 0 || jobsTomorrow.length > 0 || jobsThisWeek.length > 0) && (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Upcoming Jobs</h2>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "1.5rem"
                }}>
                  {jobsToday.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#16a34a", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>Today ({jobsToday.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsToday.map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#dcfce7",
                            borderRadius: "8px",
                            border: "1px solid #86efac"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsTomorrow.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#2563eb", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>Tomorrow ({jobsTomorrow.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsTomorrow.map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#dbeafe",
                            borderRadius: "8px",
                            border: "1px solid #93c5fd"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsThisWeek.length > 0 && (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                        <div style={{ width: "12px", height: "12px", background: "#9333ea", borderRadius: "50%" }}></div>
                        <h3 style={{ fontWeight: "700", color: "#111827" }}>This Week ({jobsThisWeek.length})</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        {jobsThisWeek.slice(0, 5).map((job, idx) => (
                          <div key={idx} style={{
                            padding: "0.75rem",
                            background: "#f3e8ff",
                            borderRadius: "8px",
                            border: "1px solid #c084fc"
                          }}>
                            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{job.customer}</div>
                            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{job.plan}</div>
                            <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.25rem" }}>{job.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Team Management Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827" }}>Your Team</h2>
                <button style={{
                  padding: "0.5rem 1rem",
                  background: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#1d4ed8";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#2563eb";
                }}>
                  <svg style={{ width: "20px", height: "20px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Team Member
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Role</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Assigned Area</th>
                      <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Active Jobs Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                        <svg style={{ width: "48px", height: "48px", margin: "0 auto 0.75rem", color: "#d1d5db" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>No team members yet. Click "Add Team Member" to get started.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Active Subscribers List */}
            {customers.filter(c => c.activeSubscriptions > 0).length > 0 && (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "1px solid #e5e7eb",
                marginBottom: "2rem"
              }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Active Subscribers</h2>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Plan Type</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Service Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.filter(c => c.activeSubscriptions > 0).map((customer) => {
                        const activeBooking = customer.bookings.find(b => b.status === "active");
                        const emailParts = customer.email.split("@");
                        const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                        const planType = activeBooking?.planName || "N/A";
                        const isMonthly = planType.toLowerCase().includes("monthly");
                        const isBiWeekly = planType.toLowerCase().includes("bi-weekly") || planType.toLowerCase().includes("biweekly");
                        
                        return (
                          <tr key={customer.email} style={{ borderBottom: "1px solid #f3f4f6" }} onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                          }} onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#111827" }}>{customer.name || customer.email.split("@")[0]}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>{maskedEmail}</td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: isMonthly ? "#dbeafe" : isBiWeekly ? "#e9d5ff" : "#f3f4f6",
                                color: isMonthly ? "#1e40af" : isBiWeekly ? "#6b21a8" : "#374151"
                              }}>
                                {planType}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>
                              {customer.nextServiceDate 
                                ? customer.nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                background: "#dcfce7",
                                color: "#166534",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}>Active</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent Bookings Table */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "1.5rem" }}>Recent Bookings</h2>
              {bookings.length === 0 ? (
                <div style={{ textAlign: "center", padding: "3rem 0" }}>
                  <svg style={{ width: "64px", height: "64px", margin: "0 auto 1rem", color: "#d1d5db" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p style={{ color: "#6b7280", fontSize: "1.125rem", marginBottom: "0.5rem" }}>No bookings yet</p>
                  <p style={{ color: "#9ca3af" }}>Share your partner link to start earning!</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer Name</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Service Address</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Subscription Type</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Cleaning Date</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                        <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Earnings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 20).map((booking) => {
                        const bookingDate = booking.createdAt?.toDate?.() || new Date(booking.createdAt?.seconds * 1000 || Date.now());
                        const nextServiceDate = booking.nextServiceDate?.toDate?.() || null;
                        const emailParts = booking.customerEmail.split("@");
                        const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                        const customerDisplay = booking.customerName 
                          ? `${booking.customerName.split(" ")[0]} ${booking.customerName.split(" ")[1]?.[0] || ""}.`
                          : maskedEmail;
                        
                        return (
                          <tr key={booking.id} style={{ borderBottom: "1px solid #f3f4f6" }} onMouseEnter={(e) => {
                            e.currentTarget.style.background = "#f9fafb";
                          }} onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>{bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td style={{ padding: "0.75rem 1rem", fontWeight: "600", color: "#111827" }}>{customerDisplay}</td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>—</td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.5rem",
                                background: "#f3f4f6",
                                color: "#374151",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                fontWeight: "600"
                              }}>
                                {booking.planName || booking.planId || "N/A"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#111827" }}>
                              {nextServiceDate ? nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem 1rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: booking.status === "active" ? "#dcfce7" :
                                  booking.status === "cancelled" ? "#fee2e2" :
                                  booking.status === "refunded" ? "#f3f4f6" :
                                  "#fef3c7",
                                color: booking.status === "active" ? "#166534" :
                                  booking.status === "cancelled" ? "#991b1b" :
                                  booking.status === "refunded" ? "#374151" :
                                  "#92400e"
                              }}>
                                {booking.status === "active" ? "Active" :
                                 booking.status === "cancelled" ? "Cancelled" :
                                 booking.status === "refunded" ? "Refunded" : "Trial"}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: "600", color: "#16a34a" }}>
                              ${(booking.partnerShareAmount / 100).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Partner Information - Business Profile */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "1.5rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827" }}>Partner Information</h2>
                <button style={{
                  padding: "0.5rem 1rem",
                  background: "#f3f4f6",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  cursor: "pointer",
                  border: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  transition: "all 0.2s ease"
                }} onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#e5e7eb";
                }} onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f3f4f6";
                }}>
                  <svg style={{ width: "16px", height: "16px" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem"
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Business Name</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827" }}>{partnerData.businessName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Owner Name</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>{partnerData.ownerName}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Email</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Phone</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.phone}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Service Area</div>
                  <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#2563eb" }}>{partnerData.serviceArea || "N/A"}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Service Type</div>
                  <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.serviceType}</div>
                </div>
                {partnerData.websiteOrInstagram && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Website/Instagram</div>
                    <a href={partnerData.websiteOrInstagram.startsWith("http") ? partnerData.websiteOrInstagram : `https://${partnerData.websiteOrInstagram}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: "1.125rem", color: "#2563eb", textDecoration: "none" }} onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = "underline";
                    }} onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = "none";
                    }}>
                      {partnerData.websiteOrInstagram}
                    </a>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Insurance Status</div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    background: partnerData.hasInsurance ? "#dcfce7" : "#fee2e2",
                    color: partnerData.hasInsurance ? "#166534" : "#991b1b"
                  }}>
                    {partnerData.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Revenue Share</div>
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    background: "#dbeafe",
                    color: "#1e40af"
                  }}>
                    {(partnerData.revenueSharePartner * 100).toFixed(0)}% Partner
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Referral Code</div>
                  <div style={{ fontSize: "1.125rem", fontFamily: "monospace", fontWeight: "700", color: "#2563eb" }}>{partnerData.referralCode}</div>
                </div>
                {partnerData.promotionMethod && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>Promotion Method</div>
                    <div style={{ fontSize: "1.125rem", color: "#111827" }}>{partnerData.promotionMethod}</div>
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
