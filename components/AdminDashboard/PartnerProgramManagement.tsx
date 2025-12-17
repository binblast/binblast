// components/AdminDashboard/PartnerProgramManagement.tsx
// Full-featured Partner Program Management Control Center
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { georgiaCounties } from "@/data/gaCounties";
import { metroAtlZones } from "@/data/metroAtlZones";

interface PartnerApplication {
  id: string;
  userId?: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  websiteOrInstagram?: string;
  serviceType: string;
  serviceArea: string;
  hasInsurance: boolean;
  promotionMethod: string;
  heardAboutUs?: string;
  status: "pending" | "approved" | "rejected" | "hold";
  linkedPartnerId?: string;
  createdAt: any;
  updatedAt: any;
  rejectionReason?: string;
}

interface Partner {
  id: string;
  userId?: string | null;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  serviceAreas: string[];
  serviceType: string;
  status: "active" | "paused" | "removed";
  revenueSharePartner: number;
  revenueSharePlatform: number;
  partnerCode: string;
  partnerSlug: string;
  createdAt: any;
  updatedAt: any;
  removedAt?: any;
  removedBy?: string;
  removalReason?: string;
  // Computed fields
  customersAssigned?: number;
  jobsTotal?: number;
  jobsThisWeek?: number;
  grossRevenueMTD?: number;
  grossRevenueLifetime?: number;
  unpaidBalance?: number;
  lastPayoutDate?: any;
}

interface PartnerProgramManagementProps {
  userId: string;
}

export function PartnerProgramManagement({ userId }: PartnerProgramManagementProps) {
  const router = useRouter();
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters and search
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all");
  
  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  
  // Approve modal state
  const [approveServiceAreas, setApproveServiceAreas] = useState<string[]>([]);
  const [approvePartnerShare, setApprovePartnerShare] = useState(60);
  const [approvePlatformShare, setApprovePlatformShare] = useState(40);
  
  // Bulk actions
  const [selectedApplicationIds, setSelectedApplicationIds] = useState<Set<string>>(new Set());
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load applications
      const appsResponse = await fetch("/api/admin/partners/applications");
      const appsData = await appsResponse.json();
      if (appsData.success) {
        setApplications(appsData.applications || []);
      }
      
      // Load partners with stats
      const partnersResponse = await fetch("/api/admin/partners/list");
      const partnersData = await partnersResponse.json();
      if (partnersData.success) {
        setPartners(partnersData.partners || []);
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Error loading partner data:", err);
      setLoading(false);
    }
  }

  async function handleApprove(applicationId: string) {
    if (!selectedApplication) return;
    
    if (approveServiceAreas.length === 0) {
      alert("Please select at least one service area");
      return;
    }
    
    if (approvePartnerShare + approvePlatformShare !== 100) {
      alert("Revenue shares must total 100%");
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/partners/applications/${applicationId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceAreas: approveServiceAreas,
          revenueSharePartner: approvePartnerShare / 100,
          revenueSharePlatform: approvePlatformShare / 100,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Partner approved successfully!");
        setShowApproveModal(false);
        setSelectedApplication(null);
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleReject(applicationId: string, reason: string) {
    try {
      const response = await fetch(`/api/admin/partners/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Application rejected");
        setShowRejectModal(false);
        setSelectedApplication(null);
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleHold(applicationId: string, notes: string) {
    try {
      const response = await fetch(`/api/admin/partners/applications/${applicationId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Application marked as 'Hold/Needs Review'");
        setShowHoldModal(false);
        setSelectedApplication(null);
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handlePausePartner(partnerId: string) {
    if (!confirm("Pause this partner? They will not receive new job assignments.")) return;
    
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/pause`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Partner paused");
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleResumePartner(partnerId: string) {
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/resume`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Partner resumed");
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  async function handleRemovePartner(partnerId: string, reason: string) {
    const partner = partners.find(p => p.id === partnerId);
    if (partner && (partner.unpaidBalance || 0) > 0) {
      if (!confirm(`WARNING: Partner has unpaid balance of $${partner.unpaidBalance?.toFixed(2)}. Remove anyway?`)) {
        return;
      }
    }
    
    if (!confirm(`Remove partner "${partner?.businessName}"? This will block future jobs and portal access.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/partners/${partnerId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      if (data.success) {
        alert("Partner removed");
        loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  // Filter applications
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !applicationSearch || 
      app.businessName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
      app.ownerName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
      app.email.toLowerCase().includes(applicationSearch.toLowerCase());
    
    const matchesStatus = applicationStatusFilter === "all" || app.status === applicationStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Filter partners
  const filteredPartners = partners.filter(partner => {
    const matchesSearch = !partnerSearch ||
      partner.businessName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      partner.ownerName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      partner.email.toLowerCase().includes(partnerSearch.toLowerCase());
    
    const matchesStatus = partnerStatusFilter === "all" || partner.status === partnerStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading partner program data...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
        Partner Program Management
      </h2>

      {/* Partner Applications Section */}
      <div style={{ marginBottom: "3rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>
            Partner Applications ({filteredApplications.length})
          </h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Search applications..."
              value={applicationSearch}
              onChange={(e) => setApplicationSearch(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                minWidth: "200px",
              }}
            />
            <select
              value={applicationStatusFilter}
              onChange={(e) => setApplicationStatusFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hold">Hold/Needs Review</option>
            </select>
            {selectedApplicationIds.size > 0 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={async () => {
                    if (confirm(`Approve ${selectedApplicationIds.size} selected applications?`)) {
                      // Bulk approve
                      for (const id of selectedApplicationIds) {
                        const app = applications.find(a => a.id === id);
                        if (app && app.status === "pending") {
                          setSelectedApplication(app);
                          setApproveServiceAreas([app.serviceArea]);
                          setApprovePartnerShare(60);
                          setApprovePlatformShare(40);
                          await handleApprove(id);
                        }
                      }
                      setSelectedApplicationIds(new Set());
                      loadData();
                    }
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Approve Selected ({selectedApplicationIds.size})
                </button>
                <button
                  onClick={() => setSelectedApplicationIds(new Set())}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer"
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          {filteredApplications.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No applications found
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
                      <input
                        type="checkbox"
                        checked={selectedApplicationIds.size === filteredApplications.length && filteredApplications.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedApplicationIds(new Set(filteredApplications.map(a => a.id)));
                          } else {
                            setSelectedApplicationIds(new Set());
                          }
                        }}
                      />
                    </th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Business Name</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Owner</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Email</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Phone</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Service Area</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Services</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Date Applied</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app) => {
                    const createdAt = app.createdAt?.toDate?.() || app.createdAt;
                    const dateStr = createdAt ? new Date(createdAt).toLocaleDateString() : "N/A";
                    
                    return (
                      <tr key={app.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={selectedApplicationIds.has(app.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedApplicationIds);
                              if (e.target.checked) {
                                newSet.add(app.id);
                              } else {
                                newSet.delete(app.id);
                              }
                              setSelectedApplicationIds(newSet);
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.businessName}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.ownerName}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.email}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.phone}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.serviceArea}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{app.serviceType}</td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{dateStr}</td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            background: app.status === "approved" ? "#dcfce7" : 
                                       app.status === "rejected" ? "#fee2e2" : 
                                       app.status === "hold" ? "#fef3c7" : "#e0e7ff",
                            color: app.status === "approved" ? "#16a34a" : 
                                  app.status === "rejected" ? "#dc2626" : 
                                  app.status === "hold" ? "#d97706" : "#6366f1"
                          }}>
                            {app.status || "pending"}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            <button
                              onClick={() => {
                                setSelectedApplication(app);
                                setShowViewModal(true);
                              }}
                              style={{
                                padding: "0.25rem 0.5rem",
                                background: "#0369a1",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              View
                            </button>
                            {app.status === "pending" && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setApproveServiceAreas([]);
                                    setApprovePartnerShare(60);
                                    setApprovePlatformShare(40);
                                    setShowApproveModal(true);
                                  }}
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    background: "#16a34a",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowRejectModal(true);
                                  }}
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Reject
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedApplication(app);
                                    setShowHoldModal(true);
                                  }}
                                  style={{
                                    padding: "0.25rem 0.5rem",
                                    background: "#f59e0b",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "4px",
                                    fontSize: "0.75rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  Hold
                                </button>
                              </>
                            )}
                          </div>
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

      {/* Active Partners Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#111827" }}>
            Active Partners ({filteredPartners.length})
          </h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder="Search partners..."
              value={partnerSearch}
              onChange={(e) => setPartnerSearch(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                minWidth: "200px",
              }}
            />
            <select
              value={partnerStatusFilter}
              onChange={(e) => setPartnerStatusFilter(e.target.value)}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="removed">Removed</option>
            </select>
            {selectedPartnerIds.size > 0 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={async () => {
                    if (confirm(`Pause ${selectedPartnerIds.size} selected partners?`)) {
                      for (const id of selectedPartnerIds) {
                        await handlePausePartner(id);
                      }
                      setSelectedPartnerIds(new Set());
                      loadData();
                    }
                  }}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#f59e0b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer"
                  }}
                >
                  Pause Selected ({selectedPartnerIds.size})
                </button>
                <button
                  onClick={() => setSelectedPartnerIds(new Set())}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#e5e7eb",
                    color: "#111827",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    cursor: "pointer"
                  }}
                >
                  Clear Selection
                </button>
              </div>
            )}
            <button
              onClick={() => {
                // Export functionality
                const csv = generatePartnersCSV(filteredPartners);
                downloadCSV(csv, "partners.csv");
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#6366f1",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer"
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        <div style={{
          background: "#ffffff",
          borderRadius: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          border: "1px solid #e5e7eb",
          overflow: "hidden"
        }}>
          {filteredPartners.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
              No partners found
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>
                    <input
                      type="checkbox"
                      checked={selectedPartnerIds.size === filteredPartners.length && filteredPartners.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPartnerIds(new Set(filteredPartners.map(p => p.id)));
                        } else {
                          setSelectedPartnerIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Partner Name</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Service Area(s)</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Customers</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Jobs</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Gross Revenue</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Company Share %</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Partner Share %</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: "600" }}>Unpaid</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Last Payout</th>
                    <th style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPartners.map((partner) => {
                    const lastPayout = partner.lastPayoutDate?.toDate?.() || partner.lastPayoutDate;
                    const payoutStr = lastPayout ? new Date(lastPayout).toLocaleDateString() : "Never";
                    
                    return (
                      <tr key={partner.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.75rem" }}>
                          <input
                            type="checkbox"
                            checked={selectedPartnerIds.has(partner.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedPartnerIds);
                              if (e.target.checked) {
                                newSet.add(partner.id);
                              } else {
                                newSet.delete(partner.id);
                              }
                              setSelectedPartnerIds(newSet);
                            }}
                          />
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                          <a
                            href={`/admin/partners/${partner.id}`}
                            style={{ color: "#0369a1", textDecoration: "none" }}
                            onClick={(e) => {
                              e.preventDefault();
                              router.push(`/admin/partners/${partner.id}`);
                            }}
                          >
                            {partner.businessName}
                          </a>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                          {partner.serviceAreas?.join(", ") || partner.serviceArea || "N/A"}
                        </td>
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{
                            padding: "0.25rem 0.75rem",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            background: partner.status === "active" ? "#dcfce7" : 
                                       partner.status === "paused" ? "#fef3c7" : "#fee2e2",
                            color: partner.status === "active" ? "#16a34a" : 
                                  partner.status === "paused" ? "#d97706" : "#dc2626"
                          }}>
                            {partner.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                          {partner.customersAssigned || 0}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                          {partner.jobsTotal || 0} {partner.jobsThisWeek ? `(${partner.jobsThisWeek} this week)` : ""}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#16a34a", textAlign: "right" }}>
                          ${((partner.grossRevenueMTD || 0) + (partner.grossRevenueLifetime || 0)).toLocaleString()}
                          {partner.grossRevenueMTD ? ` (MTD: $${partner.grossRevenueMTD.toLocaleString()})` : ""}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                          {((partner.revenueSharePlatform || 0) * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right" }}>
                          {((partner.revenueSharePartner || 0) * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#dc2626", textAlign: "right" }}>
                          ${(partner.unpaidBalance || 0).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "left" }}>
                          {payoutStr}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>
                          <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center", flexWrap: "wrap" }}>
                            <button
                              onClick={() => router.push(`/admin/partners/${partner.id}`)}
                              style={{
                                padding: "0.25rem 0.5rem",
                                background: "#0369a1",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "4px",
                                fontSize: "0.75rem",
                                cursor: "pointer"
                              }}
                            >
                              View
                            </button>
                            {partner.status === "active" && (
                              <button
                                onClick={() => handlePausePartner(partner.id)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#f59e0b",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Pause
                              </button>
                            )}
                            {partner.status === "paused" && (
                              <button
                                onClick={() => handleResumePartner(partner.id)}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#16a34a",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Resume
                              </button>
                            )}
                            {partner.status !== "removed" && (
                              <button
                                onClick={() => {
                                  const reason = prompt("Enter removal reason:");
                                  if (reason) {
                                    handleRemovePartner(partner.id, reason);
                                  }
                                }}
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  background: "#dc2626",
                                  color: "#ffffff",
                                  border: "none",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  cursor: "pointer"
                                }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
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

      {/* Approve Modal */}
      {showApproveModal && selectedApplication && (
        <ApproveModal
          application={selectedApplication}
          serviceAreas={approveServiceAreas}
          setServiceAreas={setApproveServiceAreas}
          partnerShare={approvePartnerShare}
          setPartnerShare={setApprovePartnerShare}
          platformShare={approvePlatformShare}
          setPlatformShare={setApprovePlatformShare}
          onApprove={() => handleApprove(selectedApplication.id)}
          onClose={() => {
            setShowApproveModal(false);
            setSelectedApplication(null);
          }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedApplication && (
        <RejectModal
          application={selectedApplication}
          onReject={(reason) => handleReject(selectedApplication.id, reason)}
          onClose={() => {
            setShowRejectModal(false);
            setSelectedApplication(null);
          }}
        />
      )}

      {/* Hold Modal */}
      {showHoldModal && selectedApplication && (
        <HoldModal
          application={selectedApplication}
          onHold={(notes) => handleHold(selectedApplication.id, notes)}
          onClose={() => {
            setShowHoldModal(false);
            setSelectedApplication(null);
          }}
        />
      )}

      {/* View Application Modal */}
      {showViewModal && selectedApplication && (
        <ViewApplicationModal
          application={selectedApplication}
          onClose={() => {
            setShowViewModal(false);
            setSelectedApplication(null);
          }}
        />
      )}
    </div>
  );
}

// Helper functions
function generatePartnersCSV(partners: Partner[]): string {
  const headers = [
    "Partner Name", "Owner", "Email", "Phone", "Service Areas", "Status",
    "Customers", "Jobs Total", "Jobs This Week", "Gross Revenue MTD", "Gross Revenue Lifetime",
    "Company Share %", "Partner Share %", "Unpaid Balance", "Last Payout Date"
  ];
  
  const rows = partners.map(p => [
    p.businessName,
    p.ownerName,
    p.email,
    p.phone,
    p.serviceAreas?.join("; ") || "",
    p.status,
    p.customersAssigned || 0,
    p.jobsTotal || 0,
    p.jobsThisWeek || 0,
    p.grossRevenueMTD || 0,
    p.grossRevenueLifetime || 0,
    ((p.revenueSharePlatform || 0) * 100).toFixed(0),
    ((p.revenueSharePartner || 0) * 100).toFixed(0),
    p.unpaidBalance || 0,
    p.lastPayoutDate?.toDate?.()?.toLocaleDateString() || "Never"
  ]);
  
  return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

// Modal Components
function ApproveModal({
  application,
  serviceAreas,
  setServiceAreas,
  partnerShare,
  setPartnerShare,
  platformShare,
  setPlatformShare,
  onApprove,
  onClose,
}: {
  application: PartnerApplication;
  serviceAreas: string[];
  setServiceAreas: (areas: string[]) => void;
  partnerShare: number;
  setPartnerShare: (share: number) => void;
  platformShare: number;
  setPlatformShare: (share: number) => void;
  onApprove: () => void;
  onClose: () => void;
}) {
  const [selectedCounties, setSelectedCounties] = useState<string[]>([]);
  const [selectedZones, setSelectedZones] = useState<string[]>([]);

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "2rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "700px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1.5rem" }}>
          Approve Partner: {application.businessName}
        </h3>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Service Areas (Required)
          </label>
          <div style={{ marginBottom: "1rem" }}>
            <div style={{ marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>Zones:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
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
            <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px", padding: "0.5rem" }}>
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
          <button
            onClick={() => {
              const allAreas = [...selectedZones, ...selectedCounties];
              setServiceAreas(allAreas);
            }}
            style={{
              marginTop: "0.5rem",
              padding: "0.5rem 1rem",
              background: "#6366f1",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer"
            }}
          >
            Apply Selected Areas
          </button>
          {serviceAreas.length > 0 && (
            <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
              Selected: {serviceAreas.join(", ")}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Revenue Split (Must total 100%)
          </label>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: "0.875rem", color: "#6b7280" }}>Partner Share</label>
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
              <label style={{ fontSize: "0.875rem", color: "#6b7280" }}>Company Share</label>
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
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: partnerShare + platformShare === 100 ? "#16a34a" : "#dc2626" }}>
            Total: {partnerShare + platformShare}%
          </div>
        </div>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={onApprove}
            disabled={serviceAreas.length === 0 || partnerShare + platformShare !== 100}
            style={{
              padding: "0.75rem 1.5rem",
              background: serviceAreas.length === 0 || partnerShare + platformShare !== 100 ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: serviceAreas.length === 0 || partnerShare + platformShare !== 100 ? "not-allowed" : "pointer"
            }}
          >
            Approve Partner
          </button>
        </div>
      </div>
    </div>
  );
}

function RejectModal({
  application,
  onReject,
  onClose,
}: {
  application: PartnerApplication;
  onReject: (reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "2rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "500px",
        width: "100%"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
          Reject Application: {application.businessName}
        </h3>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
          Rejection Reason (Required)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter reason for rejection..."
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
            marginBottom: "1rem"
          }}
        />
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onReject(reason)}
            disabled={!reason.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: !reason.trim() ? "#9ca3af" : "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: !reason.trim() ? "not-allowed" : "pointer"
            }}
          >
            Reject Application
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldModal({
  application,
  onHold,
  onClose,
}: {
  application: PartnerApplication;
  onHold: (notes: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "2rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "500px",
        width: "100%"
      }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "1rem" }}>
          Hold Application: {application.businessName}
        </h3>
        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes about why this needs review..."
          rows={4}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
            marginBottom: "1rem"
          }}
        />
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onHold(notes)}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Mark as Hold
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewApplicationModal({
  application,
  onClose,
}: {
  application: PartnerApplication;
  onClose: () => void;
}) {
  const createdAt = application.createdAt?.toDate?.() || application.createdAt;
  const updatedAt = application.updatedAt?.toDate?.() || application.updatedAt;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "2rem"
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "700px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>
            Application Details: {application.businessName}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280"
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Business Name</div>
            <div style={{ fontSize: "1rem", fontWeight: "600" }}>{application.businessName}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Owner Name</div>
            <div style={{ fontSize: "1rem", fontWeight: "600" }}>{application.ownerName}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Email</div>
            <div style={{ fontSize: "1rem" }}>{application.email}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Phone</div>
            <div style={{ fontSize: "1rem" }}>{application.phone}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Area</div>
            <div style={{ fontSize: "1rem" }}>{application.serviceArea}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Type</div>
            <div style={{ fontSize: "1rem" }}>{application.serviceType}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Has Insurance</div>
            <div style={{ fontSize: "1rem" }}>{application.hasInsurance ? "Yes" : "No"}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Promotion Method</div>
            <div style={{ fontSize: "1rem" }}>{application.promotionMethod}</div>
          </div>
          {application.websiteOrInstagram && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Website/Instagram</div>
              <div style={{ fontSize: "1rem" }}>{application.websiteOrInstagram}</div>
            </div>
          )}
          {application.heardAboutUs && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>How They Heard About Us</div>
              <div style={{ fontSize: "1rem" }}>{application.heardAboutUs}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Status</div>
            <span style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "600",
              background: application.status === "approved" ? "#dcfce7" : 
                         application.status === "rejected" ? "#fee2e2" : 
                         application.status === "hold" ? "#fef3c7" : "#e0e7ff",
              color: application.status === "approved" ? "#16a34a" : 
                    application.status === "rejected" ? "#dc2626" : 
                    application.status === "hold" ? "#d97706" : "#6366f1"
            }}>
              {application.status || "pending"}
            </span>
          </div>
          {application.rejectionReason && (
            <div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Rejection Reason</div>
              <div style={{ fontSize: "1rem", color: "#dc2626" }}>{application.rejectionReason}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Date Applied</div>
            <div style={{ fontSize: "1rem" }}>{createdAt ? new Date(createdAt).toLocaleString() : "N/A"}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Last Updated</div>
            <div style={{ fontSize: "1rem" }}>{updatedAt ? new Date(updatedAt).toLocaleString() : "N/A"}</div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1.5rem" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
