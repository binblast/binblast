// lib/stripe.ts
// Centralized Stripe instance for server-side usage ONLY
// This ensures Stripe is initialized once with proper error handling
// CRITICAL: This file must NEVER be imported in client-side code

import Stripe from 'stripe';

// Ensure this code only runs on the server
if (typeof window !== 'undefined') {
  throw new Error('lib/stripe.ts cannot be imported in client-side code. Stripe secret keys must never be exposed to the browser.');
}

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. Please set it in your environment variables.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2025-11-17.clover', // API version required by stripe v20.0.0
  typescript: true,
});
