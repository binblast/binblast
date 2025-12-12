// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

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

          // Process referral code from checkout session (for non-logged-in users who used a code)
          if (session.metadata?.referralCode && session.payment_status === 'paid' && customerEmail) {
            try {
              // Find the referrer by referral code
              const referrersQuery = query(
                collection(db, "users"),
                where("referralCode", "==", session.metadata.referralCode)
              );
              const referrersSnapshot = await getDocs(referrersQuery);
              
              if (!referrersSnapshot.empty && userId) {
                const referrerDoc = referrersSnapshot.docs[0];
                const referrerId = referrerDoc.id;
                
                // Prevent self-referral
                if (referrerId !== userId) {
                  // Check if referral already exists
                  const existingReferralsQuery = query(
                    collection(db, "referrals"),
                    where("referredUserId", "==", userId),
                    where("referralCode", "==", session.metadata.referralCode)
                  );
                  const existingReferrals = await getDocs(existingReferralsQuery);
                  
                  if (existingReferrals.empty) {
                    // Create PENDING referral record
                    const referralRef = doc(collection(db, "referrals"));
                    await setDoc(referralRef, {
                      referrerId,
                      referredUserId: userId,
                      referredUserEmail: customerEmail,
                      referralCode: session.metadata.referralCode,
                      status: "PENDING",
                      createdAt: serverTimestamp(),
                      updatedAt: serverTimestamp(),
                    });
                    
                    // Update user document with referral info
                    await updateDoc(doc(db, "users", userId), {
                      referredBy: referrerId,
                      referredByCode: session.metadata.referralCode,
                      updatedAt: serverTimestamp(),
                    });
                    
                    console.log("[Webhook] Referral code processed from checkout:", {
                      referralId: referralRef.id,
                      referrerId,
                      userId,
                      referralCode: session.metadata.referralCode,
                    });
                  }
                }
              }
            } catch (referralCodeError) {
              console.error("[Webhook] Error processing referral code from checkout:", referralCodeError);
            }
          }

          // Handle partner revenue share and create PartnerBooking record
          if (session.payment_status === 'paid' && session.metadata?.partnerId) {
            try {
              const partnerId = session.metadata.partnerId;
              const partnerCode = session.metadata.partnerCode || "";
              
              // Get partner record to retrieve revenue share percentages
              const partnerDocRef = doc(db, "partners", partnerId);
              const partnerDoc = await getDoc(partnerDocRef);
              
              if (partnerDoc.exists()) {
                const partnerData = partnerDoc.data();
                
                // Only process if partner is active
                if (partnerData.status === "active") {
                  // Get amount paid (in cents from Stripe)
                  const amountTotal = session.amount_total || 0; // Stripe amount is in cents
                  const bookingAmountCents = amountTotal; // Keep in cents for PartnerBooking
                  const grossAmount = amountTotal / 100; // Convert to dollars for display
                  
                  // Calculate revenue share (in cents)
                  const revenueSharePartner = partnerData.revenueSharePartner || 0.6; // Default 60%
                  const revenueSharePlatform = partnerData.revenueSharePlatform || 0.4; // Default 40%
                  
                  const partnerShareAmountCents = Math.round(bookingAmountCents * revenueSharePartner);
                  const platformShareAmountCents = Math.round(bookingAmountCents * revenueSharePlatform);
                  
                  // Get plan name from planId
                  let planName = session.metadata?.planId || "Unknown Plan";
                  try {
                    const { PLAN_CONFIGS } = await import("@/lib/stripe-config");
                    const planConfig = PLAN_CONFIGS[planName as any];
                    if (planConfig) {
                      planName = planConfig.name;
                    }
                  } catch (planError) {
                    console.warn("[Webhook] Could not load plan config:", planError);
                  }
                  
                  // Create PartnerBooking record
                  const partnerBookingRef = doc(collection(db, "partnerBookings"));
                  await setDoc(partnerBookingRef, {
                    partnerId: partnerId,
                    customerName: null, // Can be populated later if needed
                    customerEmail: customerEmail,
                    planId: session.metadata?.planId || null,
                    planName: planName,
                    bookingAmount: bookingAmountCents, // Store in cents
                    partnerShareAmount: partnerShareAmountCents, // Store in cents
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    stripeSessionId: session.id,
                    status: subscriptionId ? "active" : "trial", // "active" | "cancelled" | "refunded" | "trial"
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    nextServiceDate: null, // Can be calculated from subscription if needed
                    firstServiceDate: null,
                  });
                  
                  // Also create/update general booking record for compatibility
                  const bookingRef = doc(collection(db, "bookings"));
                  await setDoc(bookingRef, {
                    userId: userId || null,
                    partnerId: partnerId,
                    partnerCode: partnerCode,
                    customerEmail: customerEmail,
                    stripeCustomerId: customerId,
                    stripeSubscriptionId: subscriptionId,
                    stripeSessionId: session.id,
                    planId: session.metadata?.planId || null,
                    grossAmount: grossAmount,
                    partnerShareAmount: partnerShareAmountCents / 100, // Convert to dollars
                    platformShareAmount: platformShareAmountCents / 100, // Convert to dollars
                    revenueShareApplied: true,
                    source: "partner_link",
                    paymentStatus: "paid",
                    status: "completed",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                  });
                  
                  console.log("[Webhook] Partner booking created:", {
                    partnerBookingId: partnerBookingRef.id,
                    bookingId: bookingRef.id,
                    partnerId,
                    partnerCode,
                    bookingAmountCents,
                    partnerShareAmountCents,
                    platformShareAmountCents,
                  });
                } else {
                  console.warn("[Webhook] Partner not active, skipping revenue share calculation:", {
                    partnerId,
                    status: partnerData.status,
                  });
                }
              }
            } catch (partnerError) {
              console.error("[Webhook] Error processing partner revenue share:", partnerError);
              // Don't fail the webhook if partner processing fails
            }
          } else if (session.payment_status === 'paid') {
            // Create booking record for direct (non-partner) bookings
            try {
              const amountTotal = session.amount_total || 0;
              const grossAmount = amountTotal / 100;
              
              const bookingRef = doc(collection(db, "bookings"));
              await setDoc(bookingRef, {
                userId: userId || null,
                partnerId: null,
                partnerCode: null,
                customerEmail: customerEmail,
                stripeCustomerId: customerId,
                stripeSubscriptionId: subscriptionId,
                stripeSessionId: session.id,
                planId: session.metadata?.planId || null,
                grossAmount: grossAmount,
                partnerShareAmount: 0,
                platformShareAmount: grossAmount,
                revenueShareApplied: false,
                source: "direct",
                paymentStatus: "paid",
                status: "completed",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              
              console.log("[Webhook] Direct booking created:", {
                bookingId: bookingRef.id,
                grossAmount,
              });
            } catch (bookingError) {
              console.error("[Webhook] Error creating direct booking:", bookingError);
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

                        // Award $10 credit to the referrer (for one-time use)
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

                        // Update referrer's completed referral count and track for billing period discount
                        const referrerDocRef = doc(db, "users", referrerId);
                        const referrerDoc = await getDoc(referrerDocRef);
                        if (referrerDoc.exists()) {
                          const referrerData = referrerDoc.data();
                          const referrerStripeSubscriptionId = referrerData.stripeSubscriptionId;
                          
                          // Update referral count
                          const currentCount = referrerData.referralCount || 0;
                          await updateDoc(referrerDocRef, {
                            referralCount: increment(1),
                            updatedAt: serverTimestamp(),
                          });
                          
                          console.log("[Webhook] Referral completed - discount will be applied on next invoice:", {
                            referrerId,
                            subscriptionId: referrerStripeSubscriptionId,
                          });
                        }

                        // Mark referral as COMPLETED
                        await updateDoc(doc(db, "referrals", referralDoc.id), {
                          status: "COMPLETED",
                          completedAt: serverTimestamp(),
                          updatedAt: serverTimestamp(),
                        });

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

      case "invoice.upcoming": {
        // Handle invoice before it's finalized - apply referral discounts based on referrals in billing period
        const invoice = event.data.object as Stripe.Invoice;
        // Safely access subscription property - Stripe types may vary, so we use type assertion
        const invoiceSubscription = (invoice as any).subscription;
        const subscriptionId = typeof invoiceSubscription === 'string'
          ? invoiceSubscription
          : invoiceSubscription?.id;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;
        const invoiceId = invoice.id;

        if (!subscriptionId || !customerId || !invoiceId) {
          break;
        }

        try {
          const db = await getDbInstance();
          if (!db) break;

          // Get subscription to find billing period
          const subscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
          const subscription = subscriptionResponse as Stripe.Subscription;
          // Use type assertion to access period properties (Stripe types may not expose these directly)
          const billingPeriodStart = new Date((subscription as any).current_period_start * 1000);
          const billingPeriodEnd = new Date((subscription as any).current_period_end * 1000);

          // Find user by Stripe customer ID
          const usersQuery = query(
            collection(db, "users"),
            where("stripeCustomerId", "==", customerId)
          );
          const usersSnapshot = await getDocs(usersQuery);

          if (!usersSnapshot.empty) {
            const userDoc = usersSnapshot.docs[0];
            const referrerId = userDoc.id;

            // Count referrals completed in this billing period
            const referralsQuery = query(
              collection(db, "referrals"),
              where("referrerId", "==", referrerId),
              where("status", "==", "COMPLETED")
            );
            const referralsSnapshot = await getDocs(referralsQuery);

            let referralsInPeriod = 0;
            referralsSnapshot.forEach((refDoc) => {
              const refData = refDoc.data();
              const completedAt = refData.completedAt?.toDate?.() || new Date(refData.completedAt);
              
              // Check if referral was completed in this billing period
              if (completedAt >= billingPeriodStart && completedAt < billingPeriodEnd) {
                referralsInPeriod++;
              }
            });

            console.log("[Webhook] Invoice upcoming - calculating referral discount:", {
              invoiceId,
              subscriptionId,
              referrerId,
              billingPeriodStart: billingPeriodStart.toISOString(),
              billingPeriodEnd: billingPeriodEnd.toISOString(),
              referralsInPeriod,
            });

            // Apply discount to upcoming invoice based on referrals in this period ($10 per referral)
            const { applyReferralDiscountToUpcomingInvoice } = await import("@/lib/stripe-coupons");
            await applyReferralDiscountToUpcomingInvoice(invoiceId, subscriptionId, referralsInPeriod);
          }
        } catch (invoiceError: any) {
          console.error("[Webhook] Error processing invoice.upcoming:", invoiceError);
          // Don't fail the webhook
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

