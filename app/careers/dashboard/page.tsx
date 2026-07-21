"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  CAREER_APPLICATION_PIPELINE,
  CAREER_APPLICATION_STATUS_LABELS,
  type CareerApplicationRecord,
  type CareerApplicationStatus,
} from "@/lib/careers-types";
import { getPipelineProgress } from "@/lib/careers-application";
import "../careers.css";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

async function fetchApplication(token: string): Promise<CareerApplicationRecord | null> {
  const response = await fetch("/api/careers/applications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data.application || null;
}

function pipelineIndex(status: CareerApplicationStatus): number {
  const idx = CAREER_APPLICATION_PIPELINE.indexOf(status);
  return idx >= 0 ? idx : -1;
}

export default function CareersDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<{ uid: string; email: string | null } | null>(null);
  const [application, setApplication] = useState<CareerApplicationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const loadApplication = useCallback(async (token: string) => {
    const record = await fetchApplication(token);
    setApplication(record);
    if (record) {
      setPhone(record.personal.phone);
      setEmail(record.personal.email);
    }
  }, []);

  useEffect(() => {
    async function initAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();

        if (auth?.currentUser) {
          setUser({ uid: auth.currentUser.uid, email: auth.currentUser.email });
          const token = await auth.currentUser.getIdToken();
          await loadApplication(token);
        }

        const unsubscribe = await onAuthStateChanged(async (nextUser) => {
          if (nextUser) {
            setUser({ uid: nextUser.uid, email: nextUser.email });
            const token = await nextUser.getIdToken();
            await loadApplication(token);
          } else {
            setUser(null);
            setApplication(null);
          }
          setAuthReady(true);
          setLoading(false);
        });

        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (err) {
        console.error("[Careers Dashboard] auth error:", err);
        setLoading(false);
        setAuthReady(true);
      }
    }

    initAuth();
  }, [loadApplication]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoginLoading(true);

    try {
      const { signInWithEmailAndPassword } = await import("@/lib/firebase");
      await signInWithEmailAndPassword(loginEmail.trim(), loginPassword);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      setError(msg);
    } finally {
      setLoginLoading(false);
    }
  }

  async function getToken(): Promise<string | null> {
    const { getAuthInstance } = await import("@/lib/firebase");
    const auth = await getAuthInstance();
    const current = auth?.currentUser;
    if (!current) return null;
    return current.getIdToken();
  }

  async function handleUpdateContact(e: React.FormEvent) {
    e.preventDefault();
    if (!application) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");

      const response = await fetch(`/api/careers/applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "update_contact", phone, email }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update contact info.");

      setApplication(data.application);
      setMessage("Contact information updated.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update contact info.");
    } finally {
      setSaving(false);
    }
  }

  async function handleWithdraw() {
    if (!application) return;
    if (!confirm("Withdraw your application? You can re-apply later if a new role opens.")) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again.");

      const response = await fetch(`/api/careers/applications/${application.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "withdraw" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to withdraw application.");

      setApplication(data.application);
      setMessage("Your application has been withdrawn.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to withdraw application.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="careers-page careers-section">
          <div className="careers-container">
            <div className="careers-wizard" style={{ textAlign: "center" }}>Loading dashboard...</div>
          </div>
        </main>
      </>
    );
  }

  if (authReady && !user) {
    return (
      <>
        <Navbar />
        <main className="careers-page careers-section">
          <div className="careers-container" style={{ maxWidth: "520px" }}>
            <div className="careers-wizard">
              <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.75rem", fontWeight: 800 }}>Applicant Dashboard</h1>
              <p style={{ margin: "0 0 1.5rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
                Sign in with the email and password you used when applying.
              </p>

              <form onSubmit={handleLogin} className="careers-field" style={{ display: "grid", gap: "1rem" }}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </label>

                {error && (
                  <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
                )}

                <button type="submit" className="btn btn-primary" disabled={loginLoading}>
                  {loginLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <p style={{ margin: "1.25rem 0 0", fontSize: "0.9375rem", color: "var(--careers-muted)" }}>
                Haven&apos;t applied yet?{" "}
                <Link href="/careers/apply" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                  Start your application
                </Link>
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const currentPipelineIndex = application ? pipelineIndex(application.status) : -1;
  const progress = application ? getPipelineProgress(application.status) : 0;
  const isTerminal = application
    ? ["not_selected", "withdrawn", "hired"].includes(application.status)
    : false;

  return (
    <>
      <Navbar />
      <main className="careers-page careers-section">
        <div className="careers-container" style={{ maxWidth: "860px" }}>
          <div className="careers-wizard">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
              <div>
                <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.75rem", fontWeight: 800 }}>Applicant Dashboard</h1>
                <p style={{ margin: 0, color: "var(--careers-muted)" }}>{user?.email}</p>
              </div>
              <Link href="/careers" className="btn btn-secondary">
                View Careers
              </Link>
            </div>

            {!application ? (
              <div style={{ padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--careers-border)", background: "var(--careers-bg)" }}>
                <p style={{ margin: 0, color: "var(--careers-muted)", lineHeight: 1.6 }}>
                  No application found for this account.{" "}
                  <Link href="/careers/apply" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                    Submit an application
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <div className="careers-progress__label">
                    <span>{application.positionTitle}</span>
                    <span>{CAREER_APPLICATION_STATUS_LABELS[application.status]}</span>
                  </div>
                  <div className="careers-progress__bar">
                    <div className="careers-progress__fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <h2 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700 }}>Application Status</h2>
                <div className="careers-dashboard-status" style={{ marginBottom: "2rem" }}>
                  {CAREER_APPLICATION_PIPELINE.map((step, index) => {
                    const done = currentPipelineIndex >= index && application.status !== "not_selected";
                    const active = application.status === step;
                    return (
                      <div
                        key={step}
                        className={`careers-dashboard-status__item${done ? " careers-dashboard-status__item--done" : ""}`}
                        style={active ? { borderColor: "var(--careers-accent)" } : undefined}
                      >
                        <span>{CAREER_APPLICATION_STATUS_LABELS[step]}</span>
                        <span style={{ fontSize: "0.8125rem", color: "var(--careers-muted)" }}>
                          {done ? "Complete" : active ? "Current" : "Pending"}
                        </span>
                      </div>
                    );
                  })}
                  {application.status === "not_selected" && (
                    <div className="careers-dashboard-status__item" style={{ borderColor: "#fecaca", background: "#fef2f2" }}>
                      <span>{CAREER_APPLICATION_STATUS_LABELS.not_selected}</span>
                      <span style={{ fontSize: "0.8125rem", color: "#dc2626" }}>Closed</span>
                    </div>
                  )}
                  {application.status === "withdrawn" && (
                    <div className="careers-dashboard-status__item">
                      <span>{CAREER_APPLICATION_STATUS_LABELS.withdrawn}</span>
                      <span style={{ fontSize: "0.8125rem", color: "var(--careers-muted)" }}>Withdrawn</span>
                    </div>
                  )}
                </div>

                <div style={{ display: "grid", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div className="careers-card">
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Update Contact Info</h3>
                    <form onSubmit={handleUpdateContact} className="careers-field-grid">
                      <label>
                        Phone
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          disabled={isTerminal}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled={isTerminal}
                        />
                      </label>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <button type="submit" className="btn btn-primary" disabled={saving || isTerminal}>
                          {saving ? "Saving..." : "Save Changes"}
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="careers-card">
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>Documents</h3>
                    <ul style={{ margin: 0, paddingLeft: "1.1rem", lineHeight: 1.8, color: "var(--careers-muted)" }}>
                      <li>
                        Resume:{" "}
                        {application.documents.resumeUrl ? (
                          <a href={application.documents.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                            {application.documents.resumeFileName || "View resume"}
                          </a>
                        ) : (
                          "Not uploaded"
                        )}
                      </li>
                      <li>
                        Driver&apos;s license:{" "}
                        {application.documents.driversLicenseUrl ? (
                          <a href={application.documents.driversLicenseUrl} target="_blank" rel="noopener noreferrer" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                            {application.documents.driversLicenseFileName || "View license"}
                          </a>
                        ) : (
                          "Not uploaded"
                        )}
                      </li>
                      {application.documents.certificationUrls.length > 0 && (
                        <li>
                          Certifications:{" "}
                          {application.documents.certificationUrls.map((url, i) => (
                            <a key={url} href={url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--careers-accent)", fontWeight: 600, marginRight: "0.5rem" }}>
                              File {i + 1}
                            </a>
                          ))}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                {message && (
                  <p style={{ margin: "0 0 1rem", color: "var(--careers-accent)", fontWeight: 600 }}>{message}</p>
                )}
                {error && (
                  <p style={{ margin: "0 0 1rem", color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>
                )}

                {!isTerminal && (
                  <button
                    type="button"
                    onClick={handleWithdraw}
                    className="btn btn-secondary"
                    disabled={saving}
                    style={{ borderColor: "#fecaca", color: "#dc2626" }}
                  >
                    Withdraw Application
                  </button>
                )}

                <p style={{ margin: "1.5rem 0 0", fontSize: "0.875rem", color: "var(--careers-muted)" }}>
                  Submitted {new Date(application.submittedAt).toLocaleString()}
                  {application.interviewScheduledAt && (
                    <> · Interview scheduled {new Date(application.interviewScheduledAt).toLocaleString()}</>
                  )}
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
