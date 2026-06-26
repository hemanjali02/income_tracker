# Billing Setup Guide (Razorpay)

This app ships with a complete hybrid freemium system: a Free tier, a Pro
subscription (monthly or yearly), and a one-time Lifetime purchase. Payments run
through Razorpay, the standard gateway for India.

Until you add the Razorpay keys, billing stays disabled and every signed-in user
is treated as Pro, so the app is fully usable while you finish setup. The moment
the keys are present, the Free tier limits and Pro locks switch on automatically.

---

## What is gated

Free tier: dashboard, transactions (list and calendar), up to 3 accounts,
budgets, categories, balances, CSV export.

Pro tier adds: unlimited accounts, credit card cycle tracking, spending analysis,
recurring transactions, goals, receivables, investments, split expenses, bank PDF
import, and PDF monthly reports.

You can change exactly what is free vs pro in two files that must stay in sync:
- `src/config/plans.js` (client)
- `server/entitlements.js` (server, the source of truth)

---

## Step 1: Create a Razorpay account

1. Sign up at https://razorpay.com and complete KYC. You need a registered
   business or be set up as an individual, with a bank account for payouts.
2. Stay in Test Mode while you build. Switch to Live Mode only after testing.

## Step 2: Get your API keys

1. Razorpay Dashboard, go to Settings, then API Keys.
2. Generate a key pair. You get a Key ID (starts with `rzp_test_` or `rzp_live_`)
   and a Key Secret (shown once, copy it now).

## Step 3: Create the two subscription plans

You need a monthly plan and a yearly plan. In the Dashboard go to
Subscriptions, then Plans, then Create Plan.

Monthly plan:
- Billing frequency: Monthly
- Amount: 99 (or whatever you decide)
- Note the Plan ID it gives you (starts with `plan_`)

Yearly plan:
- Billing frequency: Yearly
- Amount: 799
- Note the Plan ID

The Lifetime purchase is a one-time order, so it needs no plan. Its amount is set
by an environment variable instead.

## Step 4: Set up the webhook

1. Dashboard, Settings, Webhooks, Add New Webhook.
2. Webhook URL: `https://YOUR_DOMAIN/api/billing/webhook`
3. Set a secret string of your choosing and remember it.
4. Subscribe to these events:
   - subscription.activated
   - subscription.charged
   - subscription.cancelled
   - subscription.completed
   - subscription.halted
   - subscription.pending

## Step 5: Add environment variables

On your hosting (Vercel project settings, Environment Variables), add these.
Server-side variables have no prefix. The one the browser needs is prefixed with
`VITE_`.

```
# Server side (do NOT expose the secret to the browser)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=the_secret_you_set_in_step_4
RAZORPAY_PLAN_PRO_MONTHLY=plan_xxxxxxxxxxxx
RAZORPAY_PLAN_PRO_YEARLY=plan_yyyyyyyyyyyy
RAZORPAY_LIFETIME_AMOUNT=249900   # in paise, so this is Rs 2499

# Optional display prices for the pricing page (in rupees)
BILLING_PRICE_PRO_MONTHLY=99
BILLING_PRICE_PRO_YEARLY=799
BILLING_PRICE_LIFETIME=2499

# Client side (safe to expose, it is only the public key id)
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
```

Note: `VITE_RAZORPAY_KEY_ID` is not strictly required because the server returns
the key id to the client via /api/billing/config, but setting it is harmless.

After adding variables, redeploy so they take effect.

## Step 6: Test in Test Mode

1. Open the app, sign in, you should now see the Free tier limits and the
   Upgrade to Pro button in the sidebar.
2. Click Upgrade, pick a plan.
3. Razorpay Checkout opens. Use a test card:
   - Card: 4111 1111 1111 1111
   - Any future expiry, any CVV, any name
   - For UPI testing use `success@razorpay`
4. After payment you should be upgraded to Pro and everything unlocks.

## Step 7: Go live

1. Complete Razorpay KYC and activate Live Mode.
2. Generate Live API keys and recreate the two plans in Live Mode (test and live
   plans are separate).
3. Update all the environment variables with the `rzp_live_` keys and the new
   live Plan IDs.
4. Point the webhook to your live URL.
5. Redeploy.

---

## How the flow works internally

Subscriptions (Pro):
1. Client calls POST /api/billing/subscribe, server creates a Razorpay
   subscription and returns its id.
2. Client opens Razorpay Checkout with that subscription id.
3. On success, client calls POST /api/billing/verify-subscription. Server checks
   the signature and marks the user Pro.
4. The webhook keeps the plan in sync for renewals and cancellations.

One-time (Lifetime):
1. Client calls POST /api/billing/order, server creates a Razorpay order.
2. Client opens Checkout with the order id.
3. On success, client calls POST /api/billing/verify-order. Server verifies the
   signature and marks the user Lifetime.

Server-side enforcement: even if someone bypasses the client, the server blocks
creating a 4th account or a credit card account on the Free plan.

---

## Changing what is free vs pro

To move a feature between tiers, edit both:
- `src/config/plans.js`: the `PRO_FEATURES` set, `PRO_VIEWS` set, `FREE_MAX_ACCOUNTS`
- `server/entitlements.js`: `PLAN_LIMITS`

Keep them consistent so the UI and the server agree.
