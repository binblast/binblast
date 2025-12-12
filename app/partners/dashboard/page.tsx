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
  partnerCode?: string; // Legacy field
  bookingLinkSlug: string;
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

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [stats, setStats] = useState({
    thisMonthEarnings: 0, // in cents
    totalCustomers: 0,
    activeSubscriptions: 0,
    nextPayoutDate: "Payouts processed on the 25th of each month",
  });
  const [copied, setCopied] = useState(false);

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

      // Get partner data - only active partners can access dashboard
      const partnersQuery = query(
        collection(db, "partners"),
        where("userId", "==", uid),
        where("status", "==", "active")
      );
      const partnersSnapshot = await getDocs(partnersQuery);

      if (partnersSnapshot.empty) {
        // Check if they have a pending application or pending agreement
        const allPartnersQuery = query(
          collection(db, "partners"),
          where("userId", "==", uid)
        );
        const allPartnersSnapshot = await getDocs(allPartnersQuery);
        
        if (!allPartnersSnapshot.empty) {
          const partnerData = allPartnersSnapshot.docs[0].data();
          if (partnerData.status === "pending_agreement") {
            // Redirect to agreement page
            router.push(`/partners/agreement/${allPartnersSnapshot.docs[0].id}`);
            return;
          }
        }
        
        // Not a partner, redirect to apply
        router.push("/partners/apply");
        return;
      }

      const partnerDoc = partnersSnapshot.docs[0];
      const data = partnerDoc.data();
      setPartnerData({
        id: partnerDoc.id,
        ...data,
      } as PartnerData);

      // Load partner bookings for this partner
      const bookingsQuery = query(
        collection(db, "partnerBookings"),
        where("partnerId", "==", partnerDoc.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList: PartnerBooking[] = [];
      const customerEmails = new Set<string>();
      let thisMonthEarningsCents = 0;
      let activeSubscriptionsCount = 0;

      // Get current month start
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        const booking: PartnerBooking = {
          id: doc.id,
          ...bookingData,
        } as PartnerBooking;
        
        bookingsList.push(booking);

        // Track unique customers
        if (bookingData.customerEmail) {
          customerEmails.add(bookingData.customerEmail);
        }

        // Count active subscriptions
        if (bookingData.status === "active") {
          activeSubscriptionsCount++;
        }

        // Calculate this month's earnings
        const bookingDate = bookingData.createdAt?.toDate?.() || new Date(bookingData.createdAt?.seconds * 1000 || Date.now());
        if (bookingDate >= currentMonthStart && bookingData.status !== "refunded") {
          thisMonthEarningsCents += bookingData.partnerShareAmount || 0;
        }
      });

      // Sort bookings by date (newest first)
      bookingsList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      setBookings(bookingsList);
      setStats({
        thisMonthEarnings: thisMonthEarningsCents,
        totalCustomers: customerEmails.size,
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
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
              <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>
                Welcome back, {partnerData.businessName}
              </h1>
              <p style={{ fontSize: "1rem", color: "var(--text-light)", margin: 0 }}>
                Here's how your Bin Blast Co. partnership is performing.
              </p>
            </div>

            {/* Stats Overview */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                background: "#ecfdf5",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #86efac"
              }}>
                <div style={{ fontSize: "0.875rem", color: "#047857", marginBottom: "0.5rem", fontWeight: "600" }}>
                  This Month's Earnings
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#047857" }}>
                  ${(stats.thisMonthEarnings / 100).toFixed(2)}
                </div>
              </div>

              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  Total Customers Referred
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  {stats.totalCustomers}
                </div>
              </div>

              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  Active Subscriptions
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  {stats.activeSubscriptions}
                </div>
              </div>

              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  Next Payout Date
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {stats.nextPayoutDate}
                </div>
              </div>
            </div>

            {/* Partner Tools Section */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
              gap: "2rem",
              marginBottom: "2rem"
            }}>
              {/* Your Booking Link Card */}
              <div style={{
                background: "#f0f9ff",
                borderRadius: "20px",
                padding: "2rem",
                border: "2px solid #bae6fd"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                  Your Booking Link
                </h2>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
                  <input
                    type="text"
                    readOnly
                    value={partnerLink}
                    style={{
                      flex: "1",
                      padding: "0.75rem 1rem",
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #bae6fd",
                      fontSize: "0.875rem",
                      color: "#0369a1",
                      minWidth: "250px",
                      fontFamily: "monospace"
                    }}
                  />
                  <button
                    onClick={handleCopy}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: copied ? "#16a34a" : "#0369a1",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "#0c4a6e", margin: 0 }}>
                  Share this link with your customers. All bookings through this link will be automatically tracked and attributed to you.
                </p>
              </div>

              {/* Quick Tips Card */}
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                border: "1px solid #e5e7eb",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)"
              }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                  How to Sell Bin Blast Co.
                </h2>
                <ul style={{ 
                  listStyle: "none", 
                  padding: 0, 
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  <li style={{ fontSize: "0.875rem", color: "var(--text-light)", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>•</span>
                    <span>Put your link on invoices and receipts</span>
                  </li>
                  <li style={{ fontSize: "0.875rem", color: "var(--text-light)", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>•</span>
                    <span>Text it to customers after service</span>
                  </li>
                  <li style={{ fontSize: "0.875rem", color: "var(--text-light)", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>•</span>
                    <span>Add it to your website or service menu</span>
                  </li>
                  <li style={{ fontSize: "0.875rem", color: "var(--text-light)", display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#16a34a", fontWeight: "600" }}>•</span>
                    <span>Include it in follow-up emails</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bookings List */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
                Recent Bookings
              </h2>
              {bookings.length > 20 && (
                <p style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "1rem" }}>
                  Showing 20 most recent bookings
                </p>
              )}

              {bookings.length === 0 ? (
                <p style={{ color: "var(--text-light)", textAlign: "center", padding: "2rem" }}>
                  No bookings yet. Share your partner link to start earning!
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Date
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Customer
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Plan
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Status
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Earnings
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Next Service
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 20).map((booking) => {
                        const bookingDate = booking.createdAt?.toDate?.() || new Date(booking.createdAt?.seconds * 1000 || Date.now());
                        const nextServiceDate = booking.nextServiceDate?.toDate?.() || null;
                        
                        // Mask customer email (show first part only)
                        const emailParts = booking.customerEmail.split("@");
                        const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                        
                        // Get customer name if available, otherwise use masked email
                        const customerDisplay = booking.customerName 
                          ? `${booking.customerName.split(" ")[0]} ${booking.customerName.split(" ")[1]?.[0] || ""}.`
                          : maskedEmail;
                        
                        return (
                          <tr key={booking.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {bookingDate.toLocaleDateString()}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {customerDisplay}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {booking.planName || booking.planId || "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem" }}>
                              <span style={{
                                padding: "0.25rem 0.75rem",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                background: booking.status === "active" ? "#ecfdf5" : booking.status === "cancelled" ? "#fef2f2" : "#fef3c7",
                                color: booking.status === "active" ? "#047857" : booking.status === "cancelled" ? "#dc2626" : "#92400e",
                              }}>
                                {booking.status.toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#047857", fontWeight: "600", textAlign: "right" }}>
                              ${(booking.partnerShareAmount / 100).toFixed(2)}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {nextServiceDate ? nextServiceDate.toLocaleDateString() : "N/A"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Partner Info */}
            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb",
              marginTop: "2rem"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                Partner Information
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                    Business Name
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                    {partnerData.businessName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                    Owner Name
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                    {partnerData.ownerName}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                    Service Area
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                    {partnerData.serviceArea || "N/A"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                    Revenue Share
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                    {(partnerData.revenueSharePartner * 100).toFixed(0)}% Partner / {(partnerData.revenueSharePlatform * 100).toFixed(0)}% Platform
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
