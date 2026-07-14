// components/PortalLoginForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PORTAL_INFO,
  portalMatchesExpected,
  resolveUserPortal,
  type PortalInfo,
} from "@/lib/user-portal";

interface PortalLoginFormProps {
  expectedRole: "employee" | "partner" | "customer" | "operator" | "admin";
  redirectPath?: string;
  portalName: string;
}

export function PortalLoginForm({ expectedRole, redirectPath, portalName }: PortalLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correctPortal, setCorrectPortal] = useState<PortalInfo | null>(null);
  const router = useRouter();

  const currentPortal = PORTAL_INFO[
    expectedRole === "operator" || expectedRole === "admin" ? "operator" : expectedRole
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCorrectPortal(null);

    try {
      const { signInWithEmailAndPassword, getAuthInstance, getDbInstance, signOut } = await import("@/lib/firebase");

      await signInWithEmailAndPassword(email, password);

      const auth = await getAuthInstance();
      const user = auth?.currentUser;

      if (user) {
        try {
          const db = await getDbInstance();
          if (db) {
            const { doc, getDoc } = await import("firebase/firestore");
            const userDocRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
              const userData = userDoc.data();

              if (userData.partnerAccepted === true && userData.partnerAccountCreated !== true) {
                router.push("/register?partner=true");
                return;
              }

              if (expectedRole === "operator") {
                const userRole = userData.role;
                const isOperatorAccount =
                  userRole === "operator" ||
                  userRole === "admin" ||
                  user.email === "binblastcompany@gmail.com";

                if (!isOperatorAccount) {
                  await signOut();
                  setError("This email is not registered for Blast Command. Please use the correct portal.");
                  setLoading(false);
                  return;
                }

                router.push(redirectPath || "/dashboard");
                return;
              }

              const userPortal = await resolveUserPortal(user.uid, user.email);

              if (!portalMatchesExpected(userPortal, expectedRole)) {
                await signOut();
                const portal = PORTAL_INFO[userPortal];
                setCorrectPortal(portal);
                setError(
                  `This email is registered as a ${portal.name} account. You cannot sign in here. Please use the ${portal.name} instead.`
                );
                setLoading(false);
                return;
              }

              if (userPortal === "employee") {
                router.push(redirectPath || "/employee/dashboard");
                return;
              }

              if (userPortal === "operator") {
                router.push(redirectPath || "/dashboard");
                return;
              }

              const { getDashboardUrl } = await import("@/lib/partner-auth");
              const dashboardUrl = await getDashboardUrl(user.uid, user.email);
              router.push(redirectPath || dashboardUrl);
              return;
            }
          }
        } catch (err) {
          console.error("[PortalLoginForm] Error checking user role:", err);
        }

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
      <div style={{
        padding: "0.875rem 1rem",
        background: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "10px",
        marginBottom: "1.25rem",
        fontSize: "0.875rem",
        color: "#166534",
        lineHeight: 1.5,
        textAlign: "left",
      }}>
        Sign in with your {portalName} account.
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{
            display: "block",
            fontSize: "0.9rem",
            fontWeight: "500",
            marginBottom: "0.5rem",
            color: "var(--text-dark)",
            textAlign: "left"
          }}>
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
              transition: "border-color 0.2s",
              textAlign: "left"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
          />
        </div>

        <div>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "0.5rem",
            width: "100%"
          }}>
            <label style={{
              display: "block",
              fontSize: "0.9rem",
              fontWeight: "500",
              color: "var(--text-dark)",
              textAlign: "left",
              margin: 0
            }}>
              Password
            </label>
            <Link
              href="/forgot-password"
              style={{
                fontSize: "0.875rem",
                color: "var(--primary-color)",
                fontWeight: "500",
                textDecoration: "none",
                flexShrink: 0,
                marginLeft: "1rem"
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
              transition: "border-color 0.2s",
              textAlign: "left"
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
          />
        </div>

        {error && (
          <div style={{
            padding: "0.875rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}>
            {error}
            {correctPortal && (
              <div style={{ marginTop: "0.75rem" }}>
                <Link
                  href={correctPortal.path}
                  className="btn btn-primary"
                  style={{
                    display: "inline-block",
                    fontSize: "0.875rem",
                    padding: "0.5rem 1rem",
                    textDecoration: "none",
                  }}
                >
                  Go to {correctPortal.name}
                </Link>
              </div>
            )}
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
          {loading ? "Logging in..." : `Log in to ${currentPortal.name}`}
        </button>

        {expectedRole === "customer" && (
          <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
            Don&apos;t have an account?{" "}
            <Link href="/register" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
