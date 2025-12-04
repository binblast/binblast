// app/register/page.tsx

"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import Link from "next/link";

const PLAN_NAMES: Record<string, string> = {
  "one-time": "One-Time Blast",
  "twice-month": "Bi-Weekly Clean (2x/Month)",
  "bi-monthly": "Bi-Monthly Plan – Yearly Package",
  "quarterly": "Quarterly Plan – Yearly Package",
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams.get("plan") || "";
  const initialEmail = searchParams.get("email") || "";
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      // Dynamically import Firebase auth to avoid build-time initialization
      const { auth } = await import("@/lib/firebase");
      
      if (!auth) {
        throw new Error("Firebase authentication is not configured. Please set up Firebase environment variables.");
      }
      
      const { createUserWithEmailAndPassword, updateProfile } = await import("firebase/auth");
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
      });

      // TODO: Save additional user data (phone, plan) to your database
      // You can call your API here to save to Prisma/your database
      
      setSuccess(true);
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Create Your Account
            </h1>

            {selectedPlanId && PLAN_NAMES[selectedPlanId] && (
              <div style={{
                padding: "1rem 1.5rem",
                background: "#ecfdf5",
                borderRadius: "12px",
                marginBottom: "2rem",
                border: "1px solid #16a34a"
              }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#047857", fontWeight: "600" }}>
                  <strong>Selected Plan:</strong> {PLAN_NAMES[selectedPlanId]}
                </p>
              </div>
            )}

            {success ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <div style={{ fontSize: "4rem", color: "#16a34a", marginBottom: "1rem" }}>✓</div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  Account Created!
                </h2>
                <p style={{ color: "var(--text-light)" }}>Redirecting to your dashboard...</p>
              </div>
            ) : (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
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
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
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
                  </div>

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
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                      Phone <span style={{ color: "var(--text-light)", fontWeight: "400" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
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
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
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
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
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
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                      Log in
                    </Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    }>
      <RegisterForm />
    </Suspense>
  );
}

