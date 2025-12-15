// app/admin/employees/[employeeId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { EmployeeDetail } from "@/components/AdminDashboard/EmployeeDetail";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const ALLOWED_ADMIN_EMAILS = [
  "binblastcompany@gmail.com",
];

export default function AdminEmployeeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.employeeId as string;
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (auth?.currentUser) {
          const email = auth.currentUser.email;
          setUserEmail(email || null);
          
          if (!email || !ALLOWED_ADMIN_EMAILS.includes(email)) {
            router.push("/login");
            return;
          }
          
          setLoading(false);
        }
        
        const unsubscribe = await onAuthStateChanged((user) => {
          if (user?.email) {
            setUserEmail(user.email);
            if (!ALLOWED_ADMIN_EMAILS.includes(user.email)) {
              router.push("/login");
              return;
            }
            setLoading(false);
          } else {
            router.push("/login");
          }
        });
        
        return () => {
          if (unsubscribe) unsubscribe();
        };
      } catch (err) {
        console.error("Error checking auth:", err);
        setLoading(false);
      }
    }
    
    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
          <div className="container">
            <div style={{ textAlign: "center", padding: "4rem 0" }}>
              <p>Loading...</p>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "#f9fafb" }}>
        <div className="container">
          <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <button
                onClick={() => router.push("/admin/employees")}
                style={{
                  padding: "0.5rem 1rem",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  cursor: "pointer",
                  marginBottom: "1rem",
                }}
              >
                ← Back to Employee List
              </button>
            </div>
            <div style={{
              padding: "2rem",
              background: "white",
              borderRadius: "12px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
              border: "1px solid #e5e7eb"
            }}>
              <EmployeeDetail employeeId={employeeId} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
