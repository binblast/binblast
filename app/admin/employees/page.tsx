// app/admin/employees/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { EmployeeContactList } from "@/components/AdminDashboard/EmployeeContactList";
import { HireEmployeeForm } from "@/components/AdminDashboard/HireEmployeeForm";
import { EmployeeApplications } from "@/components/AdminDashboard/EmployeeApplications";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const ALLOWED_ADMIN_EMAILS = [
  "binblastcompany@gmail.com",
];

export default function AdminEmployeesPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"list" | "hire" | "applications">("list");
  const [showHireForm, setShowHireForm] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const email = auth.currentUser.email;
          setUserEmail(email || null);
          
          if (!email || !ALLOWED_ADMIN_EMAILS.includes(email)) {
            router.push("/login");
            return;
          }
          
          setLoading(false);
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user?.email) {
            setUserEmail(user.email);
            if (!ALLOWED_ADMIN_EMAILS.includes(user.email)) {
              router.push("/login");
              return;
            }
            setLoading(false);
          } else {
            router.push("/login");
          }
        });
        
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <p>Loading...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            {/* Header */}
            <div style={{ marginBottom: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "700", color: "var(--text-dark)" }}>
                  Employee Management
                </h1>
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "1rem", color: "#6b7280" }}>
                  Manage employees, schedules, and hiring
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    setActiveView("applications");
                    setShowHireForm(false);
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: activeView === "applications" ? "#16a34a" : "white",
                    color: activeView === "applications" ? "white" : "#6b7280",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Applications
                </button>
                <button
                  onClick={() => {
                    setShowHireForm(!showHireForm);
                    setActiveView("list");
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#16a34a",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {showHireForm ? "Cancel" : "+ Hire Employee"}
                </button>
              </div>
            </div>

            {/* Hire Employee Form */}
            {showHireForm && (
              <div style={{
                marginBottom: "2rem",
                padding: "2rem",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h2 style={{ margin: "0 0 1.5rem 0", fontSize: "1.5rem", fontWeight: "600" }}>
                  Create New Employee Account
                </h2>
                <HireEmployeeForm
                  onSuccess={() => {
                    setShowHireForm(false);
                    window.location.reload();
                  }}
                  onCancel={() => setShowHireForm(false)}
                />
              </div>
            )}

            {/* Applications View */}
            {activeView === "applications" && (
              <div style={{
                padding: "2rem",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <EmployeeApplications />
              </div>
            )}

            {/* Employee List */}
            {activeView === "list" && !showHireForm && (
              <div style={{
                padding: "2rem",
                background: "white",
                borderRadius: "12px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <EmployeeContactList
                  onEmployeeSelect={(employee) => {
                    router.push(`/admin/employees/${employee.id}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
