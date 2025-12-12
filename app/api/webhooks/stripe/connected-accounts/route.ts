// app/api/webhooks/stripe/connected-accounts/route.ts
// Webhook handler for Stripe Connect connected account events
// Handles both Snapshot and Thin payload styles

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

  // Try both webhook secrets (Snapshot and Thin)
  // Stripe requires separate destinations for different payload styles
  const snapshotSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS_SNAPSHOT || process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS;
  const thinSecret = process.env.STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS_THIN;
  
  let event: Stripe.Event;
  let webhookSecret: string | undefined;

  // Try to verify with Snapshot secret first, then Thin secret
  if (snapshotSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, snapshotSecret);
      webhookSecret = snapshotSecret;
    } catch (err: any) {
      // If Snapshot fails, try Thin secret
      if (thinSecret) {
        try {
          event = stripe.webhooks.constructEvent(body, signature, thinSecret);
          webhookSecret = thinSecret;
        } catch (thinErr: any) {
          console.error("Webhook signature verification failed for both secrets:", err.message, thinErr.message);
          return NextResponse.json(
            { error: `Webhook Error: Signature verification failed` },
            { status: 400 }
          );
        }
      } else {
        console.error("Webhook signature verification failed:", err.message);
        return NextResponse.json(
          { error: `Webhook Error: ${err.message}` },
          { status: 400 }
        );
      }
    }
  } else if (thinSecret) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, thinSecret);
      webhookSecret = thinSecret;
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }
  } else {
    console.error("No webhook secret configured");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
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
            payloadStyle: webhookSecret === snapshotSecret ? 'snapshot' : 'thin',
          });
        }
        break;
      }

      case "transfer.created":
      case "transfer.paid":
      case "transfer.failed":
      case "transfer.updated": {
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
              payloadStyle: webhookSecret === snapshotSecret ? 'snapshot' : 'thin',
            });
          }
        }
        break;
      }

      // Handle v2 money management events (Thin payloads)
      case "v2.money_management.outbound_transfer.failed":
      case "v2.money_management.outbound_transfer.posted":
      case "v2.money_management.outbound_transfer.created": {
        const outboundTransfer = event.data.object as any;
        
        // For Thin payloads, we may need to fetch the full object to get metadata
        // But Stripe usually includes essential fields even in Thin payloads
        let transferId = outboundTransfer.id;
        let metadata = outboundTransfer.metadata || {};
        
        // If metadata is missing (Thin payload), try to fetch the full transfer
        if (!metadata.partnerBookingId && transferId) {
          try {
            // Try to retrieve the transfer - note: v2 transfers might use different API
            // Check if this is a transfer ID or outbound transfer ID
            const fullTransfer = await stripe.transfers.retrieve(transferId).catch(() => null);
            if (fullTransfer) {
              metadata = fullTransfer.metadata || {};
            } else {
              // If not a regular transfer, it might be an outbound transfer
              // Try to find related transfer by checking metadata in partnerBookings
              console.log("[Connected Account Webhook] v2 outbound transfer - checking for related booking:", transferId);
            }
          } catch (fetchErr) {
            console.warn("[Connected Account Webhook] Could not fetch full transfer:", fetchErr);
          }
        }
        
        // Update partner booking commission status if transfer is related
        // For v2 events, we'll need to match by transfer ID stored in partnerBookings
        if (metadata.partnerBookingId) {
          const bookingRef = doc(db, "partnerBookings", metadata.partnerBookingId);
          const bookingDoc = await getDoc(bookingRef);
          
          if (bookingDoc.exists()) {
            let commissionStatus = 'held';
            if (event.type === "v2.money_management.outbound_transfer.posted") {
              commissionStatus = 'paid';
            } else if (event.type === "v2.money_management.outbound_transfer.failed") {
              commissionStatus = 'failed';
            }
            
            await updateDoc(bookingRef, {
              commissionStatus,
              stripeTransferId: transferId,
              updatedAt: serverTimestamp(),
            });
            
            console.log("[Connected Account Webhook] Updated commission status (v2):", {
              bookingId: metadata.partnerBookingId,
              transferId: transferId,
              status: commissionStatus,
              payloadStyle: 'thin',
            });
          }
        } else {
          // If no metadata, try to find booking by transfer ID
          const { collection, query, where, getDocs } = await import("firebase/firestore");
          const bookingsQuery = query(
            collection(db, "partnerBookings"),
            where("stripeTransferId", "==", transferId)
          );
          const bookingsSnapshot = await getDocs(bookingsQuery);
          
          if (!bookingsSnapshot.empty) {
            const bookingDoc = bookingsSnapshot.docs[0];
            let commissionStatus = 'held';
            if (event.type === "v2.money_management.outbound_transfer.posted") {
              commissionStatus = 'paid';
            } else if (event.type === "v2.money_management.outbound_transfer.failed") {
              commissionStatus = 'failed';
            }
            
            await updateDoc(bookingDoc.ref, {
              commissionStatus,
              updatedAt: serverTimestamp(),
            });
            
            console.log("[Connected Account Webhook] Updated commission status (v2, matched by transfer ID):", {
              bookingId: bookingDoc.id,
              transferId: transferId,
              status: commissionStatus,
              payloadStyle: 'thin',
            });
          } else {
            console.log("[Connected Account Webhook] v2 transfer event received but no matching booking found:", {
              transferId: transferId,
              eventType: event.type,
            });
          }
        }
        break;
      }

      // Note: account.application.deauthorized may not be available in newer Stripe versions
      // Use account.updated to detect deauthorization by checking account status
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
            payloadStyle: webhookSecret === snapshotSecret ? 'snapshot' : 'thin',
          });
        }
        break;
      }

      default:
        console.log(`[Connected Account Webhook] Unhandled event type: ${event.type}`, {
          payloadStyle: webhookSecret === snapshotSecret ? 'snapshot' : 'thin',
        });
        // Log the event for debugging - you can add handlers for other events as needed
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
