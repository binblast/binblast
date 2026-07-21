import dynamic from "next/dynamic";
import Link from "next/link";
import { HIRING_TIMELINE_NOTE, HIRING_TIMELINE_STEPS } from "@/lib/careers-content";
import { buildSiteMetadata } from "@/lib/site-metadata";
import "../../careers.css";

export const metadata = buildSiteMetadata({
  title: "Application Received — Bin Blast Co. Careers",
  description: "Your Bin Blast Co. career application has been received. Review next steps in our hiring process.",
});

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function CareersApplyConfirmationPage() {
  return (
    <>
      <Navbar />
      <main className="careers-page">
        <section className="careers-section">
          <div className="careers-container" style={{ maxWidth: "760px" }}>
            <div className="careers-wizard">
              <p className="careers-eyebrow" style={{ background: "rgba(22, 163, 74, 0.12)", color: "var(--careers-accent-dark)", border: "1px solid rgba(22, 163, 74, 0.25)" }}>
                Application Received
              </p>
              <h1 style={{ margin: "0 0 0.75rem", fontSize: "clamp(1.75rem, 4vw, 2.25rem)", fontWeight: 800 }}>
                Thank you for applying
              </h1>
              <p style={{ margin: "0 0 2rem", color: "var(--careers-muted)", lineHeight: 1.7 }}>
                We&apos;ve received your application. Our recruiting team will review your information and follow up
                by email with next steps. {HIRING_TIMELINE_NOTE}
              </p>

              <h2 style={{ margin: "0 0 1rem", fontSize: "1.15rem", fontWeight: 700 }}>What happens next</h2>
              <div className="careers-timeline" style={{ marginBottom: "2rem" }}>
                {HIRING_TIMELINE_STEPS.slice(0, 4).map((step, index) => (
                  <div key={step.title} className="careers-timeline__step">
                    <div className="careers-timeline__number">{index + 1}</div>
                    <div>
                      <h3 style={{ margin: "0 0 0.25rem", fontSize: "1rem", fontWeight: 700 }}>{step.title}</h3>
                      <p style={{ margin: 0, color: "var(--careers-muted)", lineHeight: 1.6, fontSize: "0.9375rem" }}>
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="careers-actions" style={{ marginBottom: "1.5rem" }}>
                <Link href="/" className="btn btn-primary">
                  Return Home
                </Link>
                <Link href="/careers#openings" className="btn btn-secondary">
                  View Other Careers
                </Link>
              </div>

              <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--careers-muted)", lineHeight: 1.6 }}>
                Track your application status anytime from your{" "}
                <Link href="/careers/dashboard" style={{ color: "var(--careers-accent)", fontWeight: 600 }}>
                  applicant dashboard
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
