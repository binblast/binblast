// app/operator/page.tsx
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

function OperatorPortalContent() {
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

          if (userPortal === "operator") {
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
        title="Blast Command"
        message="This portal is for operator and admin accounts only. Please sign in through the portal that matches your account type."
      />
    );
  }

  return (
    <PortalLoginShell
      title="Blast Command"
      portalName="Blast Command Portal"
      expectedRole="operator"
      redirectPath={redirectPath}
      footerNote="Administrative access is provided by your system administrator."
    />
  );
}

export default function OperatorPortalPage() {
  return (
    <Suspense fallback={<PortalLoadingShell />}>
      <OperatorPortalContent />
    </Suspense>
  );
}
