// app/partners/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  PortalLoadingShell,
  PortalLoginShell,
  PortalWrongRoleMessage,
} from "@/components/PortalLoginShell";
import { resolveUserPortal } from "@/lib/user-portal";
import { getDashboardUrl } from "@/lib/partner-auth";
import { getSafeRedirectPath, subscribeAuthState } from "@/lib/auth-session";

function PartnersPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"), "/partners/dashboard");
  const [userId, setUserId] = useState<string | null>(null);
  const [wrongRole, setWrongRole] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function checkAuth() {
      try {
        unsubscribe = await subscribeAuthState(async (user) => {
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
            if (redirectPath !== "/partners/dashboard") {
              router.push(redirectPath);
              return;
            }

            const dashboardUrl = await getDashboardUrl(user.uid, user.email);
            router.push(dashboardUrl);
            return;
          }

          setWrongRole(true);
          setLoading(false);
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
  }, [router, redirectPath]);

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
      redirectPath={redirectPath}
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

export default function PartnersPage() {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <PartnersPortalContent />
    </Suspense>
  );
}
