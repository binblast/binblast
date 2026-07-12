"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BusinessOverview } from "@/components/OwnerDashboard/BusinessOverview";
import { CustomerManagement } from "@/components/OwnerDashboard/CustomerManagement";
import { CleaningScheduleBoard } from "@/components/OwnerDashboard/CleaningScheduleBoard";
import { CommercialAccounts } from "@/components/OwnerDashboard/CommercialAccounts";
import { PartnerProgramManagement } from "@/components/OwnerDashboard/PartnerProgramManagement";
import { FinancialAnalytics } from "@/components/OwnerDashboard/FinancialAnalytics";
import { SystemControls } from "@/components/OwnerDashboard/SystemControls";
import { OwnerTrainingOverview } from "@/components/OwnerDashboard/OwnerTrainingOverview";
import { OwnerPhotosOverview } from "@/components/OwnerDashboard/OwnerPhotosOverview";
import { AdminPartnerApplications } from "@/components/AdminPartnerApplications";

const EmployeeStatus = dynamic(
  () => import("@/components/OperatorDashboard/EmployeeStatus").then((m) => m.EmployeeStatus),
  { loading: () => <p style={{ color: "#6b7280" }}>Loading live operations...</p> }
);

const CustomQuotesManagement = dynamic(
  () => import("@/components/AdminDashboard/CustomQuotesManagement").then((m) => m.CustomQuotesManagement),
  { loading: () => <p style={{ color: "#6b7280" }}>Loading quotes...</p> }
);

const MessagingCenter = dynamic(
  () => import("@/components/AdminDashboard/MessagingCenter").then((m) => m.MessagingCenter),
  { loading: () => <p style={{ color: "#6b7280" }}>Loading messages...</p> }
);

export type OwnerTab =
  | "hub"
  | "overview"
  | "live-ops"
  | "schedule"
  | "employees"
  | "customers"
  | "commercial"
  | "partners"
  | "financials"
  | "messages"
  | "training"
  | "photos"
  | "settings";

const HUB_SECTIONS: Array<{
  id: OwnerTab;
  title: string;
  subtitle: string;
  icon: string;
}> = [
  { id: "overview", title: "Business Overview", subtitle: "Revenue, customers, subscriptions, and KPIs", icon: "📊" },
  { id: "live-ops", title: "Live Operations", subtitle: "Clock-ins, active shifts, jobs, and open flags", icon: "⚡" },
  { id: "schedule", title: "Schedule & Routes", subtitle: "Cleaning calendar, route board, and assignments", icon: "🗓️" },
  { id: "employees", title: "Employees", subtitle: "Hiring, profiles, routes, stops, and activity", icon: "👥" },
  { id: "customers", title: "Customers & Quotes", subtitle: "Direct accounts, custom quotes, and service history", icon: "🏠" },
  { id: "commercial", title: "Commercial Accounts", subtitle: "HOA and business client management", icon: "🏢" },
  { id: "partners", title: "Partner Program", subtitle: "Applications, payouts, and partner network", icon: "🤝" },
  { id: "financials", title: "Financial Analytics", subtitle: "Revenue, profit, and payout tracking", icon: "💰" },
  { id: "messages", title: "Messages", subtitle: "Customer and team messaging center", icon: "💬" },
  { id: "training", title: "Training & Certification", subtitle: "Module completion and compliance status", icon: "🎓" },
  { id: "photos", title: "Cleaning Photos", subtitle: "Proof-of-work and before/after job photos", icon: "📸" },
  { id: "settings", title: "System Settings", subtitle: "Pricing, permissions, and business controls", icon: "⚙️" },
];

const TAB_LABELS: Record<OwnerTab, string> = {
  hub: "Command Hub",
  overview: "Overview",
  "live-ops": "Live Ops",
  schedule: "Schedule",
  employees: "Employees",
  customers: "Customers",
  commercial: "Commercial",
  partners: "Partners",
  financials: "Financials",
  messages: "Messages",
  training: "Training",
  photos: "Photos",
  settings: "Settings",
};

const NAV_TABS: OwnerTab[] = [
  "hub",
  "overview",
  "live-ops",
  "schedule",
  "employees",
  "customers",
  "commercial",
  "partners",
  "financials",
  "messages",
  "training",
  "photos",
  "settings",
];

interface OwnerCommandCenterProps {
  userId: string;
  userName: string;
  newQuotesCount?: number;
  newPartnerApplicationsCount?: number;
}

export function OwnerCommandCenter({
  userId,
  userName,
  newQuotesCount = 0,
  newPartnerApplicationsCount = 0,
}: OwnerCommandCenterProps) {
  const [activeTab, setActiveTab] = useState<OwnerTab>("hub");

  const cardStyle = {
    display: "block" as const,
    background: "#ffffff",
    borderRadius: "16px",
    padding: "1.25rem 1.5rem",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
    border: "1px solid #e5e7eb",
    textDecoration: "none",
    transition: "all 0.2s ease",
    cursor: "pointer" as const,
    textAlign: "left" as const,
    width: "100%",
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1
          style={{
            fontSize: "clamp(1.75rem, 5vw, 2.5rem)",
            fontWeight: "800",
            color: "var(--text-dark)",
            marginBottom: "0.5rem",
            background: "linear-gradient(135deg, #1f2937 0%, #374151 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Blast Command Center
        </h1>
        <p style={{ fontSize: "1rem", color: "#6b7280", margin: 0 }}>
          Welcome back, {userName}. Everything your business needs — in one place.
        </p>
      </div>

      {/* Alert banners */}
      {(newQuotesCount > 0 || newPartnerApplicationsCount > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
          {newQuotesCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className="mobile-banner"
              style={{
                padding: "1rem 1.25rem",
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "12px",
                border: "2px solid #fbbf24",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: "700", color: "#92400e", fontSize: "0.875rem" }}>
                🔔 {newQuotesCount} new custom quote request{newQuotesCount > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "#78350f", fontWeight: "600" }}>View →</span>
            </button>
          )}
          {newPartnerApplicationsCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("partners")}
              className="mobile-banner"
              style={{
                padding: "1rem 1.25rem",
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                borderRadius: "12px",
                border: "2px solid #3b82f6",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: "700", color: "#1e40af", fontSize: "0.875rem" }}>
                📋 {newPartnerApplicationsCount} new partner application{newPartnerApplicationsCount > 1 ? "s" : ""}
              </span>
              <span style={{ fontSize: "0.8125rem", color: "#1e3a8a", fontWeight: "600" }}>Review →</span>
            </button>
          )}
        </div>
      )}

      {/* Tab navigation */}
      <div
        className="tab-navigation"
        style={{
          position: "sticky",
          top: "80px",
          background: "#ffffff",
          borderRadius: "12px",
          padding: "0.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          zIndex: 100,
          display: "flex",
          gap: "0.5rem",
        }}
      >
        {NAV_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            style={{
              flex: tab === "hub" ? "0 0 auto" : "1",
              minWidth: tab === "hub" ? "120px" : "100px",
              padding: "0.75rem 1rem",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              background: activeTab === tab ? "#16a34a" : "transparent",
              color: activeTab === tab ? "#ffffff" : "#6b7280",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "clamp(1.25rem, 4vw, 2rem)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          minHeight: "400px",
        }}
      >
        {activeTab === "hub" && (
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
              Command Hub
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Jump to any area of your business — just like choosing a portal at sign-in.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
              {HUB_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveTab(section.id)}
                  style={cardStyle}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#16a34a";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(22, 163, 74, 0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#e5e7eb";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06)";
                  }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{section.icon}</div>
                  <div style={{ fontSize: "1.05rem", fontWeight: "700", color: "var(--text-dark)", marginBottom: "0.35rem" }}>
                    {section.title}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", lineHeight: 1.5 }}>{section.subtitle}</div>
                </button>
              ))}
            </div>

            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "var(--text-dark)" }}>
              Quick Links
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.75rem" }}>
              {[
                { href: "/admin/employees", label: "Hire & Manage Employees" },
                { href: "/admin/training/modules", label: "Training Module Admin" },
                { href: "/admin/messages", label: "Full Messaging Center" },
                { href: "/admin/partners", label: "Partner Admin Panel" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  style={{
                    padding: "0.875rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                    textDecoration: "none",
                    background: "#f9fafb",
                  }}
                >
                  {link.label} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {activeTab === "overview" && <BusinessOverview userId={userId} />}
        {activeTab === "live-ops" && <EmployeeStatus userId={userId} />}
        {activeTab === "schedule" && <CleaningScheduleBoard userId={userId} />}
        {activeTab === "employees" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: 0, color: "var(--text-dark)" }}>Employee Management</h2>
              <Link href="/admin/employees" style={{ padding: "0.625rem 1rem", background: "#16a34a", color: "#fff", borderRadius: "8px", fontSize: "0.875rem", fontWeight: "600", textDecoration: "none" }}>
                Hire & Admin Employees →
              </Link>
            </div>
            <EmployeeStatus userId={userId} />
          </div>
        )}
        {activeTab === "customers" && (
          <div>
            <CustomQuotesManagement />
            <div style={{ marginTop: "2rem" }}>
              <CustomerManagement userId={userId} />
            </div>
          </div>
        )}
        {activeTab === "commercial" && <CommercialAccounts userId={userId} />}
        {activeTab === "partners" && (
          <div>
            <AdminPartnerApplications />
            <div style={{ marginTop: "2rem" }}>
              <PartnerProgramManagement userId={userId} />
            </div>
          </div>
        )}
        {activeTab === "financials" && <FinancialAnalytics userId={userId} />}
        {activeTab === "messages" && <MessagingCenter userId={userId} />}
        {activeTab === "training" && <OwnerTrainingOverview />}
        {activeTab === "photos" && <OwnerPhotosOverview />}
        {activeTab === "settings" && <SystemControls userId={userId} />}
      </div>
    </div>
  );
}
