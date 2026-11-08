import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return Boolean(key && key.trim().startsWith("sk_") && key !== "sk_test_...");
}

export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) {
    return null;
  }
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY!;
    stripeClient = new Stripe(key, { apiVersion: "2024-06-20" as any });
  }
  return stripeClient;
}
