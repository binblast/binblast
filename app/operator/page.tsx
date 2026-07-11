// app/operator/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  PortalLoadingShell,
  PortalLoginShell,
  PortalWrongRoleMessage,
} from "@/components/PortalLoginShell";
import { resolveUserPortal } from "@/lib/user-portal";

export default function OperatorPortalPage() {
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

          if (userPortal === "operator") {
            router.push("/dashboard");
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
      redirectPath="/dashboard"
      footerNote="Administrative access is provided by your system administrator."
    />
  );
}
