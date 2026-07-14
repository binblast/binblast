// app/employee/training/[moduleId]/page.tsx
// Lesson detail page with PDF viewer and quiz gating

"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LessonReader } from "@/components/EmployeeDashboard/LessonReader";
import { getAuthInstance } from "@/lib/firebase";

const Navbar = dynamic(() => import("@/components/Navbar").then((mod) => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

export default function TrainingModulePage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params?.moduleId as string;
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadEmployee() {
      try {
        const auth = await getAuthInstance();
        if (auth.currentUser) {
          setEmployeeId(auth.currentUser.uid);
        } else {
          router.push("/login?redirect=/employee/training/" + moduleId);
        }
      } catch (error) {
        console.error("Error loading employee:", error);
        router.push("/login?redirect=/employee/training/" + moduleId);
      } finally {
        setLoading(false);
      }
    }
    loadEmployee();
  }, [moduleId, router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="page-main" style={{ background: "var(--bg-white)" }}>
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            Loading...
          </div>
        </main>
      </>
    );
  }

  if (!employeeId || !moduleId) {
    return (
      <>
        <Navbar />
        <main className="page-main" style={{ background: "var(--bg-white)", padding: "1.5rem" }}>
          <div
            style={{
              maxWidth: "900px",
              margin: "0 auto",
              padding: "2rem",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
            }}
          >
            Unable to load training module. Please try again.
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="page-main" style={{ background: "var(--bg-white)" }}>
        <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
          <LessonReader moduleId={moduleId} employeeId={employeeId} />
        </div>
      </main>
    </>
  );
}
