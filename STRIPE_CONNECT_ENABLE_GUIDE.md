# How to Enable Stripe Connect

## Quick Setup Steps

The error "You can only create new accounts if you've signed up for Connect" means Stripe Connect needs to be enabled on your main Stripe account first.

### Step 1: Enable Stripe Connect

1. **Log into Stripe Dashboard**
   - Go to https://dashboard.stripe.com/
   - Make sure you're logged into the account that has your `STRIPE_SECRET_KEY`

2. **Navigate to Connect Settings**
   - Click **Settings** in the left sidebar
   - Click **Connect** (or go directly to: https://dashboard.stripe.com/settings/connect)

3. **Enable Express Accounts**
   - Toggle **"Express accounts"** to **ON**
   - This allows partners to quickly connect their Stripe accounts

4. **Configure Connect Settings**
   - **Application name**: "Bin Blast Co." (or your business name)
   - **Support email**: Your support email address
   - **Support phone**: Your support phone number (optional)
   - **Brand color**: Your brand color (optional, for branding)

5. **Save Settings**
   - Click **"Save"** or **"Enable Connect"**

### Step 2: Verify Connect is Enabled

After enabling, you should see:
- A "Connect" section in your Stripe Dashboard sidebar
- The ability to create connected accounts
- Connect-specific settings available

### Step 3: Test Partner Connection

1. Go to your partner dashboard
2. Click "Connect Stripe Account"
3. You should now be redirected to Stripe's onboarding flow
4. Partner completes their Stripe account setup
5. They're redirected back to your dashboard

## What Happens After Connect is Enabled

Once Stripe Connect is enabled:

1. **Partner clicks "Connect Stripe Account"**
   - Your app creates a Stripe Connect Express account for them
   - Generates an onboarding link

2. **Partner is redirected to Stripe**
   - Stripe handles the account setup/onboarding
   - Partner enters their business information
   - Stripe verifies their identity

3. **Partner returns to your dashboard**
   - Their account is now connected
   - They can receive automatic payouts

4. **Automatic Payouts**
   - Commissions are tracked (60% partner, 40% Bin Blast)
   - Funds are held for 7 days
   - Weekly automatic transfers to partner's bank account

## Troubleshooting

### Still Getting "Connect not enabled" Error?

1. **Check you're using the correct Stripe account**
   - The account with your `STRIPE_SECRET_KEY` must have Connect enabled
   - If you have multiple Stripe accounts, make sure you're enabling Connect on the right one

2. **Wait a few minutes**
   - Sometimes it takes a moment for Connect to fully activate
   - Try refreshing and trying again

3. **Check Stripe Dashboard**
   - Go to Settings → Connect
   - Verify "Express accounts" shows as enabled

4. **Check API Keys**
   - Make sure your `STRIPE_SECRET_KEY` matches the account where Connect is enabled
   - Test mode vs Live mode: Enable Connect in both if you're testing

### Common Issues

**Issue**: "Account creation failed"
- **Solution**: Make sure Connect is enabled AND you've saved the settings

**Issue**: "Invalid country code"
- **Solution**: Currently set to 'US' - modify code if you need other countries

**Issue**: Partner redirected but account not connecting
- **Solution**: Check webhook endpoints are configured correctly

## Next Steps After Enabling Connect

1. **Set up webhooks** (see `STRIPE_CONNECT_SETUP.md`)
2. **Test with a partner account**
3. **Configure payout schedule** (weekly, monthly, etc.)
4. **Set up commission tracking**

## Support

- Stripe Connect Docs: https://stripe.com/docs/connect
- Stripe Express Accounts: https://stripe.com/docs/connect/express-accounts
- Stripe Support: https://support.stripe.com/
