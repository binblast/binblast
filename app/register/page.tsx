// app/register/page.tsx

"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

// CRITICAL: Dynamically import Navbar to prevent webpack from bundling firebase-context.tsx into page chunks
const Navbar = dynamic(() => import("@/components/Navbar").then(mod => mod.Navbar), {
  ssr: false,
  loading: () => <nav className="navbar" style={{ minHeight: "80px" }} />,
});

const PLAN_NAMES: Record<string, string> = {
  "one-time": "Monthly Clean",
  "twice-month": "Bi-Weekly Clean (2x/Month)",
  "bi-monthly": "Bi-Monthly Plan – Yearly Package",
  "quarterly": "Quarterly Plan – Yearly Package",
};

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedPlanId = searchParams.get("plan") || "";
  const sessionId = searchParams.get("session_id") || "";
  const initialEmail = searchParams.get("email") || "";
  const referralCode = searchParams.get("ref") || "";
  const redirectParam = searchParams.get("redirect") || "";
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(!!sessionId);
  const [stripeData, setStripeData] = useState<{
    customerId: string | null;
    subscriptionId: string | null;
    customerEmail: string | null;
  } | null>(null);

  // If referral code is present in URL, redirect to pricing page to choose plan
  // User will register first, then go to checkout with their chosen plan
  useEffect(() => {
    if (referralCode && !sessionId && typeof window !== 'undefined') {
      const normalizedCode = referralCode.trim().toUpperCase();
      
      // Don't redirect if code is empty
      if (!normalizedCode || normalizedCode.length === 0) {
        return;
      }
      
      // Redirect to pricing page with referral code so user can choose their plan
      console.log("[Register] Referral code detected, redirecting to pricing page to choose plan:", normalizedCode);
      router.push(`/#pricing?ref=${normalizedCode}`);
    }
  }, [referralCode, sessionId, router]);

  // Verify Stripe session on mount if session_id is present
  useEffect(() => {
    async function verifyStripeSession() {
      if (!sessionId) {
        setVerifyingSession(false);
        return;
      }

      try {
        const response = await fetch(`/api/stripe/verify-session?session_id=${sessionId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to verify payment");
        }

        // Store Stripe data for later use
        setStripeData({
          customerId: data.customerId,
          subscriptionId: data.subscriptionId,
          customerEmail: data.customerEmail,
        });

        // Pre-fill email from Stripe session if available (always use Stripe email if present)
        if (data.customerEmail) {
          setEmail(data.customerEmail);
        }

        setVerifyingSession(false);
      } catch (err: any) {
        setError(err.message || "Failed to verify payment. Please try again.");
        setVerifyingSession(false);
      }
    }

    verifyStripeSession();
  }, [sessionId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    // Normalize referral code at the start so it's available throughout the function
    const normalizedReferralCode = referralCode?.trim().toUpperCase() || "";

    try {
      // Use safe wrapper functions that ensure Firebase is initialized
      const { createUserWithEmailAndPassword, updateProfile, getDbInstance } = await import("@/lib/firebase");
      const db = await getDbInstance();
      
      // Create Firebase user
      const userCredential = await createUserWithEmailAndPassword(email, password);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: `${firstName} ${lastName}`,
      });

      // Save user data to Firestore
      // CRITICAL: Use safe import wrapper to ensure Firebase app exists
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, doc, setDoc, serverTimestamp, query, where, getDocs } = firestore;
      
      if (db && userCredential.user) {
        // IMPORTANT: Check if user is already a partner - partners should NOT have user documents
        const partnersQuery = query(
          collection(db, "partners"),
          where("userId", "==", userCredential.user.uid)
        );
        const partnersSnapshot = await getDocs(partnersQuery);
        
        // Also check if there's a partner application or partner record by email
        // (in case application was submitted before registration)
        const partnersByEmailQuery = query(
          collection(db, "partners"),
          where("email", "==", email)
        );
        const partnersByEmailSnapshot = await getDocs(partnersByEmailQuery);
        
        // Check for partner applications by email that need userId linking
        const applicationsByEmailQuery = query(
          collection(db, "partnerApplications"),
          where("email", "==", email),
          where("userId", "==", null)
        );
        const applicationsByEmailSnapshot = await getDocs(applicationsByEmailQuery);
        
        // Link userId to any applications that were submitted before registration
        if (!applicationsByEmailSnapshot.empty) {
          const { updateDoc, doc: firestoreDoc } = firestore;
          for (const appDoc of applicationsByEmailSnapshot.docs) {
            try {
              await updateDoc(firestoreDoc(db, "partnerApplications", appDoc.id), {
                userId: userCredential.user.uid,
                updatedAt: serverTimestamp(),
              });
              console.log("[Register] Linked userId to partner application:", appDoc.id);
            } catch (linkErr) {
              console.warn("[Register] Error linking userId to application:", linkErr);
            }
          }
        }
        
        // Link userId to partner record if it exists by email but doesn't have userId
        if (!partnersByEmailSnapshot.empty) {
          const partnerDoc = partnersByEmailSnapshot.docs[0];
          const partnerData = partnerDoc.data();
          if (!partnerData.userId) {
            const { updateDoc, doc: firestoreDoc } = firestore;
            try {
              await updateDoc(firestoreDoc(db, "partners", partnerDoc.id), {
                userId: userCredential.user.uid,
                updatedAt: serverTimestamp(),
              });
              console.log("[Register] Linked userId to partner record:", partnerDoc.id);
            } catch (linkErr) {
              console.warn("[Register] Error linking userId to partner:", linkErr);
            }
          }
        }
        
        if (!partnersSnapshot.empty || !partnersByEmailSnapshot.empty) {
          // User is a partner - do NOT create user document
          console.log("[Register] User is a partner, skipping user document creation:", userCredential.user.uid);
        } else {
          // User is not a partner - create user document
          const userDocRef = doc(collection(db, "users"), userCredential.user.uid);
          
          // Determine subscription status based on Stripe data
          let subscriptionStatus = "none";
          if (stripeData?.subscriptionId) {
            subscriptionStatus = "active";
          } else if (stripeData?.customerId && !stripeData?.subscriptionId) {
            subscriptionStatus = "one_time_paid";
          }

          // Generate unique referral code
          const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
          const generatedCode = userCredential.user.uid.substring(0, 8).toUpperCase() + randomChars;

          await setDoc(userDocRef, {
            firstName,
            lastName,
            email,
            phone: phone || null,
            selectedPlan: selectedPlanId || null,
            stripeCustomerId: stripeData?.customerId || null,
            stripeSubscriptionId: stripeData?.subscriptionId || null,
            subscriptionStatus,
            paymentStatus: stripeData ? "paid" : "pending",
            referralCode: generatedCode, // Generate unique code on registration
            referralCount: 0, // Initialize referral count
            role: "customer", // Default role - can be "customer" | "partner" | "admin"
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Process referral if referral code was provided
        if (normalizedReferralCode && db && userCredential.user) {
          try {
            console.log("[Register] Processing referral code:", normalizedReferralCode);
            const response = await fetch("/api/referral/process", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                referralCode: normalizedReferralCode,
                newUserId: userCredential.user.uid,
                newUserEmail: email,
              }),
            });

            const responseData = await response.json();
            if (!response.ok) {
              console.warn("[Register] Failed to process referral:", responseData.error || responseData);
              // Don't block registration if referral processing fails
            } else {
              console.log("[Register] Referral processed successfully:", responseData);
            }
          } catch (err) {
            console.error("[Register] Error processing referral:", err);
            // Don't block registration if referral processing fails
          }
        } else if (normalizedReferralCode && normalizedReferralCode.length > 0) {
          console.warn("[Register] Referral code provided but db or user not available:", { normalizedReferralCode, hasDb: !!db, hasUser: !!userCredential.user });
        }
      }
      
      setSuccess(true);
      
      // Check if user is a partner before redirecting
      // Partners should go to partner dashboard or partner signup, not back to application
      let finalRedirect = redirectParam;
      try {
        if (userCredential?.user && db) {
          const { query, where, getDocs, collection: firestoreCollection } = firestore;
          // Check if user has a partner record
          const partnersQuery = query(
            firestoreCollection(db, "partners"),
            where("userId", "==", userCredential.user.uid)
          );
          const partnersSnapshot = await getDocs(partnersQuery);
          
          if (!partnersSnapshot.empty) {
            const partnerData = partnersSnapshot.docs[0].data();
            const partnerId = partnersSnapshot.docs[0].id;
            
            if (partnerData.status === "pending_agreement") {
              // Partner needs to complete signup - redirect to partner signup page
              finalRedirect = `/partner?partnerId=${partnerId}`;
            } else if (partnerData.status === "active") {
              // Active partner - redirect to partner dashboard
              finalRedirect = "/partners/dashboard";
            }
            // If status is something else, use original redirect
          } else {
            // Not a partner - check if redirect is to partner application
            // If so, allow it (they're applying for partnership)
            if (redirectParam === "/partners/apply") {
              finalRedirect = redirectParam;
            }
          }
        }
      } catch (partnerCheckErr) {
        console.warn("[Register] Error checking partner status:", partnerCheckErr);
        // Continue with original redirect if check fails
      }

      // Redirect logic:
      // 1. If redirect parameter exists (or partner dashboard) -> use it
      // 2. If user has already paid (has stripeData) -> go to dashboard
      // 3. If user has referral code -> go to pricing page to choose plan (with referral code preserved)
      // 4. If user has selected a plan -> go to pricing page to complete checkout
      // 5. Otherwise -> go to pricing page to choose plan
      if (finalRedirect) {
        // Redirect to the specified page (e.g., partner application or partner dashboard)
        setTimeout(() => {
          router.push(finalRedirect);
        }, 2000);
      } else if (stripeData) {
        // User has already paid - redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } else {
        // User hasn't paid yet - redirect to pricing page
        // Preserve referral code if present, so discount can be applied
        const redirectUrl = normalizedReferralCode 
          ? `/#pricing?ref=${normalizedReferralCode}`
          : "/#pricing";
        
        setTimeout(() => {
          console.log("[Register] User registered, redirecting to pricing page to choose plan:", {
            hasReferralCode: !!normalizedReferralCode,
            redirectUrl,
          });
          router.push(redirectUrl);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main style={{ minHeight: "calc(100vh - 80px)", padding: "4rem 0", background: "var(--bg-white)" }}>
        <div className="container">
          <div style={{ maxWidth: "600px", margin: "0 auto" }}>
            <h1 className="section-title" style={{ textAlign: "center", marginBottom: "1rem" }}>
              Create Your Account
            </h1>

            {verifyingSession && (
              <div style={{
                padding: "1rem 1.5rem",
                background: "#eff6ff",
                borderRadius: "12px",
                marginBottom: "2rem",
                border: "1px solid #3b82f6"
              }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: "#1e40af", fontWeight: "600" }}>
                  Verifying your payment...
                </p>
              </div>
            )}

            {selectedPlanId && PLAN_NAMES[selectedPlanId] && !verifyingSession && (
              <div style={{
                padding: "1rem 1.5rem",
                background: stripeData ? "#ecfdf5" : "#fef3c7",
                borderRadius: "12px",
                marginBottom: "2rem",
                border: `1px solid ${stripeData ? "#16a34a" : "#f59e0b"}`
              }}>
                <p style={{ margin: 0, fontSize: "0.95rem", color: stripeData ? "#047857" : "#92400e", fontWeight: "600" }}>
                  <strong>Selected Plan:</strong> {PLAN_NAMES[selectedPlanId]}
                  {stripeData && " Payment Verified"}
                </p>
              </div>
            )}

            {success ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem", color: "#16a34a" }}>
                  Account Created!
                </h2>
                <p style={{ color: "var(--text-light)" }}>Redirecting to your dashboard...</p>
              </div>
            ) : (
              <div style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "2.5rem",
                boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
                border: "1px solid #e5e7eb"
              }}>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                        First Name
                      </label>
                      <input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                        Last Name
                      </label>
                      <input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                          fontSize: "0.95rem",
                          transition: "border-color 0.2s"
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                        onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                      Phone <span style={{ color: "var(--text-light)", fontWeight: "400" }}>(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      minLength={6}
                      style={{
                        width: "100%",
                        padding: "0.75rem 1rem",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                        fontSize: "0.95rem",
                        transition: "border-color 0.2s"
                      }}
                      onFocus={(e) => e.currentTarget.style.borderColor = "#16a34a"}
                      onBlur={(e) => e.currentTarget.style.borderColor = "#e5e7eb"}
                    />
                  </div>

                  {error && (
                    <div style={{
                      padding: "0.75rem 1rem",
                      background: "#fef2f2",
                      border: "1px solid #fecaca",
                      borderRadius: "8px",
                      color: "#dc2626",
                      fontSize: "0.875rem"
                    }}>
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`btn btn-primary ${loading ? "disabled" : ""}`}
                    style={{
                      width: "100%",
                      marginTop: "0.5rem",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? "Creating Account..." : "Create Account"}
                  </button>

                  <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--text-light)", marginTop: "1rem" }}>
                    Already have an account?{" "}
                    <Link href="/login" style={{ color: "var(--primary-color)", fontWeight: "600", textDecoration: "none" }}>
                      Log in
                    </Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-2xl shadow-lg p-6 w-full max-w-md">
          <div className="text-center">Loading...</div>
        </div>
      </main>
    }>
      <RegisterForm />
    </Suspense>
  );
}

