// app/forgot-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// CRITICAL: Dynamically import Navbar to prevent webpack from bundling firebase-context.tsx into page chunks
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { sendPasswordResetEmail } = await import("@/lib/firebase");
      await sendPasswordResetEmail(email);
      setSuccess(true);
    } catch (err: any) {
      console.error("Password reset error:", err);
      
      // Handle specific Firebase errors
      if (err.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many password reset requests. Please try again later.");
      } else if (err.code === "auth/unauthorized-continue-uri" || err.message?.includes("unauthorized-continue-uri")) {
        setError("Domain not authorized. The password reset email will use Firebase's default page. Please check your email inbox.");
        // Still show success since email was sent, just with default redirect
        setSuccess(true);
        setLoading(false);
        return;
      } else {
        setError(err.message || "Failed to send password reset email. Please try again.");
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
              Forgot Password
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
                    Check Your Email
                  </h2>
                  <p style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "1.5rem", lineHeight: "1.6" }}>
                    We&apos;ve sent a password reset link to <strong>{email}</strong>. Please check your inbox and click the link to reset your password.
                  </p>
                  <div style={{
                    background: "#eff6ff",
                    border: "1px solid #93c5fd",
                    borderRadius: "8px",
                    padding: "1rem",
                    marginBottom: "1.5rem"
                  }}>
                    <p style={{ fontSize: "0.875rem", color: "#1e40af", margin: 0 }}>
                      <strong>Note:</strong> The password reset link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
                    <button
                      onClick={() => router.push("/login")}
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1d4ed8";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#2563eb";
                      }}
                    >
                      Back to Login
                    </button>
                    <button
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: "transparent",
                        color: "#6b7280",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#f9fafb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      Send Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p style={{ fontSize: "1rem", color: "#6b7280", marginBottom: "1.5rem", textAlign: "center", lineHeight: "1.6" }}>
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </p>
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
                        placeholder="Enter your email address"
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
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>

                    <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
                      Remember your password?{" "}
                      <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                        Log in
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
