// components/OwnerDashboard/SystemControls.tsx
"use client";

import { useState } from "react";
import { TeamAccountManagement } from "@/components/OwnerDashboard/TeamAccountManagement";
import { SubscriptionPricingSettings } from "@/components/OwnerDashboard/SubscriptionPricingSettings";

interface SystemControlsProps {
  userId: string;
  onNavigateTab?: (tab: "live-ops" | "partners" | "employees") => void;
}

type TeamLoginPanel = "create" | "help";

export function SystemControls({ userId, onNavigateTab }: SystemControlsProps) {
  const [activeTab, setActiveTab] = useState<string>("team-logins");
  const [teamLoginPanel, setTeamLoginPanel] = useState<TeamLoginPanel>("create");

  function openTeamLogins(panel: TeamLoginPanel) {
    setTeamLoginPanel(panel);
    setActiveTab("team-logins");
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        System Controls
      </h2>

      {/* Tabs */}
      <div
        className="tab-navigation"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: "0.25rem",
        }}
      >
        {[
          { id: "team-logins", label: "Team Logins" },
          { id: "pricing", label: "Subscription Pricing" },
          { id: "partner", label: "Partner Program" },
          { id: "referral", label: "Referral Credits" },
          { id: "loyalty", label: "Loyalty Tiers" },
          { id: "business", label: "Business Info" },
          { id: "permissions", label: "Permissions" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.75rem 1rem",
              background: activeTab === tab.id ? "#111827" : "transparent",
              color: activeTab === tab.id ? "#ffffff" : "#6b7280",
              border: "none",
              borderBottom: activeTab === tab.id ? "2px solid #111827" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: activeTab === tab.id ? "600" : "400",
              fontSize: "0.875rem"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div style={{
        background: "#ffffff",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e5e7eb"
      }}>
        {activeTab === "team-logins" && <TeamAccountManagement initialPanel={teamLoginPanel} />}

        {activeTab === "pricing" && <SubscriptionPricingSettings />}

        {activeTab === "partner" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Partner Program Rules
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Configure partner revenue share percentages and program fees.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Revenue Share</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Platform: 40% | Partner: 60%
                </div>
              </div>
              <div style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Payout Schedule</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Weekly payouts on Fridays
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "referral" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Referral Credit Amount
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Set the credit amount awarded for successful referrals.
            </p>
            <div style={{
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "8px"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Current Credit Amount</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "700", color: "#16a34a" }}>
                $10 per referral
              </div>
            </div>
          </div>
        )}

        {activeTab === "loyalty" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Loyalty Tier Rules
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Configure loyalty tier requirements and benefits.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { tier: "Getting Started", requirement: "0 cleanings" },
                { tier: "Clean Freak", requirement: "1+ cleanings" },
                { tier: "Bin Boss", requirement: "5+ cleanings" },
                { tier: "Sparkle Specialist", requirement: "15+ cleanings" },
                { tier: "Sanitation Superstar", requirement: "30+ cleanings" },
                { tier: "Bin Royalty", requirement: "50+ cleanings" },
              ].map((item) => (
                <div key={item.tier} style={{
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px"
                }}>
                  <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>{item.tier}</div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    Requirement: {item.requirement}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "business" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Business Information
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Manage business details and contact information.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Business Name
                </label>
                <input
                  type="text"
                  defaultValue="Bin Blast Co."
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
                  Contact Email
                </label>
                <input
                  type="email"
                  defaultValue="binblastcompany@gmail.com"
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.75rem",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px"
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "permissions" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Access Permissions
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1.25rem" }}>
              Manage who can log in and what each role can access across the platform.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                {
                  title: "Employee & Operator Logins",
                  description: "Create accounts, recover forgotten emails, and send password reset links.",
                  actions: [
                    { label: "Create Account", onClick: () => openTeamLogins("create") },
                    { label: "Login Help", onClick: () => openTeamLogins("help") },
                  ],
                },
                {
                  title: "Operator Access",
                  description: "Operators can view and manage assigned cleaning jobs, schedules, and team messages.",
                  actions: [
                    { label: "Open Live Ops", onClick: () => onNavigateTab?.("live-ops") },
                  ],
                },
                {
                  title: "Employee Access",
                  description: "Employees can clock in, complete jobs, view training, and message the team.",
                  actions: [
                    { label: "Open Employees", onClick: () => onNavigateTab?.("employees") },
                  ],
                },
                {
                  title: "Partner Access",
                  description: "Partners can view their customers, earnings, and manage their team portal.",
                  actions: [
                    { label: "Manage Partners", onClick: () => onNavigateTab?.("partners") },
                  ],
                },
              ].map((section) => (
                <div
                  key={section.title}
                  style={{
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: "0.5rem", color: "#111827" }}>
                    {section.title}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.875rem" }}>
                    {section.description}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {section.actions.map((action) => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={action.onClick}
                        style={{
                          padding: "0.5rem 0.875rem",
                          border: "1px solid #d1d5db",
                          borderRadius: "8px",
                          background: "#ffffff",
                          color: "#111827",
                          fontSize: "0.8125rem",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
