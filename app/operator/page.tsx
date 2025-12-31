// app/operator/page.tsx
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

const ADMIN_EMAIL = "binblastcompany@gmail.com";

export default function OperatorPortalPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const user = auth.currentUser;
          setUserId(user.uid);
          setUserEmail(user.email || null);
          
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
              const email = user.email || "";
              
              setUserRole(role);
              
              // Check if user is operator/admin
              const isOperator = role === "operator" || role === "admin" || email === ADMIN_EMAIL;
              
              if (isOperator) {
                // Operator/Admin - redirect to dashboard
                router.push("/dashboard");
                return;
              }
            }
          }
        }
        
        const unsubscribe = await onAuthStateChanged(async (user) => {
          if (user) {
            setUserId(user.uid);
            setUserEmail(user.email || null);
            
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
                const email = user.email || "";
                
                setUserRole(role);
                
                // Check if user is operator/admin
                const isOperator = role === "operator" || role === "admin" || email === ADMIN_EMAIL;
                
                if (isOperator) {
                  // Operator/Admin - redirect to dashboard
                  router.push("/dashboard");
                  return;
                }
              }
            }
          } else {
            setUserId(null);
            setUserRole(null);
            setUserEmail(null);
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

  // If user is logged in but not an operator/admin, show message
  if (userId && userRole) {
    const email = userEmail || "";
    const isOperator = userRole === "operator" || userRole === "admin" || email === ADMIN_EMAIL;
    const isEmployee = userRole === "employee";
    
    if (!isOperator) {
      return (
        <>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
            <div className="container">
              <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <h1 className="section-title" style={{ marginBottom: "1rem" }}>
                  Admin/Operator Portal
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
                    This portal is for administrators and operators only. Please visit the appropriate portal for your role.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {isEmployee && <Link href="/employee" className="btn btn-primary">Go to Employee Portal</Link>}
                  <Link href="/customer" className="btn btn-primary">Go to Bin Blasters Portal</Link>
                  <Link href="/" className="btn" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>Return Home</Link>
                </div>
              </div>
            </div>
          </main>
        </>
      );
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Admin/Operator Portal
            </h1>
            <p style={{ 
              fontSize: "1.125rem", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "3rem"
            }}>
              Manage employees, view customer routes, track operations, monitor performance
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
                  Manage Employees
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  View employee details, track performance, manage schedules, and monitor clock-in/out status.
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
                  View Customer Routes
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Monitor all scheduled cleanings, assign jobs to employees, and track completion status.
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
                  Track Operations
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Monitor system performance, view analytics, and manage platform-wide settings.
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
                Administrative Features
              </h2>
              <ul style={{ 
                listStyle: "disc",
                paddingLeft: "1.5rem",
                color: "#0c4a6e",
                lineHeight: "1.8"
              }}>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Employee Management</strong> - View and manage all employees, their routes, and performance
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Customer Overview</strong> - Monitor all customers, subscriptions, and cleaning schedules
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Route Assignment</strong> - Assign jobs to employees and track completion
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Analytics & Reporting</strong> - View platform statistics and performance metrics
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>System Administration</strong> - Manage platform settings and configurations
                </li>
              </ul>
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
                    You are already logged in. Access your dashboard to manage operations.
                  </p>
                  <Link 
                    href="/dashboard"
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
                    Admin/Operator Login
                  </h2>
                  <PortalLoginForm 
                    expectedRole="operator" 
                    redirectPath="/dashboard"
                    portalName="Admin/Operator Portal"
                  />
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.75rem" }}>
                      Need administrative access?
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)" }}>
                      Please contact your system administrator for access credentials.
                    </p>
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

