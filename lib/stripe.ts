// lib/stripe.ts
// Centralized Stripe instance for server-side usage
// This ensures Stripe is initialized once with proper error handling

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set. Please set it in your environment variables.');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20', // Stable API version compatible with stripe v20.0.0
  typescript: true,
});
