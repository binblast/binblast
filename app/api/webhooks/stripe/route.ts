// app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-config";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

// Disable body parsing, we need the raw body for webhook signature verification
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
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
        if (customerEmail && db) {
          // Note: We'll need to query by email since we don't have the user ID yet
          // This is a limitation - ideally we'd store a mapping of Stripe customer ID to Firebase UID
          // For now, we'll update the user when they complete registration
          console.log("Checkout session completed:", {
            customerEmail,
            customerId,
            subscriptionId,
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

