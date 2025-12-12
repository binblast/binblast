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

interface TeamMember {
  id: string;
  name: string;
  role: string;
  assignedArea: string;
  activeJobsToday: number;
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
        <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-20">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center">Loading...</div>
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
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
        {/* Hero Section */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
          <div className="container mx-auto px-4 py-16 relative z-10">
            <div className="max-w-4xl">
              <h1 className="text-5xl font-bold mb-4 tracking-tight">
                Welcome back, {partnerData.businessName}
              </h1>
              <p className="text-xl text-blue-100 mb-6">
                Here's how your Bin Blast Co. partnership is performing.
              </p>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Active Partner</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{(partnerData.revenueSharePartner * 100).toFixed(0)}% Revenue Share</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* This Month's Earnings */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-green-100 hover:border-green-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">This Month</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  ${(stats.thisMonthEarnings / 100).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Earnings this month</div>
              </div>

              {/* Total Customers */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-blue-100 hover:border-blue-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Customers</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.totalCustomers}
                </div>
                <div className="text-sm text-gray-500">Total referred</div>
              </div>

              {/* Active Subscriptions */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-purple-100 hover:border-purple-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Active</span>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {stats.activeSubscriptions}
                </div>
                <div className="text-sm text-gray-500">Active subscriptions</div>
              </div>

              {/* Next Payout */}
              <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border-2 border-orange-100 hover:border-orange-200 group">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-100 rounded-xl group-hover:bg-orange-200 transition-colors">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Payout</span>
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {daysUntilPayout} days
                </div>
                <div className="text-sm text-gray-500">{nextPayoutDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
              </div>
            </div>

            {/* Booking Link & Partner Signup Link Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Booking Link Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 shadow-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Your Booking Link</h2>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    readOnly
                    value={partnerLink}
                    className="flex-1 px-4 py-3 bg-white rounded-lg border-2 border-blue-200 text-sm font-mono text-blue-700 focus:outline-none focus:border-blue-400"
                  />
                  <button
                    onClick={handleCopy}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                      copied ? "bg-green-500" : "bg-blue-600 hover:bg-blue-700"
                    } shadow-md hover:shadow-lg`}
                  >
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={generateQRCode}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border-2 border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                  {qrCodeUrl && (
                    <div className="p-2 bg-white rounded-lg border-2 border-blue-200">
                      <img src={qrCodeUrl} alt="QR Code" className="w-16 h-16" />
                    </div>
                  )}
                  <div className="flex-1 text-xs text-gray-600">
                    Share this link with customers. All bookings are automatically tracked.
                  </div>
                </div>
              </div>

              {/* Partner Signup Link Card - Team Growth */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-2xl p-6 shadow-lg border-2 border-amber-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Team Growth</h2>
                    <p className="text-sm text-gray-600 mt-1">Partner Signup Link</p>
                  </div>
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    readOnly
                    value={partnerSignupLink}
                    className="flex-1 px-4 py-3 bg-white rounded-lg border-2 border-amber-200 text-sm font-mono text-amber-700 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    onClick={handleCopySignupLink}
                    className={`px-6 py-3 rounded-lg font-semibold text-white transition-all ${
                      copiedSignupLink ? "bg-green-500" : "bg-amber-600 hover:bg-amber-700"
                    } shadow-md hover:shadow-lg`}
                  >
                    {copiedSignupLink ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Share this link with team members who need partner access. They'll be able to sign up and join your team.
                </p>
              </div>
            </div>

            {/* How to Sell - Playbook Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">How to Sell Bin Blast Co.</h2>
                  <p className="text-gray-600">A guided playbook to maximize your earnings</p>
                </div>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition-colors">
                  Download PDF
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Put on invoices</h3>
                    <p className="text-sm text-gray-600">Add your booking link to every invoice and receipt</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Text after service</h3>
                    <p className="text-sm text-gray-600">Send your link via text message after completing a service</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Add to website</h3>
                    <p className="text-sm text-gray-600">Include your booking link on your website or service menu</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Follow-up emails</h3>
                    <p className="text-sm text-gray-600">Include your link in customer follow-up emails</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowPlaybookScripts(!showPlaybookScripts)}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-gray-700 transition-colors flex items-center justify-center gap-2"
              >
                {showPlaybookScripts ? "Hide" : "Show"} Top Performing Sales Scripts
                <svg className={`w-5 h-5 transition-transform ${showPlaybookScripts ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showPlaybookScripts && (
                <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <h3 className="font-bold text-lg text-gray-900 mb-4">Top Performing Sales Scripts</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Script 1: After Service Completion</h4>
                      <p className="text-sm text-gray-700 italic">"Thanks for choosing us! Want to keep your bins clean year-round? Check out Bin Blast Co.'s subscription service - [your link]. They offer monthly and bi-weekly cleaning plans."</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Script 2: Invoice Follow-up</h4>
                      <p className="text-sm text-gray-700 italic">"Your invoice is attached. As a bonus, here's a special link to Bin Blast Co.'s professional bin cleaning service: [your link]. They offer flexible plans perfect for maintaining clean bins between our visits."</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">Script 3: Social Media Post</h4>
                      <p className="text-sm text-gray-700 italic">"Partnered with Bin Blast Co. to offer you the best bin cleaning service! Use my link to get started: [your link]. They handle everything - you just enjoy clean bins!"</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Upcoming Jobs Calendar */}
            {(jobsToday.length > 0 || jobsTomorrow.length > 0 || jobsThisWeek.length > 0) && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Upcoming Jobs</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {jobsToday.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="font-bold text-gray-900">Today ({jobsToday.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {jobsToday.map((job, idx) => (
                          <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="font-semibold text-gray-900">{job.customer}</div>
                            <div className="text-sm text-gray-600">{job.plan}</div>
                            <div className="text-xs text-gray-500 mt-1">{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsTomorrow.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="font-bold text-gray-900">Tomorrow ({jobsTomorrow.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {jobsTomorrow.map((job, idx) => (
                          <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-semibold text-gray-900">{job.customer}</div>
                            <div className="text-sm text-gray-600">{job.plan}</div>
                            <div className="text-xs text-gray-500 mt-1">{job.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {jobsThisWeek.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <h3 className="font-bold text-gray-900">This Week ({jobsThisWeek.length})</h3>
                      </div>
                      <div className="space-y-2">
                        {jobsThisWeek.slice(0, 5).map((job, idx) => (
                          <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <div className="font-semibold text-gray-900">{job.customer}</div>
                            <div className="text-sm text-gray-600">{job.plan}</div>
                            <div className="text-xs text-gray-500 mt-1">{job.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Team Management Section */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Your Team</h2>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Team Member
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Role</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Assigned Area</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Active Jobs Today</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Subscribers</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Plan Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Next Service Date</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
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
                          <tr key={customer.email} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-gray-900">{customer.name || customer.email.split("@")[0]}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">{maskedEmail}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                isMonthly ? "bg-blue-100 text-blue-700" : isBiWeekly ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-700"
                              }`}>
                                {planType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {customer.nextServiceDate 
                                ? customer.nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Active</span>
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
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Bookings</h2>
              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg mb-2">No bookings yet</p>
                  <p className="text-gray-400">Share your partner link to start earning!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Customer Name</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Service Address</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Subscription Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Next Cleaning Date</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Earnings</th>
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
                          <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4 text-sm text-gray-900">{bookingDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                            <td className="py-3 px-4 font-semibold text-gray-900">{customerDisplay}</td>
                            <td className="py-3 px-4 text-sm text-gray-600">—</td>
                            <td className="py-3 px-4">
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-semibold">
                                {booking.planName || booking.planId || "N/A"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {nextServiceDate ? nextServiceDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                booking.status === "active" ? "bg-green-100 text-green-700" :
                                booking.status === "cancelled" ? "bg-red-100 text-red-700" :
                                booking.status === "refunded" ? "bg-gray-100 text-gray-700" :
                                "bg-yellow-100 text-yellow-700"
                              }`}>
                                {booking.status === "active" ? "Active" :
                                 booking.status === "cancelled" ? "Cancelled" :
                                 booking.status === "refunded" ? "Refunded" : "Trial"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-green-600">
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
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Partner Information</h2>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Business Name</div>
                  <div className="text-lg font-bold text-gray-900">{partnerData.businessName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Owner Name</div>
                  <div className="text-lg font-semibold text-gray-900">{partnerData.ownerName}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Email</div>
                  <div className="text-lg text-gray-900">{partnerData.email}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Phone</div>
                  <div className="text-lg text-gray-900">{partnerData.phone}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Area</div>
                  <div className="text-lg font-semibold text-blue-600">{partnerData.serviceArea || "N/A"}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Service Type</div>
                  <div className="text-lg text-gray-900">{partnerData.serviceType}</div>
                </div>
                {partnerData.websiteOrInstagram && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Website/Instagram</div>
                    <a href={partnerData.websiteOrInstagram.startsWith("http") ? partnerData.websiteOrInstagram : `https://${partnerData.websiteOrInstagram}`} target="_blank" rel="noopener noreferrer" className="text-lg text-blue-600 hover:underline">
                      {partnerData.websiteOrInstagram}
                    </a>
                  </div>
                )}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Insurance Status</div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    partnerData.hasInsurance ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {partnerData.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Revenue Share</div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-700">
                    {(partnerData.revenueSharePartner * 100).toFixed(0)}% Partner
                  </span>
                </div>
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Referral Code</div>
                  <div className="text-lg font-mono font-bold text-blue-600">{partnerData.referralCode}</div>
                </div>
                {partnerData.promotionMethod && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Promotion Method</div>
                    <div className="text-lg text-gray-900">{partnerData.promotionMethod}</div>
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
