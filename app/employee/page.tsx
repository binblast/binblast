// app/employee/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PortalLoginForm } from "@/components/PortalLoginForm";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function EmployeePortalPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const user = auth.currentUser;
          setUserId(user.uid);
          
          // Check user role
          const db = await getDbInstance();
          if (db) {
            const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
            const firestore = await safeImportFirestore();
            const { doc, getDoc } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const role = userData.role;
              setUserRole(role);
              
              // If logged in as employee, redirect to dashboard
              if (role === "employee") {
                router.push("/employee/dashboard");
                return;
              }
            }
          }
        }
        
        const unsubscribe = await onAuthStateChanged(async (user) => {
          if (user) {
            setUserId(user.uid);
            
            // Check user role
            const db = await getDbInstance();
            if (db) {
              const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
              const firestore = await safeImportFirestore();
              const { doc, getDoc } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;
                setUserRole(role);
                
                // If logged in as employee, redirect to dashboard
                if (role === "employee") {
                  router.push("/employee/dashboard");
                  return;
                }
              }
            }
          } else {
            setUserId(null);
            setUserRole(null);
          }
          setLoading(false);
        });
        
        setLoading(false);
        
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
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ textAlign: "center" }}>Loading...</div>
          </div>
        </main>
      </>
    );
  }

  // If user is logged in but not an employee, show message
  if (userId && userRole !== "employee") {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <h1 className="section-title" style={{ marginBottom: "1rem" }}>
                  Bin Blasters Portal
                </h1>
                <div style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "12px",
                  padding: "2rem",
                  color: "#dc2626",
                  marginBottom: "2rem"
                }}>
                  <p style={{ margin: 0, fontSize: "1rem" }}>
                    This portal is for Bin Blasters only. Please log in with an employee account or visit the appropriate portal for your role.
                  </p>
                </div>
              <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/login" className="btn btn-primary">Go to Login</Link>
                <Link href="/" className="btn" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>Return Home</Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Bin Blasters Portal
            </h1>
            <p style={{ 
              fontSize: "1.125rem", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "3rem"
            }}>
              Clock in, view route, upload before/after photos, track pay
            </p>

            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "2rem",
              marginBottom: "3rem"
            }}>
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  Clock In/Out
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Track your work hours and manage your schedule from anywhere.
                </p>
              </div>

              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  View Your Route
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  See all assigned jobs for the day with customer addresses and special instructions.
                </p>
              </div>

              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  Upload Photos
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Upload before and after photos for each job to track your work quality.
                </p>
              </div>
            </div>

            <div style={{
              background: "#f0f9ff",
              borderRadius: "20px",
              padding: "2.5rem",
              border: "2px solid #bae6fd",
              marginBottom: "2rem"
            }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "#0369a1" }}>
                Track Your Earnings
              </h2>
              <p style={{ color: "#0c4a6e", lineHeight: "1.8", marginBottom: "1rem" }}>
                Monitor your pay rate per job, view completed jobs, and track your total earnings over time.
              </p>
            </div>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb",
              textAlign: "center"
            }}>
              {userId ? (
                <div>
                  <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}>
                    You are already logged in. Access your dashboard to get started.
                  </p>
                  <Link 
                    href="/employee/dashboard"
                    className="btn btn-primary"
                    style={{
                      display: "inline-block",
                      padding: "0.75rem 2rem",
                      fontSize: "1rem",
                      fontWeight: "600"
                    }}
                  >
                    Go to Dashboard
                  </Link>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                    Bin Blasters Login
                  </h2>
                  <PortalLoginForm 
                    expectedRole="employee" 
                    redirectPath="/employee/dashboard"
                    portalName="Bin Blasters Portal"
                  />
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.75rem" }}>
                      Need access to the Bin Blasters Portal?
                    </p>
                    <Link 
                      href="/employee/register"
                      style={{
                        color: "var(--primary-color)",
                        fontWeight: "600",
                        textDecoration: "none",
                        fontSize: "0.875rem"
                      }}
                    >
                      Request Access
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

