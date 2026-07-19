// components/PricingSection.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PlanConfirmationModal } from "./PlanConfirmationModal";
import { CustomQuoteWizard } from "./CustomQuoteWizard";
import { CustomerOnboardingWizard, type OnboardingCompletePayload } from "./CustomerOnboardingWizard";
import { usePlatformPricing } from "@/hooks/usePlatformPricing";
import { useFirebase } from "@/lib/firebase-context";
import { getCapturedReferralCode, getCapturedPartnerCode, persistSiteLeadProfile } from "@/lib/site-leads";
import { getPersistedSiteLeadId } from "@/lib/partner-leads";
import {
  captureReferralCodeFromLocation,
  capturePartnerCodeFromLocation,
} from "@/lib/referral-attribution";



type PlanId = "one-time" | "twice-month" | "commercial" | "bi-monthly" | "quarterly";

type PricingTier = "starter" | "featured" | "elite" | "value" | "essential";

type PricingPlan = {
  id: PlanId;
  name: string;
  price: number | string;
  priceSuffix?: "/clean" | "/month" | "/year";
  priceRange?: string;
  highlight?: boolean;
  tier: PricingTier;
  tierLabel?: string;
  binInfo: string;
  additionalInfo?: string;
  features: string[];
  buttonText: string;
};

const PLANS: PricingPlan[] = [
  {
    id: "one-time",
    name: "Monthly Clean",
    price: 35,
    priceSuffix: "/month",
    tier: "starter",
    tierLabel: "Starter",
    binInfo: "FOR UP TO 1 BIN",
    additionalInfo: "Additional bins: +$10 each",
    features: [
      "Automatic cleaning every month",
      "Deep clean, sanitize, and deodorize",
      "Perfect for maintaining fresh bins year-round"
    ],
    buttonText: "Start Monthly Plan"
  },
  {
    id: "twice-month",
    name: "Bi-Weekly Clean (2x/Month)",
    price: 65,
    priceSuffix: "/month",
    highlight: true,
    tier: "featured",
    tierLabel: "Most Popular",
    binInfo: "FOR UP TO 1 BIN",
    additionalInfo: "Additional bins: +$10 each",
    features: [
      "Automatic cleaning every 2 weeks",
      "Eliminates odor, bacteria, and build-up",
      "Perfect for busy households and families"
    ],
    buttonText: "Start Bi-Weekly Plan"
  },
  {
    id: "commercial",
    name: "Commercial & HOA Plans",
    price: "Custom Quote",
    tier: "elite",
    tierLabel: "Top Earner",
    binInfo: "BUILT FOR MULTI-BIN PROPERTIES",
    features: [
      "Apartments & community bins",
      "HOAs & neighborhood partnerships",
      "Restaurants & commercial properties",
      "Bulk pricing & flexible schedules"
    ],
    buttonText: "Schedule Consultation"
  }
];

const ADDITIONAL_PLANS: PricingPlan[] = [
  {
    id: "bi-monthly",
    name: "Bi-Monthly Plan – Yearly Package",
    price: 210,
    priceSuffix: "/year",
    tier: "value",
    tierLabel: "Best Annual Value",
    binInfo: "6 CLEANS PER YEAR (EVERY 2 MONTHS)",
    additionalInfo: "1 bin included · +10 FREE heavy-duty odor-control bags every clean · +$10 per extra bin per cleaning",
    features: [
      "$210/year (that's $35 × 6, or ~$17.50/month equivalent)",
      "6 professional cleanings throughout the year",
      "Heavy-duty odor-control bags included with each clean"
    ],
    buttonText: "Get Yearly Package"
  },
  {
    id: "quarterly",
    name: "Quarterly Plan – Yearly Package",
    price: 160,
    priceSuffix: "/year",
    tier: "essential",
    tierLabel: "Smart Saver",
    binInfo: "4 CLEANS PER YEAR (EVERY 3 MONTHS)",
    additionalInfo: "1 bin included · +10 FREE heavy-duty odor-control bags every clean · +$10 per extra bin per cleaning",
    features: [
      "$160/year (that's $40/clean, or ~$13.33/month equivalent)",
      "4 professional cleanings throughout the year",
      "Heavy-duty odor-control bags included with each clean"
    ],
    buttonText: "Get Yearly Package"
  }
];

export function PricingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showMoreServices, setShowMoreServices] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<PlanId | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | null>(null);
  const [availableCredit, setAvailableCredit] = useState<number>(0);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [showQuoteWizard, setShowQuoteWizard] = useState(false);
  const [quoteWizardPreset, setQuoteWizardPreset] = useState<
    "residential" | "commercial" | "hoa" | undefined
  >();
  const [showOnboardingWizard, setShowOnboardingWizard] = useState(false);
  const [onboardingData, setOnboardingData] = useState<any>(null);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [referralCodeFromUrl, setReferralCodeFromUrl] = useState("");
  const [partnerCodeFromUrl, setPartnerCodeFromUrl] = useState("");

  useEffect(() => {
    const syncAttributionFromLocation = () => {
      const referralCode = captureReferralCodeFromLocation();
      const partnerCode = capturePartnerCodeFromLocation();
      setReferralCodeFromUrl(referralCode || getCapturedReferralCode());
      setPartnerCodeFromUrl(partnerCode || getCapturedPartnerCode());
    };

    syncAttributionFromLocation();
    window.addEventListener("hashchange", syncAttributionFromLocation);
    return () => window.removeEventListener("hashchange", syncAttributionFromLocation);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get("openQuote") === "commercial") {
      setQuoteWizardPreset("commercial");
      setShowQuoteWizard(true);
      requestAnimationFrame(() => {
        document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [searchParams]);

  const handleCloseQuoteWizard = () => {
    setShowQuoteWizard(false);
    setQuoteWizardPreset(undefined);

    if (searchParams.get("openQuote") === "commercial") {
      router.replace("/#pricing", { scroll: false });
    }
  };

  const { isReady: firebaseReady } = useFirebase();
  const { plans: platformPlans } = usePlatformPricing();

  const mainPlans = PLANS.map((plan) => ({
    ...plan,
    price:
      plan.id === "commercial"
        ? plan.price
        : platformPlans[plan.id]?.price ?? plan.price,
  }));

  const additionalPlans = ADDITIONAL_PLANS.map((plan) => ({
    ...plan,
    price: platformPlans[plan.id]?.price ?? plan.price,
  }));

  // Get current user ID from Firebase Auth - only when Firebase is ready
  useEffect(() => {
    if (!firebaseReady) {
      // Firebase not ready yet - skip auth check
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    async function getCurrentUserId() {
      try {
        const { getAuthInstance, onAuthStateChanged } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        if (!mounted) return;
        
        if (auth && typeof auth === "object" && "currentUser" in auth) {
          // Get current user immediately if available
          if (auth.currentUser && mounted) {
            setUserId(auth.currentUser.uid);
          }
          
          // Also listen for auth state changes using safe wrapper
          unsubscribe = await onAuthStateChanged((user) => {
            if (mounted) {
              setUserId(user?.uid || null);
            }
          });
        }
      } catch (err) {
        console.warn("[PricingSection] Error getting user ID:", err);
        // Continue without userId - checkout will work without referral credits
      }
    }
    
    getCurrentUserId();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [firebaseReady]);

  // Load available credit when userId changes
  useEffect(() => {
    async function loadAvailableCredit() {
      if (!userId) {
        setAvailableCredit(0);
        return;
      }

      try {
        const response = await fetch(`/api/referral/get-credits?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setAvailableCredit(data.totalCredits || 0);
        }
      } catch (err) {
        console.warn("[PricingSection] Error loading credits:", err);
        setAvailableCredit(0);
      }
    }

    loadAvailableCredit();
  }, [userId]);

  const handlePlanClick = (planId: PlanId) => {
    console.log("[PricingSection] Plan clicked:", planId);
    
    if (planId === "commercial") {
      setQuoteWizardPreset("commercial");
      setShowQuoteWizard(true);
      return;
    }

    // If user is not logged in, show onboarding wizard first
    if (!userId) {
      console.log("[PricingSection] User not logged in, showing onboarding wizard");
      setSelectedPlanId(planId);
      setShowOnboardingWizard(true);
      return;
    }

    // If user is logged in, show confirmation modal
    console.log("[PricingSection] User logged in, showing confirmation modal");
    setSelectedPlanId(planId);
  };

  const handleOnboardingComplete = async (payload: OnboardingCompletePayload) => {
    const { password, ...data } = payload;
    setCreatingAccount(true);

    try {
      const {
        createUserWithEmailAndPassword,
        signInWithEmailAndPassword,
        updateProfile,
        getDbInstance,
      } = await import("@/lib/firebase");
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, setDoc, serverTimestamp } = firestore;
      const db = await getDbInstance();

      const accountEmail = data.email.trim().toLowerCase();
      let userCredential;

      try {
        userCredential = await createUserWithEmailAndPassword(accountEmail, password);
      } catch (createErr: any) {
        if (
          createErr.code === "auth/email-already-in-use" ||
          createErr.code === "auth/email-already-exists"
        ) {
          userCredential = await signInWithEmailAndPassword(accountEmail, password);
        } else {
          throw createErr;
        }
      }

      await updateProfile(userCredential.user, {
        displayName: `${data.firstName} ${data.lastName}`.trim(),
      });

      if (db && userCredential.user) {
        await setDoc(
          doc(db, "users", userCredential.user.uid),
          {
            firstName: data.firstName,
            lastName: data.lastName,
            email: accountEmail,
            phone: data.phone,
            selectedPlan: selectedPlanId,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2 || null,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            preferredDayOfWeek: data.preferredDayOfWeek,
            paymentStatus: "pending",
            subscriptionStatus: "pending",
            role: "customer",
            referralCount: 0,
            pendingCleaningConfirmation: true,
            pendingCleaningData: {
              preferredServiceDate: data.preferredServiceDate,
              preferredDayOfWeek: data.preferredDayOfWeek,
              preferredTimeWindow: data.preferredTimeWindow,
              addressLine1: data.addressLine1,
              addressLine2: data.addressLine2 || null,
              city: data.city,
              state: data.state,
              zipCode: data.zipCode,
              notes: data.notes || null,
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      setUserId(userCredential.user.uid);
      setOnboardingData(data);
      setShowOnboardingWizard(false);
      persistSiteLeadProfile({
        name: `${data.firstName || ""} ${data.lastName || ""}`.trim(),
        email: data.email || "",
        phone: data.phone || "",
      });
    } catch (error: any) {
      console.error("[PricingSection] Account creation failed:", error);
      alert(error.message || "Failed to create your account. Please try again.");
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleConfirmCheckout = async (
    applyCredit: boolean,
    referralCode?: string,
    partnerCode?: string
  ) => {
    if (!selectedPlanId || !userId) return;

    setLoadingPlanId(selectedPlanId);
    setLoadingCredit(true);

    try {
      const resolvedPartnerCode = partnerCode || partnerCodeFromUrl || undefined;
      const resolvedReferralCode =
        referralCode ||
        (referralCodeFromUrl && referralCodeFromUrl !== resolvedPartnerCode
          ? referralCodeFromUrl
          : undefined);

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          planId: selectedPlanId,
          userId: userId || undefined,
          applyCredit: applyCredit && availableCredit > 0,
          referralCode: resolvedReferralCode,
          partnerCode: resolvedPartnerCode,
          leadId: getPersistedSiteLeadId() || undefined,
          onboardingData: onboardingData || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Close modal and redirect to Stripe Checkout
      setSelectedPlanId(null);
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      alert(error.message || "Failed to start checkout. Please try again.");
      setLoadingPlanId(null);
      setLoadingCredit(false);
    }
  };

  const handleCloseModal = () => {
    if (!loadingPlanId) {
      setSelectedPlanId(null);
    }
  };

  const renderPricingCard = (plan: PricingPlan) => (
    <button
      key={plan.id}
      onClick={() => handlePlanClick(plan.id)}
      disabled={loadingPlanId === plan.id}
      className={`pricing-card card-link pricing-card--${plan.tier}${plan.highlight ? " popular" : ""}`}
      style={{ opacity: loadingPlanId === plan.id ? 0.6 : 1, cursor: loadingPlanId === plan.id ? "wait" : "pointer" }}
    >
      {plan.tierLabel && (
        <div className={`pricing-tier-badge pricing-tier-badge--${plan.tier}`}>
          {plan.tierLabel}
        </div>
      )}

      <h3 className="plan-name">{plan.name}</h3>

      <p className={`price-big ${typeof plan.price === "string" ? "custom" : ""}`}>
        {typeof plan.price === "number" ? `$${plan.price}` : plan.price}
        {plan.priceSuffix && typeof plan.price === "number" && (
          <span className="price-small">{plan.priceSuffix}</span>
        )}
      </p>

      <p className="price-sub">{plan.binInfo}</p>

      {plan.additionalInfo && <p className="price-extra">{plan.additionalInfo}</p>}

      <ul className="pricing-list">
        {plan.features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>

      <div className={`card-cta card-cta--${plan.tier}`}>
        {loadingPlanId === plan.id ? "Processing..." : plan.buttonText}
      </div>
    </button>
  );

  return (
    <>
      {showOnboardingWizard && selectedPlanId && selectedPlanId !== "commercial" && (
        <CustomerOnboardingWizard
          planId={selectedPlanId}
          planName={PLANS.find(p => p.id === selectedPlanId)?.name || ADDITIONAL_PLANS.find(p => p.id === selectedPlanId)?.name || "Plan"}
          isOpen={showOnboardingWizard}
          onClose={() => {
            setShowOnboardingWizard(false);
            setSelectedPlanId(null);
            setOnboardingData(null);
          }}
          onComplete={handleOnboardingComplete}
          creatingAccount={creatingAccount}
        />
      )}
      {selectedPlanId && selectedPlanId !== "commercial" && !showOnboardingWizard && userId && (
        <PlanConfirmationModal
          planId={selectedPlanId}
          isOpen={true}
          onClose={handleCloseModal}
          onConfirm={handleConfirmCheckout}
          userId={userId}
          availableCredit={availableCredit}
          loading={loadingCredit}
          initialReferralCode={referralCodeFromUrl}
          initialPartnerCode={partnerCodeFromUrl}
        />
      )}
      <CustomQuoteWizard
        isOpen={showQuoteWizard}
        onClose={handleCloseQuoteWizard}
        initialPropertyType={quoteWizardPreset}
      />
      <section id="pricing" className="pricing-section">

      <div className="container">

        <h2 className="section-title">Plans & Pricing</h2>
        
        <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
          <span style={{ 
            fontSize: "0.875rem", 
            fontWeight: "600", 
            color: "#0369a1", 
            textTransform: "uppercase",
            letterSpacing: "0.05em"
          }}>
            FOR HOMEOWNERS & PROPERTY MANAGERS
          </span>
        </div>

        <p className="section-subtitle">

          Bin Blast Co. keeps bins fresh and routes profitable with clear,

          subscription-based pricing designed to grow from your first street to a full route.

        </p>



        <div className="pricing-grid">
          {mainPlans.map((plan) => renderPricingCard(plan))}
        </div>

        {/* More Services Button */}
        <div className="pricing-more-services-wrap">
          <button
            type="button"
            className="pricing-more-services-btn"
            onClick={() => setShowMoreServices(!showMoreServices)}
          >
            {showMoreServices ? "Hide More Services" : "More Services"}
          </button>
        </div>

        {/* Additional Plans (Collapsible) */}
        {showMoreServices && (
          <div className="pricing-grid pricing-grid--secondary">
            {additionalPlans.map((plan) => renderPricingCard(plan))}
          </div>
        )}



        <p className="pricing-disclaimer">

          All plans include eco-friendly, high-pressure cleaning, disinfecting,

          and deodorizing. Extra bins are always just +$10/bin so your pricing

          stays simple and profitable as you scale routes and add more

          households per street.

        </p>

      </div>

    </section>
    </>

  );

}

