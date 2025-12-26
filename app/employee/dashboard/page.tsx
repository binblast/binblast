// app/employee/dashboard/page.tsx
// Employee dashboard with training, clock-in, and job management
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { DailyMissionCard } from "@/components/EmployeeDashboard/DailyMissionCard";
import { JobList } from "@/components/EmployeeDashboard/JobList";
import { JobDetailModal } from "@/components/EmployeeDashboard/JobDetailModal";
import { ProgressTracker } from "@/components/EmployeeDashboard/ProgressTracker";
import { LiveEarningsTracker } from "@/components/EmployeeDashboard/LiveEarningsTracker";
import { BinBlasterLevel } from "@/components/EmployeeDashboard/BinBlasterLevel";
import { ToastContainer, Toast } from "@/components/EmployeeDashboard/Toast";
import { TrainingSection } from "@/components/EmployeeDashboard/TrainingSection";
import { EquipmentChecklist } from "@/components/EmployeeDashboard/EquipmentChecklist";
import { InteractiveWorkflow } from "@/components/EmployeeDashboard/InteractiveWorkflow";
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
  hasRequiredPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
  stickerStatus?: "existing" | "placed" | "none";
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
  const [workflowStep, setWorkflowStep] = useState<'start' | 'photos' | 'complete' | undefined>(undefined);
  const [payPreview, setPayPreview] = useState({
    completedJobs: 0,
    payRatePerJob: 0,
    estimatedPay: 0,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dashboardData, setDashboardData] = useState<{
    lifetimeJobs: number;
    todayStreak: number;
    routeName?: string;
    estimatedTime?: string;
  } | null>(null);

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

  const loadDashboardData = useCallback(async () => {
    if (!employee?.id) return;
    try {
      const response = await fetch(
        `/api/employee/dashboard?employeeId=${employee.id}`
      );
      if (response.ok) {
        const data = await response.json();
        setDashboardData({
          lifetimeJobs: data.lifetimeJobs || 0,
          todayStreak: data.todayStreak || 0,
          routeName: data.routeName,
          estimatedTime: data.estimatedTime,
        });
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    }
  }, [employee?.id]);

  const addToast = useCallback((message: string, type: Toast["type"] = "success") => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const setupJobsListener = useCallback(async (): Promise<(() => void) | undefined> => {
    if (!employee?.id) return; // Show jobs even if not clocked in

    try {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const { getTodayDateString } = await import("@/lib/employee-utils");

      const today = getTodayDateString();
      const cleaningsRef = collection(db, "scheduledCleanings");
      
      // Query for jobs assigned to this employee
      // Query only by assignedEmployeeId to avoid index requirement, then filter by date in memory
      const jobsQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employee.id)
      );

      const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
        const allJobs = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Job[];
        
        // Filter to only show today's and future jobs (scheduledDate >= today)
        const filteredJobs = allJobs.filter((job: any) => {
          return job.scheduledDate && job.scheduledDate >= today;
        });
        
        // Sort by date (today's first)
        filteredJobs.sort((a: any, b: any) => {
          const dateA = a.scheduledDate || "";
          const dateB = b.scheduledDate || "";
          return dateA.localeCompare(dateB);
        });
        
        // Filter to only show today's jobs for the main display
        const todayJobs = filteredJobs.filter((job: any) => job.scheduledDate === today);
        setJobs(todayJobs);
        loadPayPreview(); // Refresh pay preview when jobs change
        loadDashboardData(); // Refresh dashboard data when jobs change
      });

      return unsubscribe;
    } catch (error) {
      console.error("Error setting up jobs listener:", error);
      return undefined;
    }
  }, [employee?.id, loadPayPreview, loadDashboardData]);

  useEffect(() => {
    if (employee?.id) {
      loadCertificationStatus();
      loadClockInStatus();
      loadJobs();
      loadPayPreview();
      loadDashboardData();
    }

    // Listen for training progress updates to refresh certification status
    const handleTrainingProgressUpdate = () => {
      console.log("[Employee Dashboard] Training progress updated, refreshing certification status");
      if (employee?.id) {
        loadCertificationStatus();
      }
    };

    window.addEventListener('trainingProgressUpdated', handleTrainingProgressUpdate);

    return () => {
      window.removeEventListener('trainingProgressUpdated', handleTrainingProgressUpdate);
    };
  }, [employee?.id, loadCertificationStatus, loadClockInStatus, loadJobs, loadPayPreview, loadDashboardData]);

  useEffect(() => {
    if (!employee?.id) return;
    
    // Set up real-time listener for jobs (even if not clocked in, so employees can see assigned jobs)
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
  }, [employee?.id, setupJobsListener]);

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
      await loadDashboardData();
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

    // Optimistic UI update
    const previousCompleted = jobs.filter((j) => j.jobStatus === "completed").length;
    const job = jobs.find((j) => j.id === jobId);
    
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

      // Show celebration toast
      addToast(`✅ Bin Blasted! +$${payPreview.payRatePerJob.toFixed(2)}`, "success");

      // Refresh jobs and pay preview immediately
      await loadJobs();
      await loadPayPreview();
      await loadDashboardData();
      // Also refresh clock-in status to update jobs remaining count
      await loadClockInStatus();
    } catch (error: any) {
      // Rollback optimistic update on error
      addToast(`Failed to complete job: ${error.message}`, "error");
      throw error;
    }
  };

  const handleStartNextJob = async (job: Job) => {
    if (!employee) return;
    try {
      await handleStartJob(job.id);
      setSelectedJob(job);
      setIsModalOpen(true);
    } catch (error: any) {
      addToast(`Failed to start job: ${error.message}`, "error");
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

          <DailyMissionCard
            employeeName={`${employee.firstName} ${employee.lastName}`}
            clockInStatus={clockInStatus}
            jobsTotal={jobs.length}
            jobsCompleted={completedJobs}
            estimatedPay={payPreview.estimatedPay}
            payRatePerJob={payPreview.payRatePerJob}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            isClockInLoading={isClockInLoading}
            canClockIn={certificationStatus?.canClockIn ?? false}
            certificationStatus={certificationStatus?.status}
            certificationExpiresAt={certificationStatus?.expiresAt}
            certificationDaysRemaining={certificationStatus?.daysUntilExpiration}
            routeName={dashboardData?.routeName}
            estimatedTime={dashboardData?.estimatedTime}
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
              {/* Interactive Workflow */}
              <InteractiveWorkflow
                isClockedIn={isClockedIn}
                jobs={jobs}
                activeJob={selectedJob}
                onClockIn={handleClockIn}
                onJobClick={(job) => {
                  setSelectedJob(job);
                  setIsModalOpen(true);
                }}
                onStartJob={handleStartJob}
                onCompleteJob={handleCompleteJob}
                employeeId={employee.id}
                onWorkflowStepClick={(stepId, jobId) => {
                  // Handle workflow step clicks for custom navigation
                  if (stepId === 'uploadPhotos' && jobId) {
                    const job = jobs.find(j => j.id === jobId);
                    if (job) {
                      setSelectedJob(job);
                      setIsModalOpen(true);
                      // JobDetailModal will handle focusing on photos
                    }
                  } else if (stepId === 'completeJob' && jobId) {
                    const job = jobs.find(j => j.id === jobId);
                    if (job) {
                      setSelectedJob(job);
                      setIsModalOpen(true);
                      // JobDetailModal will handle focusing on completion
                    }
                  }
                }}
              />

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

                    <LiveEarningsTracker
                      completedJobs={payPreview.completedJobs}
                      payRatePerJob={payPreview.payRatePerJob}
                      estimatedPay={payPreview.estimatedPay}
                      isClockedIn={isClockedIn}
                      totalJobs={jobs.length}
                    />
                  </>
                )}

                {/* Bin Blaster Level Card */}
                {isClockedIn && dashboardData && (
                  <BinBlasterLevel
                    lifetimeJobs={dashboardData.lifetimeJobs}
                    todayStreak={dashboardData.todayStreak}
                    badges={[]}
                  />
                )}

                <JobList
                  jobs={jobs}
                  onJobClick={(job) => {
                    setSelectedJob(job);
                    setIsModalOpen(true);
                  }}
                  isClockedIn={isClockedIn}
                  onStartNextJob={handleStartNextJob}
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
          setWorkflowStep(undefined);
        }}
        onStartJob={handleStartJob}
        onCompleteJob={handleCompleteJob}
        onFlagJob={handleFlagJob}
        employeeId={employee.id}
        workflowStep={workflowStep}
        onStepComplete={(stepId) => {
          // Auto-advance workflow when steps complete
          if (stepId === 'startJob') {
            setWorkflowStep('photos');
          } else if (stepId === 'uploadPhotos') {
            setWorkflowStep('complete');
          } else if (stepId === 'completeJob') {
            // Move to next job or close modal
            setWorkflowStep(undefined);
            const nextJob = jobs.find(j => j.jobStatus === 'pending' || !j.jobStatus);
            if (nextJob) {
              setTimeout(() => {
                setSelectedJob(nextJob);
                setWorkflowStep('start');
                setIsModalOpen(true);
              }, 500);
            } else {
              setIsModalOpen(false);
              setSelectedJob(null);
            }
          }
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </>
  );
}

