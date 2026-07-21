// app/operator/employees/[employeeId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CurrentShiftCard } from "@/components/OperatorDashboard/EmployeeDetail/CurrentShiftCard";
import { ZonesCountiesPanel } from "@/components/OperatorDashboard/EmployeeDetail/ZonesCountiesPanel";
import { CustomerAssignmentModule } from "@/components/OperatorDashboard/EmployeeDetail/CustomerAssignmentModule";
import { RouteMap } from "@/components/OperatorDashboard/EmployeeDetail/RouteMap";
import { WeeklyScheduleEditor } from "@/components/OperatorDashboard/EmployeeDetail/WeeklyScheduleEditor";
import { StopList } from "@/components/OperatorDashboard/EmployeeDetail/StopList";
import { ProofOfWorkSection } from "@/components/OperatorDashboard/EmployeeDetail/ProofOfWorkSection";
import { MessageEmployeeModal } from "@/components/OperatorDashboard/EmployeeDetail/MessageEmployeeModal";
import { FlagIssueModal } from "@/components/OperatorDashboard/EmployeeDetail/FlagIssueModal";
import { TrainingStatus } from "@/components/OperatorDashboard/EmployeeDetail/TrainingStatus";
import { EmployeeIssuesPanel } from "@/components/OperatorDashboard/EmployeeDetail/EmployeeIssuesPanel";
import { EmployeeTaxDocuments } from "@/components/OperatorDashboard/EmployeeDetail/EmployeeTaxDocuments";
import { canAccessBusinessCommandCenter } from "@/lib/owner-auth";
import { getCurrentPathWithSearch, subscribeAuthState } from "@/lib/auth-session";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  serviceArea: string[];
  status?: string;
}

interface ShiftStatus {
  shiftStatus: "not_started" | "clocked_in" | "completed";
  shiftStartTime: any;
  expectedEndTime: any;
}

export default function EmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const employeeId = params?.employeeId as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [managerId, setManagerId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<string>(searchParams.get("tab") || "overview");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [terminating, setTerminating] = useState(false);
  const [terminateReason, setTerminateReason] = useState("");

  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    async function setupAccessCheck() {
      unsubscribe = await subscribeAuthState(async (user) => {
        if (!mounted) return;

        if (!user) {
          const redirect = encodeURIComponent(getCurrentPathWithSearch());
          router.push(`/login?redirect=${redirect}`);
          return;
        }

        try {
          const { getDbInstance } = await import("@/lib/firebase");
          const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
          const firestore = await safeImportFirestore();
          const { doc, getDoc } = firestore;

          const db = await getDbInstance();
          if (!db) {
            setLoading(false);
            return;
          }

          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (!userDoc.exists()) {
            const redirect = encodeURIComponent(getCurrentPathWithSearch());
            router.push(`/login?redirect=${redirect}`);
            return;
          }

          const userData = userDoc.data();
          const role = userData.role;
          const email = user.email;

          if (!canAccessBusinessCommandCenter(email, role)) {
            router.push("/dashboard");
            return;
          }

          setUserRole(role);
          setManagerId(user.uid);
          setLoading(false);
        } catch (error) {
          console.error("Error checking access:", error);
          const redirect = encodeURIComponent(getCurrentPathWithSearch());
          router.push(`/login?redirect=${redirect}`);
        }
      });
    }

    setupAccessCheck();

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [router]);

  useEffect(() => {
    if (employeeId && userRole) {
      loadEmployeeData();
      loadShiftStatus();
    }
  }, [employeeId, userRole]);

  useEffect(() => {
    if (!employeeId || !userRole) return;

    loadStops();
    loadLocation();

    const shiftInterval = setInterval(loadShiftStatus, 30000);
    const stopsInterval = setInterval(() => {
      loadStops();
      loadLocation();
    }, 20000);

    return () => {
      clearInterval(shiftInterval);
      clearInterval(stopsInterval);
    };
  }, [employeeId, userRole]);

  const loadEmployeeData = async () => {
    try {
      const response = await fetch(`/api/operator/employee-status`);
      if (response.ok) {
        const data = await response.json();
        const foundEmployee = data.employees?.find((emp: any) => emp.id === employeeId);
        if (foundEmployee) {
          const nameParts = foundEmployee.name.split(" ");
          setEmployee({
            id: foundEmployee.id,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: foundEmployee.email,
            phone: foundEmployee.phone || foundEmployee.phoneNumber || undefined,
            serviceArea: foundEmployee.serviceArea || [],
            status: foundEmployee.status || "active",
          });
        }
      }
    } catch (error) {
      console.error("Error loading employee data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadShiftStatus = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/shift-status`);
      if (response.ok) {
        const data = await response.json();
        setShiftStatus(data);
      }
    } catch (error) {
      console.error("Error loading shift status:", error);
    }
  };

  const loadLocation = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/location`);
      if (response.ok) {
        const data = await response.json();
        if (data.location) {
          setEmployeeLocation({
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          });
        }
      }
    } catch (error) {
      console.error("Error loading location:", error);
    }
  };

  const loadStops = async () => {
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/stops?skipGeocode=1`,
        { cache: "no-store" }
      );
      if (response.ok) {
        const data = await response.json();
        const todayStops = (data.todayStops || []) as Array<{
          id: string;
          routeSequence?: number;
          scheduledTime?: string;
          scheduledDate?: string;
          status?: string;
          jobStatus?: string;
        }>;

        todayStops.sort((a, b) => {
          if (typeof a.routeSequence === "number" && typeof b.routeSequence === "number") {
            return a.routeSequence - b.routeSequence;
          }
          return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
        });

        setStops(todayStops);
      }
    } catch (error) {
      console.error("Error loading stops:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadEmployeeData(),
        loadShiftStatus(),
        loadLocation(),
        loadStops(),
      ]);
      setRefreshKey((k) => k + 1);
    } finally {
      setRefreshing(false);
    }
  };

  const handleTerminate = async () => {
    setTerminating(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/terminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: terminateReason }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.error || "Failed to remove employee");
        return;
      }
      router.push("/dashboard");
    } catch (error) {
      console.error("Error terminating employee:", error);
      alert("Failed to remove employee. Please try again.");
    } finally {
      setTerminating(false);
      setShowTerminateModal(false);
    }
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "N/A";
    }
  };

  const getCurrentDate = () => {
    return new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading || !userRole) {
    return (
      <>
        <Navbar />
        <main className="page-main" style={{ background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </main>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <Navbar />
        <main className="page-main" style={{ background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#dc2626" }}>Employee not found</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="page-main dashboard-shell" style={{ background: "#f9fafb" }}>
        <div className="container">
          <div className="dashboard-shell" style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1rem" }}>
            {/* Header Section */}
            <div style={{ marginBottom: "2rem" }}>
              <button
                onClick={() => router.back()}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  cursor: "pointer",
                  marginBottom: "1rem",
                }}
              >
                ← Back
              </button>
              
              <div className="mobile-stack-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h1 style={{ fontSize: "2rem", fontWeight: "700", color: "#111827", marginBottom: "0.5rem" }}>
                    {employee.firstName} {employee.lastName}
                  </h1>
                  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>{employee.email}</span>
                    {employee.phone && (
                      <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>• {employee.phone}</span>
                    )}
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: employee.status === "active" ? "#d1fae5" : "#fee2e2",
                      color: employee.status === "active" ? "#065f46" : "#991b1b",
                    }}>
                      {employee.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="employee-detail-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleRefresh()}
                    disabled={refreshing}
                    title="Reload shift status, stops, location, and all tab data"
                    style={{
                      padding: "0.5rem 1rem",
                      background: refreshing ? "#9ca3af" : "#3b82f6",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: refreshing ? "not-allowed" : "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => { if (!refreshing) e.currentTarget.style.opacity = "0.9"; }}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  {employee?.phone && (
                    <button
                      onClick={() => window.location.href = `tel:${employee.phone}`}
                      style={{
                        padding: "0.5rem 1rem",
                        background: "#16a34a",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "opacity 0.2s",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                    >
                      Call Employee
                    </button>
                  )}
                  <button
                    onClick={() => setShowMessageModal(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#6b7280",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  >
                    Message Employee
                  </button>
                  <button
                    onClick={() => setShowFlagModal(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "2px solid #3b82f6",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  >
                    Flag Issue
                  </button>
                  <button
                    onClick={() => setShowTerminateModal(true)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#ffffff",
                      color: "#991b1b",
                      border: "1px solid #fca5a5",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "opacity 0.2s",
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                  >
                    Remove Employee
                  </button>
                </div>
              </div>

              {/* Current Shift Status */}
              <div style={{
                padding: "1rem",
                background: shiftStatus?.shiftStatus === "clocked_in" ? "#d1fae5" : "#f3f4f6",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
              }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                    {getCurrentDate()}
                  </div>
                  <div style={{ fontSize: "1rem", fontWeight: "600", color: "#111827" }}>
                    Current Shift: {shiftStatus?.shiftStatus === "clocked_in" ? "Clocked In" :
                                   shiftStatus?.shiftStatus === "completed" ? "Completed" : "Not Started"}
                  </div>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Expected End: {shiftStatus?.expectedEndTime ? formatTime(shiftStatus.expectedEndTime) : "N/A"}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation" style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "2rem",
              borderBottom: "2px solid #e5e7eb",
              overflowX: "auto",
            }}>
              {[
                { id: "overview", label: "Overview" },
                { id: "assignment", label: "Assignment & Zones" },
                { id: "schedule", label: "Schedule" },
                { id: "stops", label: "Stops" },
                { id: "training", label: "Training" },
                { id: "photos", label: "Cleaning Photos" },
                { id: "issues", label: "Flagged Issues" },
                { id: "documents", label: "Tax & W-9" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid #16a34a" : "2px solid transparent",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === tab.id ? "600" : "400",
                    color: activeTab === tab.id ? "#16a34a" : "#6b7280",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
                  <CurrentShiftCard employeeId={employeeId} refreshKey={refreshKey} managerId={managerId} />
                  <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                    <RouteMap
                      employeeId={employeeId}
                      stops={stops}
                      employeeLocation={employeeLocation || undefined}
                      refreshKey={refreshKey}
                    />
                    <StopList employeeId={employeeId} refreshKey={refreshKey} managerId={managerId} />
                  </div>
                </div>
              )}

              {activeTab === "assignment" && (
                <div className="mobile-stack-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                  <ZonesCountiesPanel employeeId={employeeId} />
                  <CustomerAssignmentModule employeeId={employeeId} onAssign={handleRefresh} />
                </div>
              )}

              {activeTab === "schedule" && (
                <WeeklyScheduleEditor employeeId={employeeId} />
              )}

              {activeTab === "stops" && (
                <StopList employeeId={employeeId} refreshKey={refreshKey} managerId={managerId} />
              )}

              {activeTab === "training" && (
                <TrainingStatus employeeId={employeeId} />
              )}

              {activeTab === "photos" && (
                <ProofOfWorkSection employeeId={employeeId} refreshKey={refreshKey} />
              )}

              {activeTab === "issues" && (
                <EmployeeIssuesPanel
                  employeeId={employeeId}
                  refreshKey={refreshKey}
                  onIssueResolved={handleRefresh}
                />
              )}

              {activeTab === "documents" && (
                <EmployeeTaxDocuments employeeId={employeeId} refreshKey={refreshKey} />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      {employee && (
        <>
          <MessageEmployeeModal
            isOpen={showMessageModal}
            onClose={() => setShowMessageModal(false)}
            employeeId={employeeId}
            employeeName={`${employee.firstName} ${employee.lastName}`}
            employeeEmail={employee.email}
          />
          <FlagIssueModal
            isOpen={showFlagModal}
            onClose={() => setShowFlagModal(false)}
            employeeId={employeeId}
            employeeName={`${employee.firstName} ${employee.lastName}`}
            onSuccess={() => {
              setActiveTab("issues");
              setRefreshKey((k) => k + 1);
              handleRefresh();
            }}
          />
        </>
      )}

      {showTerminateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
          onClick={() => !terminating && setShowTerminateModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "480px",
              width: "100%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.25rem", fontWeight: "700", color: "#111827", marginBottom: "0.75rem" }}>
              Remove Employee from Roster?
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem", lineHeight: 1.5 }}>
              This will terminate {employee?.firstName} {employee?.lastName} and remove them from your active employee list.
              Their future jobs will be unassigned. This action cannot be undone from the dashboard.
            </p>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
              Reason (optional)
            </label>
            <textarea
              value={terminateReason}
              onChange={(e) => setTerminateReason(e.target.value)}
              rows={3}
              placeholder="e.g. Terminated, resigned, no longer available..."
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowTerminateModal(false)}
                disabled={terminating}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: terminating ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={terminating}
                style={{
                  padding: "0.625rem 1.25rem",
                  background: terminating ? "#9ca3af" : "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: terminating ? "not-allowed" : "pointer",
                }}
              >
                {terminating ? "Removing..." : "Remove Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
