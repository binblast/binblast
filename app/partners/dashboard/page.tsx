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
  serviceAreas: string[];
  businessType: string;
  partnerStatus: "pending" | "approved" | "suspended";
  revenueSharePartner: number;
  revenueSharePlatform: number;
  partnerCode: string;
  partnerSlug: string;
}

interface Booking {
  id: string;
  customerEmail: string;
  planId: string | null;
  grossAmount: number;
  partnerShareAmount: number;
  platformShareAmount: number;
  status: string;
  createdAt: any;
}

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partnerData, setPartnerData] = useState<PartnerData | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalGross: 0,
    totalEarnings: 0,
    totalPlatformShare: 0,
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

      // Get partner data
      const partnersQuery = query(
        collection(db, "partners"),
        where("userId", "==", uid)
      );
      const partnersSnapshot = await getDocs(partnersQuery);

      if (partnersSnapshot.empty) {
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

      // Load bookings for this partner
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("partnerId", "==", partnerDoc.id)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList: Booking[] = [];
      let totalJobs = 0;
      let totalGross = 0;
      let totalEarnings = 0;
      let totalPlatformShare = 0;

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        bookingsList.push({
          id: doc.id,
          ...bookingData,
        } as Booking);

        if (bookingData.status === "completed") {
          totalJobs++;
          totalGross += bookingData.grossAmount || 0;
          totalEarnings += bookingData.partnerShareAmount || 0;
          totalPlatformShare += bookingData.platformShareAmount || 0;
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
        totalJobs,
        totalGross,
        totalEarnings,
        totalPlatformShare,
      });

      setLoading(false);
    } catch (err) {
      console.error("Error loading partner data:", err);
      setLoading(false);
    }
  }

  const partnerLink = typeof window !== "undefined" 
    ? `${window.location.origin}/#pricing?partner=${partnerData?.partnerCode || ""}`
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

  if (partnerData.partnerStatus === "pending") {
    return (
      <>
        <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
              Application Pending
            </h1>
              <p style={{ fontSize: "1.125rem", color: "var(--text-light)", marginBottom: "2rem" }}>
                Your partner application is under review. We'll notify you once it's been approved.
              </p>
              <button
                onClick={() => router.push("/partners")}
                className="btn btn-primary"
                style={{
                  padding: "0.75rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600"
                }}
              >
                Back to Partners
              </button>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (partnerData.partnerStatus === "suspended") {
    return (
      <>
        <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
              Account Suspended
            </h1>
              <p style={{ fontSize: "1.125rem", color: "var(--text-light)", marginBottom: "2rem" }}>
                Your partner account has been suspended. Please contact support for more information.
              </p>
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
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ marginBottom: "2rem" }}>
              Partner Dashboard
            </h1>

            {/* Stats Overview */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem"
            }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  Total Jobs
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  {stats.totalJobs}
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
                  Total Gross Revenue
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  ${stats.totalGross.toFixed(2)}
                </div>
              </div>

              <div style={{
                background: "#ecfdf5",
                borderRadius: "16px",
                padding: "1.5rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #86efac"
              }}>
                <div style={{ fontSize: "0.875rem", color: "#047857", marginBottom: "0.5rem", fontWeight: "600" }}>
                  Your Earnings ({(partnerData.revenueSharePartner * 100).toFixed(0)}%)
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "#047857" }}>
                  ${stats.totalEarnings.toFixed(2)}
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
                  Platform Share ({(partnerData.revenueSharePlatform * 100).toFixed(0)}%)
                </div>
                <div style={{ fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  ${stats.totalPlatformShare.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Partner Link Section */}
            <div style={{
              background: "#f0f9ff",
              borderRadius: "20px",
              padding: "2rem",
              border: "2px solid #bae6fd",
              marginBottom: "2rem"
            }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                Your Partner Booking Link
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
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
                    minWidth: "300px",
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
              <p style={{ fontSize: "0.875rem", color: "#0c4a6e", marginTop: "1rem", margin: 0 }}>
                Share this link with your customers. All bookings through this link will be automatically tracked and attributed to you.
              </p>
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
                          Customer Email
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Plan
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Gross Amount
                        </th>
                        <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                          Your Share
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => {
                        const bookingDate = booking.createdAt?.toDate?.() || new Date(booking.createdAt?.seconds * 1000 || Date.now());
                        return (
                          <tr key={booking.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {bookingDate.toLocaleDateString()}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {booking.customerEmail}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                              {booking.planId || "N/A"}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)", textAlign: "right" }}>
                              ${booking.grossAmount.toFixed(2)}
                            </td>
                            <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#047857", fontWeight: "600", textAlign: "right" }}>
                              ${booking.partnerShareAmount.toFixed(2)}
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
                    Service Areas
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                    {partnerData.serviceAreas.join(", ")}
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
