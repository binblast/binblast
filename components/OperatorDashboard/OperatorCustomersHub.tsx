"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomQuotesManagement } from "@/components/AdminDashboard/CustomQuotesManagement";
import { parseCleaningDate } from "@/lib/cleaning-schedule";
import {
  CustomerSubTab,
  OPERATOR_PLAN_NAMES,
  OperatorCleaningRecord,
  OperatorCustomerRecord,
  filterResidentialCustomers,
  getCustomerDisplayName,
  getCustomerStatus,
  getNextCleaningForCustomer,
  isActiveCustomer,
  isInactiveCustomer,
  isPausedCustomer,
} from "@/lib/operator-customers";

interface QuoteSummary {
  total: number;
  pending: number;
  commercialLeads: number;
}

interface OperatorCustomersHubProps {
  directCustomers: OperatorCustomerRecord[];
  commercialCustomers: OperatorCustomerRecord[];
  cleanings: OperatorCleaningRecord[];
  loading?: boolean;
  subTab: CustomerSubTab;
  onSubTabChange: (tab: CustomerSubTab) => void;
}

const inputStyle: React.CSSProperties = {
  padding: "0.625rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  background: "#ffffff",
};

export function OperatorCustomersHub({
  directCustomers,
  commercialCustomers,
  cleanings,
  loading = false,
  subTab,
  onSubTabChange,
}: OperatorCustomersHubProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [quoteSummary, setQuoteSummary] = useState<QuoteSummary>({
    total: 0,
    pending: 0,
    commercialLeads: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function loadQuoteSummary() {
      try {
        const response = await fetch("/api/quotes/list?status=all", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        const quotes = Array.isArray(data.quotes) ? data.quotes : [];
        if (!mounted) return;

        setQuoteSummary({
          total: quotes.filter((quote: { status?: string }) => quote.status !== "converted").length,
          pending: quotes.filter((quote: { status?: string }) =>
            ["pending", "pending_review"].includes(quote.status || "")
          ).length,
          commercialLeads: quotes.filter(
            (quote: { propertyType?: string; status?: string }) =>
              quote.propertyType === "commercial" && quote.status !== "converted"
          ).length,
        });
      } catch {
        // Stats are helpful but non-blocking.
      }
    }

    loadQuoteSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const residentialStats = useMemo(
    () => ({
      active: directCustomers.filter(isActiveCustomer).length,
      paused: directCustomers.filter(isPausedCustomer).length,
      inactive: directCustomers.filter(isInactiveCustomer).length,
    }),
    [directCustomers]
  );

  const commercialStats = useMemo(
    () => ({
      active: commercialCustomers.filter(isActiveCustomer).length,
      total: commercialCustomers.length,
    }),
    [commercialCustomers]
  );

  const filteredResidential = useMemo(
    () =>
      filterResidentialCustomers(directCustomers, cleanings, {
        search: searchQuery,
        plan: planFilter || undefined,
        status: statusFilter || undefined,
      }),
    [directCustomers, cleanings, searchQuery, planFilter, statusFilter]
  );

  const tabs: Array<{ id: CustomerSubTab; label: string; count: number }> = [
    { id: "quotes", label: "Quote Leads", count: quoteSummary.total },
    { id: "residential", label: "Residential", count: directCustomers.length },
    { id: "commercial", label: "Commercial", count: commercialCustomers.length },
  ];

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading customers...
      </div>
    );
  }

  return (
    <div data-operator-tour="customers-hub">
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
          Customers
        </h2>
        <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0.35rem 0 0" }}>
          Manage quote leads, residential accounts, and commercial B2B customers.
        </p>
      </div>

      <StatsBar
        residentialStats={residentialStats}
        commercialStats={commercialStats}
        quoteSummary={quoteSummary}
      />

      <div
        data-operator-tour="customers-tabs"
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSubTabChange(tab.id)}
            style={{
              padding: "0.55rem 0.9rem",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: subTab === tab.id ? "#111827" : "#ffffff",
              color: subTab === tab.id ? "#ffffff" : "#374151",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {subTab === "quotes" && <CustomQuotesManagement embedded />}

      {subTab === "residential" && (
        <ResidentialPanel
          customers={filteredResidential}
          totalCount={directCustomers.length}
          searchQuery={searchQuery}
          planFilter={planFilter}
          statusFilter={statusFilter}
          onSearchChange={setSearchQuery}
          onPlanFilterChange={setPlanFilter}
          onStatusFilterChange={setStatusFilter}
          cleanings={cleanings}
        />
      )}

      {subTab === "commercial" && (
        <CommercialPanel
          accounts={commercialCustomers}
          cleanings={cleanings}
          commercialLeadCount={quoteSummary.commercialLeads}
          onViewQuoteLeads={() => onSubTabChange("quotes")}
        />
      )}
    </div>
  );
}

function StatsBar({
  residentialStats,
  commercialStats,
  quoteSummary,
}: {
  residentialStats: { active: number; paused: number; inactive: number };
  commercialStats: { active: number; total: number };
  quoteSummary: QuoteSummary;
}) {
  const items = [
    { label: "Active Residential", value: residentialStats.active, color: "#16a34a" },
    { label: "Paused", value: residentialStats.paused, color: "#d97706" },
    { label: "Quote Leads", value: quoteSummary.total, color: "#2563eb" },
    { label: "Commercial Accounts", value: commercialStats.total, color: "#7c3aed" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.875rem 1rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function ResidentialPanel({
  customers,
  totalCount,
  searchQuery,
  planFilter,
  statusFilter,
  onSearchChange,
  onPlanFilterChange,
  onStatusFilterChange,
  cleanings,
}: {
  customers: OperatorCustomerRecord[];
  totalCount: number;
  searchQuery: string;
  planFilter: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onPlanFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  cleanings: OperatorCleaningRecord[];
}) {
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="search"
          placeholder="Search customers..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={inputStyle}
        />
        <select value={planFilter} onChange={(e) => onPlanFilterChange(e.target.value)} style={inputStyle}>
          <option value="">All Plans</option>
          {Object.entries(OPERATOR_PLAN_NAMES)
            .filter(([id]) => id !== "commercial")
            .map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          style={inputStyle}
        >
          <option value="active">Active Only</option>
          <option value="">All Statuses</option>
          <option value="paused">Paused</option>
          <option value="canceled">Canceled</option>
        </select>
      </div>

      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
        Showing {customers.length} of {totalCount} residential customers
        {statusFilter === "active" ? " (active only)" : ""}
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {customers.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            No residential customers match your current filters.
          </div>
        ) : (
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Customer", "Address", "Plan", "Status", "Next Cleaning"].map((label) => (
                    <th
                      key={label}
                      style={{
                        padding: "0.875rem 1rem",
                        textAlign: "left",
                        fontSize: "0.8125rem",
                        fontWeight: "700",
                        color: "#374151",
                      }}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const nextCleaning = getNextCleaningForCustomer(customer, cleanings);
                  const status = getCustomerStatus(customer);

                  return (
                    <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <div style={{ fontWeight: "600", color: "#111827" }}>
                          {getCustomerDisplayName(customer)}
                        </div>
                        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>{customer.email}</div>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                        {customer.addressLine1
                          ? `${customer.addressLine1}, ${customer.city || ""}`
                          : customer.city || "N/A"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.875rem" }}>
                        {OPERATOR_PLAN_NAMES[customer.selectedPlan || ""] ||
                          customer.selectedPlan ||
                          "N/A"}
                      </td>
                      <td style={{ padding: "0.875rem 1rem" }}>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "999px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: status.background,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td style={{ padding: "0.875rem 1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                        {nextCleaning ? (
                          <>
                            {parseCleaningDate(nextCleaning.scheduledDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            <div style={{ fontSize: "0.75rem", marginTop: "0.15rem" }}>
                              {nextCleaning.scheduledTime || "TBD"}
                            </div>
                          </>
                        ) : (
                          "None scheduled"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CommercialPanel({
  accounts,
  cleanings,
  commercialLeadCount,
  onViewQuoteLeads,
}: {
  accounts: OperatorCustomerRecord[];
  cleanings: OperatorCleaningRecord[];
  commercialLeadCount: number;
  onViewQuoteLeads: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          textAlign: "center",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: "1rem", fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>
          No active commercial accounts yet
        </div>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0 0 1rem" }}>
          Paying B2B accounts appear here after a quote is converted to a customer.
        </p>
        {commercialLeadCount > 0 && (
          <button
            type="button"
            onClick={onViewQuoteLeads}
            style={{
              padding: "0.55rem 0.9rem",
              background: "#eff6ff",
              color: "#1d4ed8",
              border: "1px solid #bfdbfe",
              borderRadius: "8px",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            View {commercialLeadCount} commercial quote lead
            {commercialLeadCount === 1 ? "" : "s"} →
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: "1rem",
      }}
    >
      {accounts.map((account) => {
        const nextService = getNextCleaningForCustomer(account, cleanings);
        const status = getCustomerStatus(account);

        return (
          <div
            key={account.id}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.25rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#111827", margin: 0 }}>
                {account.businessName || getCustomerDisplayName(account)}
              </h3>
              <span
                style={{
                  padding: "0.2rem 0.6rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: "700",
                  background: status.background,
                  color: status.color,
                  whiteSpace: "nowrap",
                }}
              >
                {status.label}
              </span>
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.75rem" }}>
              <div>{account.contactPerson || getCustomerDisplayName(account)}</div>
              <div>{account.email}</div>
              {account.phone && <div>{account.phone}</div>}
            </div>
            <div style={{ fontSize: "0.875rem", color: "#374151", display: "grid", gap: "0.35rem" }}>
              <div>
                <strong>Bins:</strong> {account.binsCount || 1}
              </div>
              <div>
                <strong>Frequency:</strong> {account.frequency || account.selectedPlan || "N/A"}
              </div>
              <div>
                <strong>Next Service:</strong>{" "}
                {nextService
                  ? parseCleaningDate(nextService.scheduledDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not scheduled"}
              </div>
            </div>
            {account.specialInstructions && (
              <div
                style={{
                  fontSize: "0.8125rem",
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "#f9fafb",
                  borderRadius: "8px",
                  color: "#4b5563",
                }}
              >
                <strong>Notes:</strong> {account.specialInstructions}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
