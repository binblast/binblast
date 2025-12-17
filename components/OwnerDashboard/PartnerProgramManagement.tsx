// components/OwnerDashboard/PartnerProgramManagement.tsx
// Re-export the enhanced AdminDashboard version
"use client";

export { PartnerProgramManagement } from "@/components/AdminDashboard/PartnerProgramManagement";

// Legacy component - now uses enhanced version from AdminDashboard
// Keeping this file for backward compatibility with existing imports
  const [partners, setPartners] = useState<Partner[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPartnerData() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load partner applications
        const applicationsSnapshot = await getDocs(collection(db, "partnerApplications"));
        const allApplications: any[] = [];
        applicationsSnapshot.forEach((doc) => {
          allApplications.push({ id: doc.id, ...doc.data() });
        });
        setApplications(allApplications);

        // Load partners
        const partnersSnapshot = await getDocs(collection(db, "partners"));
        const allPartners: Partner[] = [];

        // Load partner bookings to count customers
        const partnerBookingsSnapshot = await getDocs(collection(db, "partnerBookings"));
        const partnerCustomerCounts = new Map<string, Set<string>>();
        partnerBookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.partnerId && data.customerEmail) {
            if (!partnerCustomerCounts.has(data.partnerId)) {
              partnerCustomerCounts.set(data.partnerId, new Set());
            }
            partnerCustomerCounts.get(data.partnerId)!.add(data.customerEmail);
          }
        });

        // Load completed jobs per partner
        const cleaningsSnapshot = await getDocs(collection(db, "scheduledCleanings"));
        const partnerJobCounts = new Map<string, number>();
        cleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.partner && data.status === "completed") {
            partnerJobCounts.set(data.partner, (partnerJobCounts.get(data.partner) || 0) + 1);
          }
        });

        // Load partner payouts
        const payoutsSnapshot = await getDocs(collection(db, "partnerPayouts"));
        const partnerPayouts = new Map<string, { paid: number; unpaid: number }>();
        payoutsSnapshot.forEach((doc) => {
          const data = doc.data();
          const partnerId = data.partnerId || "";
          if (!partnerPayouts.has(partnerId)) {
            partnerPayouts.set(partnerId, { paid: 0, unpaid: 0 });
          }
          const amounts = partnerPayouts.get(partnerId)!;
          if (data.status === "paid") {
            amounts.paid += data.amount || 0;
          } else {
            amounts.unpaid += data.amount || 0;
          }
        });

        partnersSnapshot.forEach((doc) => {
          const data = doc.data();
          const partnerId = doc.id;
          const customerSet = partnerCustomerCounts.get(partnerId);
          const payouts = partnerPayouts.get(partnerId) || { paid: 0, unpaid: 0 };
          
          // Calculate revenue (simplified - would need actual payment data)
          const grossRevenue = payouts.paid + payouts.unpaid;
          const companyShare = grossRevenue * 0.4;
          const partnerShare = grossRevenue * 0.6;

          allPartners.push({
            id: partnerId,
            businessName: data.businessName || "",
            ownerName: data.ownerName || "",
            email: data.email || "",
            serviceArea: data.serviceArea || "",
            status: data.status || "pending",
            customersAssigned: customerSet?.size || 0,
            jobsCompleted: partnerJobCounts.get(partnerId) || 0,
            rating: data.rating,
            grossRevenue: Math.round(grossRevenue),
            companyShare: Math.round(companyShare),
            partnerShare: Math.round(partnerShare),
            unpaidPayouts: Math.round(payouts.unpaid),
            paidPayouts: Math.round(payouts.paid),
          });
        });

        setPartners(allPartners);
        setLoading(false);
      } catch (err: any) {
        console.error("[PartnerProgramManagement] Error loading partner data:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadPartnerData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading partner program data...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        Partner Program Management
      </h2>

      {/* Partner Applications */}
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
          Partner Applications
        </h3>
        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          {applications.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No pending applications
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Business Name</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Owner</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((app) => (
                    <tr key={app.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{app.businessName}</td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>{app.ownerName}</td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: app.status === "approved" ? "#dcfce7" : app.status === "rejected" ? "#fee2e2" : "#fef3c7",
                          color: app.status === "approved" ? "#16a34a" : app.status === "rejected" ? "#dc2626" : "#d97706"
                        }}>
                          {app.status || "pending"}
                        </span>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          {app.status === "pending" && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const response = await fetch(`/api/admin/partners/applications/${app.id}/approve`, {
                                      method: "POST",
                                    });
                                    if (response.ok) {
                                      window.location.reload();
                                    }
                                  } catch (err) {
                                    console.error("Error approving application:", err);
                                  }
                                }}
                                style={{
                                  padding: "0.25rem 0.75rem",
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Approve
                              </button>
                              <button
                                style={{
                                  padding: "0.25rem 0.75rem",
                                  background: "#dc2626",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Partners List */}
      <div>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
          Partners List
        </h3>
        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Partner Name</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Service Area</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Customers</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Jobs</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Gross Revenue</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Company Share</th>
                  <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Unpaid</th>
                </tr>
              </thead>
              <tbody>
                {partners.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                      No partners found
                    </td>
                  </tr>
                ) : (
                  partners.map((partner) => (
                    <tr key={partner.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600" }}>
                        {partner.businessName}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        {partner.serviceArea}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <span style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: partner.status === "active" ? "#dcfce7" : "#fee2e2",
                          color: partner.status === "active" ? "#16a34a" : "#dc2626"
                        }}>
                          {partner.status}
                        </span>
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        {partner.customersAssigned}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                        {partner.jobsCompleted}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600", color: "#16a34a" }}>
                        {"$" + partner.grossRevenue.toLocaleString()}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600", color: "#2563eb" }}>
                        {"$" + partner.companyShare.toLocaleString()}
                      </td>
                      <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600", color: "#dc2626" }}>
                        {"$" + partner.unpaidPayouts.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
