// components/AdminDashboard/PartnerMiniProfile.tsx
// Partner Mini Profile - Slide-over drawer for admin view

"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  buildPartnerApprovalEmailParams,
  sendPartnerApprovalEmailClient,
} from "@/lib/partner-approval-email";

import { useState, useEffect } from "react";
import { georgiaCounties } from "@/data/gaCounties";
import { metroAtlZones } from "@/data/metroAtlZones";
import { ReasonDialog } from "./AdminDialog";
import "./partner-program.css";

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
  createdAt: any;
  // Computed fields
  jobsThisWeek?: number;
  jobsThisMonth?: number;
  photoCompliance30d?: number;
  grossRevenueMTD?: number;
  companyShareMTD?: number;
  unpaidBalance?: number;
}

interface PartnerMiniProfileProps {
  partner: Partner | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
  onApprove?: (applicationId: string) => void;
  applicationId?: string;
  applicationStatus?: "pending" | "approved" | "rejected" | "hold";
  partnerRecordId?: string | null;
}

type Tab = "overview" | "jobs" | "performance" | "messages";

export function PartnerMiniProfile({
  partner,
  isOpen,
  onClose,
  onUpdate,
  onNotify,
  onApprove,
  applicationId,
  applicationStatus,
  partnerRecordId = null,
}: PartnerMiniProfileProps) {
  const isApplicationOnly = Boolean(applicationId && !partnerRecordId);
  const isRejectedApplication = applicationStatus === "rejected";
  const canReviewApplication = isApplicationOnly && !isRejectedApplication;
  const activePartnerId = partnerRecordId || null;
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [initialTab, setInitialTab] = useState<Tab | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [photoCompliance, setPhotoCompliance] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [resendingApprovalEmail, setResendingApprovalEmail] = useState(false);
  const [linkingLoginAccount, setLinkingLoginAccount] = useState(false);
  const [savingServiceAreas, setSavingServiceAreas] = useState(false);
  const [serviceAreaInput, setServiceAreaInput] = useState("");

  const toast = (message: string, type: "success" | "error" | "info" = "success") => {
    if (onNotify) onNotify(message, type);
  };

  useEffect(() => {
    if (isOpen && partner) {
      setServiceAreaInput(partner.serviceAreas?.join(", ") || "");
      loadTabData();
    }
  }, [isOpen, partner, activeTab]);

  // Listen for tab change events from parent
  useEffect(() => {
    const handleTabChange = (e: CustomEvent) => {
      if (e.detail?.tab) {
        setActiveTab(e.detail.tab as Tab);
      }
    };
    window.addEventListener('partnerMiniProfileOpen', handleTabChange as EventListener);
    return () => {
      window.removeEventListener('partnerMiniProfileOpen', handleTabChange as EventListener);
    };
  }, []);

  async function loadTabData() {
    if (!partner || !activePartnerId) return;

    setLoading(true);
    try {
      if (activeTab === "jobs") {
        const jobsResponse = await fetchWithAuth(`/api/admin/partners/${activePartnerId}/jobs`);
        const jobsData = await jobsResponse.json();
        if (jobsData.success) {
          setJobs(jobsData.jobs || []);
        }

        const complianceResponse = await fetchWithAuth(`/api/admin/partners/${activePartnerId}/photo-compliance?days=30`);
        const complianceData = await complianceResponse.json();
        if (complianceData.success) {
          setPhotoCompliance(complianceData);
        }
      } else if (activeTab === "messages") {
        const messagesResponse = await fetchWithAuth(`/api/admin/partners/${activePartnerId}/messages`);
        const messagesData = await messagesResponse.json();
        if (messagesData.success) {
          setMessages(messagesData.messages || []);
        }
      }
    } catch (err) {
      console.error("Error loading tab data:", err);
    } finally {
      setLoading(false);
    }
  }

  function handlePause() {
    if (!activePartnerId) return;
    window.dispatchEvent(new CustomEvent("partnerPauseRequest", { detail: { partnerId: activePartnerId } }));
  }

  async function handleResume() {
    if (!partner || !activePartnerId) return;
    try {
      const response = await fetchWithAuth(`/api/admin/partners/${activePartnerId}/resume`, { method: "POST" });
      const data = await response.json();
      if (data.success) {
        toast("Partner resumed");
        onUpdate();
      } else {
        toast(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      toast(`Error: ${err instanceof Error ? err.message : "Resume failed"}`, "error");
    }
  }

  function handleRemove() {
    if (!activePartnerId) return;
    setShowRemoveDialog(true);
  }

  function handleRejectApplication() {
    if (!applicationId || isRejectedApplication) return;
    window.dispatchEvent(new CustomEvent("partnerRejectRequest", { detail: { applicationId } }));
  }

  function handleHoldApplication() {
    if (!applicationId) return;
    window.dispatchEvent(new CustomEvent("partnerHoldRequest", { detail: { applicationId } }));
  }

  async function handleApprove() {
    if (!partner || !applicationId) return;
    onClose();
    const event = new CustomEvent("partnerApproveRequest", { detail: { applicationId } });
    window.dispatchEvent(event);
  }

  async function handleResendApprovalEmail() {
    if (!partner) return;

    setResendingApprovalEmail(true);
    try {
      const result = await sendPartnerApprovalEmailClient(
        buildPartnerApprovalEmailParams({
          email: partner.email,
          ownerName: partner.ownerName,
          businessName: partner.businessName,
          referralCode: partner.partnerCode,
          serviceAreas: partner.serviceAreas,
          revenueSharePartner: partner.revenueSharePartner,
          revenueSharePlatform: partner.revenueSharePlatform,
          partnerId: activePartnerId || partner.id,
        })
      );

      if (result.success) {
        toast(`Approval email sent to ${partner.email}`);
      } else {
        toast(result.error || "Failed to resend approval email", "error");
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to resend approval email", "error");
    } finally {
      setResendingApprovalEmail(false);
    }
  }

  async function handleLinkLoginAccount() {
    if (!partner || !activePartnerId) return;

    setLinkingLoginAccount(true);
    try {
      const response = await fetchWithAuth("/api/admin/partners/assign-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId: activePartnerId,
          userEmail: partner.email,
        }),
      });
      const data = await response.json();

      if (data.success) {
        toast(`Linked ${partner.email} to partner login`);
        onUpdate();
      } else {
        toast(data.error || "Failed to link login account", "error");
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to link login account", "error");
    } finally {
      setLinkingLoginAccount(false);
    }
  }

  async function handleSaveServiceAreas() {
    if (!partner || !activePartnerId) return;

    const serviceAreas = serviceAreaInput
      .split(",")
      .map((area) => area.trim())
      .filter(Boolean);

    if (serviceAreas.length === 0) {
      toast("Add at least one service area", "error");
      return;
    }

    setSavingServiceAreas(true);
    try {
      const response = await fetchWithAuth(`/api/admin/partners/${activePartnerId}/service-areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceAreas }),
      });
      const data = await response.json();

      if (data.success) {
        toast("Service areas updated");
        onUpdate();
      } else {
        toast(data.error || "Failed to update service areas", "error");
      }
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to update service areas", "error");
    } finally {
      setSavingServiceAreas(false);
    }
  }

  if (!isOpen || !partner) return null;

  return (
    <>
      {showRemoveDialog && activePartnerId && (
        <ReasonDialog
          title={`Remove ${partner.businessName}?`}
          description="This blocks future jobs and portal access."
          placeholder="Enter removal reason..."
          confirmLabel="Continue"
          variant="danger"
          onSubmit={(reason) => {
            window.dispatchEvent(
              new CustomEvent("partnerRemoveRequest", { detail: { partnerId: activePartnerId, reason } })
            );
          }}
          onClose={() => setShowRemoveDialog(false)}
        />
      )}
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
        }}
      />

      {/* Slide-over drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: "90%",
          maxWidth: "900px",
          background: "#ffffff",
          boxShadow: "-4px 0 16px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "1.5rem",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.25rem" }}>
                {partner.businessName}
              </h2>
              <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {partner.ownerName} • {partner.email}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#6b7280",
                padding: "0.25rem",
              }}
            >
              ×
            </button>
          </div>

          {/* Quick Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Jobs (7d)</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "600" }}>{partner.jobsThisWeek || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Jobs (30d)</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "600" }}>{partner.jobsThisMonth || 0}</div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Photo Compliance</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "600", color: (partner.photoCompliance30d || 0) >= 90 ? "#16a34a" : "#dc2626" }}>
                {partner.photoCompliance30d || 100}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Revenue (30d)</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#16a34a" }}>
                ${(partner.grossRevenueMTD || 0).toLocaleString()}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Unpaid</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "600", color: "#dc2626" }}>
                ${(partner.unpaidBalance || 0).toLocaleString()}
              </div>
            </div>
          </div>

          {canReviewApplication && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              background: "#eef2ff",
              border: "1px solid #c7d2fe",
              color: "#3730a3",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}>
              Partner application — needs your review. Approve, reject, or hold from here.
            </div>
          )}

          {isRejectedApplication && (
            <div style={{
              marginBottom: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: "0.875rem",
              fontWeight: "600",
            }}>
              This application has already been rejected and is no longer active in the partner program.
            </div>
          )}

          {/* Status & Actions */}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            {canReviewApplication ? (
              <>
                <span style={{
                  padding: "0.5rem 0.75rem",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  background: "#e0e7ff",
                  color: "#4338ca",
                }}>
                  Needs Review
                </span>
                <button
                  type="button"
                  onClick={handleApprove}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Approve Partner
                </button>
                <button
                  type="button"
                  onClick={handleHoldApplication}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#f59e0b",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Hold Application
                </button>
                <button
                  type="button"
                  onClick={handleRejectApplication}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#dc2626",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Reject Application
                </button>
              </>
            ) : isRejectedApplication ? (
              <span className="pp-status-pill rejected">Rejected</span>
            ) : (
              <>
            <select
              value={partner.status}
              onChange={async (e) => {
                const newStatus = e.target.value;
                if (newStatus === "paused" && partner.status === "active") {
                  await handlePause();
                } else if (newStatus === "active" && partner.status === "paused") {
                  await handleResume();
                }
              }}
              style={{
                padding: "0.5rem 0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                background: "#ffffff",
              }}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="removed">Removed</option>
            </select>
            {partner.status !== "removed" && (
            <button
              onClick={() => {
                setActiveTab("messages");
                // Focus message input
                setTimeout(() => {
                  const textarea = document.querySelector('textarea[placeholder*="Type your message"]') as HTMLTextAreaElement;
                  if (textarea) {
                    textarea.focus();
                  }
                }, 100);
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#0369a1",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Send Message
            </button>
            )}
            {partner.status !== "removed" && (
              <button
                type="button"
                onClick={handleResendApprovalEmail}
                disabled={resendingApprovalEmail}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#7c3aed",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: resendingApprovalEmail ? "not-allowed" : "pointer",
                  opacity: resendingApprovalEmail ? 0.7 : 1,
                }}
              >
                {resendingApprovalEmail ? "Sending..." : "Resend Approval Email"}
              </button>
            )}
            {partner.status === "active" && (
              <button
                onClick={handlePause}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#f59e0b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Pause Partner
              </button>
            )}
            {partner.status === "paused" && (
              <button
                onClick={handleResume}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Resume Partner
              </button>
            )}
            {partner.status !== "removed" && (
              <button
                onClick={handleRemove}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Remove Partner
              </button>
            )}
            {applicationId && activePartnerId && partner.status !== "removed" && (
              <button
                onClick={handleApprove}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Approve Partner
              </button>
            )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb", background: "#ffffff" }}>
          {[
            { id: "overview", label: "Overview" },
            ...(isApplicationOnly ? [] : [
              { id: "jobs", label: "Jobs & Proof" },
              { id: "performance", label: "Performance & Money" },
              { id: "messages", label: "Messages" },
            ]),
          ].map((tab) => (
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
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
          {activeTab === "overview" && (
            <OverviewTab
              partner={partner}
              serviceAreaInput={serviceAreaInput}
              setServiceAreaInput={setServiceAreaInput}
              onSaveServiceAreas={handleSaveServiceAreas}
              savingServiceAreas={savingServiceAreas}
              onLinkLoginAccount={handleLinkLoginAccount}
              linkingLoginAccount={linkingLoginAccount}
            />
          )}
          {activeTab === "jobs" && activePartnerId && (
            <JobsTab
              partnerId={activePartnerId}
              jobs={jobs}
              photoCompliance={photoCompliance}
              loading={loading}
            />
          )}
          {activeTab === "performance" && !isApplicationOnly && <PerformanceTab partner={partner} />}
          {activeTab === "messages" && activePartnerId && (
            <MessagesTab partnerId={activePartnerId} messages={messages} loading={loading} onUpdate={loadTabData} onNotify={onNotify} />
          )}
        </div>
      </div>
    </>
  );
}

// Tab Components
function OverviewTab({
  partner,
  serviceAreaInput,
  setServiceAreaInput,
  onSaveServiceAreas,
  savingServiceAreas,
  onLinkLoginAccount,
  linkingLoginAccount,
}: {
  partner: Partner;
  serviceAreaInput: string;
  setServiceAreaInput: (value: string) => void;
  onSaveServiceAreas: () => void;
  savingServiceAreas: boolean;
  onLinkLoginAccount: () => void;
  linkingLoginAccount: boolean;
}) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Account Link</h3>
      <div style={{ marginBottom: "2rem", padding: "1rem", background: partner.userId ? "#dcfce7" : "#fef3c7", borderRadius: "8px" }}>
        <div style={{ fontSize: "0.875rem", color: "#374151", marginBottom: "0.75rem" }}>
          {partner.userId
            ? "Partner login is linked. They can sign in at /partners with this email."
            : "No login linked yet. Link their customer account so they can access the Partner Dashboard and Stripe payouts."}
        </div>
        {!partner.userId && (
          <button
            type="button"
            onClick={onLinkLoginAccount}
            disabled={linkingLoginAccount}
            style={{
              padding: "0.5rem 1rem",
              background: "#0369a1",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: linkingLoginAccount ? "not-allowed" : "pointer",
              opacity: linkingLoginAccount ? 0.7 : 1,
            }}
          >
            {linkingLoginAccount ? "Linking..." : "Link Login Account"}
          </button>
        )}
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Contact Information</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "2rem" }}>
        <div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Owner</div>
          <div style={{ fontSize: "1rem", fontWeight: "600" }}>{partner.ownerName}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Email</div>
          <div style={{ fontSize: "1rem" }}>{partner.email}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Phone</div>
          <div style={{ fontSize: "1rem" }}>{partner.phone}</div>
        </div>
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Service Areas</h3>
      <div style={{ marginBottom: "2rem" }}>
        <textarea
          value={serviceAreaInput}
          onChange={(e) => setServiceAreaInput(e.target.value)}
          placeholder="South Metro, Peachtree City, Fayetteville, Tyrone, Sharpsburg, Senoia"
          rows={3}
          style={{
            width: "100%",
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            marginBottom: "0.75rem",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={onSaveServiceAreas}
          disabled={savingServiceAreas}
          style={{
            padding: "0.5rem 1rem",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: savingServiceAreas ? "not-allowed" : "pointer",
            opacity: savingServiceAreas ? 0.7 : 1,
          }}
        >
          {savingServiceAreas ? "Saving..." : "Save Service Areas"}
        </button>
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Services Offered</h3>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{partner.serviceType || "N/A"}</div>
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Revenue Split</h3>
      <div>
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Partner: {((partner.revenueSharePartner || 0) * 100).toFixed(0)}% / Company: {((partner.revenueSharePlatform || 0) * 100).toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

function JobsTab({
  partnerId,
  jobs,
  photoCompliance,
  loading,
}: {
  partnerId: string;
  jobs: any[];
  photoCompliance: any;
  loading: boolean;
}) {
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [jobStatusFilter, setJobStatusFilter] = useState<string>("all");
  const [jobSearch, setJobSearch] = useState("");

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading jobs...</div>;
  }

  return (
    <div>
      {photoCompliance && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: photoCompliance.compliancePercentage >= 90 ? "#dcfce7" : "#fef3c7", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.25rem" }}>Photo Compliance (30 days)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: photoCompliance.compliancePercentage >= 90 ? "#16a34a" : "#d97706" }}>
            {photoCompliance.compliancePercentage}%
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {photoCompliance.jobsWithPhotos} of {photoCompliance.totalJobs} jobs have required photos
          </div>
        </div>
      )}

      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <input
          type="text"
          placeholder="Search jobs..."
          value={jobSearch}
          onChange={(e) => setJobSearch(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
            flex: 1,
            minWidth: "200px",
          }}
        />
        <select
          value={jobStatusFilter}
          onChange={(e) => setJobStatusFilter(e.target.value)}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="needs_review">Needs Review</option>
        </select>
      </div>

      {(() => {
        const filteredJobs = jobs.filter((job: any) => {
          const matchesSearch = !jobSearch ||
            (job.customerName || "").toLowerCase().includes(jobSearch.toLowerCase()) ||
            (job.address || "").toLowerCase().includes(jobSearch.toLowerCase());
          const matchesStatus = jobStatusFilter === "all" || job.status === jobStatusFilter;
          return matchesSearch && matchesStatus;
        });

        if (filteredJobs.length === 0) {
          return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No jobs found</div>;
        }

        return (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Date</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", fontWeight: "600" }}>Proof Photos</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job: any) => {
                const hasBothPhotos = job.hasInsidePhoto && job.hasOutsidePhoto;
                return (
                  <tr key={job.jobId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {job.scheduledDate?.toDate?.()?.toLocaleDateString() || job.scheduledDate || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {job.customerName || job.customerEmail || "N/A"}
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>{job.addressLine1 || job.address || ""}</div>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          background:
                            job.status === "completed" ? "#dcfce7" : job.status === "needs_review" ? "#fef3c7" : "#e0e7ff",
                          color: job.status === "completed" ? "#16a34a" : job.status === "needs_review" ? "#d97706" : "#6366f1",
                        }}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "center" }}>
                      {hasBothPhotos ? (
                        <span style={{ color: "#16a34a", fontSize: "1.25rem" }}>✅</span>
                      ) : (
                        <span style={{ color: "#dc2626", fontSize: "1.25rem" }}>❌</span>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      {(job.hasInsidePhoto || job.hasOutsidePhoto) && (
                        <button
                          onClick={() => setSelectedJob(job)}
                          style={{
                            padding: "0.25rem 0.5rem",
                            background: "#0369a1",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                          }}
                        >
                          View Proof
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Photo Viewer Modal */}
      {selectedJob && (
        <PhotoViewerModal job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}

function PhotoViewerModal({ job, onClose }: { job: any; onClose: () => void }) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        padding: "2rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "800px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "700" }}>Proof Photos</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
          {job.insidePhotoUrl ? (
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Inside Bin</div>
              <img
                src={job.insidePhotoUrl}
                alt="Inside bin"
                style={{ width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
            </div>
          ) : (
            <div style={{ padding: "2rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center", color: "#dc2626" }}>
              Missing Inside Photo
            </div>
          )}
          {job.outsidePhotoUrl ? (
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>Outside Bin</div>
              <img
                src={job.outsidePhotoUrl}
                alt="Outside bin"
                style={{ width: "100%", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
            </div>
          ) : (
            <div style={{ padding: "2rem", background: "#f9fafb", borderRadius: "8px", textAlign: "center", color: "#dc2626" }}>
              Missing Outside Photo
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => {
              alert("Flag issue functionality coming soon");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#f59e0b",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Flag Issue
          </button>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function PerformanceTab({ partner }: { partner: Partner }) {
  return (
    <div>
      <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem" }}>Revenue Breakdown</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Gross Revenue (30d)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            ${(partner.grossRevenueMTD || 0).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Company Share (30d)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#0369a1" }}>
            ${((partner.grossRevenueMTD || 0) * (partner.revenueSharePlatform || 0)).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Partner Share (30d)</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#047857" }}>
            ${((partner.grossRevenueMTD || 0) * (partner.revenueSharePartner || 0)).toLocaleString()}
          </div>
        </div>
        <div style={{ padding: "1rem", background: "#f9fafb", borderRadius: "8px" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Unpaid Balance</div>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#dc2626" }}>
            ${(partner.unpaidBalance || 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ marginTop: "2rem" }}>
        <button
          onClick={() => {
            // Export CSV functionality
            alert("Export CSV functionality coming soon");
          }}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#6366f1",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Export CSV
        </button>
      </div>
    </div>
  );
}

function MessagesTab({
  partnerId,
  messages,
  loading,
  onUpdate,
  onNotify,
}: {
  partnerId: string;
  messages: any[];
  loading: boolean;
  onUpdate: () => void;
  onNotify?: (message: string, type?: "success" | "error" | "info") => void;
}) {
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"praise" | "request" | "warning">("request");

  async function handleSendMessage() {
    if (!messageText.trim()) return;

    try {
      const response = await fetchWithAuth(`/api/admin/partners/${partnerId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          type: messageType,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.status}`);
      }
      
      if (data.success) {
        setMessageText("");
        onNotify?.("Message sent", "success");
        onUpdate();
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (err: unknown) {
      console.error("[Send Message] Error:", err);
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      onNotify?.(`Failed to send message: ${errorMsg}`, "error");
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Loading messages...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setMessageText("Good job this week 🔥")}
            style={{
              padding: "0.5rem 1rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Good job this week 🔥
          </button>
          <button
            onClick={() => {
              setMessageText("Reminder: proof photos required (inside + outside)");
              setMessageType("request");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Reminder: proof photos required
          </button>
          <button
            onClick={() => {
              setMessageText("Route update / check your schedule");
              setMessageType("request");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Route update
          </button>
          <button
            onClick={() => {
              setMessageText("Call us ASAP");
              setMessageType("warning");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "#e5e7eb",
              color: "#111827",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            Call us ASAP
          </button>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value as "praise" | "request" | "warning")}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="praise">Praise</option>
            <option value="request">Request</option>
            <option value="warning">Warning</option>
          </select>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            rows={3}
            style={{
              flex: 1,
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
            style={{
              padding: "0.75rem 1.5rem",
              background: !messageText.trim() ? "#9ca3af" : "#0369a1",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: !messageText.trim() ? "not-allowed" : "pointer",
              alignSelf: "flex-end",
            }}
          >
            Send
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No messages yet</div>
        ) : (
          messages.map((msg: any) => (
            <div
              key={msg.id}
              style={{
                padding: "1rem",
                background: msg.type === "praise" ? "#dcfce7" : msg.type === "warning" ? "#fee2e2" : "#e0e7ff",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: msg.type === "praise" ? "#16a34a" : msg.type === "warning" ? "#dc2626" : "#6366f1",
                  }}
                >
                  {msg.type.toUpperCase()}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                  {msg.createdAt?.toDate?.()?.toLocaleString() || "N/A"}
                </span>
              </div>
              <div style={{ fontSize: "0.875rem" }}>{msg.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
