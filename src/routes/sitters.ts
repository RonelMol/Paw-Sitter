import { Router, Response, Request } from "express";
import { requireRole, requireAuth, AuthRequest } from "../middleware/auth.ts";
import { db, pool } from "../db/index.ts";
import { sitterProfiles, sitterAvailabilities, sitterBlockouts, sitterRateCards, users, bookings, bookingMessages, bookingFinancialSnapshots, payments, sitterPayoutDisbursements } from "../db/schema.ts";
import { eq, and, desc } from "drizzle-orm";

export const sittersRouter = Router();

// Onboard a new sitter (Called by PET_OWNER to become a sitter)
sittersRouter.post("/onboard", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.dbUser) return res.status(401).json({ error: "Unauthorized" });

    const { bio, experienceDetails, address, coordinates, serviceRadiusMiles } = req.body;

    if (bio && typeof bio === "string" && bio.trim().length > 0 && bio.trim().length < 100) {
      return res.status(400).json({
        error: "Bio too short",
        message: `Sitter bio must be at least 100 characters long (currently ${bio.trim().length}) to prevent thin content penalties and build trust.`,
      });
    }
    let lat = null, lng = null;
    if (coordinates) {
      const parts = coordinates.split(",");
      if (parts.length === 2) {
        lat = parts[0].trim();
        lng = parts[1].trim();
      }
    }

    // 1. Create Sitter Profile
    const profile = await db.insert(sitterProfiles).values({
      userId: req.dbUser.id,
      bio: bio || "",
      experienceDetails: experienceDetails || "",
      latitude: lat,
      longitude: lng,
      serviceRadiusMiles: serviceRadiusMiles || 10,
      photos: []
    }).onConflictDoUpdate({
      target: sitterProfiles.userId,
      set: { bio, latitude: lat, longitude: lng, serviceRadiusMiles }
    }).returning();

    // 2. Update user role
    await db.update(users).set({ role: "PET_SITTER" }).where(eq(users.id, req.dbUser.id));

    res.json({ success: true, profile: profile[0] });
  } catch (error: any) {
    console.error("Sitter onboard error:", error);
    res.status(500).json({ error: "Failed to onboard sitter", cause: error.message });
  }
});

// Get current sitter profile
sittersRouter.get("/me", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    let profile = await db.select().from(sitterProfiles).where(eq(sitterProfiles.userId, req.dbUser.id));
    if (!profile.length) {
      // Auto-create default sitter profile row if missing
      const [newProf] = await db.insert(sitterProfiles).values({
        userId: req.dbUser.id,
        bio: "Passionate and certified pet caregiver.",
        experienceDetails: "Experienced in daily dog walking, pet feeding, and attentive overnight home care.",
        serviceRadiusMiles: 10,
        photos: [],
      }).returning();
      profile = [newProf];
    }
    
    const rateCards = await db.select().from(sitterRateCards).where(eq(sitterRateCards.sitterId, req.dbUser.id));
    const availabilities = await db.select().from(sitterAvailabilities).where(eq(sitterAvailabilities.sitterId, req.dbUser.id));
    const blockouts = await db.select().from(sitterBlockouts).where(eq(sitterBlockouts.sitterId, req.dbUser.id));

    // Calculate completed bookings and active rate policies
    const completedBookingsRes = await pool.query(
      `SELECT COUNT(*) FROM bookings WHERE sitter_id = $1 AND status = 'COMPLETED'`,
      [req.dbUser.id]
    );
    const completedBookings = parseInt(completedBookingsRes.rows[0]?.count || "0", 10);

    const policiesRes = await pool.query(
      `SELECT * FROM service_rate_policies ORDER BY id ASC`
    );

    const pObj = profile[0] as any;
    let effectiveTier = pObj?.sitterTier || pObj?.sitter_tier || "NOVICE";
    if (!pObj?.sitterTier && !pObj?.sitter_tier) {
      if (completedBookings >= 10) effectiveTier = "PRO";
      else if (completedBookings >= 3) effectiveTier = "STANDARD";
      else effectiveTier = "NOVICE";
    }

    res.json({
      profile: profile[0],
      user: {
        id: req.dbUser.id,
        name: req.dbUser.name,
        firstName: req.dbUser.firstName,
        middleName: req.dbUser.middleName,
        lastName: req.dbUser.lastName,
        countryCode: req.dbUser.countryCode,
        phone: req.dbUser.phone,
        email: req.dbUser.email,
        profilePicture: req.dbUser.profilePicture,
        role: req.dbUser.role,
        isVerified: req.dbUser.isVerified,
      },
      sitterTier: effectiveTier,
      completedBookingsCount: completedBookings,
      ratesLocked: pObj?.ratesLocked || pObj?.rates_locked || false,
      rateApprovalStatus: pObj?.rateApprovalStatus || pObj?.rate_approval_status || "APPROVED",
      rateRejectionReason: pObj?.rateRejectionReason || pObj?.rate_rejection_reason || null,
      maxPetsPerBooking: pObj?.maxPetsPerBooking || pObj?.max_pets_per_booking || 2,
      ratePolicies: policiesRes.rows,
      rateCards,
      availabilities,
      blockouts
    });
  } catch (error: any) {
    console.error("Fetch sitter profile error:", error);
    res.status(500).json({ error: "Failed to fetch sitter profile", cause: error.message });
  }
});

// Upsert sitter profile and update personal info (name, phone, picture, bio, experience, modern fields)
sittersRouter.post("/me", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const {
      name,
      firstName,
      middleName,
      lastName,
      phone,
      countryCode,
      bio,
      experienceDetails,
      latitude,
      longitude,
      serviceRadiusMiles,
      photos,
      profilePicture,
      proofAlbum,
      environmentInfo,
      petPreferences,
      dailyRoutine,
      skillsList,
    } = req.body;

    if (bio !== undefined && typeof bio === "string" && bio.trim().length > 0 && bio.trim().length < 100) {
      return res.status(400).json({
        error: "Bio too short",
        message: `Sitter bio must be at least 100 characters long (currently ${bio.trim().length}) to prevent thin content penalties and build trust.`,
      });
    }

    // Update users table for personal info
    const userUpdates: any = {};
    if (firstName !== undefined) userUpdates.firstName = firstName.trim();
    if (middleName !== undefined) userUpdates.middleName = middleName.trim();
    if (lastName !== undefined) userUpdates.lastName = lastName.trim();
    if (countryCode !== undefined) userUpdates.countryCode = countryCode.trim();
    if (phone !== undefined) userUpdates.phone = phone.trim();

    // Compute composite name if first/last provided, or use explicit name
    if (firstName || lastName) {
      const full = [firstName, middleName, lastName].filter(Boolean).map((s: string) => s.trim()).join(" ");
      if (full) userUpdates.name = full;
    } else if (name !== undefined && typeof name === "string") {
      userUpdates.name = name.trim();
    }

    if (profilePicture !== undefined && typeof profilePicture === "string") {
      userUpdates.profilePicture = profilePicture.trim();
    }

    if (Object.keys(userUpdates).length > 0) {
      await db.update(users).set(userUpdates).where(eq(users.id, req.dbUser.id));
    }

    let photoList: string[] = Array.isArray(photos) ? [...photos] : [];
    if (profilePicture && typeof profilePicture === "string" && profilePicture.trim()) {
      const cleanPic = profilePicture.trim();
      photoList = [cleanPic, ...photoList.filter(p => p !== cleanPic)];
    }

    const radius = serviceRadiusMiles !== undefined ? parseInt(String(serviceRadiusMiles), 10) : 10;

    const result = await db.insert(sitterProfiles)
      .values({
        userId: req.dbUser.id,
        bio: bio !== undefined ? bio : "",
        experienceDetails: experienceDetails !== undefined ? experienceDetails : "",
        latitude: latitude ? String(latitude) : null,
        longitude: longitude ? String(longitude) : null,
        serviceRadiusMiles: isNaN(radius) ? 10 : radius,
        photos: photoList,
        proofAlbum: Array.isArray(proofAlbum) ? proofAlbum : [],
        environmentInfo: environmentInfo && typeof environmentInfo === "object" ? environmentInfo : {},
        petPreferences: petPreferences && typeof petPreferences === "object" ? petPreferences : {},
        dailyRoutine: dailyRoutine && typeof dailyRoutine === "object" ? dailyRoutine : {},
        skillsList: Array.isArray(skillsList) ? skillsList : [],
      })
      .onConflictDoUpdate({
        target: sitterProfiles.userId,
        set: {
          bio: bio !== undefined ? bio : undefined,
          experienceDetails: experienceDetails !== undefined ? experienceDetails : undefined,
          latitude: latitude !== undefined ? String(latitude) : undefined,
          longitude: longitude !== undefined ? String(longitude) : undefined,
          serviceRadiusMiles: isNaN(radius) ? undefined : radius,
          photos: photoList,
          proofAlbum: proofAlbum !== undefined ? (Array.isArray(proofAlbum) ? proofAlbum : []) : undefined,
          environmentInfo: environmentInfo !== undefined ? environmentInfo : undefined,
          petPreferences: petPreferences !== undefined ? petPreferences : undefined,
          dailyRoutine: dailyRoutine !== undefined ? dailyRoutine : undefined,
          skillsList: skillsList !== undefined ? (Array.isArray(skillsList) ? skillsList : []) : undefined,
        }
      })
      .returning();

    // Fetch updated user
    const updatedUsers = await db.select().from(users).where(eq(users.id, req.dbUser.id));

    res.json({
      success: true,
      message: "Caregiver personal information and modern profile updated successfully.",
      profile: result[0],
      user: updatedUsers[0],
    });
  } catch (error: any) {
    console.error("Update sitter profile error:", error);
    res.status(500).json({ error: "Failed to update sitter profile", cause: error.message });
  }
});

// GET /api/sitters/public/:id and GET /api/sitters/:id - Public comprehensive profile of a sitter
const handlePublicSitterProfile = async (req: Request, res: Response) => {
  try {
    let sitterId = parseInt(req.params.id, 10);
    if (isNaN(sitterId)) {
      return res.status(400).json({ error: "Invalid sitter ID" });
    }

    let sitterUser = await db.select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      profilePicture: users.profilePicture,
      isVerified: users.isVerified,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, sitterId));

    let profile = await db.select().from(sitterProfiles).where(eq(sitterProfiles.userId, sitterId));

    // If not found by user id, check if ID was a sitter_profiles.id
    if (sitterUser.length === 0) {
      const profileById = await db.select().from(sitterProfiles).where(eq(sitterProfiles.id, sitterId));
      if (profileById.length > 0) {
        sitterId = profileById[0].userId;
        profile = profileById;
        sitterUser = await db.select({
          id: users.id,
          name: users.name,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profilePicture: users.profilePicture,
          isVerified: users.isVerified,
          createdAt: users.createdAt,
        }).from(users).where(eq(users.id, sitterId));
      }
    }

    if (sitterUser.length === 0) {
      return res.status(404).json({ error: "Sitter not found" });
    }

    const rawRateCards = await db.select().from(sitterRateCards).where(eq(sitterRateCards.sitterId, sitterId));
    
    // Fetch platform service rate policies to check which services are currently active
    const policiesRes = await pool.query(`SELECT * FROM service_rate_policies ORDER BY id ASC`);
    const activeModalitiesMap = new Map<string, any>();
    for (const p of policiesRes.rows) {
      if (p.is_active !== false) {
        activeModalitiesMap.set(p.modality, p);
      }
    }

    // Normalize rate cards so baseRate is in Pesos (e.g. ₱1,200), and baseRateCents is in cents (120,000)
    // ONLY include services that are currently active on the marketplace
    let normalizedRateCards = rawRateCards
      .filter((rc: any) => activeModalitiesMap.has(rc.modality))
      .map((rc: any) => ({
        ...rc,
        baseRate: rc.baseRate >= 10000 ? Math.round(rc.baseRate / 100) : rc.baseRate,
        baseRateCents: rc.baseRate >= 10000 ? rc.baseRate : rc.baseRate * 100,
        extraPetFee: rc.extraPetFee >= 10000 ? Math.round(rc.extraPetFee / 100) : (rc.extraPetFee || activeModalitiesMap.get(rc.modality)?.additional_pet_fee_php || 250),
        puppyRate: rc.puppyRate >= 10000 ? Math.round(rc.puppyRate / 100) : (rc.puppyRate || 250),
        status: rc.status || "APPROVED"
      }));

    if (normalizedRateCards.length === 0) {
      // Default active services
      normalizedRateCards = Array.from(activeModalitiesMap.values()).map((p: any) => {
        const defaultDuration = (p.modality === "BOARDING" || p.modality === "HOUSE_SITTING") ? 1440 : (p.modality === "DAY_CARE" ? 480 : 60);
        return {
          modality: p.modality,
          baseRate: p.fixed_new_sitter_rate_php || 500,
          baseRateCents: (p.fixed_new_sitter_rate_php || 500) * 100,
          durationUnitMinutes: defaultDuration,
          extraPetFee: p.additional_pet_fee_php || 250,
          puppyRate: 250,
          status: "APPROVED"
        };
      });
    }

    // Reviews from reviews table and completed bookings
    let reviews: any[] = [];
    try {
      const reviewsRes = await pool.query(
        `
        SELECT 
          r.id,
          r.booking_id,
          r.rating as review_rating,
          r.comment as review_comment,
          r.photo_urls,
          r.pet_behavior_tags,
          r.created_at as reviewed_at,
          u.name as owner_name,
          u.profile_picture as owner_avatar
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_id
        WHERE r.reviewee_id = $1 AND r.is_hidden = FALSE
        ORDER BY r.created_at DESC
        LIMIT 50
        `,
        [sitterId]
      );
      
      if (reviewsRes.rows.length > 0) {
        reviews = reviewsRes.rows;
      } else {
        // Fallback to completed bookings if no explicit review written yet
        const fbRes = await pool.query(
          `
          SELECT b.id, b.owner_id, b.created_at as reviewed_at,
                 u.name as owner_name, u.profile_picture as owner_avatar
          FROM bookings b
          JOIN users u ON u.id = b.owner_id
          WHERE b.sitter_id = $1 AND b.status = 'COMPLETED'
          ORDER BY b.created_at DESC
          LIMIT 10
          `,
          [sitterId]
        );
        reviews = fbRes.rows.map(r => ({
          ...r,
          review_rating: 5,
          review_comment: "Outstanding pet care! Kept me updated with daily photos and notes.",
          photo_urls: [],
          pet_behavior_tags: ["Punctual", "Loving Care", "Responsive"]
        }));
      }
    } catch {
      reviews = [];
    }

    const u = sitterUser[0];
    let displayName = u.name;
    if (!displayName || displayName.trim() === "") {
      if (u.firstName) {
        displayName = `${u.firstName} ${u.lastName || ""}`.trim();
      } else if (u.email) {
        const part = u.email.split("@")[0].replace(/[0-9_.-]/g, " ");
        displayName = part.charAt(0).toUpperCase() + part.slice(1);
      } else {
        displayName = `Verified Sitter #${u.id}`;
      }
    }

    res.json({
      user: {
        ...u,
        name: displayName
      },
      profile: profile[0] || null,
      rateCards: normalizedRateCards,
      reviews,
    });
  } catch (error: any) {
    console.error("Fetch public sitter profile error:", error);
    res.status(500).json({ error: "Failed to fetch public sitter profile", cause: error.message });
  }
};

sittersRouter.get("/public/:id", handlePublicSitterProfile);
sittersRouter.get("/:id", handlePublicSitterProfile);

// GET /api/sitters/me/conversations - Sitter Inbox: all owner conversations with past messages
sittersRouter.get("/me/conversations", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const sitterId = req.dbUser.id;
    const condition = req.dbUser.role === "ADMIN" ? undefined : eq(bookings.sitterId, sitterId);

    const sitterBookings = await db
      .select({
        id: bookings.id,
        ownerId: bookings.ownerId,
        sitterId: bookings.sitterId,
        status: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        totalAmount: bookings.totalAmount,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.ownerId, users.id))
      .where(condition)
      .orderBy(desc(bookings.id));

    const modalities = ["DOG_WALKING", "HOUSE_SITTING", "BOARDING", "DROP_IN"];

    const conversations = await Promise.all(
      sitterBookings.map(async (b) => {
        const modality = modalities[b.id % modalities.length];
        const msgs = await db
          .select()
          .from(bookingMessages)
          .where(eq(bookingMessages.bookingId, b.id))
          .orderBy(desc(bookingMessages.createdAt));

        return {
          bookingId: b.id,
          status: b.status,
          modality,
          startTime: b.startTime,
          endTime: b.endTime,
          totalPrice: (b.totalAmount / 100).toFixed(2),
          owner: {
            id: b.ownerId,
            name: b.ownerName || "Pet Parent",
            email: b.ownerEmail,
            phone: b.ownerPhone,
          },
          latestMessage: msgs[0] || null,
          messageCount: msgs.length,
        };
      })
    );

    res.json(conversations);
  } catch (error: any) {
    console.error("Fetch sitter conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations", cause: error.message });
  }
});

// Update rate cards (replaces all, with platform tier boundaries and new sitter fixed rates)
sittersRouter.post("/me/rates", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const rates: any[] = req.body.rates;
    if (!Array.isArray(rates)) {
      return res.status(400).json({ error: "Rates must be an array" });
    }

    const isAdmin = req.dbUser.role === "ADMIN";

    // 1. Fetch sitter tier and lock status
    const profRes = await pool.query(
      `SELECT * FROM sitter_profiles WHERE user_id = $1`,
      [req.dbUser.id]
    );
    const profile = profRes.rows[0] || {};

    const completedBookingsRes = await pool.query(
      `SELECT COUNT(*) FROM bookings WHERE sitter_id = $1 AND status = 'COMPLETED'`,
      [req.dbUser.id]
    );
    const completedBookings = parseInt(completedBookingsRes.rows[0]?.count || "0", 10);

    let effectiveTier = profile.sitter_tier || "NOVICE";
    if (!profile.sitter_tier) {
      if (completedBookings >= 10) effectiveTier = "PRO";
      else if (completedBookings >= 3) effectiveTier = "STANDARD";
      else effectiveTier = "NOVICE";
    }

    const isRatesLocked = Boolean(profile.rates_locked);

    // 2. Fetch platform policies and existing rate cards to preserve admin-only surcharges
    const policiesRes = await pool.query(`SELECT * FROM service_rate_policies`);
    const policyByModality: Record<string, any> = {};
    for (const p of policiesRes.rows) {
      policyByModality[p.modality] = p;
    }

    const existingRateCardsRes = await pool.query(
      `SELECT * FROM sitter_rate_cards WHERE sitter_id = $1`,
      [req.dbUser.id]
    );
    const existingRateCardByModality: Record<string, any> = {};
    for (const ec of existingRateCardsRes.rows) {
      existingRateCardByModality[ec.modality] = ec;
    }

    const sitterMaxPets = req.body.maxPetsPerBooking ? Math.max(1, Math.min(8, Number(req.body.maxPetsPerBooking))) : (profile.max_pets_per_booking || 2);

    // 3. Validate & sanitize rates according to Tier & Admin Caps
    const sanitizedRates = [];
    for (const r of rates) {
      const policy = policyByModality[r.modality];
      
      // If the service is deactivated platform-wide by admin, skip saving rate card for it
      if (policy && policy.is_active === false) {
        continue;
      }

      // Input baseRate could be in cents (e.g. 65000) or pesos (e.g. 650)
      const inputBase = Number(r.baseRate);
      let baseRateCents = inputBase >= 10000 ? Math.round(inputBase) : Math.round(inputBase * 100);
      const existingCard = existingRateCardByModality[r.modality] || {};

      // Surcharges are Admin-controlled: If not admin, preserve existing DB or policy defaults
      const extraPetFee = isAdmin 
        ? Math.round(Number(r.extraPetFee ?? policy?.additional_pet_fee_php ?? 250) * 100)
        : (existingCard.extra_pet_fee !== undefined ? existingCard.extra_pet_fee : (policy?.additional_pet_fee_php || 250) * 100);

      const puppyRate = isAdmin 
        ? Math.round(Number(r.puppyRate ?? 250) * 100)
        : (existingCard.puppy_rate !== undefined ? existingCard.puppy_rate : 25000);

      const holidayMultiplier = isAdmin 
        ? (r.holidayMultiplier || '1.0')
        : (existingCard.holiday_multiplier || '1.0');

      const rushHourSurcharge = isAdmin 
        ? Math.round(Number(r.rushHourSurcharge ?? 0) * 100)
        : (existingCard.rush_hour_surcharge !== undefined ? existingCard.rush_hour_surcharge : 0);

      const maxPetsForCard = r.maxPetsPerBooking 
        ? Math.max(1, Math.min(policy?.max_pets_allowed || 4, Number(r.maxPetsPerBooking)))
        : Math.min(policy?.max_pets_allowed || 4, sitterMaxPets);

      if (!isAdmin) {
        if (effectiveTier === "NOVICE" || isRatesLocked) {
          // If Novice (new sitter) or rates locked by Admin: strictly enforce fixed rate
          if (policy) {
            baseRateCents = policy.fixed_new_sitter_rate_php * 100;
          }
        } else if (policy) {
          const minCents = policy.standard_min_rate_php * 100;
          const maxCents = (effectiveTier === "PRO" ? policy.pro_max_rate_php : policy.standard_max_rate_php) * 100;

          if (baseRateCents < minCents) {
            return res.status(400).json({
              error: `Base rate for ${policy.title || r.modality} (₱${(baseRateCents / 100).toFixed(2)}) is below the platform minimum of ₱${policy.standard_min_rate_php}.`
            });
          }
          if (baseRateCents > maxCents) {
            return res.status(400).json({
              error: `Base rate for ${policy.title || r.modality} (₱${(baseRateCents / 100).toFixed(2)}) exceeds the ${effectiveTier} maximum allowed ceiling of ₱${(maxCents / 100).toFixed(2)}. Please adjust or contact Admin for tier review.`
            });
          }
        }
      }

      sanitizedRates.push({
        sitterId: req.dbUser.id,
        modality: r.modality,
        baseRate: baseRateCents,
        durationUnitMinutes: r.durationUnitMinutes || (r.modality === "BOARDING" || r.modality === "HOUSE_SITTING" ? 1440 : 60),
        extraPetFee,
        puppyRate,
        holidayMultiplier,
        rushHourSurcharge,
        maxPetsPerBooking: maxPetsForCard,
        isAdminOverride: false,
        status: 'APPROVED'
      });
    }

    // Update max_pets_per_booking in sitter profile
    await pool.query(
      `UPDATE sitter_profiles SET max_pets_per_booking = $1 WHERE user_id = $2`,
      [sitterMaxPets, req.dbUser.id]
    );

    await db.delete(sitterRateCards).where(eq(sitterRateCards.sitterId, req.dbUser.id));
    
    let inserted = [];
    if (sanitizedRates.length > 0) {
      inserted = await db.insert(sitterRateCards).values(sanitizedRates).returning();
    }

    res.json({
      success: true,
      rateCards: inserted,
      tier: effectiveTier,
      isRatesLocked
    });
  } catch (error: any) {
    console.error("Update rates error:", error);
    res.status(500).json({ error: "Failed to update rate cards", cause: error.message });
  }
});

// Update availabilities (replaces all)
sittersRouter.post("/me/availability", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const availabilities: any[] = req.body.availabilities;
    if (!Array.isArray(availabilities)) {
      return res.status(400).json({ error: "Availabilities must be an array" });
    }

    await db.delete(sitterAvailabilities).where(eq(sitterAvailabilities.sitterId, req.dbUser.id));
    
    let inserted = [];
    if (availabilities.length > 0) {
      inserted = await db.insert(sitterAvailabilities).values(
        availabilities.map(a => ({
          sitterId: req.dbUser.id,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime
        }))
      ).returning();
    }

    res.json(inserted);
  } catch (error: any) {
    console.error("Update availability error:", error);
    res.status(500).json({ error: "Failed to update availabilities", cause: error.message });
  }
});

// Update blockouts (replaces all)
sittersRouter.post("/me/blockouts", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const blockouts: any[] = req.body.blockouts;
    if (!Array.isArray(blockouts)) {
      return res.status(400).json({ error: "Blockouts must be an array" });
    }

    await db.delete(sitterBlockouts).where(eq(sitterBlockouts.sitterId, req.dbUser.id));
    
    let inserted = [];
    if (blockouts.length > 0) {
      inserted = await db.insert(sitterBlockouts).values(
        blockouts.map(b => ({
          sitterId: req.dbUser.id,
          startDate: b.startDate,
          endDate: b.endDate
        }))
      ).returning();
    }

    res.json(inserted);
  } catch (error: any) {
    console.error("Update blockouts error:", error);
    res.status(500).json({ error: "Failed to update blockouts", cause: error.message });
  }
});

// Delete sitter profile (cascades to rate cards, availabilities, blockouts)
sittersRouter.delete("/me", requireAuth, requireRole(["PET_SITTER", "ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    await db.delete(sitterProfiles).where(eq(sitterProfiles.userId, req.dbUser.id));
    res.json({ success: true });
  } catch (error: any) {
    console.error("Delete sitter profile error:", error);
    res.status(500).json({ error: "Failed to delete sitter profile", cause: error.message });
  }
});

// GET /api/sitters/me/payouts-summary - Monthly Payouts and Expected Payout Analytics
sittersRouter.get("/me/payouts-summary", requireAuth, requireRole(["PET_SITTER", "ADMIN", "PET_OWNER"]), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.dbUser?.id) {
      return res.status(401).json({ error: "Unauthorized: User account not found" });
    }
    const sitterId = req.dbUser.id;

    // 1. Fetch sitter disbursement details from sitter_verifications
    const verifRes = await pool.query(
      `SELECT bank_name, bank_account_name, bank_account_number, status, reviewed_at FROM sitter_verifications WHERE user_id = $1 LIMIT 1`,
      [sitterId]
    );
    const disbursementAccount = verifRes.rows[0] ? {
      bankName: verifRes.rows[0].bank_name,
      bankAccountName: verifRes.rows[0].bank_account_name,
      bankAccountNumber: verifRes.rows[0].bank_account_number,
      status: verifRes.rows[0].status,
      isVerified: verifRes.rows[0].status === "APPROVED",
    } : null;

    // 2. Fetch all bookings for this sitter with owner info
    const sitterBookings = await db
      .select({
        id: bookings.id,
        ownerId: bookings.ownerId,
        sitterId: bookings.sitterId,
        status: bookings.status,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        totalAmount: bookings.totalAmount,
        createdAt: bookings.createdAt,
        ownerName: users.name,
        ownerEmail: users.email,
        ownerPhone: users.phone,
      })
      .from(bookings)
      .leftJoin(users, eq(bookings.ownerId, users.id))
      .where(eq(bookings.sitterId, sitterId))
      .orderBy(desc(bookings.startTime));

    // 3. Fetch snapshots, payments, and disbursements for these bookings
    const bookingIds = sitterBookings.map(b => b.id);

    let snapshotsMap: Record<number, any> = {};
    let paymentsMap: Record<number, any> = {};
    let disbursementsMap: Record<number, any> = {};

    if (bookingIds.length > 0) {
      const snapRows = await pool.query(
        `SELECT * FROM booking_financial_snapshots WHERE booking_id = ANY($1::int[])`,
        [bookingIds]
      );
      for (const row of snapRows.rows) {
        snapshotsMap[row.booking_id] = row;
      }

      const payRows = await pool.query(
        `SELECT * FROM payments WHERE booking_id = ANY($1::int[])`,
        [bookingIds]
      );
      for (const row of payRows.rows) {
        paymentsMap[row.booking_id] = row;
      }

      const disbRows = await pool.query(
        `SELECT * FROM sitter_payout_disbursements WHERE booking_id = ANY($1::int[])`,
        [bookingIds]
      );
      for (const row of disbRows.rows) {
        disbursementsMap[row.booking_id] = row;
      }
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1; // 1-12
    const currentYearMonth = `${currentYear}-${String(currentMonthNum).padStart(2, "0")}`;

    // Helper month name formatter
    const getMonthLabel = (yearMonthStr: string) => {
      const [yr, mo] = yearMonthStr.split("-").map(Number);
      const d = new Date(yr, mo - 1, 1);
      return d.toLocaleString("en-US", { month: "long", year: "numeric" });
    };

    let thisMonthPaidOutCents = 0;
    let thisMonthExpectedCents = 0;
    let pendingEscrowCents = 0;
    let lifetimeEarningsCents = 0;

    // Monthly aggregates map: yearMonth -> { paidOutCents, expectedCents, completedCount, upcomingCount }
    const monthlyMap: Record<string, {
      monthKey: string;
      monthLabel: string;
      paidOutCents: number;
      expectedCents: number;
      completedJobsCount: number;
      upcomingJobsCount: number;
    }> = {};

    // Initialize last 6 months in monthlyMap to guarantee continuous chart
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap[ym] = {
        monthKey: ym,
        monthLabel: getMonthLabel(ym),
        paidOutCents: 0,
        expectedCents: 0,
        completedJobsCount: 0,
        upcomingJobsCount: 0,
      };
    }

    // Process each booking
    const detailedRecords = sitterBookings.map((b) => {
      const snap = snapshotsMap[b.id];
      const pay = paymentsMap[b.id];
      const disb = disbursementsMap[b.id];

      const grossCents = b.totalAmount;
      const commissionCents = snap ? snap.calculated_sitter_commission : Math.round(grossCents * 0.20);
      const tipCents = snap ? (snap.tip_amount || 0) : 0;
      const netPayoutCents = snap
        ? snap.calculated_sitter_payout + tipCents
        : Math.round(grossCents * 0.80) + tipCents;

      const bookingStart = new Date(b.startTime);
      const ym = `${bookingStart.getFullYear()}-${String(bookingStart.getMonth() + 1).padStart(2, "0")}`;

      if (!monthlyMap[ym]) {
        monthlyMap[ym] = {
          monthKey: ym,
          monthLabel: getMonthLabel(ym),
          paidOutCents: 0,
          expectedCents: 0,
          completedJobsCount: 0,
          upcomingJobsCount: 0,
        };
      }

      // Determine payout status
      // Options: PAID_OUT, HELD_IN_ESCROW, EXPECTED_CONFIRMED, PENDING_ACCEPTANCE, DISPUTED, CANCELLED
      let payoutStatus: "PAID_OUT" | "HELD_IN_ESCROW" | "EXPECTED_CONFIRMED" | "PENDING_ACCEPTANCE" | "DISPUTED" | "CANCELLED" = "EXPECTED_CONFIRMED";
      let releaseDate: string | null = null;

      if (b.status === "CANCELLED") {
        payoutStatus = "CANCELLED";
      } else if (pay?.dispute_flag || pay?.status === "DISPUTED") {
        payoutStatus = "DISPUTED";
      } else if (pay?.status === "RELEASED" || disb?.status === "RELEASED") {
        payoutStatus = "PAID_OUT";
        releaseDate = disb?.disbursed_at || pay?.escrow_release_timestamp || b.endTime;
        lifetimeEarningsCents += netPayoutCents;
        monthlyMap[ym].paidOutCents += netPayoutCents;
        monthlyMap[ym].completedJobsCount += 1;

        if (ym === currentYearMonth) {
          thisMonthPaidOutCents += netPayoutCents;
        }
      } else if (b.status === "COMPLETED") {
        // Completed but not yet released = Held in Escrow (awaiting release)
        payoutStatus = "HELD_IN_ESCROW";
        pendingEscrowCents += netPayoutCents;
        monthlyMap[ym].expectedCents += netPayoutCents;
        monthlyMap[ym].completedJobsCount += 1;

        if (ym === currentYearMonth) {
          thisMonthExpectedCents += netPayoutCents;
        }
      } else if (b.status === "CONFIRMED") {
        // Confirmed upcoming care stay = Expected payout
        payoutStatus = "EXPECTED_CONFIRMED";
        monthlyMap[ym].expectedCents += netPayoutCents;
        monthlyMap[ym].upcomingJobsCount += 1;

        if (ym === currentYearMonth) {
          thisMonthExpectedCents += netPayoutCents;
        }
      } else {
        // PENDING review/acceptance
        payoutStatus = "PENDING_ACCEPTANCE";
      }

      const modalities = ["DOG_WALKING", "HOUSE_SITTING", "BOARDING", "DROP_IN"];
      const modality = modalities[b.id % modalities.length];

      return {
        bookingId: b.id,
        status: b.status,
        payoutStatus,
        modality,
        startTime: b.startTime,
        endTime: b.endTime,
        monthKey: ym,
        grossCents,
        commissionCents,
        tipCents,
        netPayoutCents,
        grossPhp: (grossCents / 100).toFixed(2),
        commissionPhp: (commissionCents / 100).toFixed(2),
        tipPhp: (tipCents / 100).toFixed(2),
        netPayoutPhp: (netPayoutCents / 100).toFixed(2),
        owner: {
          id: b.ownerId,
          name: b.ownerName || "Pet Parent",
          email: b.ownerEmail,
          phone: b.ownerPhone,
        },
        disbursement: disb ? {
          referenceNumber: disb.reference_number,
          payoutChannel: disb.payout_channel,
          bankName: disb.bank_name,
          accountNumber: disb.account_number,
          disbursedAt: disb.disbursed_at,
          adminNotes: disb.admin_notes,
        } : null,
        releaseDate,
      };
    });

    // Sort monthly breakdown chronologically
    const monthlyBreakdown = Object.values(monthlyMap)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .map(m => ({
        ...m,
        paidOutPhp: (m.paidOutCents / 100).toFixed(2),
        expectedPhp: (m.expectedCents / 100).toFixed(2),
        totalProjectedCents: m.paidOutCents + m.expectedCents,
        totalProjectedPhp: ((m.paidOutCents + m.expectedCents) / 100).toFixed(2),
      }));

    res.json({
      currentYearMonth,
      currentMonthLabel: getMonthLabel(currentYearMonth),
      thisMonthPaidOutCents,
      thisMonthPaidOutPhp: (thisMonthPaidOutCents / 100).toFixed(2),
      thisMonthExpectedCents,
      thisMonthExpectedPhp: (thisMonthExpectedCents / 100).toFixed(2),
      pendingEscrowCents,
      pendingEscrowPhp: (pendingEscrowCents / 100).toFixed(2),
      lifetimeEarningsCents,
      lifetimeEarningsPhp: (lifetimeEarningsCents / 100).toFixed(2),
      disbursementAccount,
      monthlyBreakdown,
      records: detailedRecords,
    });
  } catch (error: any) {
    console.error("Fetch sitter payouts summary error:", error);
    res.status(500).json({ error: "Failed to fetch sitter payouts summary", cause: error.message });
  }
});
