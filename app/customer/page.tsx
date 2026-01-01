// app/customer/page.tsx
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

export default function BlastClientsPortalPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nextCleaning, setNextCleaning] = useState<string | null>(null);

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
            const { doc, getDoc, collection, query, where, getDocs, orderBy, limit } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const role = userData.role;
              const userEmail = user.email || "";
              const ADMIN_EMAIL = "binblastcompany@gmail.com";
              
              setUserRole(role);
              
              // Get next cleaning if logged in
              const cleaningsQuery = query(
                collection(db, "scheduledCleanings"),
                where("userId", "==", user.uid),
                where("jobStatus", "in", ["scheduled", "pending"]),
                orderBy("scheduledDate", "asc"),
                limit(1)
              );
              const cleaningsSnapshot = await getDocs(cleaningsQuery);
              if (!cleaningsSnapshot.empty) {
                const nextClean = cleaningsSnapshot.docs[0].data();
                if (nextClean.scheduledDate) {
                  const date = new Date(nextClean.scheduledDate);
                  setNextCleaning(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
                }
              }
              
              // Check if user is customer (not employee, partner, or operator/admin)
              const isOperator = role === "operator" || role === "admin" || userEmail === ADMIN_EMAIL;
              const { getDashboardUrl } = await import("@/lib/partner-auth");
              const dashboardUrl = await getDashboardUrl(user.uid);
              const isPartner = dashboardUrl !== "/dashboard";
              
              if (role !== "employee" && !isPartner && !isOperator) {
                // Customer - redirect to dashboard
                router.push("/dashboard");
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
              const { doc, getDoc, collection, query, where, getDocs, orderBy, limit } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role;
                const userEmail = user.email || "";
                const ADMIN_EMAIL = "binblastcompany@gmail.com";
                
                setUserRole(role);
                
                // Get next cleaning if logged in
                const cleaningsQuery = query(
                  collection(db, "scheduledCleanings"),
                  where("userId", "==", user.uid),
                  where("jobStatus", "in", ["scheduled", "pending"]),
                  orderBy("scheduledDate", "asc"),
                  limit(1)
                );
                const cleaningsSnapshot = await getDocs(cleaningsQuery);
                if (!cleaningsSnapshot.empty) {
                  const nextClean = cleaningsSnapshot.docs[0].data();
                  if (nextClean.scheduledDate) {
                    const date = new Date(nextClean.scheduledDate);
                    setNextCleaning(date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
                  }
                }
                
                // Check if user is customer
                const isOperator = role === "operator" || role === "admin" || userEmail === ADMIN_EMAIL;
                const { getDashboardUrl } = await import("@/lib/partner-auth");
                const dashboardUrl = await getDashboardUrl(user.uid);
                const isPartner = dashboardUrl !== "/dashboard";
                
                if (role !== "employee" && !isPartner && !isOperator) {
                  // Customer - redirect to dashboard
                  router.push("/dashboard");
                  return;
                }
              }
            }
          } else {
            setUserId(null);
            setUserRole(null);
            setNextCleaning(null);
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

  // If user is logged in but not a customer, show message
  if (userId && userRole) {
    const userEmail = userId; // We'll check this properly
    const ADMIN_EMAIL = "binblastcompany@gmail.com";
    const isOperator = userRole === "operator" || userRole === "admin";
    const isEmployee = userRole === "employee";
    
    // We need to check if partner, but for now show message if employee or operator
    if (isEmployee || isOperator) {
      return (
        <>
          <Navbar />
          <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
            <div className="container">
              <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
                <h1 className="section-title" style={{ marginBottom: "1rem" }}>
                  Blast Clients Portal
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
                    This portal is for Blast Clients only. Please visit the appropriate portal for your role.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  {isEmployee && <Link href="/employee" className="btn btn-primary">Go to Bin Blasters Portal</Link>}
                  {isOperator && <Link href="/operator" className="btn btn-primary">Go to Blast Command Portal</Link>}
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
      `}</style>
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "0", background: "linear-gradient(to bottom, #f0f9ff 0%, #ffffff 40%)" }}>
        {/* Hero Section */}
        <section style={{ 
          padding: "clamp(3rem, 8vw, 5rem) 0 clamp(2rem, 5vw, 3rem) 0",
          background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
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
                Welcome to Blast Clients
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
                Your command center for managing cleanings, tracking rewards, and keeping your bins fresh. Everything you need, right at your fingertips.
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
                    color: "#2563eb",
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
                    Ready to manage your cleanings?
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
          <div style={{
            position: "absolute",
            bottom: "-30%",
            left: "-5%",
            width: "400px",
            height: "400px",
            background: "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            zIndex: 0
          }} />
        </section>

        <div className="container" style={{ padding: "clamp(2rem, 5vw, 3rem) 0" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            {/* Status Snapshot */}
            {userId && nextCleaning && (
              <div style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "3rem",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.2)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                animation: "fadeInUp 0.6s ease-out 0.4s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.25rem", textAlign: "center" }}>Next Cleaning</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700", textAlign: "center" }}>{nextCleaning}</div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
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
                  View Schedule →
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
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #e0e7ff",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.5s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e40af", textAlign: "center" }}>
                  Manage Your Plan
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  View your subscription, billing status, and upcoming cleanings at a glance.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #e0e7ff",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.6s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e40af", textAlign: "center" }}>
                  Schedule Cleanings
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Choose your trash day, confirm your address, and add special instructions.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #e0e7ff",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.7s both"
              }}
              onClick={() => userId ? router.push("/dashboard") : null}
              >
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#1e40af", textAlign: "center" }}>
                  Track Rewards
                </h3>
                <p style={{ color: "#64748b", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Monitor loyalty levels, referral credits, and cleaning history.
                </p>
              </div>
            </div>

            {/* Features Section */}
            <div style={{
              background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              border: "2px solid #bfdbfe",
              marginBottom: "3rem",
              animation: "fadeInUp 0.6s ease-out 0.8s both"
            }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: "700", marginBottom: "1.5rem", color: "#1e40af", textAlign: "center" }}>
                Your Dashboard Features
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "1.5rem"
              }}>
                {[
                  { title: "Plan Overview", desc: "See your current plan and billing status" },
                  { title: "Schedule Management", desc: "Pick your trash day and preferred time window" },
                  { title: "Loyalty Levels", desc: "Track your progress from Level 1 up" },
                  { title: "Referral Rewards", desc: "Access your referral link and view credits" },
                  { title: "Cleaning History", desc: "Review past and upcoming appointments" },
                  { title: "24/7 Support", desc: "Get help anytime through AI chat assistant" }
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
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.25rem", color: "#1e40af", textAlign: "center" }}>
                      {feature.title}
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#64748b", margin: 0, lineHeight: "1.5", textAlign: "center" }}>
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
              border: "2px solid #e0e7ff",
              textAlign: "center",
              animation: "fadeInUp 0.6s ease-out 0.9s both"
            }}>
              {userId ? (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-dark)", textAlign: "center" }}>
                    You&apos;re All Set!
                  </h2>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-light)", fontSize: "1rem", textAlign: "center" }}>
                    Access your dashboard to manage your account and schedule cleanings.
                  </p>
                  <Link 
                    href="/dashboard"
                    className="btn btn-primary"
                    style={{
                      display: "inline-block",
                      padding: "0.875rem 2.5rem",
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      borderRadius: "12px",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(37, 99, 235, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    Go to Dashboard →
                  </Link>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)", textAlign: "center" }}>
                    Blast Clients Login
                  </h2>
                  <PortalLoginForm 
                    expectedRole="customer" 
                    redirectPath="/dashboard"
                    portalName="Blast Clients Portal"
                  />
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <p style={{ fontSize: "0.875rem", color: "var(--text-light)", marginBottom: "0.75rem", textAlign: "center" }}>
                      Don&apos;t have an account yet?
                    </p>
                    <Link 
                      href="/#pricing"
                      style={{
                        color: "#2563eb",
                        fontWeight: "600",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        transition: "color 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#1e40af";
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "#2563eb";
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      Sign up for a cleaning plan →
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
