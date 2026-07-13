import Link from "next/link";
import type { ReactNode } from "react";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated?: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container" style={{ maxWidth: "800px", padding: "3rem 1.5rem 4rem" }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            marginBottom: "2rem",
            color: "var(--primary-color, #2563eb)",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          ← Back to Bin Blast Co.
        </Link>

        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-dark, #111827)" }}>
          {title}
        </h1>
        {lastUpdated && (
          <p style={{ color: "#6b7280", marginBottom: "2rem", fontSize: "0.95rem" }}>
            Last updated: {lastUpdated}
          </p>
        )}

        <div
          className="legal-content"
          style={{
            lineHeight: 1.7,
            color: "#374151",
            fontSize: "1rem",
          }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}
