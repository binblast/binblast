import dynamic from "next/dynamic";
import Link from "next/link";
import { buildSiteMetadata } from "@/lib/site-metadata";
import {
  CAREERS_BENEFITS,
  CAREERS_HERO,
  CAREERS_MISSION,
  FUTURE_CAREER_OPENINGS,
  HIRING_TIMELINE_NOTE,
  HIRING_TIMELINE_STEPS,
  OPEN_CAREER_OPENINGS,
} from "@/lib/careers-content";
import type { CareerOpening } from "@/lib/careers-types";
import { BUSINESS_HOURS_LINES } from "@/lib/business-hours";
import "./careers.css";

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

function OpeningCard({ job, showApply }: { job: CareerOpening; showApply: boolean }) {
  const badgeClass = job.status === "open" ? "careers-badge careers-badge--open" : "careers-badge careers-badge--future";
  const badgeLabel = job.status === "open" ? "Now Hiring" : "Future Opening";
  const applyHref =
    job.status === "open"
      ? `/careers/apply?position=${job.id}`
      : "/careers/apply?position=route-technician&talent=1";
  const applyLabel = job.status === "open" ? "Apply for This Role" : "Submit General Application";

  return (
    <article className="careers-card careers-job-card">
      <div className="careers-job-card__header">
        <h3 className="careers-job-card__title">{job.title}</h3>
        <span className={badgeClass}>{badgeLabel}</span>
      </div>

      <p className="careers-job-card__location">{job.location}</p>
      <p className="careers-job-card__meta">
        {job.employmentType}
        {job.schedule ? ` · ${job.schedule}` : ""}
      </p>
      <p className="careers-job-card__summary">{job.summary}</p>

      <div className="careers-job-card__pay">
        <strong>Pay:</strong> {job.payRange}
      </div>

      <div className="careers-grid-2 careers-job-card__details">
        <div>
          <h4 className="careers-job-card__column-title">What you&apos;ll do</h4>
          <ul className="careers-job-card__list">
            {job.responsibilities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="careers-job-card__column-title">What we&apos;re looking for</h4>
          <ul className="careers-job-card__list">
            {job.requirements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      {showApply && (
        <Link href={applyHref} className="btn btn-primary">
          {applyLabel}
        </Link>
      )}
    </article>
  );
}

export default function CareersPage() {
  return (
    <>
      <Navbar />
      <main className="careers-page">
        <section className="careers-hero">
          <div className="careers-hero__bg" aria-hidden="true" />
          <div className="careers-container careers-hero__content">
            <span className="careers-eyebrow">Careers</span>
            <h1>{CAREERS_HERO.title}</h1>
            <p>{CAREERS_HERO.subtitle}</p>
            <div className="careers-actions">
              <Link href="/careers/apply" className="btn btn-primary btn-large">
                Apply Now
              </Link>
              <Link
                href="#openings"
                className="btn btn-secondary btn-large"
                style={{ background: "transparent", border: "2px solid #ffffff", color: "#ffffff" }}
              >
                View Open Positions
              </Link>
            </div>
          </div>
        </section>

        <section className="careers-section">
          <div className="careers-container">
            <h2 style={{ margin: "0 0 0.75rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 }}>
              {CAREERS_MISSION.headline}
            </h2>
            <p style={{ margin: "0 0 2rem", maxWidth: "760px", lineHeight: 1.7, color: "var(--careers-muted)" }}>
              {CAREERS_MISSION.body}
            </p>
            <div className="careers-grid-3">
              {CAREERS_BENEFITS.map((benefit) => (
                <div key={benefit} className="careers-benefit">
                  <span className="careers-benefit__dot" aria-hidden="true" />
                  <span>{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="careers-section" style={{ background: "var(--careers-surface)" }}>
          <div className="careers-container">
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 }}>
              Hiring Process
            </h2>
            <p style={{ margin: "0 0 2rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>{HIRING_TIMELINE_NOTE}</p>
            <div className="careers-timeline">
              {HIRING_TIMELINE_STEPS.map((step, index) => (
                <div key={step.title} className="careers-timeline__step">
                  <div className="careers-timeline__number">{index + 1}</div>
                  <div>
                    <h3 style={{ margin: "0 0 0.35rem", fontSize: "1.05rem", fontWeight: 700 }}>{step.title}</h3>
                    <p style={{ margin: 0, color: "var(--careers-muted)", lineHeight: 1.6 }}>{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="openings" className="careers-section">
          <div className="careers-container">
            <h2 style={{ margin: "0 0 0.5rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800 }}>
              Open Positions
            </h2>
            <p style={{ margin: "0 0 2rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
              We&apos;re actively hiring route technicians to clean bins across Metro Atlanta.
            </p>

            <div style={{ display: "grid", gap: "1.25rem", marginBottom: "3rem" }}>
              {OPEN_CAREER_OPENINGS.map((job) => (
                <OpeningCard key={job.id} job={job} showApply />
              ))}
            </div>

            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.35rem", fontWeight: 700 }}>Future Openings</h3>
            <p style={{ margin: "0 0 1.5rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
              We&apos;re growing. Join our talent pool and we&apos;ll contact you when these roles open.
            </p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {FUTURE_CAREER_OPENINGS.map((job) => (
                <OpeningCard key={job.id} job={job} showApply />
              ))}
            </div>
          </div>
        </section>

        <section className="careers-section" style={{ background: "var(--careers-surface)" }}>
          <div className="careers-container">
            <div className="careers-card" style={{ textAlign: "center", maxWidth: "760px", margin: "0 auto" }}>
              <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.5rem", fontWeight: 800 }}>Join Our Talent Pool</h2>
              <p style={{ margin: "0 0 1.5rem", color: "var(--careers-muted)", lineHeight: 1.7 }}>
                Not ready for a specific role? Tell us about your skills and availability — we&apos;ll reach out when
                the right opportunity opens up.
              </p>
              <Link
                href="/careers/apply?position=route-technician&talent=1"
                className="btn btn-primary btn-large"
              >
                Join Talent Pool
              </Link>
            </div>
          </div>
        </section>

        <section className="careers-section">
          <div className="careers-container">
            <div className="careers-card">
              <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.35rem", fontWeight: 700 }}>Questions about careers?</h2>
              <p style={{ margin: "0 0 0.75rem", lineHeight: 1.6, color: "var(--careers-muted)" }}>
                Email{" "}
                <a href="mailto:support@binblastco.com" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                  support@binblastco.com
                </a>{" "}
                or call{" "}
                <a href="tel:+14703050823" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                  (470) 305-0823
                </a>
                .
              </p>
              <ul style={{ margin: 0, paddingLeft: "1.25rem", color: "var(--careers-muted)", lineHeight: 1.7 }}>
                {BUSINESS_HOURS_LINES.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
