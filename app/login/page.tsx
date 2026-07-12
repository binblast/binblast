// app/login/page.tsx

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { PORTAL_INFO } from "@/lib/user-portal";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const PORTAL_ORDER = ["customer", "partner", "employee", "operator"] as const;

function LoginForm() {
  const searchParams = useSearchParams();
  const passwordReset = searchParams.get("passwordReset") === "true";

  return (
    <>
      <Navbar />
      <main className="page-main portal-login-shell" style={{ background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Sign In
            </h1>
            <p style={{
              textAlign: "center",
              color: "#6b7280",
              marginBottom: "2rem",
              lineHeight: 1.6,
              fontSize: "1rem",
            }}>
              Choose your account type to continue.
            </p>

            {passwordReset && (
              <div style={{
                padding: "0.875rem 1rem",
                background: "#dcfce7",
                border: "1px solid #86efac",
                borderRadius: "10px",
                color: "#166534",
                fontSize: "0.875rem",
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}>
                Your password has been reset. Sign in below with your new password.
              </div>
            )}

            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}>
              {PORTAL_ORDER.map((portalId, index) => {
                const portal = PORTAL_INFO[portalId];
                return (
                  <div key={portal.id}>
                    {portal.id === "operator" && (
                      <div style={{
                        height: "1px",
                        background: "#e5e7eb",
                        margin: "0.25rem 0 1rem",
                      }} />
                    )}
                    <Link
                      href={portal.path}
                      style={{
                        display: "block",
                        background: "#ffffff",
                        borderRadius: "16px",
                        padding: "1.25rem 1.5rem",
                        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
                        border: "1px solid #e5e7eb",
                        textDecoration: "none",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#16a34a";
                        e.currentTarget.style.boxShadow = "0 8px 24px rgba(22, 163, 74, 0.12)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.06)";
                      }}
                    >
                      <div style={{
                        fontSize: "1.05rem",
                        fontWeight: "700",
                        color: "var(--text-dark)",
                        marginBottom: "0.35rem",
                      }}>
                        {portal.name}
                      </div>
                      <div style={{
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        lineHeight: 1.5,
                      }}>
                        {portal.subtitle}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>

            <p style={{
              textAlign: "center",
              fontSize: "0.875rem",
              color: "var(--text-light)",
              marginTop: "2rem",
              lineHeight: 1.6,
            }}>
              Pick the option that matches your account.
            </p>
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
