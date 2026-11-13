import { Router, type Request, type Response } from "express";
import { requireRole, AuthRequest } from "../middleware/auth.ts";
import { PaymentOrchestrator } from "../services/PaymentOrchestrator.ts";
import { isStripeConfigured } from "../lib/stripe.ts";

export const paymentsRouter = Router();

// GET /api/payments/config - check whether Stripe is available
paymentsRouter.get("/config", async (_req: Request, res: Response) => {
  res.json({
    stripeAvailable: isStripeConfigured(),
    defaultMethod: "CASH",
  });
});

// GET /api/payments/sitter-onboarding
paymentsRouter.get("/sitter-onboarding", requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const { refreshUrl, returnUrl } = req.query;
    
    if (!refreshUrl || !returnUrl) {
      return res.status(400).json({ error: "Missing refreshUrl or returnUrl query parameters" });
    }

    const url = await PaymentOrchestrator.generateOnboardingLink(
      req.dbUser.id,
      refreshUrl as string,
      returnUrl as string
    );

    res.json({ url });
  } catch (error: any) {
    console.error("Generate onboarding link error:", error);
    res.status(500).json({ error: "Failed to generate onboarding link", cause: error.message });
  }
});

// POST /api/payments/:bookingId/cash-confirm - confirm booking via cash on service
paymentsRouter.post("/:bookingId/cash-confirm", requireRole(["PET_OWNER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const result = await PaymentOrchestrator.confirmCashBooking(bookingId);
    res.json(result);
  } catch (error: any) {
    console.error("Confirm cash payment error:", error);
    res.status(500).json({ error: "Failed to confirm cash booking", cause: error.message });
  }
});

// POST /api/payments/:bookingId/intent
paymentsRouter.post("/:bookingId/intent", requireRole(["PET_OWNER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const result = await PaymentOrchestrator.createBookingPaymentIntent(bookingId);
    res.json(result);
  } catch (error: any) {
    console.error("Create payment intent error:", error);
    res.status(500).json({ error: "Failed to create payment intent", cause: error.message });
  }
});

// POST /api/payments/:bookingId/release
paymentsRouter.post("/:bookingId/release", requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const transfer = await PaymentOrchestrator.releaseEscrowPayout(bookingId);
    res.json({ success: true, transfer });
  } catch (error: any) {
    console.error("Release escrow payout error:", error);
    res.status(500).json({ error: "Failed to release escrow payout", cause: error.message });
  }
});

// POST /api/payments/:bookingId/dispute
paymentsRouter.post("/:bookingId/dispute", requireRole(["PET_OWNER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const result = await PaymentOrchestrator.handleDisputeEscrowFreeze(bookingId);
    res.json({ success: true, payment: result });
  } catch (error: any) {
    console.error("Dispute escrow freeze error:", error);
    res.status(500).json({ error: "Failed to freeze escrow due to dispute", cause: error.message });
  }
});
