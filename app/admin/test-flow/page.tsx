"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { canAccessAdminPages } from "@/lib/owner-auth";
import type { SeedTestFlowResult } from "@/lib/seed-test-flow";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

async function userCanAccessAdmin(email: string | null, uid: string): Promise<boolean> {
  if (canAccessAdminPages(email)) return true;
  try {
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const db = await getDbInstance();
    if (!db) return false;
    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;
    const userDoc = await getDoc(doc(db, "users", uid));
    if (!userDoc.exists()) return false;
    return canAccessAdminPages(email, userDoc.data().role);
  } catch {
    return false;
  }
}

export default function AdminTestFlowPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SeedTestFlowResult | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();

        if (!auth) {
          router.push("/login");
          return;
        }

        const verify = async () => {
          const user = auth.currentUser;
          if (!user) {
            router.push("/login");
            return;
          }

          const allowed = await userCanAccessAdmin(user.email, user.uid);
          if (!allowed) {
            router.push("/login");
            return;
          }

          setLoading(false);
        };

        if (auth.currentUser) {
          await verify();
        } else {
          onAuthStateChanged(async (user) => {
            if (!user) {
              router.push("/login");
              return;
            }
            const allowed = await userCanAccessAdmin(user.email, user.uid);
            if (!allowed) {
              router.push("/login");
              return;
            }
            setLoading(false);
          });
        }
      } catch {
        router.push("/login");
      }
    }

    checkAuth();
  }, [router]);

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/admin/seed-test-flow", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create test flow accounts");
      }
      setResult(data as SeedTestFlowResult);
    } catch (createError: unknown) {
      setError(createError instanceof Error ? createError.message : "Failed to create test accounts");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ padding: "3rem 1.5rem", textAlign: "center" }}>Loading...</main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "2.5rem 1.25rem 4rem",
        }}
      >
        <p style={{ margin: "0 0 0.5rem", color: "#64748b", fontSize: "0.875rem" }}>
          <Link href="/dashboard" style={{ color: "#2563eb" }}>
            ← Back to Blast Command
          </Link>
        </p>

        <h1 style={{ margin: "0 0 0.75rem", fontSize: "1.75rem" }}>Test Flow Setup</h1>
        <p style={{ margin: "0 0 1.5rem", color: "#475569", lineHeight: 1.6 }}>
          Creates a paid test customer, a certified test employee, and a cleaning assigned for today so
          you can walk through payment → assignment → completion.
        </p>

        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          style={{
            padding: "0.85rem 1.25rem",
            border: "none",
            borderRadius: "10px",
            background: creating ? "#9ca3af" : "#16a34a",
            color: "#fff",
            fontWeight: 700,
            cursor: creating ? "not-allowed" : "pointer",
          }}
        >
          {creating ? "Creating..." : "Create test flow accounts"}
        </button>

        {error && (
          <p
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              borderRadius: "10px",
              background: "#fef2f2",
              color: "#b91c1c",
              border: "1px solid #fecaca",
            }}
          >
            {error}
          </p>
        )}

        {result && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1.25rem",
              borderRadius: "12px",
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              display: "grid",
              gap: "1rem",
            }}
          >
            <section>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Customer</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Email: <strong>{result.customer.email}</strong>
                <br />
                Password: <strong>{result.customer.password}</strong>
                <br />
                Login: <Link href="/customer">/customer</Link>
                <br />
                Cleaning ID: <code>{result.customer.cleaningId}</code> ({result.customer.scheduledDate})
              </p>
            </section>

            <section>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Employee</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                Email: <strong>{result.employee.email}</strong>
                <br />
                Password: <strong>{result.employee.password}</strong>
                <br />
                Login: <Link href="/employee">/employee</Link>
              </p>
            </section>

            <section>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Operator</h2>
              <p style={{ margin: 0, lineHeight: 1.6 }}>
                {result.operator.note}
                <br />
                Login: <Link href={result.operator.loginUrl}>{result.operator.loginUrl}</Link>
              </p>
            </section>

            <section>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Test steps</h2>
              <ol style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7 }}>
                {result.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          </div>
        )}
      </main>
    </>
  );
}
