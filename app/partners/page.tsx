// app/partners/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  PortalLoadingShell,
  PortalLoginShell,
  PortalWrongRoleMessage,
} from "@/components/PortalLoginShell";
import { resolveUserPortal } from "@/lib/user-portal";
import { getDashboardUrl } from "@/lib/partner-auth";

export default function PartnersPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [wrongRole, setWrongRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function checkAuth() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();

        async function handleUser(user: { uid: string; email: string | null } | null) {
          if (!mounted) return;

          if (!user) {
            setUserId(null);
            setWrongRole(false);
            setLoading(false);
            return;
          }

          setUserId(user.uid);
          const userPortal = await resolveUserPortal(user.uid, user.email);

          if (userPortal === "partner") {
            const dashboardUrl = await getDashboardUrl(user.uid, user.email);
            router.push(dashboardUrl);
            return;
          }

          setWrongRole(true);
          setLoading(false);
        }

        if (auth?.currentUser) {
          await handleUser(auth.currentUser);
        } else {
          setLoading(false);
        }

        unsubscribe = await onAuthStateChanged(async (user) => {
          await handleUser(user);
        });
      } catch (err) {
        console.error("Error checking auth:", err);
        if (mounted) setLoading(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [router]);

  if (loading) {
    return <PortalLoadingShell />;
  }

  if (userId && wrongRole) {
    return (
      <PortalWrongRoleMessage
        title="Partner Portal"
        message="This portal is for partner accounts only. Please sign in through the portal that matches your account type."
      />
    );
  }

  return (
    <PortalLoginShell
      title="Partner Portal"
      portalName="Partner Portal"
      expectedRole="partner"
      redirectPath="/partners/dashboard"
      footerNote={
        <>
          Interested in becoming a partner?{" "}
          <Link href="/partners/apply" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
            Apply here
          </Link>
        </>
      }
    />
  );
}
