// components/AdminDashboard/PartnerProgramManagement.tsx
// Full-featured Partner Program Management Control Center
"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  buildPartnerApprovalEmailParams,
  sendPartnerApprovalEmailClient,
} from "@/lib/partner-approval-email";

import { useEffect, useState, useCallback, useRef } from "react";
import { georgiaCounties } from "@/data/gaCounties";
import { metroAtlZones } from "@/data/metroAtlZones";
import { PartnerMiniProfile } from "./PartnerMiniProfile";
import { ToastContainer } from "@/components/EmployeeDashboard/Toast";
import { useAdminToast } from "./useAdminToast";
import { ConfirmDialog } from "./AdminDialog";
import "./partner-program.css";

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
  jobsThisMonth?: number;
  photoCompliance30d?: number;
  grossRevenueMTD?: number;
  grossRevenueLifetime?: number;
  unpaidBalance?: number;
  lastPayoutDate?: any;
}

type ApplicationStatus = PartnerApplication["status"];
type PartnerViewTab = "queue" | "partners" | "all";

function formatRelativeDate(date: unknown): string {
  const raw = date as { toDate?: () => Date } | string | number | Date | null | undefined;
  const d = raw && typeof raw === "object" && "toDate" in raw && raw.toDate ? raw.toDate() : raw;
  if (!d) return "Recently";
  const ts = new Date(d as string | number | Date).getTime();
  if (Number.isNaN(ts)) return "Recently";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(ts).toLocaleDateString();
}

function convertApplicationToPartner(application: PartnerApplication): Partner {
  return {
    id: application.id,
    userId: application.userId || null,
    businessName: application.businessName,
    ownerName: application.ownerName,
    email: application.email,
    phone: application.phone,
    serviceAreas: application.serviceArea ? [application.serviceArea] : [],
    serviceType: application.serviceType,
    status: "paused",
    revenueSharePartner: 0.6,
    revenueSharePlatform: 0.4,
    partnerCode: "",
    partnerSlug: "",
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function statusPillClass(app: PartnerApplication): string {
  return getApplicationDisplayStatus(app);
}

function partnerStatusPillClass(status: Partner["status"]): string {
  return status;
}

function normalizeApplication(app: PartnerApplication): PartnerApplication {
  const status = (app.status || "pending") as ApplicationStatus;
  return {
    ...app,
    status: status === "approved" && !app.linkedPartnerId ? "pending" : status,
  };
}

function getApplicationDisplayStatus(app: PartnerApplication): ApplicationStatus {
  if (app.linkedPartnerId && app.status === "approved") return "approved";
  if (app.status === "rejected") return "rejected";
  if (app.status === "hold") return "hold";
  return "pending";
}

function getApplicationStatusLabel(app: PartnerApplication): string {
  switch (getApplicationDisplayStatus(app)) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "hold":
      return "On Hold";
    default:
      return "Needs Review";
  }
}

function getApplicationStats(applications: PartnerApplication[]) {
  const visible = applications.filter((app) => getApplicationDisplayStatus(app) !== "rejected");
  return {
    pending: visible.filter((app) => getApplicationDisplayStatus(app) === "pending").length,
    hold: visible.filter((app) => getApplicationDisplayStatus(app) === "hold").length,
    approved: visible.filter((app) => getApplicationDisplayStatus(app) === "approved").length,
  };
}

function applicationStatusStyle(app: PartnerApplication) {
  switch (getApplicationDisplayStatus(app)) {
    case "approved":
      return { background: "#dcfce7", color: "#16a34a", border: "1px solid #86efac" };
    case "rejected":
      return { background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" };
    case "hold":
      return { background: "#fef3c7", color: "#d97706", border: "1px solid #fcd34d" };
    default:
      return { background: "#e0e7ff", color: "#4338ca", border: "1px solid #c7d2fe" };
  }
}

interface PartnerProgramManagementProps {
  userId: string;
}

function formatLastUpdated(date: Date | null): string {
  if (!date) return "Not synced yet";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return "Updated just now";
  if (seconds < 60) return `Updated ${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes}m ago`;
  return `Updated at ${date.toLocaleTimeString()}`;
}

export function PartnerProgramManagement({ userId }: PartnerProgramManagementProps) {
  const { toasts, notify, removeToast } = useAdminToast();
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [liveConnected, setLiveConnected] = useState(false);
  const initialSnapshotRef = useRef(true);
  const knownQueueIdsRef = useRef<Set<string>>(new Set());
  const [activeView, setActiveView] = useState<PartnerViewTab>("queue");
  
  // Filters and search
  const [applicationSearch, setApplicationSearch] = useState("");
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>("all");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerStatusFilter, setPartnerStatusFilter] = useState<string>("all");
  const [partnerServiceAreaFilter, setPartnerServiceAreaFilter] = useState<string>("all");
  const [lowPhotoComplianceFilter, setLowPhotoComplianceFilter] = useState(false);
  
  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<PartnerApplication | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [showMiniProfile, setShowMiniProfile] = useState(false);
  const [miniProfileApplicationId, setMiniProfileApplicationId] = useState<string | undefined>();
  const [miniProfileApplicationStatus, setMiniProfileApplicationStatus] = useState<ApplicationStatus | undefined>();
  const [selectedPartnerRecordId, setSelectedPartnerRecordId] = useState<string | null>(null);
  const [resendingApprovalEmailId, setResendingApprovalEmailId] = useState<string | null>(null);
  
  // Approve modal state
  const [approveServiceAreas, setApproveServiceAreas] = useState<string[]>([]);
  const [approvePartnerShare, setApprovePartnerShare] = useState(60);
  const [approvePlatformShare, setApprovePlatformShare] = useState(40);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    variant: "primary" | "danger" | "warning";
    onConfirm: () => void;
  } | null>(null);

  async function handleResendApprovalEmail(input: {
    recordId: string;
    email: string;
    ownerName: string;
    businessName: string;
    partnerCode?: string;
    serviceAreas?: string[] | string;
    revenueSharePartner?: number;
    revenueSharePlatform?: number;
    partnerId?: string;
  }) {
    setResendingApprovalEmailId(input.recordId);
    try {
      const result = await sendPartnerApprovalEmailClient(
        buildPartnerApprovalEmailParams({
          email: input.email,
          ownerName: input.ownerName,
          businessName: input.businessName,
          referralCode: input.partnerCode || "PARTNER",
          serviceAreas: input.serviceAreas || "",
          revenueSharePartner: input.revenueSharePartner ?? 60,
          revenueSharePlatform: input.revenueSharePlatform ?? 40,
          partnerId: input.partnerId,
        })
      );

      if (result.success) {
        notify(`Approval email sent to ${input.email}`);
      } else {
        notify(result.error || "Failed to resend approval email", "error");
      }
    } catch (error: unknown) {
      notify(error instanceof Error ? error.message : "Failed to resend approval email", "error");
    } finally {
      setResendingApprovalEmailId(null);
    }
  }

  const openApplicationProfile = useCallback(async (app: PartnerApplication) => {
    try {
      if (app.linkedPartnerId) {
        try {
          const partnerResponse = await fetchWithAuth(`/api/admin/partners/${app.linkedPartnerId}`);
          const partnerData = await partnerResponse.json();

          if (partnerResponse.ok && partnerData.success && partnerData.partner) {
            setSelectedPartner(partnerData.partner);
            setMiniProfileApplicationId(app.id);
            setMiniProfileApplicationStatus(getApplicationDisplayStatus(app));
            setSelectedPartnerRecordId(app.linkedPartnerId);
            setShowMiniProfile(true);
            return;
          }
        } catch (fetchError) {
          console.error("[View Profile] Fetch error:", fetchError);
        }
      }

      setSelectedPartner(convertApplicationToPartner(app));
      setMiniProfileApplicationId(app.id);
      setMiniProfileApplicationStatus(getApplicationDisplayStatus(app));
      setSelectedPartnerRecordId(app.linkedPartnerId || null);
      setShowMiniProfile(true);
    } catch (error: unknown) {
      console.error("[View Profile] Error:", error);
      notify(
        `Failed to load profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        "error"
      );
    }
  }, [notify]);

  const openPartnerProfile = useCallback((partner: Partner, tab?: "messages") => {
    setSelectedPartner(partner);
    setMiniProfileApplicationId(undefined);
    setMiniProfileApplicationStatus(undefined);
    setSelectedPartnerRecordId(partner.id);
    setShowMiniProfile(true);
    if (tab === "messages") {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("partnerMiniProfileOpen", { detail: { tab: "messages" } }));
      }, 100);
    }
  }, []);

  const loadData = useCallback(async (options?: { silent?: boolean }) => {
    try {
      if (options?.silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const appsResponse = await fetchWithAuth("/api/admin/partners/applications");
      const appsData = await appsResponse.json();
      if (appsData.success) {
        const normalized = (appsData.applications || []).map(normalizeApplication);
        setApplications(normalized);
        knownQueueIdsRef.current = new Set(
          normalized
            .filter((app: PartnerApplication) => {
              const status = getApplicationDisplayStatus(app);
              return status === "pending" || status === "hold";
            })
            .map((app: PartnerApplication) => app.id)
        );
      }
      
      const partnersResponse = await fetchWithAuth("/api/admin/partners/list");
      const partnersData = await partnersResponse.json();
      if (partnersData.success) {
        setPartners(partnersData.partners || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading partner data:", err);
      notify("Failed to refresh partner data", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [notify]);

  async function handleRefresh() {
    await loadData({ silent: true });
    notify("Partner program refreshed", "success");
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time updates when new partner applications are submitted
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function setupRealtimeListener() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, onSnapshot } = firestore;
        const db = await getDbInstance();
        if (!db || !mounted) return;

        const applicationsQuery = query(collection(db, "partnerApplications"));
        unsubscribe = onSnapshot(
          applicationsQuery,
          (snapshot) => {
            if (!mounted) return;

            const queueIds = new Set(
              snapshot.docs
                .filter((doc) => {
                  const status = doc.data().status || "pending";
                  return status === "pending" || status === "hold";
                })
                .map((doc) => doc.id)
            );

            if (initialSnapshotRef.current) {
              initialSnapshotRef.current = false;
              knownQueueIdsRef.current = queueIds;
              setLiveConnected(true);
              return;
            }

            let hasNewSubmission = false;
            queueIds.forEach((id) => {
              if (!knownQueueIdsRef.current.has(id)) {
                hasNewSubmission = true;
              }
            });

            knownQueueIdsRef.current = queueIds;
            setLiveConnected(true);
            loadData({ silent: true });

            if (hasNewSubmission) {
              notify("New partner application submitted — added to your review queue", "info");
              setActiveView("queue");
            }
          },
          (error) => {
            console.error("[Partner Program] Realtime listener error:", error);
            if (mounted) setLiveConnected(false);
          }
        );
      } catch (error) {
        console.error("[Partner Program] Failed to start realtime listener:", error);
        if (mounted) setLiveConnected(false);
      }
    }

    setupRealtimeListener();

    return () => {
      mounted = false;
      unsubscribe?.();
      setLiveConnected(false);
    };
  }, [loadData, notify]);

  // Keep "Updated Xm ago" label fresh
  useEffect(() => {
    if (!lastUpdated) return;
    const timer = setInterval(() => setLastUpdated((prev) => (prev ? new Date(prev.getTime()) : prev)), 15000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Listen for approve requests from mini profile
  useEffect(() => {
    const handleApproveRequest = (e: CustomEvent) => {
      const applicationId = e.detail?.applicationId;
      if (applicationId) {
        const app = applications.find(a => a.id === applicationId);
        if (app) {
          setSelectedApplication(app);
          // Pre-populate service areas from application
          const areas = app.serviceArea ? app.serviceArea.split(",").map(s => s.trim()).filter(s => s) : [];
          setApproveServiceAreas(areas);
          setApprovePartnerShare(60);
          setApprovePlatformShare(40);
          setShowApproveModal(true);
        }
      }
    };
    window.addEventListener('partnerApproveRequest', handleApproveRequest as EventListener);
    return () => {
      window.removeEventListener('partnerApproveRequest', handleApproveRequest as EventListener);
    };
  }, [applications]);

  useEffect(() => {
    const handleRejectRequest = (e: CustomEvent) => {
      const applicationId = e.detail?.applicationId;
      const app = applications.find((a) => a.id === applicationId);
      if (app) {
        if (getApplicationDisplayStatus(app) === "rejected") {
          notify("This application was already removed from the partner program", "info");
          return;
        }
        setSelectedApplication(app);
        setShowRejectModal(true);
      }
    };
    const handleHoldRequest = (e: CustomEvent) => {
      const applicationId = e.detail?.applicationId;
      const app = applications.find((a) => a.id === applicationId);
      if (app) {
        setSelectedApplication(app);
        setShowHoldModal(true);
      }
    };
    const handleRemoveRequest = (e: CustomEvent) => {
      const { partnerId, reason } = e.detail || {};
      if (partnerId && reason) {
        requestRemovePartner(partnerId, reason);
      }
    };
    const handlePauseRequest = (e: CustomEvent) => {
      const partnerId = e.detail?.partnerId;
      if (partnerId) requestPausePartner(partnerId);
    };

    window.addEventListener("partnerRejectRequest", handleRejectRequest as EventListener);
    window.addEventListener("partnerHoldRequest", handleHoldRequest as EventListener);
    window.addEventListener("partnerRemoveRequest", handleRemoveRequest as EventListener);
    window.addEventListener("partnerPauseRequest", handlePauseRequest as EventListener);
    return () => {
      window.removeEventListener("partnerRejectRequest", handleRejectRequest as EventListener);
      window.removeEventListener("partnerHoldRequest", handleHoldRequest as EventListener);
      window.removeEventListener("partnerRemoveRequest", handleRemoveRequest as EventListener);
      window.removeEventListener("partnerPauseRequest", handlePauseRequest as EventListener);
    };
  }, [applications, partners]);

  async function handleApprove(applicationId: string) {
    if (!selectedApplication) return;
    
    if (approveServiceAreas.length === 0) {
      notify("Please select at least one service area", "error");
      return;
    }
    
    if (approvePartnerShare + approvePlatformShare !== 100) {
      notify("Revenue shares must total 100%", "error");
      return;
    }

    const application = selectedApplication;
    
    try {
      const response = await fetchWithAuth(`/api/admin/partners/applications/${applicationId}/approve`, {
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
        const clientEmailResult = await sendPartnerApprovalEmailClient(
          buildPartnerApprovalEmailParams({
            email: application.email,
            ownerName: application.ownerName,
            businessName: application.businessName,
            referralCode: data.referralCode,
            serviceAreas: approveServiceAreas,
            revenueSharePartner: approvePartnerShare,
            revenueSharePlatform: approvePlatformShare,
            signupLink: data.signupLink,
            partnerId: data.partnerId,
          })
        );

        notify(
          clientEmailResult.success
            ? "Partner approved and approval email sent!"
            : `Partner approved, but email failed: ${clientEmailResult.error || "Unknown EmailJS error"}`,
          clientEmailResult.success ? "success" : "error"
        );
        setShowApproveModal(false);
        setSelectedApplication(null);
        setShowMiniProfile(false);
        setSelectedPartner(null);
        setMiniProfileApplicationId(undefined);
        setMiniProfileApplicationStatus(undefined);
        setSelectedPartnerRecordId(null);
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Approval failed"}`, "error");
    }
  }

  async function handleReject(applicationId: string, reason: string) {
    try {
      const response = await fetchWithAuth(`/api/admin/partners/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      if (data.success) {
        notify(data.alreadyRejected ? "This application was already removed" : "Application rejected and removed from partner program", data.alreadyRejected ? "info" : "success");
        setShowRejectModal(false);
        setSelectedApplication(null);
        setShowMiniProfile(false);
        setSelectedPartner(null);
        setMiniProfileApplicationId(undefined);
        setMiniProfileApplicationStatus(undefined);
        setSelectedPartnerRecordId(null);
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Rejection failed"}`, "error");
    }
  }

  async function handleHold(applicationId: string, notes: string) {
    try {
      const response = await fetchWithAuth(`/api/admin/partners/applications/${applicationId}/hold`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      
      const data = await response.json();
      if (data.success) {
        notify("Application placed on hold");
        setShowHoldModal(false);
        setSelectedApplication(null);
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Hold failed"}`, "error");
    }
  }

  async function handlePausePartner(partnerId: string) {
    try {
      const response = await fetchWithAuth(`/api/admin/partners/${partnerId}/pause`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        notify("Partner paused");
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Pause failed"}`, "error");
    }
  }

  async function handleResumePartner(partnerId: string) {
    try {
      const response = await fetchWithAuth(`/api/admin/partners/${partnerId}/resume`, {
        method: "POST",
      });
      
      const data = await response.json();
      if (data.success) {
        notify("Partner resumed");
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Resume failed"}`, "error");
    }
  }

  async function handleRemovePartner(partnerId: string, reason: string) {
    try {
      const response = await fetchWithAuth(`/api/admin/partners/${partnerId}/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      
      const data = await response.json();
      if (data.success) {
        notify("Partner removed");
        setShowMiniProfile(false);
        setSelectedPartner(null);
        setMiniProfileApplicationId(undefined);
        setMiniProfileApplicationStatus(undefined);
        setSelectedPartnerRecordId(null);
        loadData();
      } else {
        notify(`Error: ${data.error}`, "error");
      }
    } catch (err: unknown) {
      notify(`Error: ${err instanceof Error ? err.message : "Remove failed"}`, "error");
    }
  }

  function requestPausePartner(partnerId: string) {
    setConfirmDialog({
      title: "Pause partner?",
      message: "They will not receive new job assignments until resumed.",
      confirmLabel: "Pause Partner",
      variant: "warning",
      onConfirm: () => handlePausePartner(partnerId),
    });
  }

  function requestRemovePartner(partnerId: string, reason: string) {
    const partner = partners.find((p) => p.id === partnerId);
    const unpaid = partner?.unpaidBalance || 0;
    setConfirmDialog({
      title: `Remove ${partner?.businessName || "partner"}?`,
      message:
        unpaid > 0
          ? `Warning: unpaid balance of $${unpaid.toLocaleString()}. This blocks future jobs and portal access.`
          : "This blocks future jobs and portal access.",
      confirmLabel: "Remove Partner",
      variant: "danger",
      onConfirm: () => handleRemovePartner(partnerId, reason),
    });
  }

  // Filter applications
  const matchesApplicationSearch = (app: PartnerApplication) =>
    !applicationSearch ||
    app.businessName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
    app.ownerName.toLowerCase().includes(applicationSearch.toLowerCase()) ||
    app.email.toLowerCase().includes(applicationSearch.toLowerCase()) ||
    app.phone.toLowerCase().includes(applicationSearch.toLowerCase());

  const sortApplications = (list: PartnerApplication[]) =>
    [...list].sort((a, b) => {
      const aTime = new Date((a.createdAt as { toDate?: () => Date })?.toDate?.() || a.createdAt || 0).getTime();
      const bTime = new Date((b.createdAt as { toDate?: () => Date })?.toDate?.() || b.createdAt || 0).getTime();
      return bTime - aTime;
    });

  const visibleApplications = applications.filter(
    (app) => getApplicationDisplayStatus(app) !== "rejected"
  );

  const queueApplications = sortApplications(
    visibleApplications.filter((app) => {
      const status = getApplicationDisplayStatus(app);
      return (status === "pending" || status === "hold") && matchesApplicationSearch(app);
    })
  );

  const filteredApplications = sortApplications(
    visibleApplications.filter((app) => {
      const matchesStatus =
        applicationStatusFilter === "all" ||
        getApplicationDisplayStatus(app) === applicationStatusFilter;
      return matchesApplicationSearch(app) && matchesStatus;
    })
  );

  const displayApplications = activeView === "queue" ? queueApplications : filteredApplications;

  // Filter partners
  const activePartnerCount = partners.filter((partner) => partner.status !== "removed").length;

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = !partnerSearch ||
      partner.businessName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      partner.ownerName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
      partner.email.toLowerCase().includes(partnerSearch.toLowerCase());
    
    const matchesStatus =
      partnerStatusFilter === "all"
        ? partner.status !== "removed"
        : partner.status === partnerStatusFilter;
    
    const matchesServiceArea = partnerServiceAreaFilter === "all" || 
      partner.serviceAreas?.some(area => area.toLowerCase().includes(partnerServiceAreaFilter.toLowerCase()));
    
    const matchesPhotoCompliance = !lowPhotoComplianceFilter || (partner.photoCompliance30d || 100) < 90;
    
    return matchesSearch && matchesStatus && matchesServiceArea && matchesPhotoCompliance;
  });

  const applicationStats = getApplicationStats(applications);

  if (loading) {
    return (
      <div className="pp-root">
        <div className="pp-list">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="pp-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const statusChips: { id: string; label: string }[] = [
    { id: "all", label: "All" },
    { id: "pending", label: "Needs Review" },
    { id: "hold", label: "On Hold" },
    { id: "approved", label: "Approved" },
  ];

  return (
    <div className="pp-root">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <header className="pp-header">
        <h2 className="pp-title">Partner Program</h2>
        <p className="pp-subtitle">
          Review applications in the queue, then manage active partners — all actions happen in the profile drawer.
        </p>
      </header>

      <div className="pp-stat-row">
        {[
          { label: "Needs Review", value: applicationStats.pending, color: "#4338ca", bg: "#eef2ff", filter: "pending" as const },
          { label: "On Hold", value: applicationStats.hold, color: "#d97706", bg: "#fffbeb", filter: "hold" as const },
          { label: "Approved", value: applicationStats.approved, color: "#16a34a", bg: "#ecfdf5", filter: "approved" as const },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            className="pp-stat-card"
            style={{ background: stat.bg }}
            onClick={() => {
              setActiveView(stat.filter === "pending" || stat.filter === "hold" ? "queue" : "all");
              setApplicationStatusFilter(stat.filter);
            }}
          >
            <div className="pp-stat-value" style={{ color: stat.color }}>{stat.value}</div>
            <div className="pp-stat-label">{stat.label}</div>
          </button>
        ))}
      </div>

      <div className="pp-command-bar">
        <div className="pp-tabs">
          <button
            type="button"
            className={`pp-tab ${activeView === "queue" ? "active" : ""}`}
            onClick={() => setActiveView("queue")}
          >
            Review Queue
            {applicationStats.pending + applicationStats.hold > 0 && (
              <span className="pp-tab-badge">{applicationStats.pending + applicationStats.hold}</span>
            )}
          </button>
          <button
            type="button"
            className={`pp-tab ${activeView === "partners" ? "active" : ""}`}
            onClick={() => setActiveView("partners")}
          >
            Active Partners
            <span className="pp-tab-badge">{activePartnerCount}</span>
          </button>
          <button
            type="button"
            className={`pp-tab ${activeView === "all" ? "active" : ""}`}
            onClick={() => {
              setActiveView("all");
              setApplicationStatusFilter("all");
            }}
          >
            All Applications
          </button>
        </div>
        <input
          type="text"
          className="pp-search"
          placeholder={activeView === "partners" ? "Search partners..." : "Search applications..."}
          value={activeView === "partners" ? partnerSearch : applicationSearch}
          onChange={(e) =>
            activeView === "partners"
              ? setPartnerSearch(e.target.value)
              : setApplicationSearch(e.target.value)
          }
        />
        <div className="pp-sync-controls">
          <span className={`pp-live-dot ${liveConnected ? "connected" : ""}`} title={liveConnected ? "Live updates on" : "Live updates off"} />
          <span className="pp-last-updated">{formatLastUpdated(lastUpdated)}</span>
          <button
            type="button"
            className={`pp-refresh-btn ${refreshing ? "spinning" : ""}`}
            onClick={handleRefresh}
            disabled={refreshing || loading}
            title="Refresh partner program data"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {activeView === "all" && (
        <div className="pp-chips">
          {statusChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`pp-chip ${applicationStatusFilter === chip.id ? "active" : ""}`}
              onClick={() => setApplicationStatusFilter(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {activeView !== "partners" && (
        <>
          <div className="pp-section-head">
            <h3 className="pp-section-title">
              {activeView === "queue"
                ? `Review Queue (${displayApplications.length})`
                : `Applications (${displayApplications.length})`}
            </h3>
          </div>

          {displayApplications.length === 0 ? (
            <div className="pp-empty">
              <div className="pp-empty-icon">{activeView === "queue" ? "✓" : "📋"}</div>
              <p className="pp-empty-title">
                {activeView === "queue" ? "You're all caught up" : "No applications found"}
              </p>
              <p className="pp-empty-text">
                {activeView === "queue"
                  ? "No partner applications need review right now."
                  : "Try a different search or status filter."}
              </p>
            </div>
          ) : (
            <div className="pp-list">
              {displayApplications.map((app, index) => (
                <article
                  key={app.id}
                  className="pp-card"
                  style={{ animationDelay: `${index * 0.04}s` }}
                  onClick={() => openApplicationProfile(app)}
                >
                  <div className="pp-card-main">
                    <h4 className="pp-card-title">{app.businessName}</h4>
                    <p className="pp-card-meta">
                      {app.ownerName} · {app.email}
                    </p>
                    <p className="pp-card-meta">
                      {app.serviceType} · {app.serviceArea || "No service area"} · Applied {formatRelativeDate(app.createdAt)}
                    </p>
                  </div>
                  <div className="pp-card-side">
                    <span className={`pp-status-pill ${statusPillClass(app)}`}>
                      {getApplicationStatusLabel(app)}
                    </span>
                    {getApplicationDisplayStatus(app) === "approved" && app.linkedPartnerId && (
                      <button
                        type="button"
                        className="pp-resend-btn"
                        disabled={resendingApprovalEmailId === app.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          const linkedPartner = partners.find((partner) => partner.id === app.linkedPartnerId);
                          handleResendApprovalEmail({
                            recordId: app.id,
                            email: app.email,
                            ownerName: app.ownerName,
                            businessName: app.businessName,
                            partnerCode: linkedPartner?.partnerCode,
                            serviceAreas: linkedPartner?.serviceAreas || app.serviceArea,
                            revenueSharePartner: linkedPartner?.revenueSharePartner,
                            revenueSharePlatform: linkedPartner?.revenueSharePlatform,
                            partnerId: app.linkedPartnerId,
                          });
                        }}
                      >
                        {resendingApprovalEmailId === app.id ? "Sending..." : "Resend Email"}
                      </button>
                    )}
                    <button type="button" className="pp-review-btn" onClick={(e) => { e.stopPropagation(); openApplicationProfile(app); }}>
                      Review
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {activeView === "partners" && (
        <>
          <div className="pp-section-head">
            <h3 className="pp-section-title">Active Partners ({filteredPartners.length})</h3>
            <p className="pp-section-hint">Use <strong>Resend Email</strong> to send the approval signup link again.</p>
            <button
              type="button"
              className="pp-export-btn"
              onClick={() => downloadCSV(generatePartnersCSV(filteredPartners), "partners.csv")}
            >
              Export CSV
            </button>
          </div>

          <div className="pp-filters-row">
            <select className="pp-select" value={partnerStatusFilter} onChange={(e) => setPartnerStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="removed">Removed</option>
            </select>
            <select className="pp-select" value={partnerServiceAreaFilter} onChange={(e) => setPartnerServiceAreaFilter(e.target.value)}>
              <option value="all">All Service Areas</option>
              {[...metroAtlZones, ...georgiaCounties.map((c) => c.name)].map((area) => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
            <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.84rem", color: "#374151" }}>
              <input
                type="checkbox"
                checked={lowPhotoComplianceFilter}
                onChange={(e) => setLowPhotoComplianceFilter(e.target.checked)}
              />
              Low photo compliance (&lt;90%)
            </label>
          </div>

          {filteredPartners.length === 0 ? (
            <div className="pp-empty">
              <div className="pp-empty-icon">🤝</div>
              <p className="pp-empty-title">No partners found</p>
              <p className="pp-empty-text">Approved partners will appear here once applications are accepted.</p>
            </div>
          ) : (
            <div className="pp-list">
              {filteredPartners.map((partner, index) => (
                <article
                  key={partner.id}
                  className="pp-card"
                  style={{ animationDelay: `${index * 0.04}s` }}
                  onClick={() => openPartnerProfile(partner)}
                >
                  <div className="pp-card-main">
                    <h4 className="pp-card-title">{partner.businessName}</h4>
                    <p className="pp-card-meta">{partner.ownerName} · {partner.email}</p>
                    <p className="pp-card-meta">{partner.serviceAreas?.join(", ") || "No service areas"}</p>
                    <div className="pp-partner-metrics">
                      <span className="pp-partner-metric">Jobs 7d: <strong>{partner.jobsThisWeek || 0}</strong></span>
                      <span className="pp-partner-metric">Revenue 30d: <strong>${(partner.grossRevenueMTD || 0).toLocaleString()}</strong></span>
                      <span className="pp-partner-metric">Compliance: <strong>{partner.photoCompliance30d || 100}%</strong></span>
                    </div>
                  </div>
                  <div className="pp-card-side">
                    <span className={`pp-status-pill ${partnerStatusPillClass(partner.status)}`}>
                      {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                    </span>
                    {partner.status !== "removed" && (
                      <button
                        type="button"
                        className="pp-resend-btn"
                        disabled={resendingApprovalEmailId === partner.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResendApprovalEmail({
                            recordId: partner.id,
                            email: partner.email,
                            ownerName: partner.ownerName,
                            businessName: partner.businessName,
                            partnerCode: partner.partnerCode,
                            serviceAreas: partner.serviceAreas,
                            revenueSharePartner: partner.revenueSharePartner,
                            revenueSharePlatform: partner.revenueSharePlatform,
                            partnerId: partner.id,
                          });
                        }}
                      >
                        {resendingApprovalEmailId === partner.id ? "Sending..." : "Resend Email"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="pp-review-btn"
                      onClick={(e) => { e.stopPropagation(); openPartnerProfile(partner); }}
                    >
                      Manage
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onClose={() => setConfirmDialog(null)}
        />
      )}

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

      {/* Partner Mini Profile */}
      {selectedPartner && (
        <PartnerMiniProfile
          partner={selectedPartner}
          isOpen={showMiniProfile}
          onClose={() => {
            setShowMiniProfile(false);
            setSelectedPartner(null);
            setMiniProfileApplicationId(undefined);
            setMiniProfileApplicationStatus(undefined);
            setSelectedPartnerRecordId(null);
          }}
          onUpdate={loadData}
          onNotify={notify}
          applicationId={miniProfileApplicationId}
          applicationStatus={miniProfileApplicationStatus}
          partnerRecordId={selectedPartnerRecordId}
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
        maxWidth: "600px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto"
      }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
          Approve Partner
        </h3>

        {/* Partner Information Section */}
        <div style={{
          background: "#f9fafb",
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          border: "1px solid #e5e7eb"
        }}>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#111827" }}>
            Partner Information
          </h4>
          
          <div style={{ display: "grid", gap: "1rem" }}>
            {/* Who */}
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Owner Name
              </div>
              <div style={{ fontSize: "1rem", fontWeight: "600", color: "#111827" }}>
                {application.ownerName}
              </div>
            </div>

            {/* What Business */}
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Business Name
              </div>
              <div style={{ fontSize: "1rem", fontWeight: "600", color: "#111827" }}>
                {application.businessName}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Business Type
              </div>
              <div style={{ fontSize: "1rem", color: "#111827" }}>
                {application.serviceType}
              </div>
            </div>

            {/* Contact Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Email
                </div>
                <div style={{ fontSize: "0.875rem", color: "#111827" }}>
                  {application.email}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Phone
                </div>
                <div style={{ fontSize: "0.875rem", color: "#111827" }}>
                  {application.phone}
                </div>
              </div>
            </div>

            {/* Where - Service Area from Application */}
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Service Area (from application)
              </div>
              <div style={{ fontSize: "0.875rem", color: "#111827", padding: "0.5rem", background: "#ffffff", borderRadius: "4px", border: "1px solid #e5e7eb" }}>
                {application.serviceArea || "Not specified"}
              </div>
            </div>
          </div>
        </div>

        {/* Service Areas Selection - Simplified */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Service Areas (Required) - Edit if needed
          </label>
          <input
            type="text"
            value={serviceAreas.join(", ")}
            onChange={(e) => {
              const areas = e.target.value.split(",").map(s => s.trim()).filter(s => s);
              setServiceAreas(areas);
            }}
            placeholder="e.g., Metro Atlanta Core, Clayton, Cobb"
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem"
            }}
          />
          <div style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#6b7280" }}>
            Separate multiple areas with commas
          </div>
        </div>

        {/* Revenue Split - Simplified */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600", fontSize: "0.875rem" }}>
            Revenue Split
          </label>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <div style={{ flex: 1 }}>
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
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem"
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", textAlign: "center" }}>
                Partner %
              </div>
            </div>
            <div style={{ fontSize: "1.25rem", color: "#6b7280", paddingTop: "1rem" }}>/</div>
            <div style={{ flex: 1 }}>
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
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem"
                }}
              />
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", textAlign: "center" }}>
                Company %
              </div>
            </div>
          </div>
          <div style={{ 
            marginTop: "0.5rem", 
            fontSize: "0.875rem", 
            fontWeight: "600",
            color: partnerShare + platformShare === 100 ? "#16a34a" : "#dc2626",
            textAlign: "center"
          }}>
            Total: {partnerShare + platformShare}%
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
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
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#d1d5db"}
            onMouseLeave={(e) => e.currentTarget.style.background = "#e5e7eb"}
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
              cursor: serviceAreas.length === 0 || partnerShare + platformShare !== 100 ? "not-allowed" : "pointer",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => {
              if (serviceAreas.length > 0 && partnerShare + platformShare === 100) {
                e.currentTarget.style.background = "#15803d";
              }
            }}
            onMouseLeave={(e) => {
              if (serviceAreas.length > 0 && partnerShare + platformShare === 100) {
                e.currentTarget.style.background = "#16a34a";
              }
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
              ...applicationStatusStyle(application),
            }}>
              {getApplicationStatusLabel(application)}
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
