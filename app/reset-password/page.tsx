// app/reset-password/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// CRITICAL: Dynamically import Navbar to prevent webpack from bundling firebase-context.tsx into page chunks
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [oobCode, setOobCode] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Get the reset token from URL query parameters
    // Can be either Firebase oobCode or custom token
    const code = searchParams.get("oobCode");
    const token = searchParams.get("token");
    const mode = searchParams.get("mode");
    
    // Also check window.location.search as fallback (in case Next.js searchParams doesn't capture it)
    let fallbackCode: string | null = null;
    let fallbackToken: string | null = null;
    let fallbackMode: string | null = null;
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      fallbackCode = urlParams.get("oobCode");
      fallbackToken = urlParams.get("token");
      fallbackMode = urlParams.get("mode");
      
      // Also check if we're on Firebase auth handler page and extract oobCode from there
      // Firebase Admin SDK links go through: https://[project].firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=...
      // Then redirect to continueUrl with oobCode
      if (!fallbackCode && window.location.href.includes('/__/auth/action')) {
        const authUrlParams = new URLSearchParams(window.location.search);
        fallbackCode = authUrlParams.get("oobCode");
        fallbackMode = authUrlParams.get("mode");
        console.log("[Reset Password] Found oobCode in Firebase auth handler URL");
      }
      
      // Check hash fragment as well (some redirects might put params in hash)
      if (!fallbackCode && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        fallbackCode = hashParams.get("oobCode") || fallbackCode;
        fallbackToken = hashParams.get("token") || fallbackToken;
      }
    }
    
    const finalCode = code || fallbackCode;
    const finalToken = token || fallbackToken;
    const finalMode = mode || fallbackMode;
    
    console.log("[Reset Password] URL params:", { 
      code: finalCode?.substring(0, 20), 
      token: finalToken?.substring(0, 20), 
      mode: finalMode,
      url: typeof window !== 'undefined' ? window.location.href.substring(0, 200) : 'N/A'
    });
    
    // Check for oobCode first (Firebase Admin SDK format)
    // oobCode can exist with or without mode parameter
    if (finalCode) {
      // Firebase oobCode format (from Admin SDK generatePasswordResetLink)
      // oobCodes are typically > 50 characters
      console.log("[Reset Password] Found oobCode:", finalCode.length > 50 ? "long (oobCode)" : "short");
      setOobCode(finalCode);
    } else if (finalToken) {
      // Custom token format (fallback method)
      console.log("[Reset Password] Found custom token");
      setOobCode(finalToken);
    } else if (finalMode === "resetPassword" && !finalCode && !finalToken) {
      // Mode is set but no code/token - invalid link
      console.error("[Reset Password] Mode is resetPassword but no code or token found");
      setError("Invalid password reset link. Please request a new one.");
    } else if (!finalCode && !finalToken && !finalMode) {
      // If no code or token, this might be a direct visit - show error
      console.error("[Reset Password] No reset parameters found in URL");
      setError("Invalid or expired password reset link. Please request a new one.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (!oobCode) {
      setError("Invalid reset link. Please request a new password reset email.");
      return;
    }

    setLoading(true);

    try {
      // Check if it's a Firebase oobCode (longer) or custom token
      const isOobCode = oobCode && oobCode.length > 50;
      
      if (isOobCode) {
        // Use Firebase's confirmPasswordReset for oobCode
        const { getAuthInstance } = await import("@/lib/firebase");
        const { safeImportAuth } = await import("@/lib/firebase-module-loader");
        
        const auth = await getAuthInstance();
        if (!auth) {
          throw new Error("Firebase auth is not available");
        }

        const firebaseAuth = await safeImportAuth();
        
        // Verify the password reset code and apply the new password
        await firebaseAuth.confirmPasswordReset(auth, oobCode, password);
      } else {
        // Use API route for custom token
        console.log("[Reset Password] Using custom token, calling API:", {
          tokenLength: oobCode?.length,
          tokenPrefix: oobCode?.substring(0, 10),
        });
        
        const response = await fetch("/api/auth/confirm-password-reset", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token: oobCode,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error("[Reset Password] API error:", {
            status: response.status,
            error: data.error,
          });
          throw new Error(data.error || "Failed to reset password");
        }
        
        console.log("[Reset Password] Password reset successful via API");
      }
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push("/login?passwordReset=true");
      }, 3000);
    } catch (err: any) {
      console.error("Password reset error:", err);
      
      // Handle specific Firebase errors
      if (err.code === "auth/expired-action-code" || err.message?.includes("expired")) {
        setError("This password reset link has expired. Please request a new one.");
      } else if (err.code === "auth/invalid-action-code" || err.message?.includes("Invalid")) {
        setError("Invalid password reset link. Please request a new one.");
      } else if (err.code === "auth/weak-password" || err.message?.includes("weak")) {
        setError("Password is too weak. Please choose a stronger password.");
      } else {
        setError(err.message || "Failed to reset password. Please try again.");
      }
      setLoading(false);
    }
  }

  // Show loading state while extracting token from URL
  useEffect(() => {
    // Small delay to ensure URL params are parsed
    const timer = setTimeout(() => {
      if (!oobCode && !error) {
        // If we still don't have a token after parsing, show error with diagnostic info
        const code = searchParams.get("oobCode");
        const token = searchParams.get("token");
        const mode = searchParams.get("mode");
        const apiKey = searchParams.get("apiKey");
        const continueUrl = searchParams.get("continueUrl");
        
        // Log all URL parameters for debugging
        const allParams: Record<string, string | null> = {};
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.forEach((value, key) => {
            allParams[key] = value.substring(0, 50); // Truncate long values
          });
        }
        
        console.error("[Reset Password] No token found after parsing:", { 
          code: code?.substring(0, 20), 
          token: token?.substring(0, 20), 
          mode, 
          apiKey: apiKey?.substring(0, 20),
          continueUrl,
          allParams,
          url: typeof window !== 'undefined' ? window.location.href.substring(0, 200) : 'N/A'
        });
        
        if (!code && !token) {
          setError("Invalid password reset link. Please request a new one.");
        }
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [oobCode, error, searchParams]);

  if (!oobCode && !error) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
          <div className="container">
            <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "2rem auto" }}></div>
              <p style={{ color: "#6b7280" }}>Loading...</p>
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
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "2rem" }}>
              Reset Password
            </h1>

            <div style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "2.5rem",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              {success ? (
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "64px",
                    height: "64px",
                    background: "#dcfce7",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 1.5rem"
                  }}>
                    <svg style={{ width: "32px", height: "32px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", marginBottom: "1rem" }}>
                    Password Reset Successful!
                  </h2>
                  <p style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                    Your password has been successfully reset. You can now log in with your new password.
                  </p>
                  <p style={{ fontSize: "0.875rem", color: "#9ca3af" }}>
                    Redirecting to login page...
                  </p>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "1.5rem", textAlign: "center", lineHeight: "1.6" }}>
                    Enter your new password below.
                  </p>
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                        New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Enter new password (min. 6 characters)"
                        minLength={6}
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
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Confirm new password"
                        minLength={6}
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
                        {process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && (
                          <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#fee2e2", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace", wordBreak: "break-all" }}>
                            <strong>Debug Info:</strong><br/>
                            URL: {window.location.href.substring(0, 200)}<br/>
                            oobCode: {searchParams.get("oobCode")?.substring(0, 30) || "not found"}<br/>
                            token: {searchParams.get("token")?.substring(0, 30) || "not found"}<br/>
                            mode: {searchParams.get("mode") || "not found"}
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !oobCode}
                      className={`btn btn-primary ${loading ? "disabled" : ""}`}
                      style={{
                        width: "100%",
                        marginTop: "0.5rem",
                        cursor: loading || !oobCode ? "not-allowed" : "pointer",
                        opacity: loading || !oobCode ? 0.6 : 1
                      }}
                    >
                      {loading ? "Resetting Password..." : "Reset Password"}
                    </button>

                    <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
                      <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                        Back to Login
                      </Link>
                      {" • "}
                      <Link href="/forgot-password" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                        Request New Link
                      </Link>
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
