// app/operator/employees/[employeeId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
  const employeeId = params?.employeeId as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [employeeLocation, setEmployeeLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showFlagModal, setShowFlagModal] = useState(false);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    if (employeeId && userRole) {
      loadEmployeeData();
      loadShiftStatus();
      loadLocation();
      loadStops();
    }
  }, [employeeId, userRole]);

  const checkAccess = async () => {
    try {
      // Check user role from Firebase auth
      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      if (!auth || !auth.currentUser) {
        router.push("/login?redirect=/operator/employees/" + employeeId);
        return;
      }

      // Get user role from Firestore
      const { getDbInstance } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, getDoc } = firestore;

      const db = await getDbInstance();
      if (!db) return;

      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const role = userData.role;

        if (role !== "operator" && role !== "admin") {
          router.push("/dashboard");
          return;
        }

        setUserRole(role);
      } else {
        router.push("/login?redirect=/operator/employees/" + employeeId);
      }
    } catch (error) {
      console.error("Error checking access:", error);
      router.push("/login?redirect=/operator/employees/" + employeeId);
    }
  };

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
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        const allStops = [...(data.todayStops || []), ...(data.upcomingStops || [])];
        setStops(allStops);
      }
    } catch (error) {
      console.error("Error loading stops:", error);
    }
  };

  const handleRefresh = () => {
    loadShiftStatus();
    loadStops();
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
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </main>
      </>
    );
  }

  if (!employee) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "3rem 0", background: "#f9fafb" }}>
          <div style={{ textAlign: "center", color: "#dc2626" }}>Employee not found</div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "2rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "0 1rem" }}>
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
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
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
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleRefresh()}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#3b82f6",
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
                    Refresh
                  </button>
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
                    {shiftStatus?.shiftStartTime && ` • Started: ${formatTime(shiftStatus.shiftStartTime)}`}
                  </div>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Expected End: {shiftStatus?.expectedEndTime ? formatTime(shiftStatus.expectedEndTime) : "N/A"}
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "2rem",
              borderBottom: "2px solid #e5e7eb",
              overflowX: "auto",
            }}>
              {["overview", "assignment", "schedule", "stops", "proof"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab ? "2px solid #16a34a" : "2px solid transparent",
                    fontSize: "0.875rem",
                    fontWeight: activeTab === tab ? "600" : "400",
                    color: activeTab === tab ? "#16a34a" : "#6b7280",
                    cursor: "pointer",
                    textTransform: "capitalize",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tab === "overview" ? "Overview" :
                   tab === "assignment" ? "Assignment & Zones" :
                   tab === "schedule" ? "Schedule" :
                   tab === "stops" ? "Stops" : "Proof of Work"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div>
              {activeTab === "overview" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "2rem" }}>
                  <CurrentShiftCard employeeId={employeeId} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                    <RouteMap employeeId={employeeId} stops={stops} employeeLocation={employeeLocation || undefined} />
                    <StopList employeeId={employeeId} />
                  </div>
                </div>
              )}

              {activeTab === "assignment" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                  <ZonesCountiesPanel employeeId={employeeId} />
                  <CustomerAssignmentModule employeeId={employeeId} onAssign={handleRefresh} />
                </div>
              )}

              {activeTab === "schedule" && (
                <WeeklyScheduleEditor employeeId={employeeId} />
              )}

              {activeTab === "stops" && (
                <StopList employeeId={employeeId} />
              )}

              {activeTab === "proof" && (
                <ProofOfWorkSection employeeId={employeeId} />
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
          />
        </>
      )}
    </>
  );
}
