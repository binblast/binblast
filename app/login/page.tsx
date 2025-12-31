// app/login/page.tsx

"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// CRITICAL: Dynamically import Navbar to prevent webpack from bundling firebase-context.tsx into page chunks
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const passwordReset = searchParams.get("passwordReset") === "true";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Use safe wrapper function that ensures Firebase is initialized
      const { signInWithEmailAndPassword, getAuthInstance, getDbInstance } = await import("@/lib/firebase");
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(email, password);
      
      // Get the authenticated user
      const auth = await getAuthInstance();
      const user = auth?.currentUser;
      
      if (user) {
        // Check if user is an accepted partner who needs to sign up for partner account
        // This check should happen first before other redirects
        try {
          const db = await getDbInstance();
          if (db) {
            const { doc, getDoc } = await import("firebase/firestore");
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // Check if partner is accepted but hasn't created partner account yet
              if (userData.partnerAccepted === true && userData.partnerAccountCreated !== true) {
                // Redirect to partner signup
                router.push("/register?partner=true");
                return;
              }
            }
          }
        } catch (partnerCheckErr) {
          console.warn("[Login] Error checking partner status:", partnerCheckErr);
          // Continue with normal flow if partner check fails
        }

        // Check redirect parameter first (for employee portal, etc.)
        const redirectParam = searchParams.get("redirect");
        if (redirectParam) {
          router.push(redirectParam);
          return;
        }

        // Check callbackUrl parameter (for NextAuth redirects)
        const callbackUrl = searchParams.get("callbackUrl");
        if (callbackUrl) {
          router.push(callbackUrl);
          return;
        }

        // Check user role and redirect accordingly
        try {
          const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
          const db = await getDbInstance();
          
          if (db) {
            const firestore = await safeImportFirestore();
            const { doc, getDoc } = firestore;
            const userDoc = await getDoc(doc(db, "users", user.uid));
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const userRole = userData.role;
              const userEmail = user.email || "";
              const ADMIN_EMAIL = "binblastcompany@gmail.com";
              
              console.log(`[Login] User role: ${userRole}, partnerId: ${userData.partnerId || "none"}`);
              
              // Check if user is operator/admin
              const isOperator = userRole === "operator" || userRole === "admin" || userEmail === ADMIN_EMAIL;
              
              // Redirect based on role
              if (userRole === "employee") {
                // Employee (including partner employees) - redirect to employee dashboard
                const redirectPath = redirectParam || "/employee/dashboard";
                console.log(`[Login] Redirecting employee to: ${redirectPath}`);
                router.push(redirectPath);
                return;
              } else if (isOperator) {
                // Operator/Admin - redirect to dashboard
                const redirectPath = redirectParam || "/dashboard";
                console.log(`[Login] Redirecting operator/admin to: ${redirectPath}`);
                router.push(redirectPath);
                return;
              }
            } else {
              console.warn(`[Login] User document not found for uid: ${user.uid}`);
            }
          }
        } catch (err) {
          console.error("[Login] Error checking user role:", err);
        }

        // Check if user is a partner and redirect accordingly (for customers, this will return /dashboard)
        const { getDashboardUrl } = await import("@/lib/partner-auth");
        const dashboardUrl = await getDashboardUrl(user.uid);
        const redirectPath = redirectParam || dashboardUrl;
        console.log(`[Login] Redirecting to: ${redirectPath}`);
        router.push(redirectPath);
      } else {
        // Fallback to regular dashboard if user not found
        const redirectParam = searchParams.get("redirect");
        const callbackUrl = searchParams.get("callbackUrl");
        router.push(redirectParam || callbackUrl || "/dashboard");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Handle specific Firebase errors
      console.error("[Login] Error code:", err.code);
      console.error("[Login] Error message:", err.message);
      
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/user-disabled") {
        setError("This account has been disabled.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else if (err.code === "auth/network-request-failed") {
        setError("Network error. Please check your connection and try again.");
      } else {
        setError(err.message || "Failed to sign in. Please try again.");
      }
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "2rem" }}>
              Log in to Bin Blast Co.
            </h1>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2.5rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {passwordReset && (
                  <div style={{
                    padding: "0.75rem 1rem",
                    background: "#dcfce7",
                    border: "1px solid #86efac",
                    borderRadius: "8px",
                    color: "#166534",
                    fontSize: "0.875rem",
                    marginBottom: "0.5rem"
                  }}>
                    ✓ Your password has been reset successfully. Please log in with your new password.
                  </div>
                )}
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", color: "var(--text-dark)" }}>
                      Password
                    </label>
                    <Link 
                      href="/forgot-password" 
                      style={{ 
                        fontSize: "0.875rem", 
                        color: "var(--primary-color)", 
                        fontWeight: "500",
                        textDecoration: "none"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = "underline";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = "none";
                      }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      transition: "border-color 0.2s"
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                    onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                  />
                </div>

                {error && (
                  <div style={{
                    padding: "0.75rem 1rem",
                    background: "#fef2f2",
                    border: "1px solid #fecaca",
                    borderRadius: "8px",
                    color: "#dc2626",
                    fontSize: "0.875rem"
                  }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`btn btn-primary ${loading ? "disabled" : ""}`}
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? "Logging in..." : "Log in"}
                </button>

                <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
                  Don&apos;t have an account?{" "}
                  <Link href="/register" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                    Sign up
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}

