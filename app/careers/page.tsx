import dynamic from "next/dynamic";
import Link from "next/link";
import { buildSiteMetadata } from "@/lib/site-metadata";
import {
  CAREERS_BENEFITS,
  CAREERS_HERO,
  FUTURE_CAREER_OPENINGS,
  OPEN_CAREER_OPENINGS,
} from "@/lib/careers-content";
import { BUSINESS_HOURS_LINES } from "@/lib/business-hours";

export const metadata = buildSiteMetadata({
  title: "Careers — Join the Bin Blast Co. Team",
  description:
    "Apply to clean bins on Metro Atlanta routes with Bin Blast Co. View open route technician roles and future career openings.",
  keywords: [
    "Bin Blast Co careers",
    "trash bin cleaning jobs Atlanta",
    "route technician jobs Fayetteville",
    "bin cleaning employment",
  ],
});

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function statusBadge(status: "open" | "future") {
  if (status === "open") {
    return {
      label: "Now Hiring",
      background: "#dcfce7",
      color: "#166534",
      border: "#bbf7d0",
    };
  }

  return {
    label: "Future Opening",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "#bfdbfe",
  };
}

function JobCard({
  job,
  showApply,
}: {
  job: (typeof OPEN_CAREER_OPENINGS)[number] | (typeof FUTURE_CAREER_OPENINGS)[number];
  showApply: boolean;
}) {
  const badge = statusBadge(job.status);

  return (
    <article
      style={{
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "16px",
        padding: "clamp(1.25rem, 4vw, 1.75rem)",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "0.75rem",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#111827" }}>
          {job.title}
        </h3>
        <span
          style={{
            display: "inline-block",
            padding: "0.35rem 0.75rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            background: badge.background,
            color: badge.color,
            border: `1px solid ${badge.border}`,
          }}
        >
          {badge.label}
        </span>
      </div>

      <p style={{ margin: "0 0 0.35rem", color: "#374151", fontWeight: 600 }}>{job.location}</p>
      <p style={{ margin: "0 0 1rem", color: "#6b7280", fontSize: "0.9375rem" }}>{job.schedule}</p>
      <p style={{ margin: "0 0 1rem", color: "#374151", lineHeight: 1.6 }}>{job.summary}</p>

      {job.paySummary && (
        <p
          style={{
            margin: "0 0 1rem",
            padding: "0.75rem 0.875rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            color: "#166534",
            fontSize: "0.875rem",
            lineHeight: 1.5,
          }}
        >
          <strong>Pay:</strong> {job.paySummary}
        </p>
      )}

      <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div>
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>
            What you&apos;ll do
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#4b5563", lineHeight: 1.55, fontSize: "0.9rem" }}>
            {job.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={{ margin: "0 0 0.5rem", fontSize: "0.875rem", fontWeight: 700, color: "#111827" }}>
            What we&apos;re looking for
          </h4>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "#4b5563", lineHeight: 1.55, fontSize: "0.9rem" }}>
            {job.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {showApply && (
        <div style={{ marginTop: "1.25rem" }}>
          <Link href="/employee/register" className="btn btn-primary">
            Apply for This Role
          </Link>
        </div>
      )}
    </article>
  );
}

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className="bg-white marketing-main">
        <section
          style={{
            background: "linear-gradient(135deg, #0f172a 0%, #14532d 55%, #1e3a5f 100%)",
            color: "#ffffff",
            padding: "clamp(3rem, 10vw, 5rem) 0",
          }}
        >
          <div className="container" style={{ maxWidth: "920px" }}>
            <p
              style={{
                margin: "0 0 0.75rem",
                fontSize: "0.8125rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#86efac",
              }}
            >
              Careers
            </p>
            <h1
              style={{
                margin: "0 0 1rem",
                fontSize: "clamp(2rem, 6vw, 3rem)",
                fontWeight: 800,
                lineHeight: 1.15,
              }}
            >
              {CAREERS_HERO.title}
            </h1>
            <p
              style={{
                margin: "0 0 1.75rem",
                fontSize: "clamp(1rem, 3vw, 1.2rem)",
                lineHeight: 1.7,
                color: "rgba(255,255,255,0.92)",
                maxWidth: "760px",
              }}
            >
              {CAREERS_HERO.subtitle}
            </p>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link href="/employee/register" className="btn btn-primary btn-large">
                Apply Now
              </Link>
              <Link
                href="/employee"
                className="btn btn-secondary btn-large"
                style={{ background: "transparent", border: "2px solid #ffffff", color: "#ffffff" }}
              >
                Employee Sign In
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "clamp(2.5rem, 8vw, 4rem) 0", background: "#f9fafb" }}>
          <div className="container" style={{ maxWidth: "920px" }}>
            <h2 className="section-title" style={{ textAlign: "left", marginBottom: "1rem" }}>
              Why work with Bin Blast Co.?
            </h2>
            <ul
              style={{
                margin: 0,
                paddingLeft: "1.25rem",
                display: "grid",
                gap: "0.65rem",
                color: "#374151",
                lineHeight: 1.6,
              }}
            >
              {CAREERS_BENEFITS.map((benefit) => (
                <li key={benefit}>{benefit}</li>
              ))}
            </ul>
          </div>
        </section>

        <section style={{ padding: "clamp(2.5rem, 8vw, 4rem) 0" }}>
          <div className="container" style={{ maxWidth: "920px" }}>
            <h2 className="section-title" style={{ textAlign: "left", marginBottom: "0.5rem" }}>
              Open Positions
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              We&apos;re actively hiring route technicians to clean bins across Metro Atlanta.
            </p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {OPEN_CAREER_OPENINGS.map((job) => (
                <JobCard key={job.id} job={job} showApply />
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "clamp(2.5rem, 8vw, 4rem) 0", background: "#f9fafb" }}>
          <div className="container" style={{ maxWidth: "920px" }}>
            <h2 className="section-title" style={{ textAlign: "left", marginBottom: "0.5rem" }}>
              Future Openings
            </h2>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              We&apos;re growing. Apply now for route technician roles and mention your interest in
              future positions — we&apos;ll contact you when those roles open.
            </p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {FUTURE_CAREER_OPENINGS.map((job) => (
                <JobCard key={job.id} job={job} showApply={false} />
              ))}
            </div>
            <div style={{ marginTop: "1.5rem" }}>
              <Link href="/employee/register" className="btn btn-primary">
                Submit General Application
              </Link>
            </div>
          </div>
        </section>

        <section style={{ padding: "clamp(2.5rem, 8vw, 4rem) 0" }}>
          <div
            className="container"
            style={{
              maxWidth: "920px",
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "16px",
              padding: "clamp(1.5rem, 4vw, 2rem)",
            }}
          >
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem", fontWeight: 700, color: "#111827" }}>
              Questions about careers?
            </h2>
            <p style={{ margin: "0 0 0.75rem", color: "#4b5563", lineHeight: 1.6 }}>
              Email{" "}
              <a href="mailto:support@binblastco.com" style={{ color: "#16a34a", fontWeight: 600 }}>
                support@binblastco.com
              </a>{" "}
              or call{" "}
              <a href="tel:+14703050823" style={{ color: "#16a34a", fontWeight: 600 }}>
                (470) 305-0823
              </a>
              .
            </p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9375rem", lineHeight: 1.6 }}>
              {BUSINESS_HOURS_LINES.join(" · ")}
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
