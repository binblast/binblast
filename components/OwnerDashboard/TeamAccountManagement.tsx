"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


import { useEffect, useMemo, useState } from "react";

type StaffRole = "employee" | "operator";
type Panel = "create" | "help";

interface TeamAccount {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  role: StaffRole;
  hiringStatus: string;
  hasChangedPassword: boolean;
}

interface CreateAccountResult {
  account: {
    email: string;
    role: StaffRole;
    tempPassword: string;
    firstName: string;
    lastName: string;
  };
}

interface TeamAccountManagementProps {
  initialPanel?: Panel;
}

export function TeamAccountManagement({ initialPanel = "create" }: TeamAccountManagementProps) {
  const [panel, setPanel] = useState<Panel>(initialPanel);
  const [accounts, setAccounts] = useState<TeamAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createResult, setCreateResult] = useState<CreateAccountResult["account"] | null>(null);
  const [resettingEmail, setResettingEmail] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    role: "employee" as StaffRole,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceArea: "",
    payRatePerJob: "10",
    password: "",
  });

  useEffect(() => {
    setPanel(initialPanel);
  }, [initialPanel]);

  useEffect(() => {
    if (panel === "help") {
      loadAccounts(searchQuery);
    }
  }, [panel]);

  async function loadAccounts(query = "") {
    try {
      setLoadingAccounts(true);
      const params = new URLSearchParams();
      if (query.trim()) params.set("query", query.trim());
      const response = await fetchWithAuth(`/api/admin/team-accounts?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load accounts");
      }
      setAccounts(data.accounts || []);
    } catch (error: unknown) {
      console.error("Error loading team accounts:", error);
      setActionMessage(error instanceof Error ? error.message : "Failed to load accounts");
    } finally {
      setLoadingAccounts(false);
    }
  }

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();
    setCreateError(null);
    setCreateResult(null);
    setCreating(true);

    try {
      const serviceAreas = formData.serviceArea
        ? formData.serviceArea.split(",").map((area) => area.trim()).filter(Boolean)
        : [];

      const response = await fetchWithAuth("/api/admin/team-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: formData.role,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          serviceArea: serviceAreas,
          payRatePerJob: formData.role === "employee" ? parseFloat(formData.payRatePerJob) : undefined,
          password: formData.password || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      setCreateResult(data.account);
      if (data.message) {
        setActionMessage(data.message);
      }
      setFormData({
        role: formData.role,
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        serviceArea: "",
        payRatePerJob: "10",
        password: "",
      });
    } catch (error: unknown) {
      setCreateError(error instanceof Error ? error.message : "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

  async function handleSendPasswordReset(email: string) {
    try {
      setResettingEmail(email);
      setActionMessage(null);
      const response = await fetchWithAuth("/api/admin/team-accounts/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send password reset");
      }
      setActionMessage(data.message || `Password reset sent to ${email}`);
    } catch (error: unknown) {
      setActionMessage(error instanceof Error ? error.message : "Failed to send password reset");
    } finally {
      setResettingEmail(null);
    }
  }

  const filteredAccounts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return accounts;
    return accounts.filter(
      (account) =>
        account.fullName.toLowerCase().includes(query) ||
        account.email.toLowerCase().includes(query) ||
        account.phone.includes(query)
    );
  }, [accounts, searchQuery]);

  return (
    <div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        Team Login Management
      </h3>
      <p style={{ color: "#6b7280", marginBottom: "1.25rem", lineHeight: 1.5 }}>
        Create operator and employee logins, look up forgotten emails, and send password reset links when someone is locked out.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        {[
          { id: "create" as Panel, label: "Create Account" },
          { id: "help" as Panel, label: "Login Help" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPanel(tab.id)}
            style={{
              padding: "0.625rem 0.875rem",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: panel === tab.id ? "#16a34a" : "#ffffff",
              color: panel === tab.id ? "#ffffff" : "#374151",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {panel === "create" && (
        <form onSubmit={handleCreateAccount} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Account Type *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
              style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            >
              <option value="employee">Employee</option>
              <option value="operator">Operator</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>First Name *</label>
              <input
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Last Name *</label>
              <input
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
              />
            </div>
          </div>

          {formData.role === "employee" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Service Areas
                </label>
                <input
                  value={formData.serviceArea}
                  onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                  placeholder="City, ZIP, County"
                  style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Pay Rate Per Job ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.payRatePerJob}
                  onChange={(e) => setFormData({ ...formData, payRatePerJob: e.target.value })}
                  style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Initial Password (optional)
            </label>
            <input
              type="text"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Leave blank to auto-generate"
              style={{ width: "100%", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
          </div>

          {createError && (
            <div style={{ padding: "0.875rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626" }}>
              {createError}
            </div>
          )}

          {createResult && (
            <div style={{ padding: "1rem", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534" }}>
              <div style={{ fontWeight: "700", marginBottom: "0.5rem" }}>Account ready</div>
              {actionMessage && (
                <div style={{ marginBottom: "0.5rem", fontSize: "0.875rem" }}>{actionMessage}</div>
              )}
              <div><strong>Name:</strong> {createResult.firstName} {createResult.lastName}</div>
              <div><strong>Role:</strong> {createResult.role}</div>
              <div><strong>Login email:</strong> {createResult.email}</div>
              <div><strong>Temporary password:</strong> {createResult.tempPassword}</div>
              <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
                Share these credentials with the team member. They can change their password after logging in or via a reset email.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{
              alignSelf: "flex-start",
              padding: "0.75rem 1.25rem",
              background: creating ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "600",
              cursor: creating ? "not-allowed" : "pointer",
            }}
          >
            {creating ? "Creating..." : `Create ${formData.role === "operator" ? "Operator" : "Employee"} Login`}
          </button>
        </form>
      )}

      {panel === "help" && (
        <div>
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  loadAccounts(searchQuery);
                }
              }}
              placeholder="Search by name, email, or phone..."
              style={{ flex: 1, minWidth: "240px", padding: "0.75rem 1rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
            />
            <button
              type="button"
              onClick={() => loadAccounts(searchQuery)}
              style={{ padding: "0.75rem 1rem", background: "#111827", color: "#ffffff", border: "none", borderRadius: "8px", fontWeight: "600", cursor: "pointer" }}
            >
              Search
            </button>
          </div>

          {actionMessage && (
            <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", color: "#1d4ed8" }}>
              {actionMessage}
            </div>
          )}

          {loadingAccounts ? (
            <div style={{ color: "#6b7280" }}>Loading team accounts...</div>
          ) : filteredAccounts.length === 0 ? (
            <div style={{ color: "#6b7280" }}>No matching employee or operator accounts found.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {filteredAccounts.map((account) => (
                <div
                  key={account.id}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    background: "#f9fafb",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "1rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", color: "#111827" }}>
                      {account.fullName || "Unnamed User"}
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: account.role === "operator" ? "#5b21b6" : "#1e40af" }}>
                        {account.role}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#374151", marginTop: "0.25rem" }}>
                      <strong>Email:</strong> {account.email || "No email on file"}
                    </div>
                    {account.phone && (
                      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.15rem" }}>
                        <strong>Phone:</strong> {account.phone}
                      </div>
                    )}
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.35rem" }}>
                      Status: {account.hiringStatus || "active"}
                      {!account.hasChangedPassword ? " • still using initial password" : " • password updated"}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (account.email) navigator.clipboard.writeText(account.email);
                        setActionMessage(`Copied login email for ${account.fullName}`);
                      }}
                      style={{ padding: "0.5rem 0.875rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "#ffffff", cursor: "pointer" }}
                    >
                      Copy Email
                    </button>
                    <button
                      type="button"
                      disabled={!account.email || resettingEmail === account.email}
                      onClick={() => account.email && handleSendPasswordReset(account.email)}
                      style={{
                        padding: "0.5rem 0.875rem",
                        border: "none",
                        borderRadius: "8px",
                        background: !account.email || resettingEmail === account.email ? "#9ca3af" : "#0369a1",
                        color: "#ffffff",
                        cursor: !account.email || resettingEmail === account.email ? "not-allowed" : "pointer",
                        fontWeight: "600",
                      }}
                    >
                      {resettingEmail === account.email ? "Sending..." : "Send Password Reset"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
