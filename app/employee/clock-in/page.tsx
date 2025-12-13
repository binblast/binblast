// app/employee/clock-in/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getAuthInstance } from "@/lib/firebase";
import { getEmployeeData, Employee } from "@/lib/employee-utils";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function ClockInPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      const auth = await getAuthInstance();
      const user = auth?.currentUser;
      if (!user) {
        router.push("/login?redirect=/employee/clock-in");
        return;
      }

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

  const handleClockIn = async () => {
    if (!employee) return;

    setIsClockInLoading(true);
    setError(null);

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
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clock in");
      }

      // Redirect to dashboard with success message
      router.push("/employee/dashboard");
    } catch (error: any) {
      setError(error.message || "Failed to clock in. Please try again.");
    } finally {
      setIsClockInLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0" }}>
          <div style={{ textAlign: "center", color: "#6b7280" }}>Loading...</div>
        </main>
      </>
    );
  }

  if (!employee) {
    return null;
  }

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "500px", margin: "0 auto" }}>
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb",
                textAlign: "center",
              }}
            >
              <h1
                style={{
                  fontSize: "1.75rem",
                  fontWeight: "600",
                  marginBottom: "0.5rem",
                  color: "#111827",
                }}
              >
                Welcome, {employee.firstName}
              </h1>
              <div style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "2rem" }}>
                {currentDate}
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: "700",
                  color: "#111827",
                  marginBottom: "2rem",
                }}
              >
                {currentTime}
              </div>

              {error && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "0.875rem",
                    marginBottom: "1.5rem",
                  }}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleClockIn}
                disabled={isClockInLoading}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  padding: "1rem",
                  borderRadius: "12px",
                  border: "none",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#ffffff",
                  background: isClockInLoading ? "#9ca3af" : "#16a34a",
                  cursor: isClockInLoading ? "not-allowed" : "pointer",
                  opacity: isClockInLoading ? 0.6 : 1,
                  transition: "all 0.2s",
                }}
                onMouseDown={(e) => {
                  if (!isClockInLoading) {
                    e.currentTarget.style.transform = "scale(0.98)";
                  }
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                {isClockInLoading ? "Processing..." : "CLOCK IN NOW"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

