import { stripe } from "@/lib/stripe";

export type ReferralPaymentCheckResult = {
  hasPaid: boolean;
  stripeCustomerId: string | null;
};

export async function hasStripeCustomerPaid(params: {
  stripeCustomerId?: string | null;
  email?: string | null;
}): Promise<ReferralPaymentCheckResult> {
  let stripeCustomerId = params.stripeCustomerId?.trim() || null;
  const normalizedEmail = params.email?.trim().toLowerCase() || null;

  if (!stripeCustomerId && normalizedEmail) {
    const customers = await stripe.customers.list({
      email: normalizedEmail,
      limit: 1,
    });
    if (customers.data.length > 0) {
      stripeCustomerId = customers.data[0].id;
    }
  }

  if (!stripeCustomerId) {
    return { hasPaid: false, stripeCustomerId: null };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "active",
    limit: 1,
  });
  if (subscriptions.data.length > 0) {
    return { hasPaid: true, stripeCustomerId };
  }

  const paidInvoices = await stripe.invoices.list({
    customer: stripeCustomerId,
    status: "paid",
    limit: 1,
  });
  if (paidInvoices.data.some((invoice) => invoice.amount_paid > 0)) {
    return { hasPaid: true, stripeCustomerId };
  }

  const checkoutSessions = await stripe.checkout.sessions.list({
    customer: stripeCustomerId,
    limit: 5,
  });
  if (
    checkoutSessions.data.some(
      (session) => session.payment_status === "paid" && (session.amount_total || 0) > 0
    )
  ) {
    return { hasPaid: true, stripeCustomerId };
  }

  return { hasPaid: false, stripeCustomerId };
}
