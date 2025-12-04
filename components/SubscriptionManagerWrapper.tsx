// components/SubscriptionManagerWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PlanId } from "@/lib/stripe-config";

interface SubscriptionManagerWrapperProps {
  userId: string;
  currentPlanId: PlanId;
  stripeSubscriptionId: string | null;
  stripeCustomerId?: string | null;
  billingPeriodEnd?: Date;
  onPlanChanged?: () => void;
}

// Dynamically import SubscriptionManager with error handling
const SubscriptionManager = dynamic(
  () => import("@/components/SubscriptionManager").then((mod) => ({ default: mod.SubscriptionManager })),
  { 
    ssr: false,
    loading: () => null,
  }
);

export function SubscriptionManagerWrapper(props: SubscriptionManagerWrapperProps) {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Ensure Firebase is initialized before loading SubscriptionManager
    async function ensureFirebaseReady() {
      try {
        // Wait a bit to ensure FirebaseInitializer has run
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if Firebase is initialized
        const firebaseModule = await import("@/lib/firebase");
        const auth = await firebaseModule.getAuthInstance();
        const db = await firebaseModule.getDbInstance();
        
        if (auth && db) {
          console.log("[SubscriptionManagerWrapper] Firebase is ready");
          setIsReady(true);
        } else {
          console.warn("[SubscriptionManagerWrapper] Firebase not ready, will retry");
          // Retry after a delay
          setTimeout(() => {
            setIsReady(true); // Try anyway
          }, 500);
        }
      } catch (error) {
        console.error("[SubscriptionManagerWrapper] Error checking Firebase:", error);
        setHasError(true);
      }
    }

    ensureFirebaseReady();
  }, []);

  if (hasError) {
    return (
      <div style={{ marginTop: "1rem", padding: "1rem", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca" }}>
        <p style={{ margin: 0, color: "#dc2626", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          Unable to load subscription manager.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
          style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
        >
          Refresh Page
        </button>
      </div>
    );
  }

  if (!isReady) {
    return null; // Don't render until Firebase is ready
  }

  return <SubscriptionManager {...props} />;
}

