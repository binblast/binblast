// components/OwnerDashboard/CleaningScheduleBoard.tsx
"use client";

import { useEffect, useState } from "react";

interface CleaningScheduleBoardProps {
  userId: string;
}

interface Cleaning {
  id: string;
  userId: string;
  customerName?: string;
  addressLine1: string;
  addressLine2?: string;
  scheduledDate: any;
  status: string;
  operator?: string;
  partner?: string;
  city?: string;
  notes?: string;
}

export function CleaningScheduleBoard({ userId }: CleaningScheduleBoardProps) {
  const [cleanings, setCleanings] = useState<Cleaning[]>([]);
  const [filteredCleanings, setFilteredCleanings] = useState<Cleaning[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOperator, setFilterOperator] = useState<string>("");
  const [filterPartner, setFilterPartner] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [selectedCleaning, setSelectedCleaning] = useState<Cleaning | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    async function loadCleanings() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, orderBy } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        const cleaningsSnapshot = await getDocs(query(collection(db, "scheduledCleanings"), orderBy("scheduledDate", "asc")));
        const allCleanings: Cleaning[] = [];

        // Load customer names
        const usersSnapshot = await getDocs(collection(db, "users"));
        const userMap = new Map<string, string>();
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          userMap.set(doc.id, (data.firstName || "") + " " + (data.lastName || ""));
        });

        cleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          allCleanings.push({
            id: doc.id,
            userId: data.userId || "",
            customerName: userMap.get(data.userId) || "Unknown",
            addressLine1: data.addressLine1 || "",
            addressLine2: data.addressLine2 || "",
            scheduledDate: data.scheduledDate,
            status: data.status || "pending",
            operator: data.operator || "",
            partner: data.partner || "",
            city: data.city || "",
            notes: data.notes || "",
          });
        });

        setCleanings(allCleanings);
        setFilteredCleanings(allCleanings);
        setLoading(false);
      } catch (err: any) {
        console.error("[CleaningScheduleBoard] Error loading cleanings:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadCleanings();
    }
  }, [userId]);

  useEffect(() => {
    let filtered = [...cleanings];

    if (filterOperator) {
      filtered = filtered.filter((c) => c.operator === filterOperator);
    }

    if (filterPartner) {
      filtered = filtered.filter((c) => c.partner === filterPartner);
    }

    if (filterCity) {
      filtered = filtered.filter((c) => c.city?.toLowerCase().includes(filterCity.toLowerCase()));
    }

    if (filterStatus) {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (filterDate) {
      const filterDateObj = new Date(filterDate);
      filterDateObj.setHours(0, 0, 0, 0);
      filtered = filtered.filter((c) => {
        const cleaningDate = c.scheduledDate?.toDate?.() || new Date(c.scheduledDate);
        cleaningDate.setHours(0, 0, 0, 0);
        return cleaningDate.getTime() === filterDateObj.getTime();
      });
    }

    setFilteredCleanings(filtered);
  }, [cleanings, filterOperator, filterPartner, filterCity, filterDate, filterStatus]);

  const handleUpdateCleaning = async (cleaning: Cleaning, updates: Partial<Cleaning>) => {
    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, updateDoc } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      await updateDoc(doc(db, "scheduledCleanings", cleaning.id), updates);
      
      setCleanings(cleanings.map((c) => (c.id === cleaning.id ? { ...c, ...updates } : c)));
      setShowEditModal(false);
      setSelectedCleaning(null);
    } catch (err: any) {
      console.error("[CleaningScheduleBoard] Error updating cleaning:", err);
      alert("Failed to update cleaning: " + (err.message || "Unknown error"));
    }
  };

  // Group cleanings by date
  const groupedCleanings = filteredCleanings.reduce((acc, cleaning) => {
    const date = cleaning.scheduledDate?.toDate?.() || new Date(cleaning.scheduledDate);
    const dateKey = date.toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(cleaning);
    return acc;
  }, {} as Record<string, Cleaning[]>);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading cleaning schedule...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>
          Cleaning Schedule & Operations Board
        </h2>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {filteredCleanings.length} jobs
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <input
            type="text"
            placeholder="Filter by operator..."
            value={filterOperator}
            onChange={(e) => setFilterOperator(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          />
          <input
            type="text"
            placeholder="Filter by partner..."
            value={filterPartner}
            onChange={(e) => setFilterPartner(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          />
          <input
            type="text"
            placeholder="Filter by city..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #d1d5db",
              borderRadius: "8px",
              fontSize: "0.875rem"
            }}
          />
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
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Schedule Board */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {Object.entries(groupedCleanings).map(([date, dateCleanings]) => (
          <div key={date} style={{
            background: "#ffffff",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            border: "1px solid #e5e7eb",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "1rem 1.5rem",
              background: "#f9fafb",
              borderBottom: "1px solid #e5e7eb",
              fontWeight: "600",
              color: "#111827"
            }}>
              {date} ({dateCleanings.length} jobs)
            </div>
            <div style={{ padding: "1rem" }}>
              {dateCleanings.map((cleaning) => {
                const cleaningDate = cleaning.scheduledDate?.toDate?.() || new Date(cleaning.scheduledDate);
                return (
                  <div
                    key={cleaning.id}
                    style={{
                      padding: "1rem",
                      marginBottom: "0.5rem",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                        {cleaning.customerName}
                      </div>
                      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                        {cleaning.addressLine1}
                        {cleaning.addressLine2 && ", " + cleaning.addressLine2}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {cleaningDate.toLocaleTimeString()} | {cleaning.operator && `Operator: ${cleaning.operator}`} | {cleaning.partner && `Partner: ${cleaning.partner}`}
                      </div>
                      {cleaning.notes && (
                        <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem", fontStyle: "italic" }}>
                          Notes: {cleaning.notes}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <span style={{
                        padding: "0.25rem 0.75rem",
                        borderRadius: "12px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: cleaning.status === "completed" ? "#dcfce7" : 
                                   cleaning.status === "in-progress" ? "#dbeafe" : 
                                   cleaning.status === "cancelled" ? "#fee2e2" : "#fef3c7",
                        color: cleaning.status === "completed" ? "#16a34a" : 
                               cleaning.status === "in-progress" ? "#2563eb" : 
                               cleaning.status === "cancelled" ? "#dc2626" : "#d97706"
                      }}>
                        {cleaning.status}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedCleaning(cleaning);
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
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedCleaning && (
        <EditCleaningModal
          cleaning={selectedCleaning}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCleaning(null);
          }}
          onSave={(updates) => handleUpdateCleaning(selectedCleaning, updates)}
        />
      )}
    </div>
  );
}

function EditCleaningModal({
  cleaning,
  onClose,
  onSave,
}: {
  cleaning: Cleaning;
  onClose: () => void;
  onSave: (updates: Partial<Cleaning>) => void;
}) {
  const [formData, setFormData] = useState({
    status: cleaning.status,
    operator: cleaning.operator || "",
    notes: cleaning.notes || "",
    scheduledDate: cleaning.scheduledDate?.toDate?.() ? 
      new Date(cleaning.scheduledDate.toDate()).toISOString().split("T")[0] : 
      new Date(cleaning.scheduledDate).toISOString().split("T")[0],
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
        width: "90%"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
          Edit Cleaning Job
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Operator
            </label>
            <input
              type="text"
              value={formData.operator}
              onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
              placeholder="Operator name..."
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
              Scheduled Date
            </label>
            <input
              type="date"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
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
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Internal notes..."
              rows={4}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                resize: "vertical"
              }}
            />
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
            onClick={() => {
              const updates: any = {
                status: formData.status,
                operator: formData.operator,
                notes: formData.notes,
              };
              if (formData.scheduledDate) {
                updates.scheduledDate = new Date(formData.scheduledDate);
              }
              onSave(updates);
            }}
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
