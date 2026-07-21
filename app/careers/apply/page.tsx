"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ApplicationWizard } from "@/components/Careers/ApplicationWizard";
import "../careers.css";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

function ApplyPageContent() {
  const searchParams = useSearchParams();
  const position = searchParams.get("position") || "route-technician";
  const talent = searchParams.get("talent") === "1";

  return (
    <>
      <Navbar />
      <main className="careers-page">
        <section className="careers-section">
          <div className="careers-container" style={{ maxWidth: "860px" }}>
            <ApplicationWizard positionId={position} joinTalentPool={talent} />
          </div>
        </section>
      </main>
    </>
  );
}

export default function CareersApplyPage() {
  return (
    <Suspense
      fallback={
        <main className="careers-page careers-section">
          <div className="careers-container">
            <div className="careers-wizard" style={{ textAlign: "center" }}>
              Loading application...
            </div>
          </div>
        </main>
      }
    >
      <ApplyPageContent />
    </Suspense>
  );
}
