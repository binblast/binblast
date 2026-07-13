// lib/stripe.ts
// Centralized Stripe instance for server-side usage ONLY
// This ensures Stripe is initialized once with proper error handling
// CRITICAL: This file must NEVER be imported in client-side code

import Stripe from 'stripe';

// Ensure this code only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('lib/stripe.ts cannot be imported in client-side code. Stripe secret keys must never be exposed to the browser.');
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || "sk_test_missing_build_time_key";

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover', // API version required by stripe v20.0.0
  typescript: true,
});
