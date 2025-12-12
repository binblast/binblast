// components/OwnerDashboard/CustomerManagement.tsx
"use client";

import { useEffect, useState } from "react";

interface CustomerManagementProps {
  userId: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
  selectedPlan?: string;
  serviceTier?: string;
  status?: string;
  loyaltyRanking?: string;
  referralUsageCount?: number;
  nextScheduledService?: any;
  totalRevenue?: number;
  source?: "direct" | "partner";
  partnerName?: string;
}

export function CustomerManagement({ userId }: CustomerManagementProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  useEffect(() => {
    async function loadCustomers() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, orderBy } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load all users
        const usersSnapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
        const allCustomers: Customer[] = [];

        // Load partner bookings to identify source
        const partnerBookingsSnapshot = await getDocs(collection(db, "partnerBookings"));
        const partnerCustomerMap = new Map<string, string>();
        partnerBookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.customerEmail && data.partnerName) {
            partnerCustomerMap.set(data.customerEmail, data.partnerName);
          }
        });

        // Load next scheduled cleanings
        const cleaningsSnapshot = await getDocs(collection(db, "scheduledCleanings"));
        const nextCleaningMap = new Map<string, any>();
        cleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.userId && data.status !== "cancelled" && data.status !== "completed") {
            const cleaningDate = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate);
            const existing = nextCleaningMap.get(data.userId);
            if (!existing || cleaningDate < existing) {
              nextCleaningMap.set(data.userId, cleaningDate);
            }
          }
        });

        // Load referral counts
        const referralsSnapshot = await getDocs(collection(db, "referrals"));
        const referralCountMap = new Map<string, number>();
        referralsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.referrerId) {
            referralCountMap.set(data.referrerId, (referralCountMap.get(data.referrerId) || 0) + 1);
          }
        });

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          const email = data.email || "";
          const partnerName = partnerCustomerMap.get(email);
          
          allCustomers.push({
            id: doc.id,
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: email,
            phone: data.phone || "",
            address: data.address || "",
            selectedPlan: data.selectedPlan || "",
            serviceTier: data.selectedPlan || "",
            status: data.subscriptionStatus || "inactive",
            loyaltyRanking: data.loyaltyLevel || "Getting Started",
            referralUsageCount: referralCountMap.get(doc.id) || 0,
            nextScheduledService: nextCleaningMap.get(doc.id),
            totalRevenue: 0, // Would need to calculate from payments
            source: partnerName ? "partner" : "direct",
            partnerName: partnerName || undefined,
          });
        });

        setCustomers(allCustomers);
        setFilteredCustomers(allCustomers);
        setLoading(false);
      } catch (err: any) {
        console.error("[CustomerManagement] Error loading customers:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadCustomers();
    }
  }, [userId]);

  useEffect(() => {
    let filtered = [...customers];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.firstName.toLowerCase().includes(term) ||
          c.lastName.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
      );
    }

    if (filterTier) {
      filtered = filtered.filter((c) => c.selectedPlan === filterTier);
    }

    if (filterStatus) {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (filterSource) {
      filtered = filtered.filter((c) => c.source === filterSource);
    }

    setFilteredCustomers(filtered);
  }, [customers, searchTerm, filterTier, filterStatus, filterSource]);

  const handleEditCustomer = async (customer: Customer, updates: Partial<Customer>) => {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, updateDoc } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      await updateDoc(doc(db, "users", customer.id), updates);
      
      // Update local state
      setCustomers(customers.map((c) => (c.id === customer.id ? { ...c, ...updates } : c)));
      setShowEditModal(false);
      setSelectedCustomer(null);
    } catch (err: any) {
      console.error("[CustomerManagement] Error updating customer:", err);
      alert("Failed to update customer: " + (err.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading customers...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>
          Customer Management
        </h2>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {filteredCustomers.length} of {customers.length} customers
        </div>
      </div>

      {/* Filters */}
      <div style={{
        background: "#ffffff",
        padding: "1.5rem",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          />
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          >
            <option value="">All Plans</option>
            <option value="one-time">Monthly</option>
            <option value="twice-month">Twice Monthly</option>
            <option value="bi-monthly">Bi-Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="commercial">Commercial</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="cancelled">Cancelled</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          >
            <option value="">All Sources</option>
            <option value="direct">Direct</option>
            <option value="partner">Partner</option>
          </select>
        </div>
      </div>

      {/* Customer Table */}
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
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Name</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Email</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Plan</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Loyalty</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Source</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Next Service</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {customer.firstName} {customer.lastName}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {customer.email}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {customer.selectedPlan || "N/A"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: customer.status === "active" ? "#dcfce7" : "#fef3c7",
                        color: customer.status === "active" ? "#16a34a" : "#d97706"
                      }}>
                        {customer.status || "inactive"}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {customer.loyaltyRanking || "Getting Started"}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {customer.source === "partner" ? (
                        <span style={{ color: "#2563eb" }}>Partner: {customer.partnerName || "Unknown"}</span>
                      ) : (
                        <span style={{ color: "#6b7280" }}>Direct</span>
                      )}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {customer.nextScheduledService
                        ? new Date(customer.nextScheduledService).toLocaleDateString()
                        : "None"}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowEditModal(true);
                          }}
                          style={{
                            padding: "0.25rem 0.75rem",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer"
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowHistoryModal(true);
                          }}
                          style={{
                            padding: "0.25rem 0.75rem",
                            background: "#f3f4f6",
                            border: "1px solid #e5e7eb",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            cursor: "pointer"
                          }}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedCustomer && (
        <EditCustomerModal
          customer={selectedCustomer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCustomer(null);
          }}
          onSave={(updates) => handleEditCustomer(selectedCustomer, updates)}
        />
      )}

      {/* History Modal */}
      {showHistoryModal && selectedCustomer && (
        <CustomerHistoryModal
          customer={selectedCustomer}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
}

function EditCustomerModal({
  customer,
  onClose,
  onSave,
}: {
  customer: Customer;
  onClose: () => void;
  onSave: (updates: Partial<Customer>) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone || "",
    status: customer.status || "inactive",
    loyaltyRanking: customer.loyaltyRanking || "Getting Started",
  });

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "500px",
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
          Edit Customer
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px"
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px"
              }}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Loyalty Ranking
            </label>
            <select
              value={formData.loyaltyRanking}
              onChange={(e) => setFormData({ ...formData, loyaltyRanking: e.target.value })}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px"
              }}
            >
              <option value="Getting Started">Getting Started</option>
              <option value="Clean Freak">Clean Freak</option>
              <option value="Bin Boss">Bin Boss</option>
              <option value="Sparkle Specialist">Sparkle Specialist</option>
              <option value="Sanitation Superstar">Sanitation Superstar</option>
              <option value="Bin Royalty">Bin Royalty</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#111827",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerHistoryModal({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where, orderBy } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load cleanings
        const cleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("userId", "==", customer.id),
          orderBy("scheduledDate", "desc")
        );
        const cleaningsSnapshot = await getDocs(cleaningsQuery);
        const cleanings: any[] = [];
        cleaningsSnapshot.forEach((doc) => {
          cleanings.push({ id: doc.id, type: "cleaning", ...doc.data() });
        });

        setHistory(cleanings);
        setLoading(false);
      } catch (err: any) {
        console.error("[CustomerHistoryModal] Error loading history:", err);
        setLoading(false);
      }
    }

    loadHistory();
  }, [customer.id]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "800px",
        width: "90%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
          Customer History: {customer.firstName} {customer.lastName}
        </h3>
        {loading ? (
          <p style={{ color: "#6b7280" }}>Loading history...</p>
        ) : history.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No history found</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {history.map((item) => (
              <div key={item.id} style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>
                  {item.type === "cleaning" ? "Cleaning" : "Payment"}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Date: {item.scheduledDate?.toDate?.() ? new Date(item.scheduledDate.toDate()).toLocaleDateString() : "N/A"}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Status: {item.status || "N/A"}
                </div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onClose}
          style={{
            marginTop: "1.5rem",
            padding: "0.75rem 1.5rem",
            background: "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
