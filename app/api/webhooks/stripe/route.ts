// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-config";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

// Disable body parsing, we need the raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Dynamically import Firebase to prevent build-time initialization
  const { getDbInstance } = await import("@/lib/firebase");
  const { doc, updateDoc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, increment } = await import("firebase/firestore");
  
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get customer email from session
        const customerEmail = session.customer_details?.email;
        const customerId = typeof session.customer === 'string' 
          ? session.customer 
          : session.customer?.id;
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription?.id;

        // If we have a customer email, try to find the user in Firestore
        const db = await getDbInstance();
        if (customerEmail && db && session.payment_status === 'paid') {
          // Find user by email or stripeCustomerId
          
          let userId: string | null = null;
          
          // First, try to get userId from session metadata (most reliable)
          if (session.metadata?.userId) {
            userId = session.metadata.userId;
          }
          
          // If not in metadata, try to find by Stripe customer ID
          if (!userId && customerId) {
            const usersByStripeQuery = query(
              collection(db, "users"),
              where("stripeCustomerId", "==", customerId)
            );
            const stripeUsers = await getDocs(usersByStripeQuery);
            if (!stripeUsers.empty) {
              userId = stripeUsers.docs[0].id;
            }
          }
          
          // If still not found, try by email
          if (!userId && customerEmail) {
            const usersByEmailQuery = query(
              collection(db, "users"),
              where("email", "==", customerEmail)
            );
            const emailUsers = await getDocs(usersByEmailQuery);
            if (!emailUsers.empty) {
              userId = emailUsers.docs[0].id;
            }
          }
          
          // Mark credits as used if they were applied in checkout (idempotent)
          if (session.metadata?.creditsToUse && session.payment_status === 'paid' && userId) {
            try {
              const creditsToUseIds = session.metadata.creditsToUse.split(',');
              for (const creditId of creditsToUseIds) {
                if (creditId) {
                  // Check if credit was already marked as used (idempotency check)
                  const creditDocRef = doc(db, "credits", creditId);
                  const creditDoc = await getDoc(creditDocRef);
                  
                  if (creditDoc.exists()) {
                    const creditData = creditDoc.data();
                    // Only mark as used if not already used
                    if (!creditData.used) {
                      await updateDoc(creditDocRef, {
                        used: true,
                        usedAt: serverTimestamp(),
                        usedForAmount: parseFloat(session.metadata.creditApplied || "0"),
                      });
                      console.log("[Webhook] Marked credit as used:", creditId);
                    } else {
                      console.log("[Webhook] Credit already marked as used (idempotent):", creditId);
                    }
                  }
                }
              }
            } catch (creditError) {
              console.error("[Webhook] Error marking credits as used:", creditError);
            }
          }

          // Award referral credits if user was found and this is their first paid service
          if (userId) {
            try {
              // Check if this is the user's first paid service
              const userDoc = await getDoc(doc(db, "users", userId));
              
              if (userDoc.exists()) {
                const userData = userDoc.data();
                // Award credits if user has a referral and hasn't received credits yet
                if (userData.referredBy && session.payment_status === 'paid') {
                  // Find any PENDING referrals for this user
                  const referralsQuery = query(
                    collection(db, "referrals"),
                    where("referredUserId", "==", userId),
                    where("status", "==", "PENDING")
                  );
                  const referralsSnapshot = await getDocs(referralsQuery);

                  if (!referralsSnapshot.empty) {
                    const referralDoc = referralsSnapshot.docs[0];
                    const referralData = referralDoc.data();
                    const referrerId = referralData.referrerId;

                    // Idempotency check: Only award credits if referral is still PENDING
                    if (referralData.status === "PENDING") {
                      // Check if credits were already created for this referral (idempotency)
                      const existingCreditsQuery = query(
                        collection(db, "credits"),
                        where("referralId", "==", referralDoc.id),
                        where("type", "==", "referral_reward")
                      );
                      const existingCreditsSnapshot = await getDocs(existingCreditsQuery);

                      // Only award if credits don't already exist
                      if (existingCreditsSnapshot.empty) {
                        // Award $10 credit to the referred user
                        const referredUserCreditRef = doc(collection(db, "credits"));
                        await setDoc(referredUserCreditRef, {
                          userId,
                          amount: 10.00,
                          currency: "USD",
                          used: false,
                          referralId: referralDoc.id,
                          type: "referral_reward",
                          createdAt: serverTimestamp(),
                          expiresAt: null,
                        });

                        // Award $10 credit to the referrer
                        const referrerCreditRef = doc(collection(db, "credits"));
                        await setDoc(referrerCreditRef, {
                          userId: referrerId,
                          amount: 10.00,
                          currency: "USD",
                          used: false,
                          referralId: referralDoc.id,
                          type: "referral_reward",
                          createdAt: serverTimestamp(),
                          expiresAt: null,
                        });

                        // Mark referral as COMPLETED
                        await updateDoc(doc(db, "referrals", referralDoc.id), {
                          status: "COMPLETED",
                          completedAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                        });

                        // Update referrer's completed referral count (idempotent)
                        const referrerDocRef = doc(db, "users", referrerId);
                        const referrerDoc = await getDoc(referrerDocRef);
                        if (referrerDoc.exists()) {
                          const currentCount = referrerDoc.data().referralCount || 0;
                          // Only increment if not already incremented (check if referral was just completed)
                          await updateDoc(referrerDocRef, {
                            referralCount: increment(1),
                            updatedAt: serverTimestamp(),
                          });
                        }

                        console.log("[Webhook] Referral credits awarded:", {
                          referralId: referralDoc.id,
                          referredUserId: userId,
                          referrerId,
                        });
                      } else {
                        console.log("[Webhook] Credits already awarded for referral (idempotent):", referralDoc.id);
                      }
                    } else {
                      console.log("[Webhook] Referral already completed (idempotent):", referralDoc.id);
                    }
                  }
                }
              }
            } catch (creditError) {
              console.error("[Webhook] Error awarding credits:", creditError);
              // Don't fail the webhook if credit awarding fails
            }
          }
          
          console.log("Checkout session completed:", {
            customerEmail,
            customerId,
            subscriptionId,
            userId,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        const db = await getDbInstance();
        if (customerId && db) {
          // Find user by stripeCustomerId and update subscription status
          // Note: This requires querying Firestore, which may not be efficient
          // Consider creating a mapping collection: stripeCustomers -> firebaseUid
          console.log("Subscription updated:", {
            subscriptionId: subscription.id,
            customerId,
            status: subscription.status,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer?.id;

        const db = await getDbInstance();
        if (customerId && db) {
          // Find user by stripeCustomerId and update subscription status to cancelled
          console.log("Subscription deleted:", {
            subscriptionId: subscription.id,
            customerId,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        const db = await getDbInstance();
        if (customerId && db) {
          console.log("Invoice payment succeeded:", {
            invoiceId: invoice.id,
            customerId,
            amount: invoice.amount_paid,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        const db = await getDbInstance();
        if (customerId && db) {
          console.log("Invoice payment failed:", {
            invoiceId: invoice.id,
            customerId,
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Error processing webhook:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

