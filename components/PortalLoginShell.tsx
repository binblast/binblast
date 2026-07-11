// components/PortalLoginShell.tsx
"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { PortalLoginForm } from "@/components/PortalLoginForm";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

interface PortalLoginShellProps {
  title: string;
  portalName: string;
  expectedRole: "employee" | "partner" | "customer" | "operator" | "admin";
  redirectPath: string;
  footerNote?: React.ReactNode;
}

export function PortalLoginShell({
  title,
  portalName,
  expectedRole,
  redirectPath,
  footerNote,
}: PortalLoginShellProps) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <h1
              className="section-title"
              style={{ textAlign: "center", marginBottom: "0.75rem", fontSize: "clamp(1.75rem, 4vw, 2.25rem)" }}
            >
              {title}
            </h1>
            <p
              style={{
                textAlign: "center",
                color: "#6b7280",
                marginBottom: "2rem",
                lineHeight: 1.6,
                fontSize: "0.95rem",
              }}
            >
              Sign in to your account. Use the portal that matches your account type.
            </p>

            <PortalLoginForm
              expectedRole={expectedRole}
              redirectPath={redirectPath}
              portalName={portalName}
            />

            <p style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
              Not your portal?{" "}
              <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                Choose a different portal
              </Link>
            </p>

            {footerNote && (
              <div style={{ marginTop: "1.5rem", textAlign: "center", fontSize: "0.875rem", color: "#6b7280" }}>
                {footerNote}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

interface PortalWrongRoleMessageProps {
  title: string;
  message: string;
}

export function PortalWrongRoleMessage({ title, message }: PortalWrongRoleMessageProps) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
            <h1 className="section-title" style={{ marginBottom: "1rem" }}>
              {title}
            </h1>
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "12px",
                padding: "2rem",
                color: "#dc2626",
                marginBottom: "2rem",
              }}
            >
              <p style={{ margin: 0, fontSize: "1rem", lineHeight: 1.6 }}>{message}</p>
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login" className="btn btn-primary">
                Choose Your Portal
              </Link>
              <Link href="/" className="btn" style={{ background: "#ffffff", border: "1px solid #e5e7eb" }}>
                Return Home
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export function PortalLoadingShell() {
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
