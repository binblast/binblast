// components/OwnerDashboard/FinancialAnalytics.tsx
"use client";

import { useEffect, useState } from "react";

interface FinancialAnalyticsProps {
  userId: string;
}

interface FinancialData {
  directRevenue: {
    monthlyTotals: Record<string, number>;
    paidInvoices: number;
    outstandingPayments: number;
    refunds: number;
  };
  partnerRevenue: {
    totalRevenue: number;
    platformShare: number;
    topPartners: Array<{ name: string; revenue: number }>;
    revenueByRegion: Record<string, number>;
  };
  operatorRevenue: {
    totalPayouts: number;
    pendingBalances: number;
  };
  profitBreakdown: {
    totalRevenue: number;
    companyShare: number;
    operatorExpenses: number;
    partnerExpenses: number;
    netProfit: number;
  };
}

export function FinancialAnalytics({ userId }: FinancialAnalyticsProps) {
  const [financialData, setFinancialData] = useState<FinancialData>({
    directRevenue: {
      monthlyTotals: {},
      paidInvoices: 0,
      outstandingPayments: 0,
      refunds: 0,
    },
    partnerRevenue: {
      totalRevenue: 0,
      platformShare: 0,
      topPartners: [],
      revenueByRegion: {},
    },
    operatorRevenue: {
      totalPayouts: 0,
      pendingBalances: 0,
    },
    profitBreakdown: {
      totalRevenue: 0,
      companyShare: 0,
      operatorExpenses: 0,
      partnerExpenses: 0,
      netProfit: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFinancialData() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, getDocs } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load users for direct revenue calculation
        const usersSnapshot = await getDocs(collection(db, "users"));
        const planPrices: Record<string, number> = {
          "one-time": 25,
          "twice-month": 45,
          "bi-monthly": 20,
          "quarterly": 15,
          "commercial": 100,
        };

        let directRevenue = 0;
        const monthlyTotals: Record<string, number> = {};
        
        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.subscriptionStatus === "active" && data.selectedPlan) {
            const price = planPrices[data.selectedPlan] || 25;
            const multiplier = data.selectedPlan === "twice-month" ? 2 : 
                             data.selectedPlan === "bi-monthly" ? 0.5 : 
                             data.selectedPlan === "quarterly" ? 0.25 : 1;
            const monthlyRevenue = price * multiplier;
            directRevenue += monthlyRevenue;
            
            const month = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });
            monthlyTotals[month] = (monthlyTotals[month] || 0) + monthlyRevenue;
          }
        });

        // Load partner payouts
        const payoutsSnapshot = await getDocs(collection(db, "partnerPayouts"));
        let partnerTotalRevenue = 0;
        const partnerRevenueMap = new Map<string, number>();
        
        payoutsSnapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          partnerTotalRevenue += amount;
          
          if (data.partnerId) {
            partnerRevenueMap.set(data.partnerId, (partnerRevenueMap.get(data.partnerId) || 0) + amount);
          }
        });

        const platformShare = partnerTotalRevenue * 0.4;
        const partnerExpenses = partnerTotalRevenue * 0.6;

        // Get top partners
        const partnersSnapshot = await getDocs(collection(db, "partners"));
        const topPartners: Array<{ name: string; revenue: number }> = [];
        partnersSnapshot.forEach((doc) => {
          const data = doc.data();
          const revenue = partnerRevenueMap.get(doc.id) || 0;
          if (revenue > 0) {
            topPartners.push({
              name: data.businessName || "Unknown",
              revenue: Math.round(revenue),
            });
          }
        });
        topPartners.sort((a, b) => b.revenue - a.revenue);
        const top5Partners = topPartners.slice(0, 5);

        const totalRevenue = directRevenue + partnerTotalRevenue;
        const companyShare = directRevenue + platformShare;
        const netProfit = companyShare - (partnerExpenses + 0); // Operator expenses would be calculated separately

        setFinancialData({
          directRevenue: {
            monthlyTotals,
            paidInvoices: Math.round(directRevenue),
            outstandingPayments: 0,
            refunds: 0,
          },
          partnerRevenue: {
            totalRevenue: Math.round(partnerTotalRevenue),
            platformShare: Math.round(platformShare),
            topPartners: top5Partners,
            revenueByRegion: {},
          },
          operatorRevenue: {
            totalPayouts: 0,
            pendingBalances: 0,
          },
          profitBreakdown: {
            totalRevenue: Math.round(totalRevenue),
            companyShare: Math.round(companyShare),
            operatorExpenses: 0,
            partnerExpenses: Math.round(partnerExpenses),
            netProfit: Math.round(netProfit),
          },
        });
        setLoading(false);
      } catch (err: any) {
        console.error("[FinancialAnalytics] Error loading financial data:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadFinancialData();
    }
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading financial analytics...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        Financial Analytics
      </h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
        {/* Direct Revenue */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
            Direct Revenue
          </h3>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Paid Invoices</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
              {"$" + financialData.directRevenue.paidInvoices.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Outstanding</div>
            <div style={{ fontSize: "1rem", fontWeight: "600", color: "#d97706" }}>
              {"$" + financialData.directRevenue.outstandingPayments.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Partner Revenue */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
            Partner Revenue
          </h3>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Total Revenue</div>
            <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
              {"$" + financialData.partnerRevenue.totalRevenue.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Platform Share (40%)</div>
            <div style={{ fontSize: "1rem", fontWeight: "600", color: "#2563eb" }}>
              {"$" + financialData.partnerRevenue.platformShare.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Profit Breakdown */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
            Profit Breakdown
          </h3>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Total Revenue</div>
            <div style={{ fontSize: "1rem", fontWeight: "600" }}>
              {"$" + financialData.profitBreakdown.totalRevenue.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Company Share</div>
            <div style={{ fontSize: "1rem", fontWeight: "600", color: "#16a34a" }}>
              {"$" + financialData.profitBreakdown.companyShare.toLocaleString()}
            </div>
          </div>
          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Partner Expenses</div>
            <div style={{ fontSize: "1rem", fontWeight: "600", color: "#dc2626" }}>
              {"$" + financialData.profitBreakdown.partnerExpenses.toLocaleString()}
            </div>
          </div>
          <div style={{ paddingTop: "0.75rem", borderTop: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>Net Profit</div>
            <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
              {"$" + financialData.profitBreakdown.netProfit.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Top Partners */}
      {financialData.partnerRevenue.topPartners.length > 0 && (
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
            Top Performing Partners
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {financialData.partnerRevenue.topPartners.map((partner, index) => (
              <div key={index} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.75rem",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                <div>
                  <div style={{ fontWeight: "600" }}>{partner.name}</div>
                </div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#16a34a" }}>
                  {"$" + partner.revenue.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
