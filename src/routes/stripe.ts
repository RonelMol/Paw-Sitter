import { Router, type Request, type Response } from "express";
import { getStripe } from "../lib/stripe.ts";
import { db } from "../db/index.ts";
import { bookings, payments } from "../db/schema.ts";
import { eq } from "drizzle-orm";

export const stripeWebhookRouter = Router();

stripeWebhookRouter.post("/", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(200).json({ received: true, simulated: true, message: "Stripe not configured" });
    }
    if (!endpointSecret) {
      event = JSON.parse(req.body.toString());
    } else {
      event = stripe.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    }
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;
        const transferGroup = paymentIntent.transfer_group;
        
        if (transferGroup) {
          // In a full implementation, we'd look up the payment record via transferGroup
          // and then update the associated booking.
          const paymentRecord = await db.select().from(payments).where(eq(payments.transferGroup, transferGroup));
          if (paymentRecord.length > 0) {
            await db.update(bookings)
              .set({ status: "CONFIRMED" })
              .where(eq(bookings.id, paymentRecord[0].bookingId));
              
            await db.update(payments)
              .set({ status: "HELD_IN_ESCROW" })
              .where(eq(payments.id, paymentRecord[0].id));
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const transferGroup = paymentIntent.transfer_group;
        
        if (transferGroup) {
          const paymentRecord = await db.select().from(payments).where(eq(payments.transferGroup, transferGroup));
          if (paymentRecord.length > 0) {
            await db.update(bookings)
              .set({ status: "CANCELLED" })
              .where(eq(bookings.id, paymentRecord[0].bookingId));
          }
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    res.status(500).send("Internal Server Error");
  }
});
