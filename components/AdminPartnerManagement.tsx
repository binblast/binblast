// components/AdminPartnerManagement.tsx
"use client";

import { useState, useEffect } from "react";

interface Partner {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceArea: string;
  serviceType: string;
  status: "pending_agreement" | "active" | "suspended";
  referralCode: string;
  revenueSharePartner: number;
  revenueSharePlatform: number;
  websiteOrInstagram?: string;
  hasInsurance?: boolean;
  promotionMethod?: string;
  createdAt: any;
}

interface PartnerBooking {
  id: string;
  partnerId: string;
  customerName: string | null;
  customerEmail: string;
  planName: string;
  bookingAmount: number;
  partnerShareAmount: number;
  status: "active" | "cancelled" | "refunded" | "trial";
  createdAt: any;
  nextServiceDate: any | null;
}

interface PartnerStats {
  totalBookings: number;
  totalEarnings: number;
  activeSubscriptions: number;
  totalCustomers: number;
  thisMonthEarnings: number;
}

export function AdminPartnerManagement() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [bookings, setBookings] = useState<PartnerBooking[]>([]);
  const [stats, setStats] = useState<PartnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadPartners();
  }, []);

  async function loadPartners() {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, query, getDocs, orderBy } = firestore;

      const db = await getDbInstance();
      if (!db) {
        setLoading(false);
        return;
      }

      const partnersQuery = query(
        collection(db, "partners"),
        orderBy("createdAt", "desc")
      );
      const partnersSnapshot = await getDocs(partnersQuery);

      const partnersList: Partner[] = [];
      partnersSnapshot.forEach((doc) => {
        partnersList.push({
          id: doc.id,
          ...doc.data(),
        } as Partner);
      });

      setPartners(partnersList);
      setLoading(false);
    } catch (err) {
      console.error("Error loading partners:", err);
      setLoading(false);
    }
  }

  async function loadPartnerDetails(partnerId: string) {
    setLoadingDetails(true);
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, query, where, getDocs } = firestore;

      const db = await getDbInstance();
      if (!db) {
        setLoadingDetails(false);
        return;
      }

      // Load bookings
      const bookingsQuery = query(
        collection(db, "partnerBookings"),
        where("partnerId", "==", partnerId)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const bookingsList: PartnerBooking[] = [];
      const customerEmails = new Set<string>();
      let totalEarningsCents = 0;
      let activeSubscriptionsCount = 0;
      let thisMonthEarningsCents = 0;

      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        const booking: PartnerBooking = {
          id: doc.id,
          ...bookingData,
        } as PartnerBooking;

        bookingsList.push(booking);

        if (bookingData.customerEmail) {
          customerEmails.add(bookingData.customerEmail);
        }

        if (bookingData.status === "active") {
          activeSubscriptionsCount++;
        }

        totalEarningsCents += bookingData.partnerShareAmount || 0;

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

      setBookings(bookingsList);
      setStats({
        totalBookings: bookingsList.length,
        totalEarnings: totalEarningsCents,
        activeSubscriptions: activeSubscriptionsCount,
        totalCustomers: customerEmails.size,
        thisMonthEarnings: thisMonthEarningsCents,
      });

      setLoadingDetails(false);
    } catch (err) {
      console.error("Error loading partner details:", err);
      setLoadingDetails(false);
    }
  }

  function handleSelectPartner(partner: Partner) {
    setSelectedPartner(partner);
    loadPartnerDetails(partner.id);
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading partners...</div>;
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      marginTop: "2rem"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
        Partner Management
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: selectedPartner ? "400px 1fr" : "1fr", gap: "2rem" }}>
        {/* Partners List */}
        <div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
            All Partners ({partners.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "600px", overflowY: "auto" }}>
            {partners.map((partner) => (
              <div
                key={partner.id}
                onClick={() => handleSelectPartner(partner)}
                style={{
                  padding: "1rem",
                  background: selectedPartner?.id === partner.id ? "#f0f9ff" : "#f9fafb",
                  borderRadius: "12px",
                  border: selectedPartner?.id === partner.id ? "2px solid #0369a1" : "1px solid #e5e7eb",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ fontWeight: "600", color: "var(--text-dark)", marginBottom: "0.25rem" }}>
                  {partner.businessName}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                  {partner.ownerName}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {partner.serviceArea} • {partner.status}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partner Details */}
        {selectedPartner && (
          <div>
            {loadingDetails ? (
              <div style={{ padding: "2rem", textAlign: "center" }}>Loading details...</div>
            ) : (
              <>
                {/* Partner Info */}
                <div style={{
                  background: "#f9fafb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  marginBottom: "1.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                    {selectedPartner.businessName}
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Owner</div>
                      <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{selectedPartner.ownerName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Email</div>
                      <div style={{ color: "var(--text-dark)" }}>{selectedPartner.email}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Phone</div>
                      <div style={{ color: "var(--text-dark)" }}>{selectedPartner.phone}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Area</div>
                      <div style={{ fontWeight: "600", color: "#0369a1" }}>{selectedPartner.serviceArea}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Status</div>
                      <div style={{
                        display: "inline-block",
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: selectedPartner.status === "active" ? "#ecfdf5" : "#fef3c7",
                        color: selectedPartner.status === "active" ? "#047857" : "#92400e"
                      }}>
                        {selectedPartner.status.toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Referral Code</div>
                      <div style={{ fontFamily: "monospace", fontWeight: "600", color: "#0369a1" }}>{selectedPartner.referralCode}</div>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                {stats && (
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    marginBottom: "1.5rem"
                  }}>
                    <div style={{
                      background: "#ecfdf5",
                      borderRadius: "12px",
                      padding: "1rem",
                      border: "1px solid #86efac"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#047857", marginBottom: "0.25rem" }}>Total Earnings</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#047857" }}>
                        ${(stats.totalEarnings / 100).toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "1rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>This Month</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                        ${(stats.thisMonthEarnings / 100).toFixed(2)}
                      </div>
                    </div>
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "1rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Customers</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                        {stats.totalCustomers}
                      </div>
                    </div>
                    <div style={{
                      background: "#ffffff",
                      borderRadius: "12px",
                      padding: "1rem",
                      border: "1px solid #e5e7eb"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Active Subs</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)" }}>
                        {stats.activeSubscriptions}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bookings */}
                <div style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  border: "1px solid #e5e7eb"
                }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
                    Bookings ({bookings.length})
                  </h3>
                  {bookings.length === 0 ? (
                    <p style={{ color: "#6b7280", textAlign: "center", padding: "2rem" }}>No bookings yet</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                            <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Date</th>
                            <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Customer</th>
                            <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Plan</th>
                            <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Status</th>
                            <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Earnings</th>
                            <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "var(--text-dark)" }}>Next Service</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bookings.slice(0, 50).map((booking) => {
                            const bookingDate = booking.createdAt?.toDate?.() || new Date(booking.createdAt?.seconds * 1000 || Date.now());
                            const nextServiceDate = booking.nextServiceDate?.toDate?.() || null;
                            const emailParts = booking.customerEmail.split("@");
                            const maskedEmail = emailParts[0].substring(0, 3) + "***@" + (emailParts[1] || "");
                            const customerDisplay = booking.customerName || maskedEmail;

                            return (
                              <tr key={booking.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                                  {bookingDate.toLocaleDateString()}
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                                  {customerDisplay}
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-dark)" }}>
                                  {booking.planName}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
