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
            const { doc, getDoc } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserRole(userData.role);
              
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
              const { doc, getDoc } = firestore;
              const userDoc = await getDoc(doc(db, "users", user.uid));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                setUserRole(userData.role);
                
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
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Blast Partners Portal
            </h1>
            <p style={{ 
              fontSize: "1.125rem", 
              color: "var(--text-light)", 
              textAlign: "center",
              marginBottom: "3rem"
            }}>
              Grow your business by offering Bin Blast Co. services to your customers
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
                  Earn Revenue Share
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Get 60% of every booking that comes through your unique partner link. No upfront costs or fees.
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
                  Your Own Booking Link
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  Share your unique link with customers. All bookings are automatically tracked and attributed to you.
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
                  Track Everything
                </h3>
                <p style={{ color: "var(--text-light)", fontSize: "0.95rem" }}>
                  View all your bookings, earnings, and customer details in your dedicated partner dashboard.
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
                How It Works
              </h2>
              <ol style={{ 
                listStyle: "decimal",
                paddingLeft: "1.5rem",
                color: "#0c4a6e",
                lineHeight: "1.8"
              }}>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Apply to become a partner</strong> - Fill out a simple application form
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Get approved</strong> - We review your application (usually within 24-48 hours)
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Receive your booking link</strong> - Share it with your customers
                </li>
                <li style={{ marginBottom: "0.75rem" }}>
                  <strong>Earn 60% revenue share</strong> - Track all bookings and earnings in your dashboard
                </li>
              </ol>
            </div>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2rem",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb",
              textAlign: "center",
              marginBottom: "2rem"
            }}>
              <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1rem", color: "var(--text-dark)" }}>
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
                    padding: "0.5rem 1rem",
                    background: "#f0f9ff",
                    borderRadius: "8px",
                    color: "#0369a1",
                    fontSize: "0.875rem",
                    fontWeight: "600"
                  }}>
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
                    padding: "0.75rem 2rem",
                    fontSize: "1rem",
                    fontWeight: "600"
                  }}
                >
                  Apply Now
                </Link>
              ) : (
                <div>
                  <p style={{ marginBottom: "1rem", color: "var(--text-light)" }}>
                    Sign up or log in to apply for the Partner Program
                  </p>
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
                    <Link 
                      href="/register?partner=true"
                      className="btn btn-primary"
                      style={{
                        display: "inline-block",
                        padding: "0.75rem 2rem",
                        fontSize: "1rem",
                        fontWeight: "600"
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
                        border: "1px solid #e5e7eb"
                      }}
                    >
                      Log In
                    </Link>
                  </div>
                </div>
              )}
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
                    You are already logged in. Access your partner dashboard to manage your account.
                  </p>
                  <Link 
                    href="/partners/dashboard"
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
