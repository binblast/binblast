// app/partners/page.tsx
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

export default function PartnersPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const user = auth.currentUser;
          setUserId(user.uid);
          
          // Check user role and partner status
          const db = await getDbInstance();
          if (db) {
            const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
            const firestore = await safeImportFirestore();
            const { doc, getDoc, collection, query, where, getDocs } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserRole(userData.role);
              
              // Check if user is a partner and get earnings
              const { getPartner } = await import("@/lib/partner-auth");
              const partner = await getPartner(user.uid, user.email || null);
              if (partner) {
                // Try to get earnings from bookings
                const bookingsQuery = query(
                  collection(db, "bookings"),
                  where("partnerId", "==", partner.id)
                );
                const bookingsSnapshot = await getDocs(bookingsQuery);
                let total = 0;
                bookingsSnapshot.forEach((doc) => {
                  const data = doc.data();
                  if (data.partnerShareAmount) {
                    total += data.partnerShareAmount / 100; // Convert cents to dollars
                  }
                });
                if (total > 0) {
                  setTotalEarnings(`$${total.toFixed(2)}`);
                }
              }
              
              // Check if user is a partner and redirect to dashboard
              const { getDashboardUrl } = await import("@/lib/partner-auth");
              const dashboardUrl = await getDashboardUrl(user.uid);
              if (dashboardUrl !== "/dashboard") {
                router.push("/partners/dashboard");
                return;
              }
            }
          }
        }
        
        const unsubscribe = await onAuthStateChanged(async (user) => {
          if (user) {
            setUserId(user.uid);
            
            // Check user role and partner status
            const db = await getDbInstance();
            if (db) {
              const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
              const firestore = await safeImportFirestore();
              const { doc, getDoc, collection, query, where, getDocs } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserRole(userData.role);
                
                // Check if user is a partner and get earnings
                const { getPartner } = await import("@/lib/partner-auth");
                const partner = await getPartner(user.uid, user.email || null);
                if (partner) {
                  const bookingsQuery = query(
                    collection(db, "bookings"),
                    where("partnerId", "==", partner.id)
                  );
                  const bookingsSnapshot = await getDocs(bookingsQuery);
                  let total = 0;
                  bookingsSnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.partnerShareAmount) {
                      total += data.partnerShareAmount / 100;
                    }
                  });
                  if (total > 0) {
                    setTotalEarnings(`$${total.toFixed(2)}`);
                  }
                }
                
                // Check if user is a partner and redirect to dashboard
                const { getDashboardUrl } = await import("@/lib/partner-auth");
                const dashboardUrl = await getDashboardUrl(user.uid);
                if (dashboardUrl !== "/dashboard") {
                  router.push("/partners/dashboard");
                  return;
                }
              }
            }
          } else {
            setUserId(null);
            setUserRole(null);
            setTotalEarnings(null);
          }
          setLoading(false);
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
  }, []);

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
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "0", background: "linear-gradient(to bottom, #ecfdf5 0%, #ffffff 40%)" }}>
        {/* Hero Section */}
        <section style={{ 
          padding: "clamp(3rem, 8vw, 5rem) 0 clamp(2rem, 5vw, 3rem) 0",
          background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
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
                🤝
              </div>
              
              {/* Headline */}
              <h1 style={{
                fontSize: "clamp(2rem, 6vw, 3.5rem)",
                fontWeight: "800",
                marginBottom: "1rem",
                lineHeight: "1.2",
                animation: "fadeInUp 0.8s ease-out 0.1s both"
              }}>
                Blast Partners Portal
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
                Grow your business with Bin Blast Co. Earn 60% revenue share on every booking through your unique partner link.
              </p>
              
              {/* Primary CTA */}
              {userId ? (
                <Link
                  href="/partners/dashboard"
                  className="btn btn-primary"
                  style={{
                    display: "inline-block",
                    padding: "1rem 2.5rem",
                    fontSize: "1.125rem",
                    fontWeight: "700",
                    background: "#ffffff",
                    color: "#059669",
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
                    Ready to start earning?
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
            {userId && totalEarnings && (
              <div style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                borderRadius: "16px",
                padding: "1.5rem",
                marginBottom: "3rem",
                boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "1rem",
                animation: "fadeInUp 0.6s ease-out 0.4s both"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ fontSize: "2rem" }}>💰</div>
                  <div>
                    <div style={{ fontSize: "0.875rem", opacity: 0.9, marginBottom: "0.25rem" }}>Total Earnings</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700" }}>{totalEarnings}</div>
                  </div>
                </div>
                <Link
                  href="/partners/dashboard"
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
                  View Earnings →
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
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #86efac",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.5s both"
              }}
              onClick={() => userId ? router.push("/partners/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">💵</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#065f46", textAlign: "center" }}>
                  Earn Revenue Share
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Get 60% of every booking that comes through your unique partner link. No upfront costs or fees.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #86efac",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.6s both"
              }}
              onClick={() => userId ? router.push("/partners/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">🔗</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#065f46", textAlign: "center" }}>
                  Your Own Booking Link
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  Share your unique link with customers. All bookings are automatically tracked and attributed to you.
                </p>
              </div>

              <div className="action-card fade-in-up" style={{
                background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                borderRadius: "20px",
                padding: "2rem",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                border: "2px solid #86efac",
                cursor: "pointer",
                animation: "fadeInUp 0.6s ease-out 0.7s both"
              }}
              onClick={() => userId ? router.push("/partners/dashboard") : null}
              >
                <div style={{ fontSize: "3rem", marginBottom: "1rem", textAlign: "center" }} className="icon-bounce">📊</div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "#065f46", textAlign: "center" }}>
                  Track Everything
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.95rem", textAlign: "center", lineHeight: "1.6" }}>
                  View all your bookings, earnings, and customer details in your dedicated partner dashboard.
                </p>
              </div>
            </div>

            {/* How It Works Section */}
            <div style={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              border: "2px solid #86efac",
              marginBottom: "3rem",
              animation: "fadeInUp 0.6s ease-out 0.8s both"
            }}>
              <h2 style={{ fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: "700", marginBottom: "1.5rem", color: "#065f46", textAlign: "center" }}>
                How It Works
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1.5rem",
                marginTop: "2rem"
              }}>
                {[
                  { step: "1", icon: "📝", title: "Apply", desc: "Fill out a simple application form" },
                  { step: "2", icon: "✅", title: "Get Approved", desc: "We review within 24-48 hours" },
                  { step: "3", icon: "🔗", title: "Get Your Link", desc: "Receive your unique booking link" },
                  { step: "4", icon: "💰", title: "Start Earning", desc: "Track bookings and earnings" }
                ].map((item, idx) => (
                  <div key={idx} style={{
                    background: "#ffffff",
                    borderRadius: "16px",
                    padding: "1.5rem",
                    textAlign: "center",
                    position: "relative",
                    transition: "transform 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  >
                    <div style={{
                      position: "absolute",
                      top: "-12px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      background: "#10b981",
                      color: "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.75rem",
                      fontWeight: "700"
                    }}>
                      {item.step}
                    </div>
                    <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem", marginTop: "0.5rem" }}>{item.icon}</div>
                    <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem", color: "#065f46" }}>
                      {item.title}
                    </h4>
                    <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0, lineHeight: "1.5" }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Perfect For Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "2px solid #86efac",
              textAlign: "center",
              marginBottom: "3rem",
              animation: "fadeInUp 0.6s ease-out 0.9s both"
            }}>
              <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                Perfect For
              </h2>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                justifyContent: "center",
                marginBottom: "2rem"
              }}>
                {["Car Detailers", "Pressure Washers", "Landscapers", "Property Managers", "HVAC Companies", "Other Service Businesses"].map((business) => (
                  <span key={business} style={{
                    padding: "0.625rem 1.25rem",
                    background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                    borderRadius: "12px",
                    color: "#065f46",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    border: "1px solid #86efac",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.background = "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)";
                  }}
                  >
                    {business}
                  </span>
                ))}
              </div>
              
              {userId ? (
                <Link 
                  href="/partners/apply"
                  className="btn btn-primary"
                  style={{
                    display: "inline-block",
                    padding: "0.875rem 2.5rem",
                    fontSize: "1.125rem",
                    fontWeight: "600",
                    borderRadius: "12px",
                    background: "#10b981",
                    border: "none",
                    color: "#ffffff",
                    transition: "all 0.3s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 8px 16px rgba(16, 185, 129, 0.4)";
                    e.currentTarget.style.background = "#059669";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                    e.currentTarget.style.background = "#10b981";
                  }}
                >
                  Apply Now →
                </Link>
              ) : (
                <div>
                  <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}>
                    Sign up or log in to apply for the Partner Program
                  </p>
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <Link 
                      href="/register?partner=true"
                      className="btn btn-primary"
                      style={{
                        display: "inline-block",
                        padding: "0.75rem 2rem",
                        fontSize: "1rem",
                        fontWeight: "600",
                        background: "#10b981",
                        border: "none",
                        color: "#ffffff"
                      }}
                    >
                      Sign Up
                    </Link>
                    <Link 
                      href="/login"
                      className="btn"
                      style={{
                        display: "inline-block",
                        padding: "0.75rem 2rem",
                        fontSize: "1rem",
                        fontWeight: "600",
                        background: "#ffffff",
                        border: "2px solid #86efac",
                        color: "#065f46"
                      }}
                    >
                      Log In
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Login Section */}
            <div style={{
              background: "#ffffff",
              borderRadius: "24px",
              padding: "clamp(2rem, 5vw, 3rem)",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08)",
              border: "2px solid #86efac",
              textAlign: "center",
              animation: "fadeInUp 0.6s ease-out 1s both"
            }}>
              {userId ? (
                <div>
                  <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-dark)" }}>
                    You&apos;re All Set!
                  </h2>
                  <p style={{ marginBottom: "1.5rem", color: "var(--text-light)", fontSize: "1rem" }}>
                    Access your partner dashboard to manage your account and track earnings.
                  </p>
                  <Link 
                    href="/partners/dashboard"
                    className="btn btn-primary"
                    style={{
                      display: "inline-block",
                      padding: "0.875rem 2.5rem",
                      fontSize: "1.125rem",
                      fontWeight: "600",
                      borderRadius: "12px",
                      background: "#10b981",
                      border: "none",
                      color: "#ffffff",
                      transition: "all 0.3s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 8px 16px rgba(16, 185, 129, 0.4)";
                      e.currentTarget.style.background = "#059669";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.background = "#10b981";
                    }}
                  >
                    Go to Dashboard →
                  </Link>
                </div>
              ) : (
                <div>
                  <h2 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
                    Blast Partners Login
                  </h2>
                  <PortalLoginForm 
                    expectedRole="partner" 
                    redirectPath="/partners/dashboard"
                    portalName="Blast Partners Portal"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
