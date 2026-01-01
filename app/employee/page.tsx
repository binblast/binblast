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
  const [todaysJobs, setTodaysJobs] = useState<number | null>(null);

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
            const { doc, getDoc, collection, query, where, getDocs } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const role = userData.role;
              setUserRole(role);
              
              // Get today's jobs if logged in as employee
              if (role === "employee") {
                const today = new Date().toISOString().split('T')[0];
                const jobsQuery = query(
                  collection(db, "scheduledCleanings"),
                  where("assignedEmployeeId", "==", user.uid),
                  where("scheduledDate", "==", today)
                );
                const jobsSnapshot = await getDocs(jobsQuery);
                setTodaysJobs(jobsSnapshot.size);
              }
              
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
              const { doc, getDoc, collection, query, where, getDocs } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;
                setUserRole(role);
                
                // Get today's jobs if logged in as employee
                if (role === "employee") {
                  const today = new Date().toISOString().split('T')[0];
                  const jobsQuery = query(
                    collection(db, "scheduledCleanings"),
                    where("assignedEmployeeId", "==", user.uid),
                    where("scheduledDate", "==", today)
                  );
                  const jobsSnapshot = await getDocs(jobsQuery);
                  setTodaysJobs(jobsSnapshot.size);
                }
                
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
            setTodaysJobs(null);
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
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
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
        .icon-rotate:hover {
          animation: rotate 2s linear infinite;
        }
      `}</style>
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "0", background: "linear-gradient(to bottom, #fef3c7 0%, #ffffff 40%)" }}>
        {/* Hero Section */}
        <section style={{ 
          padding: "clamp(3rem, 8vw, 5rem) 0 clamp(2rem, 5vw, 3rem) 0",
          background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
          color: "#ffffff",
          position: "relative",
          overflow: "hidden"
        }}>
          <div className="container" style={{ position: "relative", zIndex: 1 }}>
            <div style={{ maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
              {/* Large Icon */}
              <div style={{
                fontSize: "5rem",
                marginBottom: "1.5rem",
                animation: "fadeInUp 0.8s ease-out"
              }}>
                ⚡
              </div>
              
              {/* Headline */}
              <h1 style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                fontWeight: "800",
                marginBottom: "1rem",
                lineHeight: "1.2",
                animation: "fadeInUp 0.8s ease-out 0.1s both"
              }}>
                Bin Blasters Portal
              </h1>
              
              {/* Description */}
              <p style={{
                fontSize: "clamp(1rem, 3vw, 1.25rem)",
                marginBottom: "2rem",
                opacity: 0.95,
                maxWidth: "600px",
                margin: "0 auto 2rem auto",
                animation: "fadeInUp 0.8s ease-out 0.2s both"
              }}>
                Your mobile command center. Clock in, view routes, upload photos, and track your earnings—all from your phone.
              </p>
              
              {/* Primary CTA */}
              {userId ? (
                <Link
                  href="/employee/dashboard"
                  className="btn btn-primary"
                  style={{
                    display: "inline-block",
                    padding: "1rem 2.5rem",
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#d97706",
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
                  <p style={{ marginBottom: "1rem", fontSize: "1rem", opacity: 0.9 }}>
                    Ready to start your shift?
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Decorative elements */}
          <div style={{
            position: "absolute",
            top: "-50%",
            right: "-10%",
            width: "500px",
            height: "500px",
            background: "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0
          }} />
        </section>

        <div className="container" style={{ padding: "clamp(2rem, 5vw, 3rem) 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Status Snapshot */}
            {userId && todaysJobs !== null && (
              <div style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "3rem",
                boxShadow: "0 4px 16px rgba(245, 158, 11, 0.3)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                animation: "fadeInUp 0.6s ease-out 0.4s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "2rem" }}>📋</div>
                  <div>
                    <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.25rem" }}>Today&apos;s Jobs</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{todaysJobs} {todaysJobs === 1 ? 'job' : 'jobs'} assigned</div>
                  </div>
                </div>
                <Link
                  href="/employee/dashboard"
                  style={{
                    padding: "0.5rem 1.5rem",
                    background: "rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    textDecoration: "none",
                    fontWeight: "600",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  }}
                >
                  View Route →
                </Link>
              </div>
            )}

            {/* Interactive Action Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1.5rem",
              marginBottom: "3rem"
            }}>
              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #fde68a",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.5s both"
              }}
              onClick={() => userId ? router.push("/employee/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">⏰</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#92400e", textAlign: "center" }}>
                  Clock In/Out
                </h3>
                <p style={{ color: "#78716c", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Track your work hours and manage your schedule from anywhere.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #fde68a",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.6s both"
              }}
              onClick={() => userId ? router.push("/employee/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">🗺️</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#92400e", textAlign: "center" }}>
                  View Your Route
                </h3>
                <p style={{ color: "#78716c", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  See all assigned jobs for the day with customer addresses and special instructions.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #fffbeb 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #fde68a",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.7s both"
              }}
              onClick={() => userId ? router.push("/employee/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">📸</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#92400e", textAlign: "center" }}>
                  Upload Photos
                </h3>
                <p style={{ color: "#78716c", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Upload before and after photos for each job to track your work quality.
                </p>
              </div>
            </div>

            {/* Features Section */}
            <div style={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              border: "2px solid #fde68a",
              marginBottom: "3rem",
              animation: "fadeInUp 0.6s ease-out 0.8s both"
            }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: "700", marginBottom: "1.5rem", color: "#92400e", textAlign: "center" }}>
                Track Your Earnings
              </h2>
              <p style={{ color: "#78716c", lineHeight: "1.8", marginBottom: "1.5rem", textAlign: "center", fontSize: "1.125rem" }}>
                Monitor your pay rate per job, view completed jobs, and track your total earnings over time.
              </p>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
                marginTop: "2rem"
              }}>
                {[
                  { icon: "💰", title: "Pay Per Job", desc: "See your rate for each cleaning" },
                  { icon: "✅", title: "Completed Jobs", desc: "Track your completed work" },
                  { icon: "📊", title: "Total Earnings", desc: "View your lifetime earnings" }
                ].map((feature, idx) => (
                  <div key={idx} style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    padding: "1.25rem",
                    textAlign: "center",
                    transition: "transform 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  >
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{feature.icon}</div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.25rem", color: "#92400e" }}>
                      {feature.title}
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#78716c", margin: 0 }}>
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
              border: "2px solid #fde68a",
              textAlign: "center",
              animation: "fadeInUp 0.6s ease-out 0.9s both"
            }}>
              {userId ? (
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    You&apos;re All Set!
                  </h2>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-light)", fontSize: "1rem" }}>
                    Access your dashboard to clock in and view your route.
                  </p>
                  <Link 
                    href="/employee/dashboard"
                    className="btn btn-primary"
                    style={{
                      display: "inline-block",
                      padding: "0.875rem 2.5rem",
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      borderRadius: "12px",
                      background: "#f59e0b",
                      border: "none",
                      color: "#ffffff",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(245, 158, 11, 0.4)";
                      e.currentTarget.style.background = "#d97706";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#f59e0b";
                    }}
                  >
                    Go to Dashboard →
                  </Link>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
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
                        color: "#d97706",
                        fontWeight: "600",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        transition: "color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#92400e";
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#d97706";
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      Request Access →
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
