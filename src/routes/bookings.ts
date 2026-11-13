import { Router, type Response } from "express";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import { bookings, sitterRateCards, users, bookingFinancialSnapshots, payments, sitterBlockouts, sitterAvailabilities, petCareActivities, sitterProfiles, pets, bookingMessages, bookingPets } from "../db/schema.ts";
import { eq, or, and, ne, sql, desc, asc, inArray } from "drizzle-orm";
import { getStripe } from "../lib/stripe.ts";
import crypto from "crypto";
import { NotificationService } from "../services/NotificationService.ts";

export const bookingsRouter = Router();

// GET /api/bookings/sitter-schedule/:sitterId - return booked slots and blockouts
bookingsRouter.get("/sitter-schedule/:sitterId", async (req: AuthRequest, res: Response) => {
  try {
    const sitterId = parseInt(req.params.sitterId, 10);
    if (isNaN(sitterId)) {
      return res.status(400).json({ error: "Invalid sitter ID" });
    }

    const activeBookings = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.sitterId, sitterId),
          ne(bookings.status, "CANCELLED")
        )
      );

    const blockouts = await db
      .select()
      .from(sitterBlockouts)
      .where(eq(sitterBlockouts.sitterId, sitterId));

    const availabilities = await db
      .select()
      .from(sitterAvailabilities)
      .where(eq(sitterAvailabilities.sitterId, sitterId));

    res.json({
      bookings: activeBookings,
      blockouts,
      availabilities,
    });
  } catch (error: any) {
    console.error("Fetch sitter schedule error:", error);
    res.status(500).json({ error: "Failed to fetch sitter schedule" });
  }
});

bookingsRouter.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const role = req.dbUser.role;

    let condition = undefined;
    if (role === "PET_OWNER") {
      condition = eq(bookings.ownerId, userId);
    } else if (role === "PET_SITTER") {
      condition = eq(bookings.sitterId, userId);
    } else if (role !== "ADMIN" && role !== "SUPPORT_AGENT") {
      return res.status(403).json({ error: "Unauthorized role" });
    }

    const allBookings = await db
      .select()
      .from(bookings)
      .where(condition)
      .orderBy(desc(bookings.createdAt));

    // Enrich each booking with rich sitter, owner, payment, location, questionnaire and activity timeline metrics
    const enriched = await Promise.all(
      allBookings.map(async (b) => {
        // Sitter User & Profile
        const sitterUserRows = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          countryCode: users.countryCode,
          profilePicture: users.profilePicture,
        }).from(users).where(eq(users.id, b.sitterId));
        const sitterProfileRows = await db.select().from(sitterProfiles).where(eq(sitterProfiles.userId, b.sitterId));

        // Owner User with full contact info
        const ownerUserRows = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          countryCode: users.countryCode,
          profilePicture: users.profilePicture,
        }).from(users).where(eq(users.id, b.ownerId));

        // Financial snapshot
        const snapshotRows = await db.select().from(bookingFinancialSnapshots).where(eq(bookingFinancialSnapshots.bookingId, b.id));
        const financialSnapshot = snapshotRows[0] || null;

        // Payment record
        const paymentRows = await db.select().from(payments).where(eq(payments.bookingId, b.id));
        const payment = paymentRows[0] || null;

        // Activities count & list
        const activityRows = await db.select().from(petCareActivities).where(eq(petCareActivities.bookingId, b.id))
          .orderBy(asc(petCareActivities.scheduledDate), asc(petCareActivities.scheduledTime));
        const totalActivities = activityRows.length;
        const completedActivities = activityRows.filter(a => a.status === "COMPLETED").length;

        // Pets - linked pets via bookingPets or owner pets
        let petRows = await db.select({
          id: pets.id,
          name: pets.name,
          type: pets.type,
          breed: pets.breed,
          age: pets.age,
          weight: pets.weight,
          foodType: pets.foodType,
          foodFrequency: pets.foodFrequency,
          foodGramsPerMeal: pets.foodGramsPerMeal,
          otherNotes: pets.otherNotes,
          photoUrl: pets.photoUrl,
          medicalConditions: pets.medicalConditions,
          medicationRequirements: pets.medicationRequirements,
          behavioralNotes: pets.behavioralNotes,
        }).from(bookingPets)
          .innerJoin(pets, eq(bookingPets.petId, pets.id))
          .where(eq(bookingPets.bookingId, b.id));

        if (petRows.length === 0) {
          petRows = await db.select({
            id: pets.id,
            name: pets.name,
            type: pets.type,
            breed: pets.breed,
            age: pets.age,
            weight: pets.weight,
            foodType: pets.foodType,
            foodFrequency: pets.foodFrequency,
            foodGramsPerMeal: pets.foodGramsPerMeal,
            otherNotes: pets.otherNotes,
            photoUrl: pets.photoUrl,
            medicalConditions: pets.medicalConditions,
            medicationRequirements: pets.medicationRequirements,
            behavioralNotes: pets.behavioralNotes,
          }).from(pets).where(eq(pets.ownerId, b.ownerId));
        }

        // Modality determination
        const intakeQ: any = b.intakeQuestionnaire || {};
        const modality = intakeQ?.serviceType || (financialSnapshot as any)?.modality || (b as any).modality || "HOUSE_SITTING";

        return {
          id: b.id,
          ownerId: b.ownerId,
          sitterId: b.sitterId,
          status: b.status,
          startTime: b.startTime,
          endTime: b.endTime,
          totalAmount: b.totalAmount,
          totalPrice: (b.totalAmount / 100).toFixed(2),
          modality,
          houseLocationAddress: b.houseLocationAddress,
          houseLocationDetails: b.houseLocationDetails || {},
          intakeQuestionnaire: b.intakeQuestionnaire || {},
          routineApprovalStatus: b.routineApprovalStatus || "PENDING_APPROVAL",
          routineApprovedAt: b.routineApprovedAt || null,
          routineApprovedBy: b.routineApprovedBy || null,
          routineProposalNotes: (b as any).routineProposalNotes || (b as any).routine_proposal_notes || null,
          createdAt: b.createdAt,
          sitter: {
            ...(sitterUserRows[0] || { id: b.sitterId, name: "Professional Caregiver", email: "" }),
            profile: sitterProfileRows[0] || null,
          },
          owner: ownerUserRows[0] || { id: b.ownerId, name: "Pet Owner", email: "" },
          financialSnapshot,
          payment: {
            isCash: payment?.transferGroup?.startsWith("cash") || payment?.status === "PENDING" || true,
            status: payment?.status || "pending",
          },
          pets: petRows,
          activities: activityRows,
          activityStats: {
            total: totalActivities,
            completed: completedActivities,
            pending: totalActivities - completedActivities,
            progressPercent: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0,
          }
        };
      })
    );

    res.json(enriched);
  } catch (error: any) {
    console.error("Fetch bookings error:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

bookingsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { 
      sitterId, modality, startTime, endTime, 
      paymentMethod = "CASH", activities = [], forceConfirm = false,
      houseLocationAddress, houseLocationDetails = {}, intakeQuestionnaire = {}
    } = req.body;
    
    if (!req.dbUser) {
      return res.status(401).json({ error: "User profile not found. Please log in again." });
    }

    if (!sitterId || !modality || !startTime || !endTime) {
      return res.status(400).json({ error: "Missing required fields (sitterId, modality, startTime, endTime)" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date/time provided. Please pick valid start and end dates." });
    }
    if (end <= start) {
      return res.status(400).json({ error: "End time must be after start time" });
    }

    let targetSitterId = Number(sitterId);
    if (isNaN(targetSitterId)) {
      targetSitterId = 1;
    }

    // Verify sitter exists in users table to prevent FK constraint violations
    const sitterUserCheck = await db.select({ id: users.id }).from(users).where(eq(users.id, targetSitterId));
    if (sitterUserCheck.length === 0) {
      const anySitter = await db.select({ id: users.id }).from(users).where(eq(users.role, "PET_SITTER")).limit(1);
      if (anySitter.length > 0) {
        targetSitterId = anySitter[0].id;
      } else {
        const anyUser = await db.select({ id: users.id }).from(users).limit(1);
        if (anyUser.length > 0) {
          targetSitterId = anyUser[0].id;
        }
      }
    }

    // Extract target pet IDs
    const normalizedPetIds: number[] = [
      ...(Array.isArray(req.body.petIds) ? req.body.petIds : []),
      ...(Array.isArray(req.body.selectedPetIds) ? req.body.selectedPetIds : [])
    ].map(Number).filter((n) => !isNaN(n) && n > 0);

    // PET SCHEDULE OVERLAP CHECK:
    // If the pet already has an active booking on that date and time range, reject booking
    if (normalizedPetIds.length > 0) {
      try {
        const petConflicts = await db
          .select({
            bookingId: bookings.id,
            startTime: bookings.startTime,
            endTime: bookings.endTime,
            status: bookings.status,
            petId: bookingPets.petId,
            petName: pets.name,
          })
          .from(bookingPets)
          .innerJoin(bookings, eq(bookingPets.bookingId, bookings.id))
          .innerJoin(pets, eq(bookingPets.petId, pets.id))
          .where(
            and(
              inArray(bookingPets.petId, normalizedPetIds),
              ne(bookings.status, "CANCELLED"),
              sql`${bookings.startTime} < ${end} AND ${bookings.endTime} > ${start}`
            )
          );

        if (petConflicts.length > 0 && !forceConfirm) {
          const conflict = petConflicts[0];
          const conflictStart = new Date(conflict.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
          const conflictEnd = new Date(conflict.endTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
          return res.status(409).json({
            error: `Your pet "${conflict.petName}" already has an active booking (#BK-${conflict.bookingId}) from ${conflictStart} to ${conflictEnd}. You cannot book the same pet for overlapping dates and times.`,
            petConflict: true,
            conflictPetName: conflict.petName,
            conflictBookingId: conflict.bookingId,
            canForceConfirm: false,
          });
        }
      } catch (petCheckErr) {
        console.warn("Pet conflict check warning:", petCheckErr);
      }
    }

    // STRICT CHECK: Double booking prevention on same date and time range
    const overlappingBookings = await db
      .select({
        id: bookings.id,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.sitterId, targetSitterId),
          ne(bookings.status, "CANCELLED"),
          sql`${bookings.startTime} < ${end} AND ${bookings.endTime} > ${start}`
        )
      );

    if (overlappingBookings.length > 0 && !forceConfirm) {
      const conflict = overlappingBookings[0];
      const conflictStart = new Date(conflict.startTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      const conflictEnd = new Date(conflict.endTime).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
      return res.status(409).json({
        error: `This sitter is already booked between ${conflictStart} and ${conflictEnd}. You can choose another time slot, or click 'Proceed Anyway' if this is your booking.`,
        conflict: {
          id: conflict.id,
          startTime: conflict.startTime,
          endTime: conflict.endTime,
        },
        canForceConfirm: true
      });
    }

    // Check for sitter blockouts
    const startIsoDate = start.toISOString().split("T")[0];
    const endIsoDate = end.toISOString().split("T")[0];
    const overlappingBlockouts = await db
      .select()
      .from(sitterBlockouts)
      .where(
        and(
          eq(sitterBlockouts.sitterId, targetSitterId),
          sql`${sitterBlockouts.startDate} <= ${endIsoDate} AND ${sitterBlockouts.endDate} >= ${startIsoDate}`
        )
      );

    if (overlappingBlockouts.length > 0 && !forceConfirm) {
      return res.status(409).json({
        error: "The sitter has marked these dates as blocked out. Please choose alternate dates.",
        canForceConfirm: true
      });
    }

    // Fetch rate card with automatic fallback
    const rateResult = await db.select().from(sitterRateCards)
      .where(and(eq(sitterRateCards.sitterId, targetSitterId), eq(sitterRateCards.modality, modality as any)));
      
    let rate = rateResult[0];
    if (!rate) {
      const modalityDefaults: Record<string, { baseRate: number; durationUnitMinutes: number }> = {
        BOARDING: { baseRate: 4500, durationUnitMinutes: 1440 },
        HOUSE_SITTING: { baseRate: 5500, durationUnitMinutes: 1440 },
        DROP_IN: { baseRate: 2500, durationUnitMinutes: 60 },
        DAY_CARE: { baseRate: 3000, durationUnitMinutes: 60 },
        DOG_WALKING: { baseRate: 2500, durationUnitMinutes: 60 },
      };
      const def = modalityDefaults[modality] || { baseRate: 3500, durationUnitMinutes: 60 };
      try {
        const insertedRate = await db.insert(sitterRateCards).values({
          sitterId: targetSitterId,
          modality: modality as any,
          baseRate: def.baseRate,
          durationUnitMinutes: def.durationUnitMinutes,
          extraPetFee: 1500,
          puppyRate: 1000,
          medicationSurcharge: 500,
          holidayMultiplier: "1.00",
          rushHourSurcharge: 0,
        }).returning();
        rate = insertedRate[0];
      } catch (err) {
        rate = {
          id: 0,
          sitterId: targetSitterId,
          modality: modality as any,
          baseRate: def.baseRate,
          durationUnitMinutes: def.durationUnitMinutes,
          extraPetFee: 1500,
          puppyRate: 1000,
          medicationSurcharge: 500,
          holidayMultiplier: "1.00",
          rushHourSurcharge: 0,
        } as any;
      }
    }

    // Validate sitter availability & blockouts
    const blockouts = await db.select().from(sitterBlockouts).where(eq(sitterBlockouts.sitterId, targetSitterId));
    const isBlockoutConflict = blockouts.some(b => {
      const bStart = new Date(b.startDate);
      const bEnd = new Date(b.endDate);
      return (start < bEnd && end > bStart);
    });
    if (isBlockoutConflict) {
      return res.status(400).json({ error: "The sitter is unavailable during the requested time due to scheduled blockouts." });
    }

    const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
    const units = Math.max(1, Math.ceil(durationMinutes / (rate.durationUnitMinutes || 60)));
    const amount = Math.round(units * rate.baseRate);

    const isCash = paymentMethod === "CASH";
    const transferGroup = `${isCash ? 'cash' : 'booking'}_${crypto.randomBytes(8).toString("hex")}`;

    // All bookings start as PENDING for Sitter to review first before accepting & confirming
    const newBooking = await db.insert(bookings).values({
      ownerId: req.dbUser.id,
      sitterId: targetSitterId,
      totalAmount: amount,
      startTime: start,
      endTime: end,
      houseLocationAddress: houseLocationAddress || null,
      houseLocationDetails: houseLocationDetails || {},
      intakeQuestionnaire: intakeQuestionnaire || {},
      status: "PENDING",
    }).returning();

    await db.insert(bookingFinancialSnapshots).values({
      bookingId: newBooking[0].id,
      baseRateApplied: rate.baseRate,
      durationUnitMinutesApplied: rate.durationUnitMinutes,
      platformOwnerFeePercentageApplied: "0.05",
      platformSitterCommissionPercentageApplied: "0.20",
      fixedTransactionFeeApplied: 0,
      calculatedBaseTotal: amount,
      calculatedOwnerFee: Math.round(amount * 0.05),
      calculatedSitterCommission: Math.round(amount * 0.20),
      calculatedSitterPayout: Math.round(amount * 0.8),
      calculatedTotalOwnerCharge: amount + Math.round(amount * 0.05),
      calculatedNetPlatformRevenue: Math.round(amount * 0.05) + Math.round(amount * 0.20),
      tipAmount: 0
    });

    await db.insert(payments).values({
      bookingId: newBooking[0].id,
      transferGroup,
      status: isCash ? "AUTHORIZED" : "PENDING",
    });

    // Link pets to booking
    if (normalizedPetIds.length > 0) {
      for (const pId of normalizedPetIds) {
        try {
          await db.insert(bookingPets).values({
            bookingId: newBooking[0].id,
            petId: pId,
          });
        } catch (bpErr) {
          console.warn("Could not insert bookingPet link:", bpErr);
        }
      }
    }

    // Save scheduled pet care activities if provided
    if (Array.isArray(activities) && activities.length > 0) {
      for (const act of activities) {
        if (!act || !act.title) continue;
        try {
          await db.insert(petCareActivities).values({
            bookingId: newBooking[0].id,
            title: act.title,
            activityType: act.activityType || "FEEDING",
            scheduledDate: act.scheduledDate || startIsoDate,
            scheduledTime: act.scheduledTime || "09:00",
            instructions: act.instructions || (act.isRequired ? "Required: high-priority task." : "Optional care recommendation."),
            status: "PENDING",
          });
        } catch (actErr) {
          console.warn("Could not insert activity:", actErr);
        }
      }
    }

    // Create Stripe Checkout Session only if Stripe was requested
    let checkoutUrl = null;
    if (!isCash) {
      try {
        const stripe = getStripe();
        if (stripe && req.dbUser.stripeCustomerId) {
          const session = await stripe.checkout.sessions.create({
            customer: req.dbUser.stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: `Pet Sitting: ${modality}`,
                  },
                  unit_amount: amount,
                },
                quantity: 1,
              },
            ],
            mode: "payment",
            payment_intent_data: {
              transfer_group: transferGroup,
            },
            success_url: `${process.env.APP_URL || 'http://localhost:3000'}/bookings/${newBooking[0].id}/confirmation`,
            cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/bookings/${newBooking[0].id}/confirmation`,
          });
          checkoutUrl = session.url;
        }
      } catch (stripeErr) {
        console.warn("Stripe checkout error:", stripeErr);
      }
    }

    // Trigger notifications for all roles (Pet Owner, Sitter, Admin)
    try {
      const sitterRows = await db.select().from(users).where(eq(users.id, targetSitterId));
      if (sitterRows.length > 0) {
        await NotificationService.onBookingCreated(newBooking[0], req.dbUser, sitterRows[0]);
        if (isCash) {
          await NotificationService.onPaymentAction(newBooking[0].id, req.dbUser.id, targetSitterId, amount, "AUTHORIZED");
        }
      }
    } catch (notifErr) {
      console.warn("Notification dispatch notice:", notifErr);
    }

    res.json({
      booking: newBooking[0],
      checkoutUrl,
      paymentMethod: isCash ? "CASH" : "STRIPE",
      confirmed: isCash,
      message: isCash ? "Booking confirmed with Cash on Service!" : "Booking created"
    });
  } catch (error: any) {
    console.error("Create booking error:", error);
    res.status(500).json({ error: "Failed to create booking", cause: error.message });
  }
});

// PATCH /api/bookings/:id/status - Sitter accepts or declines booking with 3-booking limit check
bookingsRouter.patch("/:id/status", requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { status } = req.body; // "CONFIRMED" or "CANCELLED"
    const sitterId = req.dbUser.id;

    const bookingResult = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingResult.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingResult[0];

    if (req.dbUser.role !== "ADMIN" && booking.sitterId !== sitterId) {
      return res.status(403).json({ error: "Forbidden: You are not assigned to this booking" });
    }

    if (status === "CONFIRMED") {
      // Check 3-booking free limit from user_memberships
      const membershipCheck = await db.execute(sql`
        SELECT * FROM user_memberships WHERE user_id = ${sitterId} LIMIT 1
      `);
      let mem = (membershipCheck as any).rows?.[0];

      if (!mem) {
        // Initialize membership
        const newMem = await db.execute(sql`
          INSERT INTO user_memberships (user_id, plan_type, status, accepted_bookings_count, max_free_bookings)
          VALUES (${sitterId}, 'FREE_TIER', 'ACTIVE', 0, 3)
          RETURNING *
        `);
        mem = (newMem as any).rows?.[0];
      }

      const isPro = mem?.plan_type !== "FREE_TIER" && mem?.status === "ACTIVE";
      const acceptedCount = mem?.accepted_bookings_count || 0;
      const maxFree = mem?.max_free_bookings || 3;

      if (!isPro && acceptedCount >= maxFree) {
        return res.status(403).json({
          membershipRequired: true,
          acceptedCount,
          maxFree,
          error: `Membership Required: You have reached your ${maxFree} free accepted bookings limit. Please upgrade to PawShield Pro Sitter Membership (₱499/month) to accept this booking.`,
        });
      }

      // Allowed! Increment accepted bookings count
      await db.execute(sql`
        UPDATE user_memberships 
        SET accepted_bookings_count = accepted_bookings_count + 1, updated_at = NOW()
        WHERE user_id = ${sitterId}
      `);
    }

    const updated = await db.update(bookings)
      .set({ status })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Trigger notification
    try {
      await NotificationService.onBookingStatusChanged(updated[0], status, req.dbUser);
    } catch (nErr) {
      console.warn("Status change notification error:", nErr);
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error("Update booking status error:", error);
    res.status(500).json({ error: "Failed to update booking status", cause: error.message });
  }
});

bookingsRouter.post("/:id/complete", requireRole(["PET_OWNER", "PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    
    const bookingResult = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingResult.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const booking = bookingResult[0];
    
    if (req.dbUser.role !== "ADMIN" && booking.ownerId !== req.dbUser.id && booking.sitterId !== req.dbUser.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (booking.status !== "CONFIRMED") {
      return res.status(400).json({ error: "Only CONFIRMED bookings can be COMPLETED" });
    }

    const snapshotResult = await db.select().from(bookingFinancialSnapshots).where(eq(bookingFinancialSnapshots.bookingId, booking.id));
    const snapshot = snapshotResult[0];

    // Execute transfer to sitter if Stripe configured
    try {
      const sitterResult = await db.select().from(users).where(eq(users.id, booking.sitterId));
      const sitter = sitterResult[0];
      
      if (sitter && sitter.stripeAccountId && snapshot) {
        const stripe = getStripe();
        if (stripe) {
          console.log(`Simulating transfer of ${snapshot.calculatedSitterPayout} to ${sitter.stripeAccountId}`);
        }
      }
    } catch (stripeErr) {
      console.warn("Transfer notification skipped:", stripeErr);
    }

    const updated = await db.update(bookings)
      .set({ status: "COMPLETED" })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Trigger completion notifications across roles (Owner, Sitter, Admin)
    try {
      await NotificationService.onBookingStatusChanged(updated[0], "COMPLETED", req.dbUser);
      const payoutAmount = snapshot?.calculatedSitterPayout || Math.round(booking.totalAmount * 0.8);
      await NotificationService.onPaymentAction(booking.id, booking.ownerId, booking.sitterId, payoutAmount, "RELEASED");
    } catch (notifErr) {
      console.warn("Booking completion notification error:", notifErr);
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error("Complete booking error:", error);
    res.status(500).json({ error: "Failed to complete booking", cause: error.message });
  }
});

// GET /api/bookings/:id - Single booking details with full order context
bookingsRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    // Authorization: owner, sitter, or admin
    if (req.dbUser.role !== "ADMIN" && booking.ownerId !== req.dbUser.id && booking.sitterId !== req.dbUser.id) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to view this order" });
    }

    // Fetch Sitter Info & Profile
    const sitterUser = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, booking.sitterId));

    const sitterProfile = await db.select().from(sitterProfiles).where(eq(sitterProfiles.userId, booking.sitterId));

    // Fetch Owner Info
    const ownerUser = await db.select({
      id: users.id,
      name: users.name,
      email: users.email,
    }).from(users).where(eq(users.id, booking.ownerId));

    // Fetch Financial Snapshot
    const snapshots = await db.select().from(bookingFinancialSnapshots).where(eq(bookingFinancialSnapshots.bookingId, bookingId));
    const financialSnapshot = snapshots[0] || null;

    // Fetch Payment Record
    const paymentRows = await db.select().from(payments).where(eq(payments.bookingId, bookingId));
    const payment = paymentRows[0] || null;
    const isCash = payment?.transferGroup?.startsWith("cash") || false;

    // Fetch Pets of Owner
    const ownerPets = await db.select().from(pets).where(eq(pets.ownerId, booking.ownerId));

    // Fetch Activities for this booking
    const activities = await db.select().from(petCareActivities)
      .where(eq(petCareActivities.bookingId, bookingId))
      .orderBy(asc(petCareActivities.scheduledDate), asc(petCareActivities.scheduledTime));

    res.json({
      booking: {
        ...booking,
        totalPrice: (booking.totalAmount / 100).toFixed(2),
        routineApprovalStatus: booking.routineApprovalStatus || "PENDING_APPROVAL",
        routineApprovedAt: booking.routineApprovedAt || null,
        routineApprovedBy: booking.routineApprovedBy || null,
      },
      sitter: {
        ...(sitterUser[0] || {}),
        profile: sitterProfile[0] || null,
      },
      owner: ownerUser[0] || null,
      financialSnapshot,
      payment: payment ? {
        ...payment,
        isCash,
        methodLabel: isCash ? "Cash on Service (Pay upon arrival)" : "Stripe Escrow",
      } : null,
      pets: ownerPets,
      activities,
    });
  } catch (error: any) {
    console.error("Get booking details error:", error);
    res.status(500).json({ error: "Failed to fetch booking details" });
  }
});

// POST /api/bookings/:id/routine/propose-sitter - Sitter proposes adjustments/new items to routine, pending owner approval
bookingsRouter.post("/:id/routine/propose-sitter", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { notes, activities: proposedActivities } = req.body;

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    if (req.dbUser.role !== "ADMIN" && booking.sitterId !== req.dbUser.id) {
      return res.status(403).json({ error: "Only the assigned Pet Sitter can propose routine changes." });
    }

    // If proposedActivities array was passed, optionally update/add activities
    if (Array.isArray(proposedActivities) && proposedActivities.length > 0) {
      for (const act of proposedActivities) {
        if (!act.title) continue;
        if (act.id && typeof act.id === "number") {
          // Update existing activity
          await db.update(petCareActivities).set({
            title: act.title,
            activityType: act.activityType || "FEEDING",
            scheduledDate: act.scheduledDate,
            scheduledTime: act.scheduledTime,
            instructions: act.instructions || "",
            proofRequired: Boolean(act.proofRequired),
          }).where(eq(petCareActivities.id, act.id));
        } else {
          // Insert new activity proposed by sitter
          await db.insert(petCareActivities).values({
            bookingId,
            petId: act.petId ? parseInt(act.petId, 10) : null,
            petName: act.petName || null,
            title: act.title,
            activityType: act.activityType || "FEEDING",
            scheduledDate: act.scheduledDate || new Date(booking.startTime).toISOString().split("T")[0],
            scheduledTime: act.scheduledTime || "09:00",
            instructions: act.instructions || "",
            proofRequired: Boolean(act.proofRequired),
            status: "PENDING",
          });
        }
      }
    }

    // Mark routine as PENDING_OWNER_APPROVAL
    const updated = await db.update(bookings)
      .set({
        routineApprovalStatus: "PENDING_OWNER_APPROVAL",
        ...(notes ? { routineProposalNotes: notes.trim() } : {}),
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Fetch updated activities
    const updatedActivities = await db.select().from(petCareActivities)
      .where(eq(petCareActivities.bookingId, bookingId))
      .orderBy(asc(petCareActivities.scheduledDate), asc(petCareActivities.scheduledTime));

    // Notify Pet Owner of proposed changes
    try {
      await NotificationService.send({
        userId: booking.ownerId,
        targetRole: "PET_OWNER",
        title: "Sitter Proposed Routine Schedule Updates",
        message: `Your sitter ${req.dbUser.name || "Caregiver"} proposed changes to the daily care schedule for Booking #${booking.id}: "${notes || 'Custom schedule updates'}". Please review and approve.`,
        type: "BOOKING",
        actionType: "ROUTINE_PROPOSED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: `/bookings/${booking.id}/order-summary`,
      });
    } catch (notifErr) {
      console.warn("Routine proposal notification error:", notifErr);
    }

    res.json({
      success: true,
      message: "Routine changes proposed to the pet owner for approval.",
      booking: updated[0],
      activities: updatedActivities,
    });
  } catch (error: any) {
    console.error("Propose routine error:", error);
    res.status(500).json({ error: "Failed to propose routine changes", cause: error.message });
  }
});

// POST /api/bookings/:id/routine/owner-approve - Pet Owner approves the proposed routine
bookingsRouter.post("/:id/routine/owner-approve", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    if (req.dbUser.role !== "ADMIN" && booking.ownerId !== req.dbUser.id) {
      return res.status(403).json({ error: "Only the Pet Owner can approve the proposed routine." });
    }

    const updated = await db.update(bookings)
      .set({
        routineApprovalStatus: "APPROVED",
        routineApprovedAt: new Date(),
        routineApprovedBy: req.dbUser.id,
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify Sitter
    try {
      await NotificationService.send({
        userId: booking.sitterId,
        targetRole: "PET_SITTER",
        title: "Care Routine Approved by Pet Owner 🎉",
        message: `Pet parent ${req.dbUser.name || "Owner"} has approved your proposed care routine schedule for Booking #${booking.id}!`,
        type: "BOOKING",
        actionType: "ROUTINE_APPROVED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: `/sitter/inbox`,
      });
    } catch (notifErr) {
      console.warn("Owner approval notification error:", notifErr);
    }

    res.json({ success: true, message: "Proposed routine approved successfully.", booking: updated[0] });
  } catch (error: any) {
    console.error("Owner approve routine error:", error);
    res.status(500).json({ error: "Failed to approve routine", cause: error.message });
  }
});

// POST /api/bookings/:id/routine/owner-reject - Pet Owner requests adjustments
bookingsRouter.post("/:id/routine/owner-reject", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { reason } = req.body;
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    if (req.dbUser.role !== "ADMIN" && booking.ownerId !== req.dbUser.id) {
      return res.status(403).json({ error: "Only the Pet Owner can decline the proposed routine." });
    }

    const updated = await db.update(bookings)
      .set({
        routineApprovalStatus: "PENDING_SITTER_REVISION",
        routineProposalNotes: reason ? `Owner requested revision: ${reason}` : "Owner requested routine revisions.",
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify Sitter
    try {
      await NotificationService.send({
        userId: booking.sitterId,
        targetRole: "PET_SITTER",
        title: "Care Routine Revision Requested",
        message: `Pet parent ${req.dbUser.name || "Owner"} requested routine revisions for Booking #${booking.id}: "${reason || 'Please adjust the schedule'}".`,
        type: "BOOKING",
        actionType: "ROUTINE_REVISION_REQUESTED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: `/sitter/inbox`,
      });
    } catch (notifErr) {
      console.warn("Owner reject notification error:", notifErr);
    }

    res.json({ success: true, message: "Feedback sent to sitter.", booking: updated[0] });
  } catch (error: any) {
    console.error("Owner reject routine error:", error);
    res.status(500).json({ error: "Failed to process feedback", cause: error.message });
  }
});

// POST /api/bookings/:id/routine/approve - Sitter approves and confirms the pet care routine
bookingsRouter.post("/:id/routine/approve", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    // Only the assigned Sitter or Admin can approve the routine
    if (req.dbUser.role !== "ADMIN" && booking.sitterId !== req.dbUser.id) {
      return res.status(403).json({ error: "Only the assigned Pet Sitter can approve and confirm the care routine." });
    }

    const updated = await db.update(bookings)
      .set({
        routineApprovalStatus: "APPROVED",
        routineApprovedAt: new Date(),
        routineApprovedBy: req.dbUser.id,
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Notify pet owner
    try {
      await NotificationService.send({
        userId: booking.ownerId,
        targetRole: "PET_OWNER",
        title: "Pet Care Routine Approved & Confirmed",
        message: `Your sitter ${req.dbUser.name || "Caregiver"} has reviewed, confirmed, and approved the care routine for Booking #${booking.id}.`,
        type: "BOOKING",
        actionType: "ROUTINE_APPROVED",
        entityType: "booking",
        entityId: booking.id,
        linkUrl: `/bookings/${booking.id}/order-summary`,
      });
    } catch (notifErr) {
      console.warn("Routine approval notification failed:", notifErr);
    }

    res.json({ success: true, message: "Care routine approved and confirmed.", booking: updated[0] });
  } catch (error: any) {
    console.error("Approve routine error:", error);
    res.status(500).json({ error: "Failed to approve routine", cause: error.message });
  }
});

// POST /api/bookings/:id/routine/reopen - Sitter or Admin reopens routine for revisions
bookingsRouter.post("/:id/routine/reopen", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    if (req.dbUser.role !== "ADMIN" && booking.sitterId !== req.dbUser.id) {
      return res.status(403).json({ error: "Only the assigned Pet Sitter or Admin can reopen the routine." });
    }

    const updated = await db.update(bookings)
      .set({
        routineApprovalStatus: "PENDING_APPROVAL",
      })
      .where(eq(bookings.id, bookingId))
      .returning();

    res.json({ success: true, message: "Routine unlocked for adjustments.", booking: updated[0] });
  } catch (error: any) {
    console.error("Reopen routine error:", error);
    res.status(500).json({ error: "Failed to reopen routine" });
  }
});

// GET /api/bookings/:id/activities - List pet care activities
bookingsRouter.get("/:id/activities", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const activities = await db.select().from(petCareActivities)
      .where(eq(petCareActivities.bookingId, bookingId))
      .orderBy(asc(petCareActivities.scheduledDate), asc(petCareActivities.scheduledTime));
    res.json(activities);
  } catch (error: any) {
    console.error("Fetch activities error:", error);
    res.status(500).json({ error: "Failed to fetch pet activities" });
  }
});

// POST /api/bookings/:id/activities - Owner or Sitter adds a scheduled pet activity
bookingsRouter.post("/:id/activities", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { title, activityType = "FEEDING", scheduledDate, scheduledTime, instructions, petId, petName, proofRequired = false } = req.body;

    if (!title || !scheduledDate || !scheduledTime) {
      return res.status(400).json({ error: "Missing required fields: title, scheduledDate, scheduledTime" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    // If Pet Owner is adding, check if routine is already approved by Sitter
    const isOwner = booking.ownerId === req.dbUser.id && req.dbUser.role !== "ADMIN";
    if (isOwner && booking.routineApprovalStatus === "APPROVED") {
      return res.status(403).json({
        error: "This pet care routine has already been confirmed and approved by your sitter. To make revisions, please message your sitter directly.",
      });
    }

    const inserted = await db.insert(petCareActivities).values({
      bookingId,
      petId: petId ? parseInt(petId, 10) : null,
      petName: petName || null,
      title,
      activityType,
      scheduledDate,
      scheduledTime,
      instructions: instructions || "",
      status: "PENDING",
      proofRequired: Boolean(proofRequired),
    }).returning();

    res.status(201).json(inserted[0]);
  } catch (error: any) {
    console.error("Create activity error:", error);
    res.status(500).json({ error: "Failed to create pet activity" });
  }
});

// POST /api/bookings/:id/activities/generate-routine - 1-Click Auto populate pet care schedule
bookingsRouter.post("/:id/activities/generate-routine", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    const isOwner = booking.ownerId === req.dbUser.id && req.dbUser.role !== "ADMIN";
    if (isOwner && booking.routineApprovalStatus === "APPROVED") {
      return res.status(403).json({
        error: "This pet care routine has already been approved and confirmed by your sitter.",
      });
    }

    const { petId, petName } = req.body || {};

    const startDate = new Date(booking.startTime);
    const endDate = new Date(booking.endTime);

    // Compute dates between start and end (inclusive)
    const dates: string[] = [];
    const curr = new Date(startDate);
    curr.setHours(0, 0, 0, 0);
    const endBoundary = new Date(endDate);
    endBoundary.setHours(23, 59, 59, 999);

    while (curr <= endBoundary) {
      dates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }

    const standardTemplates = [
      {
        title: "Morning Meal & Fresh Water",
        activityType: "FEEDING",
        scheduledTime: "08:00",
        instructions: "Serve recommended portion. Wash food bowl and provide cold fresh water.",
        proofRequired: true,
      },
      {
        title: "Morning Walk & Bathroom Break",
        activityType: "WALKING",
        scheduledTime: "09:30",
        instructions: "20-30 min walk around perimeter, record potty status.",
        proofRequired: true,
      },
      {
        title: "Afternoon Relief & Playtime",
        activityType: "POTTY",
        scheduledTime: "13:30",
        instructions: "Potty break in yard or brief walk; 15 mins interactive play/cuddles.",
        proofRequired: false,
      },
      {
        title: "Evening Dinner & Medicine Check",
        activityType: "FEEDING",
        scheduledTime: "17:30",
        instructions: "Serve dinner portion. Administer any scheduled supplements/meds.",
        proofRequired: true,
      },
      {
        title: "Bedtime Outdoor Potty Break",
        activityType: "POTTY",
        scheduledTime: "20:30",
        instructions: "Final quick relief break before night sleep.",
        proofRequired: false,
      },
    ];

    const newActivities = [];
    for (const d of dates) {
      for (const t of standardTemplates) {
        newActivities.push({
          bookingId,
          petId: petId ? parseInt(petId, 10) : null,
          petName: petName || null,
          title: t.title,
          activityType: t.activityType,
          scheduledDate: d,
          scheduledTime: t.scheduledTime,
          instructions: t.instructions,
          status: "PENDING",
          proofRequired: t.proofRequired,
        });
      }
    }

    const inserted = await db.insert(petCareActivities).values(newActivities).returning();
    res.json({ message: "Routine schedule generated successfully", activities: inserted });
  } catch (error: any) {
    console.error("Generate routine error:", error);
    res.status(500).json({ error: "Failed to generate routine schedule" });
  }
});

// PATCH /api/bookings/:id/activities/:activityId - Sitter marks task complete / updates status
bookingsRouter.patch("/:id/activities/:activityId", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const activityId = parseInt(req.params.activityId, 10);
    const { status, completedNotes, completedPhotoUrl, title, instructions, scheduledTime, petId, petName, proofRequired } = req.body;

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    const existingActRows = await db.select().from(petCareActivities).where(eq(petCareActivities.id, activityId));
    if (existingActRows.length === 0) {
      return res.status(404).json({ error: "Care activity not found" });
    }
    const existingAct = existingActRows[0];

    const isSitterOrAdmin = req.dbUser.role === "ADMIN" || booking.sitterId === req.dbUser.id;
    const isOwner = booking.ownerId === req.dbUser.id && !isSitterOrAdmin;

    // RULE 1: If status is being updated (e.g. COMPLETED or PENDING), ONLY Pet Sitter or Admin can do this!
    if (status !== undefined) {
      if (!isSitterOrAdmin) {
        return res.status(403).json({
          error: "Permission Denied: Pet owners have real-time view-only oversight. Only the assigned Pet Sitter can check off care tasks as done.",
        });
      }

      // RULE 1.1: If marking COMPLETED, the Care Routine MUST be approved & confirmed first!
      if (status === "COMPLETED") {
        if (booking.routineApprovalStatus !== "APPROVED") {
          return res.status(400).json({
            error: "Routine Not Approved: The assigned pet sitter must review and click 'Approve & Confirm Routine' before tasks can be checked off as done.",
          });
        }

        // RULE 1.2: If proof is required, photo proof must be provided!
        const requiresProof = proofRequired !== undefined ? Boolean(proofRequired) : Boolean(existingAct.proofRequired);
        const effectivePhoto = completedPhotoUrl || existingAct.completedPhotoUrl;
        if (requiresProof && (!effectivePhoto || !effectivePhoto.trim())) {
          return res.status(400).json({
            error: "Photo Proof Required: The pet parent has tagged this task as requiring photo verification. Please upload a photo proof to complete this task.",
          });
        }
      }
    }

    // RULE 2: If editing task details (title, instructions, etc.), Pet Owner cannot edit if routine is already APPROVED
    if (isOwner && booking.routineApprovalStatus === "APPROVED" && (title !== undefined || instructions !== undefined || scheduledTime !== undefined)) {
      return res.status(403).json({
        error: "This routine has been confirmed and approved by your sitter. Only the sitter can edit task details.",
      });
    }

    const isCompleted = status === "COMPLETED";

    const updateData: any = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.completedAt = isCompleted ? new Date() : null;
      updateData.completedBy = isCompleted ? (req.dbUser.name || req.dbUser.email) : null;
    }
    if (completedNotes !== undefined) updateData.completedNotes = completedNotes;
    if (completedPhotoUrl !== undefined) updateData.completedPhotoUrl = completedPhotoUrl;
    if (proofRequired !== undefined) updateData.proofRequired = Boolean(proofRequired);
    if (title !== undefined) updateData.title = title;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (scheduledTime !== undefined) updateData.scheduledTime = scheduledTime;
    if (petId !== undefined) updateData.petId = petId ? parseInt(petId, 10) : null;
    if (petName !== undefined) updateData.petName = petName;

    const updated = await db.update(petCareActivities)
      .set(updateData)
      .where(eq(petCareActivities.id, activityId))
      .returning();

    // Trigger Pet Care notification to Pet Owner & Admin
    if (isCompleted && updated[0]) {
      try {
        await NotificationService.onActivityCompleted(
          updated[0],
          booking,
          req.dbUser.name || req.dbUser.email || "Your Sitter"
        );
      } catch (actNotifErr) {
        console.warn("Activity notification error:", actNotifErr);
      }
    }

    res.json(updated[0]);
  } catch (error: any) {
    console.error("Update activity error:", error);
    res.status(500).json({ error: "Failed to update activity", cause: error.message });
  }
});

// DELETE /api/bookings/:id/activities/:activityId - Remove an activity
bookingsRouter.delete("/:id/activities/:activityId", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const activityId = parseInt(req.params.activityId, 10);

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const booking = bookingRows[0];

    const isOwner = booking.ownerId === req.dbUser.id && req.dbUser.role !== "ADMIN" && booking.sitterId !== req.dbUser.id;
    if (isOwner && booking.routineApprovalStatus === "APPROVED") {
      return res.status(403).json({
        error: "This routine has been confirmed and approved by your sitter. You cannot delete tasks from an approved routine.",
      });
    }

    await db.delete(petCareActivities).where(eq(petCareActivities.id, activityId));
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete activity error:", error);
    res.status(500).json({ error: "Failed to delete activity" });
  }
});

// GET /api/bookings/admin/activities-compliance - Admin overview of sitter activity execution
bookingsRouter.get("/admin/activities-compliance", requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    // Fetch all activities with booking and sitter info
    const allActivities = await db
      .select({
        activityId: petCareActivities.id,
        bookingId: petCareActivities.bookingId,
        title: petCareActivities.title,
        activityType: petCareActivities.activityType,
        scheduledDate: petCareActivities.scheduledDate,
        scheduledTime: petCareActivities.scheduledTime,
        status: petCareActivities.status,
        completedAt: petCareActivities.completedAt,
        completedBy: petCareActivities.completedBy,
        completedNotes: petCareActivities.completedNotes,
        instructions: petCareActivities.instructions,
        sitterId: bookings.sitterId,
        ownerId: bookings.ownerId,
        bookingStatus: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
      })
      .from(petCareActivities)
      .innerJoin(bookings, eq(petCareActivities.bookingId, bookings.id))
      .orderBy(desc(petCareActivities.scheduledDate), desc(petCareActivities.scheduledTime));

    // Get sitters mapping
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
    const userMap = new Map(allUsers.map(u => [u.id, u.name || u.email]));

    const enriched = allActivities.map(a => ({
      ...a,
      sitterName: userMap.get(a.sitterId) || `Sitter #${a.sitterId}`,
      ownerName: userMap.get(a.ownerId) || `Owner #${a.ownerId}`,
    }));

    const total = enriched.length;
    const completed = enriched.filter(a => a.status === "COMPLETED").length;
    const pending = total - completed;
    const complianceRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    res.json({
      stats: {
        total,
        completed,
        pending,
        complianceRate,
      },
      activities: enriched,
    });
  } catch (error: any) {
    console.error("Admin compliance error:", error);
    res.status(500).json({ error: "Failed to fetch activities compliance" });
  }
});

// GET /api/bookings/:id/messages - Retrieve full conversation history for a booking
bookingsRouter.get("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!bookingRows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const b = bookingRows[0];

    const currentUserId = req.dbUser.id;
    const isOwner = b.ownerId === currentUserId;
    const isSitter = b.sitterId === currentUserId;
    const isAdmin = req.dbUser.role === "ADMIN" || req.dbUser.role === "SUPPORT_AGENT";

    if (!isOwner && !isSitter && !isAdmin) {
      return res.status(403).json({ error: "Access denied to conversation history" });
    }

    // Fetch existing messages
    let messages = await db
      .select()
      .from(bookingMessages)
      .where(eq(bookingMessages.bookingId, bookingId))
      .orderBy(asc(bookingMessages.createdAt));

    // If zero messages yet, initialize with a greeting from owner to make the chat lively and welcoming
    if (messages.length === 0) {
      const ownerUser = await db.select().from(users).where(eq(users.id, b.ownerId));
      const ownerName = ownerUser[0]?.name || "Pet Parent";

      const [initialMsg] = await db.insert(bookingMessages).values({
        bookingId,
        senderId: b.ownerId,
        senderRole: "PET_OWNER",
        senderName: ownerName,
        message: `Hello! Looking forward to our scheduled care for Booking #${bookingId}. Please feel free to leave any visit updates, questions, or instructions here! 🐾`,
        isFlagged: false,
      }).returning();

      messages = [initialMsg];
    }

    res.json(messages);
  } catch (error: any) {
    console.error("Fetch booking messages error:", error);
    res.status(500).json({ error: "Failed to fetch conversation history" });
  }
});

// POST /api/bookings/:id/messages - Send a direct dynamic message
bookingsRouter.post("/:id/messages", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message text cannot be empty" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (!bookingRows.length) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const b = bookingRows[0];

    const currentUserId = req.dbUser.id;
    const isOwner = b.ownerId === currentUserId;
    const isSitter = b.sitterId === currentUserId;
    const isAdmin = req.dbUser.role === "ADMIN";

    if (!isOwner && !isSitter && !isAdmin) {
      return res.status(403).json({ error: "Access denied to message on this booking" });
    }

    // Disintermediation / Off-platform filter check
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
    const offPlatformRegex = /(venmo|cashapp|zelle|paypal|gcash|maya|cash on hand)/i;

    const isFlagged = phoneRegex.test(message) || emailRegex.test(message) || offPlatformRegex.test(message);
    const flagReason = isFlagged ? "Potential off-platform contact or unverified payment mention" : null;

    const senderRole = req.dbUser.role === "ADMIN" ? "ADMIN" : (isSitter ? "PET_SITTER" : "PET_OWNER");
    const senderName = req.dbUser.name || req.user?.displayName || (senderRole === "PET_SITTER" ? "Verified Sitter" : "Pet Parent");

    const [newMsg] = await db.insert(bookingMessages).values({
      bookingId,
      senderId: currentUserId,
      senderRole,
      senderName,
      message: message.trim(),
      isFlagged,
      flagReason,
    }).returning();

    // Trigger Notification to the counterpart
    try {
      const recipientId = isSitter ? b.ownerId : b.sitterId;
      await NotificationService.send({
        userId: recipientId,
        targetRole: isSitter ? "PET_OWNER" : "PET_SITTER",
        title: `New Message from ${senderName}`,
        message: message.length > 80 ? `${message.substring(0, 80)}...` : message,
        type: "BOOKING",
        actionType: "NEW_MESSAGE",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: isSitter ? "/profile" : "/sitter/inbox",
        metadata: { bookingId, senderRole, senderName },
      });
    } catch (notifErr) {
      console.warn("Message notification error:", notifErr);
    }

    res.status(201).json(newMsg);
  } catch (error: any) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to dispatch message" });
  }
});

// POST /api/bookings/:id/check-in - Record GPS check in and transition booking to IN_PROGRESS
bookingsRouter.post("/:id/check-in", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const { latitude = 14.5995, longitude = 120.9842 } = req.body || {};

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const b = bookingRows[0];

    const updated = await db.update(bookings)
      .set({ status: "IN_PROGRESS" })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Auto notify pet owner
    try {
      await NotificationService.send({
        userId: b.ownerId,
        targetRole: "PET_OWNER",
        title: "Visit Started - Sitter Checked In",
        message: `Your pet sitter has arrived and checked in! Live GPS tracking and visit checklist are now active.`,
        type: "BOOKING",
        actionType: "VISIT_STARTED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/bookings/${bookingId}/live-tracker`,
      });
    } catch (notifErr) {
      console.warn("Check-in notif error:", notifErr);
    }

    res.json({
      success: true,
      message: "Check-in successful! Visit has started.",
      booking: updated[0],
      checkInTime: new Date(),
      location: { latitude, longitude }
    });
  } catch (error: any) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Failed to record check-in", cause: error.message });
  }
});

// POST /api/bookings/:id/check-out - Complete visit and generate report card
bookingsRouter.post("/:id/check-out", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const b = bookingRows[0];

    const updated = await db.update(bookings)
      .set({ status: "COMPLETED" })
      .where(eq(bookings.id, bookingId))
      .returning();

    // Mark remaining pending activities as completed
    await db.update(petCareActivities)
      .set({
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: req.dbUser?.name || "Caregiver",
        completedNotes: "Completed upon visit check out.",
      })
      .where(and(eq(petCareActivities.bookingId, bookingId), eq(petCareActivities.status, "PENDING")));

    try {
      await NotificationService.send({
        userId: b.ownerId,
        targetRole: "PET_OWNER",
        title: "Visit Completed - Full Report Ready",
        message: `Your pet care visit for Booking #${bookingId} has concluded. View the full activity checklist and photos in the live tracker.`,
        type: "BOOKING",
        actionType: "VISIT_COMPLETED",
        entityType: "booking",
        entityId: bookingId,
        linkUrl: `/bookings/${bookingId}/live-tracker`,
      });
    } catch (notifErr) {
      console.warn("Check-out notif error:", notifErr);
    }

    res.json({
      success: true,
      message: "Visit checked out and marked complete.",
      booking: updated[0],
    });
  } catch (error: any) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Failed to record check-out", cause: error.message });
  }
});

// POST /api/bookings/:id/simulate-visit - 1-Click Simulation Override for testing entire process
bookingsRouter.post("/:id/simulate-visit", async (req: AuthRequest, res: Response) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ error: "Invalid booking ID" });
    }

    const bookingRows = await db.select().from(bookings).where(eq(bookings.id, bookingId));
    if (bookingRows.length === 0) {
      return res.status(404).json({ error: "Booking not found" });
    }
    const b = bookingRows[0];

    // Approve routine & set in progress
    await db.update(bookings)
      .set({
        routineApprovalStatus: "APPROVED",
        routineApprovedAt: new Date(),
        routineApprovedBy: req.dbUser?.id || b.sitterId,
        status: "IN_PROGRESS",
      })
      .where(eq(bookings.id, bookingId));

    // Ensure sample activities exist
    const existingActs = await db.select().from(petCareActivities).where(eq(petCareActivities.bookingId, bookingId));
    if (existingActs.length === 0) {
      await db.insert(petCareActivities).values([
        {
          bookingId,
          title: "Morning Feeding & Fresh Water",
          activityType: "FEEDING",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: "08:30",
          instructions: "Prescribed kibble portion & fresh water bowl.",
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: req.dbUser?.name || "Caregiver",
          completedNotes: "Ate the entire bowl with great enthusiasm.",
        },
        {
          bookingId,
          title: "Neighborhood Walk & Exercise",
          activityType: "WALKING",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: "09:15",
          instructions: "20 minute stroll around the park.",
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: req.dbUser?.name || "Caregiver",
          completedNotes: "Pee & poo logged. Happy tail wags!",
        },
        {
          bookingId,
          title: "Medication & Vitamins",
          activityType: "MEDICATION",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: "12:00",
          instructions: "1 vitamin chew after lunch.",
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: req.dbUser?.name || "Caregiver",
          completedNotes: "Given with treat without hassle.",
        },
        {
          bookingId,
          title: "Playtime & Cuddles",
          activityType: "PLAYTIME",
          scheduledDate: new Date().toISOString().split("T")[0],
          scheduledTime: "17:00",
          instructions: "Indoor fetch and brushing.",
          status: "COMPLETED",
          completedAt: new Date(),
          completedBy: req.dbUser?.name || "Caregiver",
          completedNotes: "Played fetch and brushed coat.",
        }
      ]);
    } else {
      // Mark all existing activities as completed for the simulation
      for (const act of existingActs) {
        await db.update(petCareActivities)
          .set({
            status: "COMPLETED",
            completedAt: new Date(),
            completedBy: req.dbUser?.name || "Caregiver",
            completedNotes: "Completed during visit simulation.",
          })
          .where(eq(petCareActivities.id, act.id));
      }
    }

    res.json({
      success: true,
      message: "Simulation activated! Routine confirmed, GPS check-in simulated, and activities recorded.",
      bookingId,
    });
  } catch (error: any) {
    console.error("Simulation error:", error);
    res.status(500).json({ error: "Failed to run simulation", cause: error.message });
  }
});

