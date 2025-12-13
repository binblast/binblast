// app/employee/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { TodayStatusBar } from "@/components/EmployeeDashboard/TodayStatusBar";
import { JobList } from "@/components/EmployeeDashboard/JobList";
import { JobDetailModal } from "@/components/EmployeeDashboard/JobDetailModal";
import { ProgressTracker } from "@/components/EmployeeDashboard/ProgressTracker";
import { PayPreview } from "@/components/EmployeeDashboard/PayPreview";
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

export default function EmployeeDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [clockInStatus, setClockInStatus] = useState<ClockInRecord | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [payPreview, setPayPreview] = useState({
    completedJobs: 0,
    payRatePerJob: 0,
    estimatedPay: 0,
  });

  useEffect(() => {
    loadEmployeeData();
  }, []);

  useEffect(() => {
    if (employee?.id) {
      loadClockInStatus();
      loadJobs();
      loadPayPreview();
    }
  }, [employee?.id]);

  useEffect(() => {
    if (!clockInStatus?.isActive || !employee?.id) return;
    
    // Set up real-time listener for jobs
    let unsubscribe: (() => void) | undefined;
    
    setupJobsListener().then((cleanup) => {
      unsubscribe = cleanup;
    });
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [clockInStatus?.isActive, employee?.id]);

  const loadEmployeeData = async () => {
    try {
      const auth = await getAuthInstance();
      const user = auth?.currentUser;
      if (!user) {
        router.push("/login?redirect=/employee/dashboard");
        return;
      }

      const { getEmployeeData } = await import("@/lib/employee-utils");
      const employeeData = await getEmployeeData(user.uid);
      
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

  const loadClockInStatus = async () => {
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
  };

  const loadJobs = async () => {
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
  };

  const loadPayPreview = async () => {
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
  };

  const setupJobsListener = async (): Promise<(() => void) | undefined> => {
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
  };

  const handleClockIn = async () => {
    if (!employee) return;

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
        throw new Error(error.message || "Failed to clock in");
      }

      // Refresh all data after clock-in
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
      employeeNotes?: string;
      binCount?: number;
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
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "2rem" }}>
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
          paddingBottom: "2rem",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "1rem", width: "100%" }}>
          <TodayStatusBar
            employeeName={`${employee.firstName} ${employee.lastName}`}
            clockInStatus={clockInStatus}
            jobsRemaining={remainingJobs}
            onClockIn={handleClockIn}
            onClockOut={handleClockOut}
            isClockInLoading={isClockInLoading}
          />

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

          <div style={{ marginBottom: "1.5rem" }}>
            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#111827",
              }}
            >
              Today&apos;s Route
            </h2>
            <JobList
              jobs={jobs}
              onJobClick={(job) => {
                setSelectedJob(job);
                setIsModalOpen(true);
              }}
              isClockedIn={isClockedIn}
            />
          </div>
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

