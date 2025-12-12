// components/OwnerDashboard/SystemControls.tsx
"use client";

import { useState } from "react";

interface SystemControlsProps {
  userId: string;
}

export function SystemControls({ userId }: SystemControlsProps) {
  const [activeTab, setActiveTab] = useState<string>("pricing");

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        System Controls
      </h2>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1.5rem",
        borderBottom: "1px solid #e5e7eb"
      }}>
        {[
          { id: "pricing", label: "Subscription Pricing" },
          { id: "partner", label: "Partner Program" },
          { id: "referral", label: "Referral Credits" },
          { id: "loyalty", label: "Loyalty Tiers" },
          { id: "business", label: "Business Info" },
          { id: "permissions", label: "Permissions" },
        ].map((tab) => (
          <button
            key={tab.id}
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
        {activeTab === "pricing" && (
          <div>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Subscription Pricing
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Manage subscription plan pricing. Changes will apply to new subscriptions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { plan: "Monthly Clean", price: 25 },
                { plan: "Twice Monthly", price: 45 },
                { plan: "Bi-Monthly", price: 20 },
                { plan: "Quarterly", price: 15 },
                { plan: "Commercial", price: 100 },
              ].map((item) => (
                <div key={item.plan} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "1rem",
                  background: "#f9fafb",
                  borderRadius: "8px"
                }}>
                  <div style={{ fontWeight: "600" }}>{item.plan}</div>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ color: "#6b7280" }}>{"$" + item.price}</span>
                    <button style={{
                      padding: "0.25rem 0.75rem",
                      background: "#f3f4f6",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      cursor: "pointer"
                    }}>
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
            <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
              Manage operator and partner access permissions.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Operator Access</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Operators can view and manage assigned cleaning jobs
                </div>
              </div>
              <div style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px"
              }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Partner Access</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Partners can view their customers and earnings
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
