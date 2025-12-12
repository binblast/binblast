// app/partners/[slug]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function PartnerSlugPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  useEffect(() => {
    // Look up partner by slug and redirect to pricing with partner code
    async function redirectToPricing() {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const { collection, query, where, getDocs } = firestore;

        const db = await getDbInstance();
        if (!db) {
          router.push("/#pricing");
          return;
        }

        const partnersQuery = query(
          collection(db, "partners"),
          where("partnerSlug", "==", slug),
          where("partnerStatus", "==", "approved")
        );
        const partnersSnapshot = await getDocs(partnersQuery);

        if (!partnersSnapshot.empty) {
          const partnerDoc = partnersSnapshot.docs[0];
          const partnerData = partnerDoc.data();
          const partnerCode = partnerData.partnerCode;
          
          // Redirect to pricing page with partner code
          router.push(`/#pricing?partner=${partnerCode}`);
        } else {
          // Partner not found or not approved, redirect to pricing without partner code
          router.push("/#pricing");
        }
      } catch (err) {
        console.error("Error looking up partner:", err);
        router.push("/#pricing");
      }
    }

    if (slug) {
      redirectToPricing();
    } else {
      router.push("/#pricing");
    }
  }, [slug, router]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-white)"
    }}>
      <div style={{ textAlign: "center" }}>
        <p style={{ color: "var(--text-light)" }}>Redirecting...</p>
      </div>
    </div>
  );
}
