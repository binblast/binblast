// app/employee/training/[moduleId]/page.tsx
// Lesson detail page with PDF viewer and quiz gating

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LessonReader } from "@/components/EmployeeDashboard/LessonReader";
import { getAuthInstance } from "@/lib/firebase";

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
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!employeeId || !moduleId) {
    return (
      <div
        style={{
          padding: "2rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
        }}
      >
        Unable to load training module. Please try again.
      </div>
    );
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1400px", margin: "0 auto" }}>
      <LessonReader moduleId={moduleId} employeeId={employeeId} />
    </div>
  );
}
