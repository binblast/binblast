// app/admin/partners/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const ALLOWED_ADMIN_EMAILS = [
  "you@example.com", // Update with your admin email
];

interface Partner {
  id: string;
  userId: string;
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
  createdAt: any;
  updatedAt: any;
}

interface PartnerStats {
  totalJobs: number;
  totalGross: number;
  totalPartnerShare: number;
  totalPlatformShare: number;
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [partnerStats, setPartnerStats] = useState<Record<string, PartnerStats>>({});
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const email = auth.currentUser.email;
          setUserEmail(email || null);
          
          if (!email || !ALLOWED_ADMIN_EMAILS.includes(email)) {
            router.push("/login");
            return;
          }
          
          loadPartners();
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user?.email) {
            setUserEmail(user.email);
            if (!ALLOWED_ADMIN_EMAILS.includes(user.email)) {
              router.push("/login");
              return;
            }
            loadPartners();
          } else {
            router.push("/login");
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

  async function loadPartners() {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, query, getDocs, where } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      const partnersQuery = query(collection(db, "partners"));
      const partnersSnapshot = await getDocs(partnersQuery);

      const partnersList: Partner[] = [];
      partnersSnapshot.forEach((doc) => {
        partnersList.push({
          id: doc.id,
          ...doc.data(),
        } as Partner);
      });

      // Sort by created date (newest first)
      partnersList.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
        const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
        return bTime - aTime;
      });

      setPartners(partnersList);

      // Load stats for each partner
      const stats: Record<string, PartnerStats> = {};
      for (const partner of partnersList) {
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("partnerId", "==", partner.id)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);

        let totalJobs = 0;
        let totalGross = 0;
        let totalPartnerShare = 0;
        let totalPlatformShare = 0;

        bookingsSnapshot.forEach((doc) => {
          const booking = doc.data();
          if (booking.status === "completed") {
            totalJobs++;
            totalGross += booking.grossAmount || 0;
            totalPartnerShare += booking.partnerShareAmount || 0;
            totalPlatformShare += booking.platformShareAmount || 0;
          }
        });

        stats[partner.id] = {
          totalJobs,
          totalGross,
          totalPartnerShare,
          totalPlatformShare,
        };
      }

      setPartnerStats(stats);
      setLoading(false);
    } catch (err) {
      console.error("Error loading partners:", err);
      setLoading(false);
    }
  }

  async function updatePartnerStatus(partnerId: string, newStatus: "pending" | "approved" | "suspended") {
    try {
      const response = await fetch("/api/admin/partners/update-status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerId,
          status: newStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update partner status");
      }

      // Reload partners
      loadPartners();
    } catch (err) {
      console.error("Error updating partner status:", err);
      alert("Failed to update partner status");
    }
  }

  async function updateRevenueShare(partnerId: string, partnerShare: number, platformShare: number) {
    try {
      const response = await fetch("/api/admin/partners/update-revenue-share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partnerId,
          revenueSharePartner: partnerShare,
          revenueSharePlatform: platformShare,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update revenue share");
      }

      // Reload partners
      loadPartners();
      alert("Revenue share updated successfully");
    } catch (err) {
      console.error("Error updating revenue share:", err);
      alert("Failed to update revenue share");
    }
  }

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

  if (!userEmail || !ALLOWED_ADMIN_EMAILS.includes(userEmail)) {
    return null;
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ marginBottom: "2rem" }}>
              Partner Management
            </h1>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Business Name
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Owner
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Email
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Status
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Jobs
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Gross Revenue
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Partner Share
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Platform Share
                      </th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {partners.map((partner) => {
                      const stats = partnerStats[partner.id] || {
                        totalJobs: 0,
                        totalGross: 0,
                        totalPartnerShare: 0,
                        totalPlatformShare: 0,
                      };
                      const partnerLink = typeof window !== "undefined"
                        ? `${window.location.origin}/#pricing?partner=${partner.partnerCode}`
                        : "";

                      return (
                        <tr key={partner.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                            {partner.businessName}
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                            {partner.ownerName}
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                            {partner.email}
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{
                              padding: "0.25rem 0.75rem",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              background: partner.partnerStatus === "approved" ? "#ecfdf5" : partner.partnerStatus === "pending" ? "#fef3c7" : "#fef2f2",
                              color: partner.partnerStatus === "approved" ? "#047857" : partner.partnerStatus === "pending" ? "#92400e" : "#dc2626",
                            }}>
                              {partner.partnerStatus.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)", textAlign: "right" }}>
                            {stats.totalJobs}
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)", textAlign: "right" }}>
                            ${stats.totalGross.toFixed(2)}
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#047857", fontWeight: "600", textAlign: "right" }}>
                            ${stats.totalPartnerShare.toFixed(2)}
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)", textAlign: "right" }}>
                            ${stats.totalPlatformShare.toFixed(2)}
                          </td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
                              {partner.partnerStatus === "pending" && (
                                <button
                                  onClick={() => updatePartnerStatus(partner.id, "approved")}
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                  }}
                                >
                                  Approve
                                </button>
                              )}
                              {partner.partnerStatus === "approved" && (
                                <button
                                  onClick={() => updatePartnerStatus(partner.id, "suspended")}
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    background: "#f59e0b",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                  }}
                                >
                                  Suspend
                                </button>
                              )}
                              {partner.partnerStatus === "suspended" && (
                                <button
                                  onClick={() => updatePartnerStatus(partner.id, "approved")}
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "0.75rem",
                                    fontWeight: "600",
                                    cursor: "pointer"
                                  }}
                                >
                                  Reactivate
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedPartner(partner);
                                  setShowDetails(true);
                                }}
                                style={{
                                  padding: "0.25rem 0.75rem",
                                  background: "#0369a1",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  cursor: "pointer"
                                }}
                              >
                                Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Partner Details Modal */}
      {showDetails && selectedPartner && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "2rem"
        }}>
          <div style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "2rem",
            maxWidth: "600px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                Partner Details
              </h2>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "var(--text-light)"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Business Name
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {selectedPartner.businessName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Owner Name
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {selectedPartner.ownerName}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Email
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {selectedPartner.email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Phone
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {selectedPartner.phone}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Service Areas
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "600", color: "var(--text-dark)" }}>
                  {selectedPartner.serviceAreas.join(", ")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.25rem" }}>
                  Partner Link
                </div>
                <div style={{ fontSize: "0.875rem", color: "#0369a1", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {typeof window !== "undefined" ? `${window.location.origin}/#pricing?partner=${selectedPartner.partnerCode}` : ""}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.5rem" }}>
                  Revenue Share
                </div>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={selectedPartner.revenueSharePartner * 100}
                    onChange={(e) => {
                      const partnerShare = parseFloat(e.target.value) / 100;
                      const platformShare = 1 - partnerShare;
                      setSelectedPartner({
                        ...selectedPartner,
                        revenueSharePartner: partnerShare,
                        revenueSharePlatform: platformShare,
                      });
                    }}
                    style={{
                      width: "80px",
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px"
                    }}
                  />
                  <span>% Partner /</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={selectedPartner.revenueSharePlatform * 100}
                    onChange={(e) => {
                      const platformShare = parseFloat(e.target.value) / 100;
                      const partnerShare = 1 - platformShare;
                      setSelectedPartner({
                        ...selectedPartner,
                        revenueSharePartner: partnerShare,
                        revenueSharePlatform: platformShare,
                      });
                    }}
                    style={{
                      width: "80px",
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px"
                    }}
                  />
                  <span>% Platform</span>
                  <button
                    onClick={() => {
                      updateRevenueShare(
                        selectedPartner.id,
                        selectedPartner.revenueSharePartner,
                        selectedPartner.revenueSharePlatform
                      );
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#0369a1",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer"
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#e5e7eb",
                  color: "var(--text-dark)",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
