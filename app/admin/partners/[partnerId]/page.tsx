// app/admin/partners/[partnerId]/page.tsx
// Partner Detail Page with Tabs

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { georgiaCounties } from "@/data/gaCounties";
import { metroAtlZones } from "@/data/metroAtlZones";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface Partner {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceAreas: string[];
  status: "active" | "paused" | "removed";
  revenueSharePartner: number;
  revenueSharePlatform: number;
  partnerCode: string;
  createdAt: any;
  removedAt?: any;
  removalReason?: string;
}

type Tab = "overview" | "jobs" | "customers" | "financials" | "service-areas" | "settings";

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params.partnerId as string;
  
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [jobs, setJobs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [financials, setFinancials] = useState<any>(null);

  useEffect(() => {
    if (partnerId) {
      loadPartnerData();
    }
  }, [partnerId, activeTab]);

  async function loadPartnerData() {
    try {
      setLoading(true);
      
      // Load partner details
      const partnerResponse = await fetch(`/api/admin/partners/${partnerId}`);
      const partnerData = await partnerResponse.json();
      if (partnerData.success) {
        setPartner(partnerData.partner);
      }

      // Load tab-specific data
      if (activeTab === "jobs") {
        const jobsResponse = await fetch(`/api/admin/partners/${partnerId}/jobs`);
        const jobsData = await jobsResponse.json();
        if (jobsData.success) {
          setJobs(jobsData.jobs || []);
        }
      } else if (activeTab === "customers") {
        const customersResponse = await fetch(`/api/admin/partners/${partnerId}/customers`);
        const customersData = await customersResponse.json();
        if (customersData.success) {
          setCustomers(customersData.customers || []);
        }
      } else if (activeTab === "financials") {
        const financialsResponse = await fetch(`/api/admin/partners/${partnerId}/financials`);
        const financialsData = await financialsResponse.json();
        if (financialsData.success) {
          setFinancials(financialsData);
        }
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading partner data:", err);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center" }}>Loading...</div>
          </div>
        </main>
      </>
    );
  }

  if (!partner) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center" }}>Partner not found</div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={() => router.push("/admin/partners")}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#e5e7eb",
                  color: "#111827",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  marginBottom: "1rem"
                }}
              >
                ← Back to Partners
              </button>
              <h1 className="section-title" style={{ marginBottom: "0.5rem" }}>
                {partner.businessName}
              </h1>
              <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                Owner: {partner.ownerName} • {partner.email}
              </p>
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex",
              gap: "0.5rem",
              borderBottom: "2px solid #e5e7eb",
              marginBottom: "2rem"
            }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "jobs", label: "Jobs" },
                { id: "customers", label: "Customers" },
                { id: "financials", label: "Financials" },
                { id: "service-areas", label: "Service Areas" },
                { id: "settings", label: "Settings" },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "none",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid #0369a1" : "2px solid transparent",
                    color: activeTab === tab.id ? "#0369a1" : "#6b7280",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === tab.id ? "600" : "400",
                    cursor: "pointer",
                    marginBottom: "-2px"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "2rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              border: "1px solid #e5e7eb"
            }}>
              {activeTab === "overview" && <OverviewTab partner={partner} />}
              {activeTab === "jobs" && <JobsTab partnerId={partnerId} jobs={jobs} />}
              {activeTab === "customers" && <CustomersTab partnerId={partnerId} customers={customers} />}
              {activeTab === "financials" && <FinancialsTab partnerId={partnerId} financials={financials} />}
              {activeTab === "service-areas" && <ServiceAreasTab partner={partner} onUpdate={loadPartnerData} />}
              {activeTab === "settings" && <SettingsTab partner={partner} onUpdate={loadPartnerData} />}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

// Tab Components
function OverviewTab({ partner }: { partner: Partner }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Overview</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Status</div>
          <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>
            <span style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "12px",
              fontSize: "0.875rem",
              fontWeight: "600",
              background: partner.status === "active" ? "#dcfce7" : 
                         partner.status === "paused" ? "#fef3c7" : "#fee2e2",
              color: partner.status === "active" ? "#16a34a" : 
                    partner.status === "paused" ? "#d97706" : "#dc2626"
            }}>
              {partner.status}
            </span>
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Partner Code</div>
          <div style={{ fontSize: "1.25rem", fontWeight: "600", fontFamily: "monospace" }}>{partner.partnerCode}</div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Revenue Split</div>
          <div style={{ fontSize: "1.25rem", fontWeight: "600" }}>
            {((partner.revenueSharePartner || 0) * 100).toFixed(0)}% / {((partner.revenueSharePlatform || 0) * 100).toFixed(0)}%
          </div>
        </div>
      </div>
      {partner.removedAt && (
        <div style={{ padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
          <div style={{ fontSize: "0.875rem", color: "#dc2626", fontWeight: "600", marginBottom: "0.25rem" }}>Removed</div>
          <div style={{ fontSize: "0.875rem", color: "#991b1b" }}>
            Reason: {partner.removalReason || "No reason provided"}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#991b1b", marginTop: "0.25rem" }}>
            Date: {partner.removedAt?.toDate?.()?.toLocaleDateString() || "N/A"}
          </div>
        </div>
      )}
    </div>
  );
}

function JobsTab({ partnerId, jobs }: { partnerId: string; jobs: any[] }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Jobs</h2>
      {jobs.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No jobs found</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Date</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Customer</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Location</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job: any) => (
                <tr key={job.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {job.scheduledDate?.toDate?.()?.toLocaleDateString() || "N/A"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{job.customerName || job.customerEmail || "N/A"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {job.county || "N/A"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      background: job.status === "completed" ? "#dcfce7" : "#fef3c7",
                      color: job.status === "completed" ? "#16a34a" : "#d97706"
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                    ${job.amount?.toFixed(2) || "0.00"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CustomersTab({ partnerId, customers }: { partnerId: string; customers: any[] }) {
  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Customers</h2>
      {customers.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No customers found</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Name</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Email</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Location</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Plan</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer: any) => (
                <tr key={customer.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{customer.name || "N/A"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{customer.email}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {customer.city}, {customer.county}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{customer.planName || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FinancialsTab({ partnerId, financials }: { partnerId: string; financials: any }) {
  if (!financials) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading financials...</div>;
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Financials</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Gross Revenue (MTD)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            ${(financials.grossRevenueMTD || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Gross Revenue (Lifetime)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            ${(financials.grossRevenueLifetime || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Unpaid Balance</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#dc2626" }}>
            ${(financials.unpaidBalance || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Total Paid</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0369a1" }}>
            ${(financials.totalPaid || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Payout History</h3>
      {financials.payouts && financials.payouts.length > 0 ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Period</th>
                <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Amount</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Paid Date</th>
              </tr>
            </thead>
            <tbody>
              {financials.payouts.map((payout: any) => (
                <tr key={payout.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{payout.period || "N/A"}</td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                    ${payout.amount?.toFixed(2) || "0.00"}
                  </td>
                  <td style={{ padding: "0.75rem" }}>
                    <span style={{
                      padding: "0.25rem 0.5rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      background: payout.status === "paid" ? "#dcfce7" : "#fef3c7",
                      color: payout.status === "paid" ? "#16a34a" : "#d97706"
                    }}>
                      {payout.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                    {payout.paidAt?.toDate?.()?.toLocaleDateString() || "Pending"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No payout history</div>
      )}
    </div>
  );
}

function ServiceAreasTab({ partner, onUpdate }: { partner: Partner; onUpdate: () => void }) {
  const [serviceAreas, setServiceAreas] = useState<string[]>(partner.serviceAreas || []);
  const [saving, setSaving] = useState(false);
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    // Initialize selections from current service areas
    const zones = serviceAreas.filter(area => metroAtlZones.includes(area));
    const counties = serviceAreas.filter(area => !metroAtlZones.includes(area));
    setSelectedZones(zones);
    setSelectedCounties(counties);
  }, [serviceAreas]);

  async function handleSave() {
    const allAreas = [...selectedZones, ...selectedCounties];
    if (allAreas.length === 0) {
      alert("Please select at least one service area");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}/service-areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAreas: allAreas }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Service areas updated successfully");
        setServiceAreas(allAreas);
        setEditing(false);
        onUpdate();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Service Areas</h2>
      
      {!editing ? (
        <div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
            Current Service Areas: {serviceAreas.length > 0 ? serviceAreas.join(", ") : "None"}
          </div>
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: "0.5rem 1rem",
              background: "#0369a1",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer"
            }}
          >
            Edit Service Areas
          </button>
        </div>
      ) : (
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Zones:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
              {metroAtlZones.map(zone => (
                <label key={zone} style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedZones.includes(zone)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedZones([...selectedZones, zone]);
                      } else {
                        setSelectedZones(selectedZones.filter(z => z !== zone));
                      }
                    }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{zone}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <div style={{ marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Counties:</div>
            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem" }}>
              {georgiaCounties.map(county => (
                <label key={county.name} style={{ display: "flex", alignItems: "center", gap: "0.25rem", marginBottom: "0.25rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedCounties.includes(county.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCounties([...selectedCounties, county.name]);
                      } else {
                        setSelectedCounties(selectedCounties.filter(c => c !== county.name));
                      }
                    }}
                  />
                  <span style={{ fontSize: "0.875rem" }}>{county.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
            Selected: {[...selectedZones, ...selectedCounties].join(", ") || "None"}
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              onClick={handleSave}
              disabled={saving || selectedZones.length + selectedCounties.length === 0}
              style={{
                padding: "0.75rem 1.5rem",
                background: saving || selectedZones.length + selectedCounties.length === 0 ? "#9ca3af" : "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: saving || selectedZones.length + selectedCounties.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                // Reset to original
                const zones = serviceAreas.filter(area => metroAtlZones.includes(area));
                const counties = serviceAreas.filter(area => !metroAtlZones.includes(area));
                setSelectedZones(zones);
                setSelectedCounties(counties);
              }}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#e5e7eb",
                color: "#111827",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ partner, onUpdate }: { partner: Partner; onUpdate: () => void }) {
  const router = useRouter();
  const [partnerShare, setPartnerShare] = useState((partner.revenueSharePartner || 0) * 100);
  const [platformShare, setPlatformShare] = useState((partner.revenueSharePlatform || 0) * 100);
  const [adjustingSplit, setAdjustingSplit] = useState(false);

  async function handlePause() {
    if (!confirm("Pause this partner? They will not receive new job assignments.")) return;
    
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}/pause`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        alert("Partner paused");
        onUpdate();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleResume() {
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}/resume`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        alert("Partner resumed");
        onUpdate();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleRemove() {
    const reason = prompt("Enter removal reason:");
    if (!reason) return;
    
    try {
      const response = await fetch(`/api/admin/partners/${partner.id}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Partner removed");
        router.push("/admin/partners");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleAdjustRevenueSplit() {
    if (partnerShare + platformShare !== 100) {
      alert("Revenue shares must total 100%");
      return;
    }

    if (!confirm(`Change revenue split to ${partnerShare}% / ${platformShare}%? This will be logged.`)) {
      return;
    }

    setAdjustingSplit(true);
    try {
      const reason = prompt("Enter reason for revenue split change (optional):") || "No reason provided";
      const response = await fetch(`/api/admin/partners/${partner.id}/revenue-split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenueSharePartner: partnerShare / 100,
          revenueSharePlatform: platformShare / 100,
          reason,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Revenue split updated successfully");
        onUpdate();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setAdjustingSplit(false);
    }
  }

  return (
    <div>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>Settings</h2>
      
      <div style={{ marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Revenue Split</h3>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: "1rem" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem", display: "block" }}>Partner Share</label>
            <input
              type="number"
              min="0"
              max="100"
              value={partnerShare}
              onChange={(e) => {
                const share = parseInt(e.target.value) || 0;
                setPartnerShare(share);
                setPlatformShare(100 - share);
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem", display: "block" }}>Company Share</label>
            <input
              type="number"
              min="0"
              max="100"
              value={platformShare}
              onChange={(e) => {
                const share = parseInt(e.target.value) || 0;
                setPlatformShare(share);
                setPartnerShare(100 - share);
              }}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px"
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: "1rem", fontSize: "0.875rem", color: partnerShare + platformShare === 100 ? "#16a34a" : "#dc2626" }}>
          Total: {partnerShare + platformShare}%
        </div>
        <button
          onClick={handleAdjustRevenueSplit}
          disabled={adjustingSplit || partnerShare + platformShare !== 100}
          style={{
            padding: "0.75rem 1.5rem",
            background: adjustingSplit || partnerShare + platformShare !== 100 ? "#9ca3af" : "#0369a1",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: adjustingSplit || partnerShare + platformShare !== 100 ? "not-allowed" : "pointer",
            maxWidth: "200px"
          }}
        >
          {adjustingSplit ? "Updating..." : "Update Revenue Split"}
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>Partner Status</h3>
        {partner.status === "active" && (
          <button
            onClick={handlePause}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              maxWidth: "200px"
            }}
          >
            Pause Partner
          </button>
        )}
        {partner.status === "paused" && (
          <button
            onClick={handleResume}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              maxWidth: "200px"
            }}
          >
            Resume Partner
          </button>
        )}
        {partner.status !== "removed" && (
          <button
            onClick={handleRemove}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
              maxWidth: "200px"
            }}
          >
            Remove Partner
          </button>
        )}
      </div>
    </div>
  );
}
