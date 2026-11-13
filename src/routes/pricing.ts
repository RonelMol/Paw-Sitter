import { Router, type Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { PricingEngine, QuoteRequest } from "../services/PricingEngine.ts";

export const pricingRouter = Router();

// POST /api/pricing/quote (publicly accessible for rate estimation)
pricingRouter.post("/quote", async (req: any, res: Response) => {
  try {
    const { sitterId, modality, startTime, endTime, petIds = [], isHoliday, isRushHour } = req.body;

    if (!sitterId || !modality || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields (sitterId, modality, startTime, endTime)" });
    }

    const request: QuoteRequest = {
      sitterId: Number(sitterId),
      modality,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      petIds: Array.isArray(petIds) ? petIds : [],
      isHoliday: !!isHoliday,
      isRushHour: !!isRushHour
    };

    const quote = await PricingEngine.calculateQuote(request);
    res.json(quote);
  } catch (error: any) {
    console.error("Pricing quote error:", error);
    if (error.message.includes("not found") || error.message.includes("does not offer")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("time must be")) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Failed to calculate quote", cause: error.message });
  }
});
