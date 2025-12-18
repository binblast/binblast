// app/admin/messages/page.tsx
// Messaging center page for admin/operator

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagingCenter } from "@/components/AdminDashboard/MessagingCenter";
import dynamic from "next/dynamic";

const Navbar = dynamic(() => import("@/components/Navbar").then(mod => ({ default: mod.Navbar })), { ssr: false });

export default function MessagesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      try {
        const { getAuthInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (!auth) {
          router.push("/login?redirect=/admin/messages");
          return;
        }

        auth.onAuthStateChanged(async (user: any) => {
          if (!user) {
            router.push("/login?redirect=/admin/messages");
            return;
          }

          // Check if user is admin or operator
          const { getDbInstance } = await import("@/lib/firebase");
          const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
          const db = await getDbInstance();
          
          if (!db) {
            router.push("/login?redirect=/admin/messages");
            return;
          }

          const firestore = await safeImportFirestore();
          const { doc, getDoc } = firestore;
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const role = userData.role;
            
            if (role !== "admin" && role !== "operator" && user.email !== "binblastcompany@gmail.com") {
              router.push("/dashboard");
              return;
            }
            
            setUserId(user.uid);
            setLoading(false);
          } else {
            router.push("/login?redirect=/admin/messages");
          }
        });
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/login?redirect=/admin/messages");
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <Navbar />
      <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1.5rem", color: "#111827" }}>
          Messaging Center
        </h1>
        <MessagingCenter userId={userId} />
      </div>
    </div>
  );
}
