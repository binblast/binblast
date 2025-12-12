# Stripe Connect Setup Guide

This document outlines the environment variables and configuration needed for Stripe Connect partner payouts.

## Overview

Partners can connect their Stripe accounts to receive automatic weekly commission payouts. Commissions are tracked via partner booking links (e.g., `https://binblast.vercel.app/#pricing?partner=SAS96`) and held for 7 days before being automatically transferred to the partner's connected Stripe account.

## Environment Variables Required

Add these to your Vercel environment variables:

### Required Variables

1. **STRIPE_SECRET_KEY**
   - Your main Stripe secret key (already configured)
   - Used for creating connected accounts and transfers

2. **STRIPE_WEBHOOK_SECRET**
   - Webhook secret for your main Stripe account
   - Used to verify webhook signatures from Stripe
   - Get this from: Stripe Dashboard → Developers → Webhooks → Your webhook endpoint → Signing secret

3. **STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS** (Optional but Recommended)
   - Webhook secret for connected account events
   - Used to verify webhook signatures from connected accounts
   - Create a separate webhook endpoint in Stripe Dashboard for connected account events
   - Endpoint URL: `https://yourdomain.com/api/webhooks/stripe/connected-accounts`

4. **NEXT_PUBLIC_BASE_URL**
   - Your application's base URL
   - Example: `https://binblast.vercel.app`
   - Used for Stripe Connect return URLs

5. **CRON_SECRET** (Optional, for scheduled payouts)
   - Secret key for securing the payout cron job endpoint
   - Generate a random string: `openssl rand -hex 32`
   - Used to authenticate weekly payout processing

## Stripe Dashboard Configuration

### 1. Enable Stripe Connect

1. Go to Stripe Dashboard → Settings → Connect
2. Enable "Express accounts" or "Standard accounts" (Express recommended)
3. Configure your Connect settings:
   - Application name: "Bin Blast Co."
   - Support email: Your support email
   - Support phone: Your support phone

### 2. Create Webhook Endpoints

#### Main Account Webhook
- **URL**: `https://yourdomain.com/api/webhooks/stripe`
- **Events to listen for**:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.paid`
  - `transfer.created`
  - `transfer.paid`
  - `transfer.failed`

#### Connected Account Webhook (Optional)
- **URL**: `https://yourdomain.com/api/webhooks/stripe/connected-accounts`
- **Events to listen for**:
  - `account.updated`
  - `account.application.deauthorized`
  - `transfer.created`
  - `transfer.paid`
  - `transfer.failed`

### 3. Get Webhook Secrets

After creating webhook endpoints:
1. Click on each webhook endpoint
2. Copy the "Signing secret"
3. Add to Vercel environment variables:
   - `STRIPE_WEBHOOK_SECRET` (main account)
   - `STRIPE_WEBHOOK_SECRET_CONNECTED_ACCOUNTS` (connected accounts)

## How It Works

### Commission Tracking Flow

1. **Customer Books via Partner Link**
   - Customer visits: `https://binblast.vercel.app/#pricing?partner=SAS96`
   - Partner code (`SAS96`) is stored in checkout session metadata
   - Checkout completes → Webhook fires

2. **Webhook Processes Commission**
   - Webhook receives `checkout.session.completed` event
   - Extracts `partnerId` from session metadata
   - Calculates commission (60% partner, 40% platform by default)
   - Creates `partnerBookings` document in Firestore
   - If partner has connected Stripe account:
     - Creates transfer to connected account (funds held)
     - Sets `commissionStatus` to `'held'`
   - If no connected account:
     - Sets `commissionStatus` to `'pending'`

3. **Weekly Payout Processing**
   - Cron job calls `/api/partners/commissions/payout` weekly
   - Finds all commissions older than 7 days with status `'pending'` or `'held'`
   - Creates transfers to connected accounts
   - Updates commission status to `'paid'`
   - Creates `partnerPayouts` record

### Commission Statuses

- **`pending`**: Commission earned but partner hasn't connected Stripe account
- **`held`**: Commission transferred to connected account, waiting for 7-day hold period
- **`paid`**: Commission paid out to partner
- **`failed`**: Transfer failed (rare)

## Setting Up Weekly Payouts

### Option 1: Vercel Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/partners/commissions/payout",
    "schedule": "0 0 * * 1"
  }]
}
```

This runs every Monday at midnight UTC.

### Option 2: External Cron Service

Use a service like:
- Cron-job.org
- EasyCron
- GitHub Actions (scheduled workflows)

Call: `POST https://yourdomain.com/api/partners/commissions/payout`
Headers: `Authorization: Bearer YOUR_CRON_SECRET`

## Testing

### Test Mode

1. Use Stripe test mode keys
2. Create test partner accounts
3. Use Stripe test cards for checkout
4. Verify transfers appear in Stripe Dashboard → Connect → Test data

### Test Cards

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

## Security Notes

1. **Never expose Stripe secret keys** in client-side code
2. **Always verify webhook signatures** before processing
3. **Use HTTPS** for all webhook endpoints
4. **Protect payout endpoint** with `CRON_SECRET`
5. **Validate partner ownership** before creating transfers

## Troubleshooting

### Transfers Not Creating

- Check partner has `stripeConnectedAccountId` set
- Verify account is active (`charges_enabled` and `payouts_enabled`)
- Check Stripe Dashboard → Connect → Accounts for errors

### Webhooks Not Firing

- Verify webhook URL is accessible
- Check webhook secret matches environment variable
- Review Stripe Dashboard → Developers → Webhooks → Attempts

### Payouts Not Processing

- Verify cron job is running
- Check `CRON_SECRET` matches
- Review commission statuses in Firestore
- Ensure commissions are older than 7 days

## Support

For Stripe Connect documentation:
- https://stripe.com/docs/connect
- https://stripe.com/docs/connect/express-accounts
