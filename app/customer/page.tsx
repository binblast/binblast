// app/customer/page.tsx
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  PortalLoadingShell,
  PortalLoginShell,
  PortalWrongRoleMessage,
} from "@/components/PortalLoginShell";
import { resolveUserPortal } from "@/lib/user-portal";
import { getSafeRedirectPath, subscribeAuthState } from "@/lib/auth-session";

function CustomerPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = getSafeRedirectPath(searchParams.get("redirect"), "/dashboard");
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

          if (userPortal === "customer") {
            router.push(redirectPath);
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
        title="Customer Portal"
        message="This portal is for customer accounts only. Please sign in through the portal that matches your account type."
      />
    );
  }

  return (
    <PortalLoginShell
      title="Customer Portal"
      portalName="Customer Portal"
      expectedRole="customer"
      redirectPath={redirectPath}
    />
  );
}

export default function CustomerPortalPage() {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <CustomerPortalContent />
    </Suspense>
  );
}
