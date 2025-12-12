// app/api/webhooks/stripe/connected-accounts/route.ts
// Webhook handler for Stripe Connect connected account events

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { getDbInstance } = await import("@/lib/firebase");
  const { doc, updateDoc, getDoc, serverTimestamp } = await import("firebase/firestore");
  
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature provided" },
      { status: 400 }
    );
  }

  // Use separate webhook secret for connected accounts if available
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS || process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS or STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

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
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    switch (event.type) {
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        
        // Find partner by stripeConnectedAccountId
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const partnersQuery = query(
          collection(db, "partners"),
          where("stripeConnectedAccountId", "==", account.id)
        );
        const partnersSnapshot = await getDocs(partnersQuery);
        
        if (!partnersSnapshot.empty) {
          const partnerDoc = partnersSnapshot.docs[0];
          const isEnabled = account.charges_enabled && account.payouts_enabled;
          
          await updateDoc(partnerDoc.ref, {
            stripeConnectStatus: isEnabled ? 'active' : account.details_submitted ? 'pending' : 'incomplete',
            updatedAt: serverTimestamp(),
          });
          
          console.log("[Connected Account Webhook] Updated partner Stripe Connect status:", {
            partnerId: partnerDoc.id,
            accountId: account.id,
            status: isEnabled ? 'active' : 'pending',
          });
        }
        break;
      }

      case "transfer.created":
      case "transfer.paid":
      case "transfer.failed": {
        const transfer = event.data.object as Stripe.Transfer;
        
        // Update partner booking commission status if transfer is related
        if (transfer.metadata?.partnerBookingId) {
          const bookingRef = doc(db, "partnerBookings", transfer.metadata.partnerBookingId);
          const bookingDoc = await getDoc(bookingRef);
          
          if (bookingDoc.exists()) {
            let commissionStatus = 'held';
            if (event.type === "transfer.paid") {
              commissionStatus = 'paid';
            } else if (event.type === "transfer.failed") {
              commissionStatus = 'failed';
            }
            
            await updateDoc(bookingRef, {
              commissionStatus,
              stripeTransferId: transfer.id,
              updatedAt: serverTimestamp(),
            });
            
            console.log("[Connected Account Webhook] Updated commission status:", {
              bookingId: transfer.metadata.partnerBookingId,
              transferId: transfer.id,
              status: commissionStatus,
            });
          }
        }
        break;
      }

      case "account.application.deauthorized": {
        const account = event.data.object as Stripe.Account;
        
        // Find and update partner
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        const partnersQuery = query(
          collection(db, "partners"),
          where("stripeConnectedAccountId", "==", account.id)
        );
        const partnersSnapshot = await getDocs(partnersQuery);
        
        if (!partnersSnapshot.empty) {
          const partnerDoc = partnersSnapshot.docs[0];
          
          await updateDoc(partnerDoc.ref, {
            stripeConnectStatus: 'disconnected',
            updatedAt: serverTimestamp(),
          });
          
          console.log("[Connected Account Webhook] Partner disconnected Stripe account:", {
            partnerId: partnerDoc.id,
            accountId: account.id,
          });
        }
        break;
      }

      default:
        console.log(`[Connected Account Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Error processing connected account webhook:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process webhook" },
      { status: 500 }
    );
  }
}
