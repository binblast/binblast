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
  const [systemStatus, setSystemStatus] = useState<{ active: number; total: number } | null>(null);

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
            const { doc, getDoc, collection, getDocs } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const role = userData.role;
              const email = user.email || "";
              
              setUserRole(role);
              
              // Get system status if operator/admin
              const isOperator = role === "operator" || role === "admin" || email === ADMIN_EMAIL;
              if (isOperator) {
                // Get active employees count
                const employeesSnapshot = await getDocs(collection(db, "users"));
                let activeCount = 0;
                let totalCount = 0;
                employeesSnapshot.forEach((doc) => {
                  const data = doc.data();
                  if (data.role === "employee") {
                    totalCount++;
                    if (data.isActive !== false) {
                      activeCount++;
                    }
                  }
                });
                setSystemStatus({ active: activeCount, total: totalCount });
              }
              
              // Check if user is operator/admin
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
              const { doc, getDoc, collection, getDocs } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;
                const email = user.email || "";
                
                setUserRole(role);
                
                // Get system status if operator/admin
                const isOperator = role === "operator" || role === "admin" || email === ADMIN_EMAIL;
                if (isOperator) {
                  const employeesSnapshot = await getDocs(collection(db, "users"));
                  let activeCount = 0;
                  let totalCount = 0;
                  employeesSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.role === "employee") {
                      totalCount++;
                      if (data.isActive !== false) {
                        activeCount++;
                      }
                    }
                  });
                  setSystemStatus({ active: activeCount, total: totalCount });
                }
                
                // Check if user is operator/admin
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
            setSystemStatus(null);
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
                  Blast Command Portal
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
                    This portal is for Blast Command only. Please visit the appropriate portal for your role.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {isEmployee && <Link href="/employee" className="btn btn-primary">Go to Bin Blasters Portal</Link>}
                  <Link href="/customer" className="btn btn-primary">Go to Blast Clients Portal</Link>
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
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
          50% { box-shadow: 0 0 30px rgba(139, 92, 246, 0.5); }
        }
        .fade-in-up {
          animation: fadeInUp 0.6s ease-out;
        }
        .action-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .action-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }
        .icon-bounce:hover {
          animation: pulse 0.6s ease-in-out;
        }
        .glow-effect {
          animation: glow 2s ease-in-out infinite;
        }
        @media (max-width: 768px) {
          .action-card {
            padding: 1.5rem !important;
          }
          .decorative-element {
            display: none;
          }
        }
        @media (max-width: 480px) {
          .action-card {
            padding: 1.25rem !important;
          }
        }
      `}</style>
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "0", background: "linear-gradient(to bottom, #faf5ff 0%, #ffffff 40%)" }}>
        {/* Hero Section */}
        <section style={{ 
          padding: "clamp(3rem, 8vw, 5rem) 0 clamp(2rem, 5vw, 3rem) 0",
          background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden"
        }}>
          <div className="container" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
              {/* Headline */}
              <h1 style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                fontWeight: "800",
                marginBottom: "1rem",
                lineHeight: "1.2",
                textAlign: "center",
                animation: "fadeInUp 0.8s ease-out 0.1s both"
              }}>
                Blast Command Portal
              </h1>
              
              {/* Description */}
              <p style={{
                fontSize: "clamp(1rem, 3vw, 1.25rem)",
                marginBottom: "2rem",
                opacity: 0.95,
                maxWidth: "600px",
                margin: "0 auto 2rem auto",
                textAlign: "center",
                animation: "fadeInUp 0.8s ease-out 0.2s both"
              }}>
                Your mission control center. Manage employees, monitor operations, track performance, and keep everything running smoothly.
              </p>
              
              {/* Primary CTA */}
              {userId ? (
                <Link
                  href="/dashboard"
                  className="btn btn-primary"
                  style={{
                    display: "inline-block",
                    padding: "1rem 2.5rem",
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#7c3aed",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                    transition: "all 0.3s ease",
                    animation: "fadeInUp 0.8s ease-out 0.3s both"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(0, 0, 0, 0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
                  }}
                >
                  Go to Dashboard →
                </Link>
              ) : (
                <div style={{ animation: "fadeInUp 0.8s ease-out 0.3s both" }}>
                  <p style={{ marginBottom: "1rem", fontSize: "1rem", opacity: 0.9, textAlign: "center" }}>
                    Ready to take command?
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div className="decorative-element" style={{
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "clamp(200px, 50vw, 500px)",
            height: "clamp(200px, 50vw, 500px)",
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0,
            display: "none"
          }} />
        </section>

        <div className="container" style={{ padding: "clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 1.5rem)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Status Snapshot */}
            {userId && systemStatus && (
              <div style={{
                background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                borderRadius: "clamp(12px, 3vw, 16px)",
                padding: "clamp(1rem, 3vw, 1.5rem)",
                marginBottom: "clamp(2rem, 5vw, 3rem)",
                boxShadow: "0 4px 16px rgba(139, 92, 246, 0.3)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: "clamp(0.75rem, 2vw, 1rem)",
                animation: "fadeInUp 0.6s ease-out 0.4s both",
                textAlign: "center"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.25rem", textAlign: "center" }}>System Status</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700", textAlign: "center" }}>
                      {systemStatus.active} / {systemStatus.total} Active Employees
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  style={{
                    padding: "clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 1.5rem)",
                    background: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "clamp(6px, 2vw, 8px)",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: "600",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    transition: "all 0.2s ease",
                    fontSize: "clamp(0.875rem, 2.5vw, 1rem)",
                    minHeight: "44px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                >
                  View Dashboard →
                </Link>
              </div>
            )}

            {/* Interactive Action Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
              gap: "clamp(1rem, 3vw, 1.5rem)",
              marginBottom: "clamp(2rem, 5vw, 3rem)"
            }}>
              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
                borderRadius: "clamp(16px, 4vw, 20px)",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #c4b5fd",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.5s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "clamp(1.125rem, 3vw, 1.25rem)", fontWeight: "700", marginBottom: "clamp(0.5rem, 2vw, 0.75rem)", color: "#6d28d9", textAlign: "center" }}>
                  Manage Employees
                </h3>
                <p style={{ color: "#6b7280", fontSize: "clamp(0.875rem, 2.5vw, 0.95rem)", textAlign: "center", lineHeight: "1.6" }}>
                  View employee details, track performance, manage schedules, and monitor clock-in/out status.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
                borderRadius: "clamp(16px, 4vw, 20px)",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #c4b5fd",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.6s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "clamp(1.125rem, 3vw, 1.25rem)", fontWeight: "700", marginBottom: "clamp(0.5rem, 2vw, 0.75rem)", color: "#6d28d9", textAlign: "center" }}>
                  View Customer Routes
                </h3>
                <p style={{ color: "#6b7280", fontSize: "clamp(0.875rem, 2.5vw, 0.95rem)", textAlign: "center", lineHeight: "1.6" }}>
                  Monitor all scheduled cleanings, assign jobs to employees, and track completion status.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #faf5ff 100%)",
                borderRadius: "clamp(16px, 4vw, 20px)",
                padding: "clamp(1.25rem, 4vw, 2rem)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #c4b5fd",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.7s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "clamp(1.125rem, 3vw, 1.25rem)", fontWeight: "700", marginBottom: "clamp(0.5rem, 2vw, 0.75rem)", color: "#6d28d9", textAlign: "center" }}>
                  Track Operations
                </h3>
                <p style={{ color: "#6b7280", fontSize: "clamp(0.875rem, 2.5vw, 0.95rem)", textAlign: "center", lineHeight: "1.6" }}>
                  Monitor system performance, view analytics, and manage platform-wide settings.
                </p>
              </div>
            </div>

            {/* Administrative Features Section */}
            <div style={{
              background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              border: "2px solid #c4b5fd",
              marginBottom: "3rem",
              animation: "fadeInUp 0.6s ease-out 0.8s both"
            }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: "700", marginBottom: "1.5rem", color: "#6d28d9", textAlign: "center" }}>
                Administrative Features
              </h2>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: "1.5rem"
              }}>
                {[
                  { title: "Employee Management", desc: "View and manage all employees, their routes, and performance" },
                  { title: "Customer Overview", desc: "Monitor all customers, subscriptions, and cleaning schedules" },
                  { title: "Route Assignment", desc: "Assign jobs to employees and track completion" },
                  { title: "Analytics & Reporting", desc: "View platform statistics and performance metrics" },
                  { title: "System Administration", desc: "Manage platform settings and configurations" },
                  { title: "Notifications", desc: "Send alerts and updates to employees and customers" }
                ].map((feature, idx) => (
                  <div key={idx} style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    textAlign: "center",
                    transition: "transform 0.2s ease",
                    flex: "0 1 min(100%, 250px)",
                    minWidth: "min(100%, 250px)",
                    maxWidth: "100%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  >
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.25rem", color: "#6d28d9", textAlign: "center" }}>
                      {feature.title}
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0, lineHeight: "1.5", textAlign: "center" }}>
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Login Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
              border: "2px solid #c4b5fd",
              textAlign: "center",
              animation: "fadeInUp 0.6s ease-out 0.9s both"
            }}>
              {userId ? (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-dark)", textAlign: "center" }}>
                    You&apos;re All Set!
                  </h2>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-light)", fontSize: "1rem", textAlign: "center" }}>
                    Access your dashboard to manage operations and monitor system performance.
                  </p>
                  <Link 
                    href="/dashboard"
                    className="btn btn-primary"
                    style={{
                      display: "inline-block",
                      padding: "clamp(0.75rem, 3vw, 0.875rem) clamp(1.5rem, 5vw, 2.5rem)",
                      fontSize: "clamp(1rem, 3vw, 1.125rem)",
                      fontWeight: "600",
                      borderRadius: "clamp(10px, 3vw, 12px)",
                      background: "#8b5cf6",
                      border: "none",
                      color: "#ffffff",
                      transition: "all 0.3s ease",
                      minHeight: "44px",
                      width: "100%",
                      maxWidth: "400px"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(139, 92, 246, 0.4)";
                      e.currentTarget.style.background = "#7c3aed";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#8b5cf6";
                    }}
                  >
                    Go to Dashboard →
                  </Link>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)", textAlign: "center" }}>
                    Blast Command Login
                  </h2>
                  <PortalLoginForm 
                    expectedRole="operator" 
                    redirectPath="/dashboard"
                    portalName="Blast Command Portal"
                  />
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.75rem", textAlign: "center" }}>
                      Need administrative access?
                    </p>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)", textAlign: "center" }}>
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
