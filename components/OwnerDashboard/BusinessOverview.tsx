// components/OwnerDashboard/BusinessOverview.tsx
"use client";

import { useEffect, useState } from "react";

interface BusinessOverviewProps {
  userId: string;
}

interface BusinessMetrics {
  totalCustomers: number;
  totalCommercialCustomers: number;
  totalPartnerCustomers: number;
  activeSubscriptionsByTier: Record<string, number>;
  completedCleaningsThisMonth: number;
  upcomingScheduledCleanings: number;
  totalRevenue: number;
  platformProfit: number;
  partnerPayouts: {
    totalOwed: number;
    totalPaid: number;
    pending: number;
  };
  operatorPayouts: {
    totalOwed: number;
    totalPaid: number;
    pending: number;
  };
}

export function BusinessOverview({ userId }: BusinessOverviewProps) {
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    totalCustomers: 0,
    totalCommercialCustomers: 0,
    totalPartnerCustomers: 0,
    activeSubscriptionsByTier: {},
    completedCleaningsThisMonth: 0,
    upcomingScheduledCleanings: 0,
    totalRevenue: 0,
    platformProfit: 0,
    partnerPayouts: { totalOwed: 0, totalPaid: 0, pending: 0 },
    operatorPayouts: { totalOwed: 0, totalPaid: 0, pending: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, getDocs, where } = firestore;

        const db = await getDbInstance();
        if (!db) return;

        // Load all users
        const usersSnapshot = await getDocs(collection(db, "users"));
        const allUsers: any[] = [];
        let commercialCount = 0;
        let partnerCustomerCount = 0;
        const subscriptionsByTier: Record<string, number> = {};

        usersSnapshot.forEach((doc) => {
          const data = doc.data();
          allUsers.push({ id: doc.id, ...data });
          
          if (data.selectedPlan === "commercial" || data.selectedPlan?.includes("commercial") || data.selectedPlan?.includes("HOA")) {
            commercialCount++;
          }
          
          if (data.subscriptionStatus === "active" && data.selectedPlan) {
            subscriptionsByTier[data.selectedPlan] = (subscriptionsByTier[data.selectedPlan] || 0) + 1;
          }
        });

        // Load partner bookings to identify partner customers
        const partnerBookingsSnapshot = await getDocs(collection(db, "partnerBookings"));
        const partnerCustomerEmails = new Set<string>();
        partnerBookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.customerEmail) {
            partnerCustomerEmails.add(data.customerEmail);
          }
        });
        partnerCustomerCount = Array.from(partnerCustomerEmails).length;

        // Load cleanings
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const completedCleaningsQuery = query(
          collection(db, "scheduledCleanings"),
          where("status", "==", "completed")
        );
        const completedCleaningsSnapshot = await getDocs(completedCleaningsQuery);
        let completedThisMonth = 0;
        
        completedCleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          const cleaningDate = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate);
          if (cleaningDate >= startOfMonth && cleaningDate <= endOfMonth) {
            completedThisMonth++;
          }
        });

        const upcomingCleaningsQuery = query(
          collection(db, "scheduledCleanings")
        );
        const upcomingCleaningsSnapshot = await getDocs(upcomingCleaningsQuery);
        let upcomingCount = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        upcomingCleaningsSnapshot.forEach((doc) => {
          const data = doc.data();
          const cleaningDate = data.scheduledDate?.toDate?.() || new Date(data.scheduledDate);
          if (cleaningDate >= today && data.status !== "cancelled" && data.status !== "completed") {
            upcomingCount++;
          }
        });

        // Calculate revenue (simplified - would need actual payment data)
        const planPrices: Record<string, number> = {
          "one-time": 25,
          "twice-month": 45,
          "bi-monthly": 20,
          "quarterly": 15,
          "commercial": 100,
        };
        
        let totalRevenue = 0;
        allUsers.forEach((user) => {
          if (user.subscriptionStatus === "active" && user.selectedPlan) {
            const price = planPrices[user.selectedPlan] || 25;
            const multiplier = user.selectedPlan === "twice-month" ? 2 : 
                             user.selectedPlan === "bi-monthly" ? 0.5 : 
                             user.selectedPlan === "quarterly" ? 0.25 : 1;
            totalRevenue += price * multiplier;
          }
        });

        // Load partner payouts
        const partnerPayoutsSnapshot = await getDocs(collection(db, "partnerPayouts"));
        let partnerTotalOwed = 0;
        let partnerTotalPaid = 0;
        let partnerPending = 0;
        
        partnerPayoutsSnapshot.forEach((doc) => {
          const data = doc.data();
          const amount = data.amount || 0;
          if (data.status === "paid") {
            partnerTotalPaid += amount;
          } else if (data.status === "pending" || data.status === "held") {
            partnerPending += amount;
          }
          partnerTotalOwed += amount;
        });

        // Platform profit is 40% of partner revenue
        const platformProfit = totalRevenue * 0.4;

        setMetrics({
          totalCustomers: allUsers.length,
          totalCommercialCustomers: commercialCount,
          totalPartnerCustomers: partnerCustomerCount,
          activeSubscriptionsByTier: subscriptionsByTier,
          completedCleaningsThisMonth: completedThisMonth,
          upcomingScheduledCleanings: upcomingCount,
          totalRevenue: Math.round(totalRevenue),
          platformProfit: Math.round(platformProfit),
          partnerPayouts: {
            totalOwed: Math.round(partnerTotalOwed),
            totalPaid: Math.round(partnerTotalPaid),
            pending: Math.round(partnerPending),
          },
          operatorPayouts: {
            totalOwed: 0,
            totalPaid: 0,
            pending: 0,
          },
        });
        setLoading(false);
      } catch (err: any) {
        console.error("[BusinessOverview] Error loading metrics:", err);
        setLoading(false);
      }
    }

    if (userId) {
      loadMetrics();
    }
  }, [userId]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading business metrics...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        Business Overview
      </h2>
      
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
        gap: "1.5rem",
        marginBottom: "2rem"
      }}>
        {/* Total Customers */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Total Customers
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}>
            {metrics.totalCustomers.toLocaleString()}
          </div>
        </div>

        {/* Commercial Customers */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Commercial Customers
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}>
            {metrics.totalCommercialCustomers.toLocaleString()}
          </div>
        </div>

        {/* Partner Customers */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Partner Customers
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}>
            {metrics.totalPartnerCustomers.toLocaleString()}
          </div>
        </div>

        {/* Completed Cleanings This Month */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Completed This Month
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
            {metrics.completedCleaningsThisMonth.toLocaleString()}
          </div>
        </div>

        {/* Upcoming Cleanings */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Upcoming Cleanings
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2563eb" }}>
            {metrics.upcomingScheduledCleanings.toLocaleString()}
          </div>
        </div>

        {/* Total Revenue */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Total Revenue
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
            {"$" + metrics.totalRevenue.toLocaleString()}
          </div>
        </div>

        {/* Platform Profit */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Platform Profit (40%)
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#16a34a" }}>
            {"$" + metrics.platformProfit.toLocaleString()}
          </div>
        </div>

        {/* Partner Payouts Owed */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Partner Payouts Owed
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#dc2626" }}>
            {"$" + metrics.partnerPayouts.totalOwed.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {"$" + metrics.partnerPayouts.pending.toLocaleString()} pending
          </div>
        </div>

        {/* Operator Payouts */}
        <div style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb"
        }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: "600" }}>
            Operator Payouts
          </div>
          <div style={{ fontSize: "2rem", fontWeight: "700", color: "#111827" }}>
            {"$" + metrics.operatorPayouts.totalOwed.toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {"$" + metrics.operatorPayouts.pending.toLocaleString()} pending
          </div>
        </div>
      </div>

      {/* Active Subscriptions by Tier */}
      <div style={{
        background: "#ffffff",
        padding: "1.5rem",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb"
      }}>
        <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
          Active Subscriptions by Tier
        </h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          {Object.entries(metrics.activeSubscriptionsByTier).map(([tier, count]) => (
            <div key={tier} style={{
              padding: "0.75rem 1rem",
              background: "#f3f4f6",
              borderRadius: "8px",
              border: "1px solid #e5e7eb"
            }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                {tier}
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
