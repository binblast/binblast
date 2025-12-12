// components/OwnerDashboard/CommercialAccounts.tsx
"use client";

import { useEffect, useState } from "react";

interface CommercialAccountsProps {
  userId: string;
}

interface CommercialAccount {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string;
  phone?: string;
  binsCount: number;
  frequency: string;
  nextService: any;
  contractValue: number;
  assignedOperator?: string;
  assignedPartner?: string;
  lifetimeValue: number;
}

export function CommercialAccounts({ userId }: CommercialAccountsProps) {
  const [accounts, setAccounts] = useState<CommercialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCommercialAccounts() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load commercial customers
        const usersSnapshot = await getDocs(collection(db, "users"));
        const commercialAccounts: CommercialAccount[] = [];

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.selectedPlan === "commercial" || data.selectedPlan?.includes("commercial") || data.selectedPlan?.includes("HOA")) {
            commercialAccounts.push({
              id: doc.id,
              businessName: data.businessName || data.firstName + " " + data.lastName,
              contactPerson: data.firstName + " " + data.lastName,
              email: data.email || "",
              phone: data.phone || "",
              binsCount: data.binsCount || 1,
              frequency: data.selectedPlan || "monthly",
              nextService: null, // Would need to load from cleanings
              contractValue: data.contractValue || 0,
              assignedOperator: data.assignedOperator || "",
              assignedPartner: data.assignedPartner || "",
              lifetimeValue: data.lifetimeValue || 0,
            });
          }
        });

        setAccounts(commercialAccounts);
        setLoading(false);
      } catch (err: any) {
        console.error("[CommercialAccounts] Error loading accounts:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadCommercialAccounts();
    }
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading commercial accounts...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        Commercial Accounts Management
      </h2>

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
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Business Name</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Contact</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Bins</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Frequency</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Contract Value</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Assigned</th>
                <th style={{ padding: "1rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Lifetime Value</th>
              </tr>
            </thead>
            <tbody>
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                    No commercial accounts found
                  </td>
                </tr>
              ) : (
                accounts.map((account) => (
                  <tr key={account.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600" }}>
                      {account.businessName}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      <div>{account.contactPerson}</div>
                      <div style={{ color: "#6b7280", fontSize: "0.75rem" }}>{account.email}</div>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {account.binsCount}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {account.frequency}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600", color: "#16a34a" }}>
                      {"$" + account.contractValue.toLocaleString()}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      {account.assignedOperator || account.assignedPartner || "Unassigned"}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", fontWeight: "600", color: "#2563eb" }}>
                      {"$" + account.lifetimeValue.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
