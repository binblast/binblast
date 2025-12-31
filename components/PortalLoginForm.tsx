// components/PortalLoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface PortalLoginFormProps {
  expectedRole?: "employee" | "partner" | "customer" | "operator" | "admin";
  redirectPath?: string;
  portalName: string;
}

export function PortalLoginForm({ expectedRole, redirectPath, portalName }: PortalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { signInWithEmailAndPassword, getAuthInstance, getDbInstance } = await import("@/lib/firebase");
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(email, password);
      
      // Get the authenticated user
      const auth = await getAuthInstance();
      const user = auth?.currentUser;
      
      if (user) {
        // Check if user is an accepted partner who needs to sign up for partner account
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
                router.push("/register?partner=true");
                return;
              }

              const userRole = userData.role;
              const userEmail = user.email || "";
              const ADMIN_EMAIL = "binblastcompany@gmail.com";
              
              // Check if user is operator/admin
              const isOperator = userRole === "operator" || userRole === "admin" || userEmail === ADMIN_EMAIL;
              
              // Check if user is a partner
              const { getPartner, getDashboardUrl } = await import("@/lib/partner-auth");
              const partner = await getPartner(user.uid, userEmail);
              const dashboardUrl = await getDashboardUrl(user.uid);
              const isPartner = dashboardUrl !== "/dashboard" || partner !== null;

              // Check if user has the expected role for this portal
              if (expectedRole) {
                let roleMatches = false;
                
                if (expectedRole === "employee" && userRole === "employee") {
                  roleMatches = true;
                } else if (expectedRole === "partner" && isPartner) {
                  roleMatches = true;
                } else if (expectedRole === "customer" && !isPartner && userRole !== "employee" && !isOperator) {
                  roleMatches = true;
                } else if ((expectedRole === "operator" || expectedRole === "admin") && isOperator) {
                  roleMatches = true;
                }

                if (!roleMatches) {
                  // Redirect to correct portal based on role
                  if (userRole === "employee") {
                    router.push("/employee");
                    return;
                  } else if (isOperator) {
                    router.push("/operator");
                    return;
                  } else if (isPartner) {
                    router.push("/partners");
                    return;
                  } else {
                    router.push("/customer");
                    return;
                  }
                }
              }

              // Redirect based on role
              if (userRole === "employee") {
                router.push(redirectPath || "/employee/dashboard");
                return;
              } else if (isOperator) {
                router.push(redirectPath || "/dashboard");
                return;
              } else {
                router.push(redirectPath || dashboardUrl);
                return;
              }
            }
          }
        } catch (err) {
          console.error("[PortalLoginForm] Error checking user role:", err);
        }

        // Fallback redirect
        router.push(redirectPath || "/dashboard");
      }
    } catch (err: any) {
      console.error("[PortalLoginForm] Login error:", err);
      
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
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2.5rem",
      boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
      border: "1px solid #e5e7eb",
      maxWidth: "500px",
      margin: "0 auto"
    }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
  );
}

