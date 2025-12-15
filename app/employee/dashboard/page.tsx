// app/employee/dashboard/page.tsx
// Employee dashboard with training, clock-in, and job management
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TodayStatusBar } from "@/components/EmployeeDashboard/TodayStatusBar";
import { JobList } from "@/components/EmployeeDashboard/JobList";
import { JobDetailModal } from "@/components/EmployeeDashboard/JobDetailModal";
import { ProgressTracker } from "@/components/EmployeeDashboard/ProgressTracker";
import { PayPreview } from "@/components/EmployeeDashboard/PayPreview";
import { TrainingSection } from "@/components/EmployeeDashboard/TrainingSection";
import { EquipmentChecklist } from "@/components/EmployeeDashboard/EquipmentChecklist";
import {
  getEmployeeData,
  ClockInRecord,
  Employee,
} from "@/lib/employee-utils";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getAuthInstance } from "@/lib/firebase";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface Job {
  id: string;
  customerName?: string;
  userEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  binCount?: number;
  planType?: string;
  notes?: string;
  jobStatus?: "pending" | "in_progress" | "completed";
  flags?: string[];
  completionPhotoUrl?: string;
  employeeNotes?: string;
  completedAt?: any;
}

type DashboardTab = "home" | "training" | "equipment";

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [clockInStatus, setClockInStatus] = useState<ClockInRecord | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [certificationStatus, setCertificationStatus] = useState<any>(null);
  const [payPreview, setPayPreview] = useState({
    completedJobs: 0,
    payRatePerJob: 0,
    estimatedPay: 0,
  });

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    async function setupAuthListener() {
      try {
        const { onAuthStateChanged } = await import("@/lib/firebase");
        unsubscribe = await onAuthStateChanged(async (user) => {
          if (!isMounted) return;

          if (user) {
            // User is authenticated, load employee data
            await loadEmployeeData(user.uid);
          } else {
            // No user, redirect to login
            setLoading(false);
            router.push("/login?redirect=/employee/dashboard");
          }
        });
      } catch (error) {
        console.error("Error setting up auth listener:", error);
        if (isMounted) {
          setLoading(false);
          router.push("/login?redirect=/employee/dashboard");
        }
      }
    }

    setupAuthListener();

    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const loadCertificationStatus = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(`/api/employee/certification-status?employeeId=${employee.id}`);
      if (response.ok) {
        const data = await response.json();
        setCertificationStatus(data);
      }
    } catch (error) {
      console.error("Error loading certification status:", error);
    }
  }, [employee?.id]);

  const loadClockInStatus = useCallback(async () => {
    if (!employee?.id) return;
    try {
      // Use API route instead of direct Firestore query to avoid permission issues
      const response = await fetch(
        `/api/employee/clock-in-status?employeeId=${employee.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setClockInStatus(data.clockInStatus);
      }
    } catch (error) {
      console.error("Error loading clock-in status:", error);
    }
  }, [employee?.id]);

  const loadJobs = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `/api/employee/jobs?employeeId=${employee.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || []);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
    }
  }, [employee?.id]);

  const loadPayPreview = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `/api/employee/pay-preview?employeeId=${employee.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setPayPreview({
          completedJobs: data.completedJobs || 0,
          payRatePerJob: data.payRatePerJob || 0,
          estimatedPay: data.estimatedPay || 0,
        });
      }
    } catch (error) {
      console.error("Error loading pay preview:", error);
    }
  }, [employee?.id]);

  const setupJobsListener = useCallback(async (): Promise<(() => void) | undefined> => {
    if (!employee?.id || !clockInStatus?.isActive) return;

    try {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const { getTodayDateString } = await import("@/lib/employee-utils");

      const today = getTodayDateString();
      const cleaningsRef = collection(db, "scheduledCleanings");
      const jobsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employee.id),
        where("scheduledDate", "==", today)
      );

      const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
        const updatedJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[];
        setJobs(updatedJobs);
        loadPayPreview(); // Refresh pay preview when jobs change
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up jobs listener:", error);
      return undefined;
    }
  }, [employee?.id, clockInStatus?.isActive, loadPayPreview]);

  useEffect(() => {
    if (employee?.id) {
      loadCertificationStatus();
      loadClockInStatus();
      loadJobs();
      loadPayPreview();
    }
  }, [employee?.id, loadCertificationStatus, loadClockInStatus, loadJobs, loadPayPreview]);

  useEffect(() => {
    if (!clockInStatus?.isActive || !employee?.id) return;
    
    // Set up real-time listener for jobs
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;
    
    setupJobsListener().then((cleanup) => {
      if (isMounted) {
        unsubscribe = cleanup;
      } else if (cleanup) {
        // Component unmounted before listener was set up, clean up immediately
        cleanup();
      }
    });
    
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [clockInStatus?.isActive, employee?.id, setupJobsListener]);

  const loadEmployeeData = async (userId: string) => {
    try {
      const { getEmployeeData } = await import("@/lib/employee-utils");
      const employeeData = await getEmployeeData(userId);
      
      if (!employeeData) {
        router.push("/login");
        return;
      }

      if (employeeData.role !== "employee") {
        router.push("/dashboard");
        return;
      }

      setEmployee(employeeData);
    } catch (error) {
      console.error("Error loading employee data:", error);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };


  const handleClockIn = async () => {
    if (!employee) return;

    // Check certification before clock-in
    if (certificationStatus && !certificationStatus.canClockIn) {
      if (certificationStatus.status === "expired") {
        alert(`Your certification has expired. Please complete re-certification training before clocking in.\n\nExpired modules: ${certificationStatus.expiredModules.join(", ")}`);
      } else {
        alert(`You must complete all required training modules before clocking in.\n\nCompleted: ${certificationStatus.completedModules}/${certificationStatus.totalModules}\nMissing: ${certificationStatus.missingModules.join(", ")}`);
      }
      setActiveTab("training");
      return;
    }

    setIsClockInLoading(true);
    try {
      const response = await fetch("/api/employee/clock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          employeeEmail: employee.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.certificationStatus) {
          // Certification issue - reload status
          await loadCertificationStatus();
        }
        throw new Error(error.message || "Failed to clock in");
      }

      // Refresh all data after clock-in
      await loadCertificationStatus();
      await loadClockInStatus();
      await loadJobs();
      await loadPayPreview();
      // Set up real-time listener for jobs
      await setupJobsListener();
    } catch (error: any) {
      alert(error.message || "Failed to clock in. Please try again.");
    } finally {
      setIsClockInLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!employee) return;

    const completedCount = jobs.filter((j) => j.jobStatus === "completed").length;
    const estimatedPay = payPreview.estimatedPay;

    const confirmed = window.confirm(
      `End Your Shift?\n\nYou've completed ${completedCount} jobs today.\nEstimated pay: $${estimatedPay.toFixed(2)}\n\nClick OK to clock out.`
    );

    if (!confirmed) return;

    setIsClockInLoading(true);
    try {
      const response = await fetch("/api/employee/clock-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to clock out");
      }

      await loadClockInStatus();
    } catch (error: any) {
      alert(error.message || "Failed to clock out. Please try again.");
    } finally {
      setIsClockInLoading(false);
    }
  };

  const handleStartJob = async (jobId: string) => {
    if (!employee) return;

    try {
      const response = await fetch(`/api/employee/jobs/${jobId}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start job");
      }

      await loadJobs();
    } catch (error: any) {
      throw error;
    }
  };

  const handleCompleteJob = async (
    jobId: string,
    data: {
      completionPhotoUrl?: string;
      insidePhotoUrl?: string;
      outsidePhotoUrl?: string;
      employeeNotes?: string;
      binCount?: number;
      stickerStatus?: "existing" | "placed" | "none";
      stickerPlaced?: boolean;
    }
  ) => {
    if (!employee) return;

    try {
      const response = await fetch(`/api/employee/jobs/${jobId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          ...data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete job");
      }

      // Refresh jobs and pay preview immediately
      await loadJobs();
      await loadPayPreview();
      // Also refresh clock-in status to update jobs remaining count
      await loadClockInStatus();
    } catch (error: any) {
      throw error;
    }
  };

  const handleFlagJob = async (jobId: string, flag: string) => {
    if (!employee) return;

    try {
      const response = await fetch(`/api/employee/jobs/${jobId}/flag`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: employee.id,
          flag,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to flag job");
      }

      await loadJobs();
    } catch (error: any) {
      throw error;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main 
          className="employee-dashboard"
          style={{ 
            minHeight: "calc(100vh - 80px)", 
            padding: "clamp(1rem, 4vw, 2rem)"
          }}
        >
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </main>
      </>
    );
  }

  if (!employee) {
    return null;
  }

  const completedJobs = jobs.filter((j) => j.jobStatus === "completed").length;
  const remainingJobs = jobs.length - completedJobs;
  const isClockedIn = clockInStatus?.isActive === true;

  return (
    <>
      <Navbar />
      <main
        style={{
          minHeight: "calc(100vh - 80px)",
          background: "#f9fafb",
          paddingBottom: "clamp(1rem, 4vw, 2rem)",
          paddingTop: "clamp(1rem, 4vw, 2rem)",
        }}
        className="employee-dashboard"
      >
        <div style={{ 
          maxWidth: "800px", 
          margin: "0 auto", 
          padding: "clamp(1rem, 4vw, 1.5rem)", 
          width: "100%",
          boxSizing: "border-box"
        }}>
          {/* Certification Warning Banner */}
          {certificationStatus && !certificationStatus.isCertified && (
            <div
              style={{
                padding: "1rem",
                background: certificationStatus.status === "expired" ? "#fee2e2" : "#fef3c7",
                border: `2px solid ${certificationStatus.status === "expired" ? "#fecaca" : "#fde68a"}`,
                borderRadius: "8px",
                marginBottom: "1rem",
                color: certificationStatus.status === "expired" ? "#991b1b" : "#92400e",
              }}
            >
              <div style={{ fontWeight: "700", marginBottom: "0.5rem", fontSize: "1rem" }}>
                {certificationStatus.status === "expired" ? "Certification Expired" : "Certification Required"}
              </div>
              <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                {certificationStatus.status === "expired"
                  ? `Your certification has expired. ${certificationStatus.expiredModules.length} module(s) need to be retaken.`
                  : `Complete all ${certificationStatus.totalModules} required training modules to become certified. ${certificationStatus.completedModules}/${certificationStatus.totalModules} completed.`}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: "600" }}>
                {certificationStatus.status === "expired"
                  ? "You cannot clock in or receive route assignments until re-certified."
                  : "You cannot clock in or receive route assignments until certified."}
              </div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab("training");
                }}
                type="button"
                style={{
                  marginTop: "0.75rem",
                  padding: "0.5rem 1rem",
                  background: certificationStatus.status === "expired" ? "#dc2626" : "#f59e0b",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                {certificationStatus.status === "expired" ? "Go to Training →" : "Complete Training →"}
              </button>
            </div>
          )}

          <TodayStatusBar
            employeeName={`${employee.firstName} ${employee.lastName}`}
            clockInStatus={clockInStatus}
            jobsRemaining={remainingJobs}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            isClockInLoading={isClockInLoading}
            canClockIn={certificationStatus?.canClockIn ?? false}
            certificationStatus={certificationStatus?.status}
            certificationExpiresAt={certificationStatus?.expiresAt}
            certificationDaysRemaining={certificationStatus?.daysUntilExpiration}
          />

          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginTop: "1.5rem",
              marginBottom: "1.5rem",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab("home");
              }}
              type="button"
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "transparent",
                fontSize: "0.95rem",
                fontWeight: "600",
                color: activeTab === "home" ? "#16a34a" : "#6b7280",
                cursor: "pointer",
                borderBottom: activeTab === "home" ? "2px solid #16a34a" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.2s",
              }}
            >
              Home
            </button>
            {/* Only show Training tab if not certified */}
            {(!certificationStatus?.isCertified) && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setActiveTab("training");
                }}
                type="button"
                style={{
                  padding: "0.75rem 1.5rem",
                  border: "none",
                  background: "transparent",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  color: activeTab === "training" ? "#16a34a" : "#6b7280",
                  cursor: "pointer",
                  borderBottom: activeTab === "training" ? "2px solid #16a34a" : "2px solid transparent",
                  marginBottom: "-2px",
                  transition: "all 0.2s",
                }}
              >
                Training
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab("equipment");
              }}
              type="button"
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "transparent",
                fontSize: "0.95rem",
                fontWeight: "600",
                color: activeTab === "equipment" ? "#16a34a" : "#6b7280",
                cursor: "pointer",
                borderBottom: activeTab === "equipment" ? "2px solid #16a34a" : "2px solid transparent",
                marginBottom: "-2px",
                transition: "all 0.2s",
              }}
            >
              Equipment
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "home" && (
            <>
              {/* Step-Based UI Guide */}
              {isClockedIn && (
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    marginBottom: "1.5rem",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1rem",
                      fontWeight: "600",
                      color: "#111827",
                      marginBottom: "1rem",
                    }}
                  >
                    Your Workflow:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#16a34a",
                        fontWeight: "600",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#d1fae5",
                          color: "#16a34a",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                        }}
                      >
                        ✓
                      </span>
                      Clock In
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#2563eb",
                        fontWeight: "600",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#dbeafe",
                          color: "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                        }}
                      >
                        2
                      </span>
                      View Jobs
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#f3f4f6",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                        }}
                      >
                        3
                      </span>
                      Complete Job (with required photos)
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#f3f4f6",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                        }}
                      >
                        4
                      </span>
                      Upload Photos (inside + outside required)
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      <span
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          background: "#f3f4f6",
                          color: "#6b7280",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "700",
                          fontSize: "0.75rem",
                        }}
                      >
                        5
                      </span>
                      Submit Job
                    </div>
                  </div>
                </div>
              )}

              {/* Today's Route - Primary Focus */}
              <div style={{ marginBottom: "1.5rem" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "1rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "700",
                      color: "#111827",
                    }}
                  >
                    Today&apos;s Route
                  </h2>
                  {isClockedIn && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                        fontWeight: "600",
                      }}
                    >
                      {completedJobs} / {jobs.length} completed
                    </div>
                  )}
                </div>
                
                {isClockedIn && (
                  <>
                    <ProgressTracker
                      completed={completedJobs}
                      remaining={remainingJobs}
                      total={jobs.length}
                    />

                    <PayPreview
                      completedJobs={payPreview.completedJobs}
                      payRatePerJob={payPreview.payRatePerJob}
                      estimatedPay={payPreview.estimatedPay}
                      isClockedIn={isClockedIn}
                    />
                  </>
                )}

                <JobList
                  jobs={jobs}
                  onJobClick={(job) => {
                    setSelectedJob(job);
                    setIsModalOpen(true);
                  }}
                  isClockedIn={isClockedIn}
                />
              </div>
            </>
          )}

          {activeTab === "training" && employee && !certificationStatus?.isCertified && (
            <TrainingSection employeeId={employee.id} />
          )}

          {activeTab === "equipment" && (
            <EquipmentChecklist 
              employeeId={employee.id}
              isClockedIn={isClockedIn}
            />
          )}
        </div>
      </main>

      <JobDetailModal
        job={selectedJob}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedJob(null);
        }}
        onStartJob={handleStartJob}
        onCompleteJob={handleCompleteJob}
        onFlagJob={handleFlagJob}
        employeeId={employee.id}
      />
    </>
  );
}

