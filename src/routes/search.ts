import { Router, type Request, type Response } from "express";
import { pool } from "../db/index.ts";

export const searchRouter = Router();

// GET /api/search/services - Returns all marketplace care services and their active status
searchRouter.get("/services", async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, modality, title, fixed_new_sitter_rate_php, standard_min_rate_php, 
              standard_max_rate_php, pro_max_rate_php, max_extra_pet_fee_php, 
              max_puppy_rate_php, max_medication_surcharge_php, max_holiday_multiplier, 
              is_active, max_pets_allowed, additional_pet_fee_php
       FROM service_rate_policies
       ORDER BY id ASC`
    );
    res.json({ services: rows });
  } catch (error: any) {
    console.error("Fetch marketplace services error:", error);
    res.status(500).json({ error: "Failed to fetch services", cause: error.message });
  }
});

searchRouter.get("/sitters", async (req: Request, res: Response) => {
  try {
    const { 
      lat, 
      lng, 
      radiusMiles, 
      modality, 
      date, 
      minRating, 
      minPrice, 
      maxPrice, 
      strictDistance,
      limit = 20, 
      offset = 0 
    } = req.query;

    // Fetch active service policies from platform administration
    const policiesRes = await pool.query(
      `SELECT modality, title, is_active, fixed_new_sitter_rate_php, standard_min_rate_php, standard_max_rate_php, additional_pet_fee_php
       FROM service_rate_policies`
    );
    
    const activePolicies = policiesRes.rows.filter((p: any) => p.is_active !== false);
    const activeModalitiesSet = new Set<string>(activePolicies.map((p: any) => p.modality));

    // If user searched for a specific modality that has been disabled by Admin, return empty results immediately
    if (modality && !activeModalitiesSet.has(modality as string)) {
      return res.json([]);
    }

    const queryLimit = parseInt(limit as string, 10) || 20;
    const queryOffset = parseInt(offset as string, 10) || 0;
    const reqLat = parseFloat(lat as string);
    const reqLng = parseFloat(lng as string);
    const reqRadius = parseFloat(radiusMiles as string) || 25;
    const reqMinRating = parseFloat(minRating as string) || 0;
    const isStrictDistance = strictDistance === "true";

    // Rates in DB are in cents (e.g. ₱350 = 35,000 cents, ₱650 = 65,000 cents)
    const parsedMinPrice = minPrice ? parseInt(minPrice as string, 10) * 100 : null;
    const parsedMaxPrice = maxPrice ? parseInt(maxPrice as string, 10) * 100 : null;

    const hasValidCoords = !isNaN(reqLat) && !isNaN(reqLng);

    let params: any[] = [];
    let sql = "";

    if (hasValidCoords) {
      params = [reqLat, reqLng, reqMinRating];
      sql = `
        WITH SitterDistances AS (
          SELECT 
            sp.id as profile_id,
            sp.user_id,
            sp.bio,
            sp.latitude,
            sp.longitude,
            sp.service_radius_miles,
            sp.rating,
            sp.photos,
            u.email,
            u.name,
            u.first_name,
            u.last_name,
            u.profile_picture,
            u.is_verified,
            CASE 
              WHEN sp.latitude IS NOT NULL AND sp.longitude IS NOT NULL
              THEN ( 3959 * acos( LEAST(1.0, GREATEST(-1.0, 
                      cos( radians($1) ) * cos( radians( CAST(sp.latitude AS float) ) ) 
                      * cos( radians( CAST(sp.longitude AS float) ) - radians($2) ) 
                      + sin( radians($1) ) * sin( radians( CAST(sp.latitude AS float) ) ) 
                   )) ) )
              ELSE NULL 
            END AS distance
          FROM sitter_profiles sp
          JOIN users u ON sp.user_id = u.id
          WHERE (u.role = 'PET_SITTER' OR sp.id IS NOT NULL)
            AND COALESCE(sp.rating, 0) >= $3
        )
        SELECT * FROM SitterDistances
        WHERE 1=1
      `;

      if (isStrictDistance) {
        params.push(reqRadius);
        sql += ` AND distance IS NOT NULL AND distance <= $${params.length}`;
      }
    } else {
      params = [reqMinRating];
      sql = `
        SELECT 
          sp.id as profile_id,
          sp.user_id,
          sp.bio,
          sp.latitude,
          sp.longitude,
          sp.service_radius_miles,
          sp.rating,
          sp.photos,
          u.email,
          u.name,
          u.first_name,
          u.last_name,
          u.profile_picture,
          u.is_verified,
          NULL::float AS distance
        FROM sitter_profiles sp
        JOIN users u ON sp.user_id = u.id
        WHERE (u.role = 'PET_SITTER' OR sp.id IS NOT NULL)
          AND COALESCE(sp.rating, 0) >= $1
      `;
    }

    if (modality || parsedMinPrice || parsedMaxPrice) {
      sql += ` AND user_id IN (
        SELECT src.sitter_id FROM sitter_rate_cards src 
        WHERE 1=1
      `;
      if (modality) {
        params.push(modality);
        sql += ` AND src.modality = $${params.length}`;
      }
      if (parsedMinPrice) {
        params.push(parsedMinPrice);
        sql += ` AND src.base_rate >= $${params.length}`;
      }
      if (parsedMaxPrice) {
        params.push(parsedMaxPrice);
        sql += ` AND src.base_rate <= $${params.length}`;
      }
      sql += `)`;
    }

    if (date) {
      params.push(date);
      sql += `
        AND user_id NOT IN (
          SELECT sb.sitter_id FROM sitter_blockouts sb
          WHERE sb.start_date <= $${params.length} AND sb.end_date >= $${params.length}
        )
      `;
    }

    if (hasValidCoords) {
      params.push(queryLimit, queryOffset);
      sql += ` ORDER BY (distance IS NULL), distance ASC, rating DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`;
    } else {
      params.push(queryLimit, queryOffset);
      sql += ` ORDER BY rating DESC NULLS LAST, profile_id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;
    }

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.json([]);
    }

    // Fetch rate cards for all sitters found to display real services & rates
    const userIds = rows.map((r: any) => r.user_id);
    const ratesRes = await pool.query(
      `SELECT sitter_id, modality, base_rate, duration_unit_minutes, extra_pet_fee, puppy_rate, status
       FROM sitter_rate_cards 
       WHERE sitter_id = ANY($1)`,
      [userIds]
    );

    const ratesBySitter = new Map<number, any[]>();
    for (const rc of ratesRes.rows) {
      // ONLY include rate card if this modality is currently active on the platform
      if (!activeModalitiesSet.has(rc.modality)) {
        continue;
      }

      const list = ratesBySitter.get(rc.sitter_id) || [];
      const basePhp = rc.base_rate >= 10000 ? Math.round(rc.base_rate / 100) : rc.base_rate;
      const extraFeePhp = rc.extra_pet_fee >= 10000 ? Math.round(rc.extra_pet_fee / 100) : (rc.extra_pet_fee || 250);
      const puppyPhp = rc.puppy_rate >= 10000 ? Math.round(rc.puppy_rate / 100) : (rc.puppy_rate || 250);

      list.push({
        modality: rc.modality,
        baseRate: basePhp,
        baseRateCents: rc.base_rate >= 10000 ? rc.base_rate : rc.base_rate * 100,
        durationUnitMinutes: rc.duration_unit_minutes,
        extraPetFee: extraFeePhp,
        puppyRate: puppyPhp,
        status: rc.status || "ACTIVE",
      });
      ratesBySitter.set(rc.sitter_id, list);
    }

    // Standard fallback default rates for active modalities only
    const defaultActiveRates = activePolicies.map((p: any) => {
      const defaultDuration = (p.modality === "BOARDING" || p.modality === "HOUSE_SITTING") ? 1440 : (p.modality === "DAY_CARE" ? 480 : 60);
      return {
        modality: p.modality,
        baseRate: p.fixed_new_sitter_rate_php || 500,
        baseRateCents: (p.fixed_new_sitter_rate_php || 500) * 100,
        durationUnitMinutes: defaultDuration,
        extraPetFee: p.additional_pet_fee_php || 250,
        puppyRate: 250,
        status: "ACTIVE"
      };
    });

    // Enhance each row with non-null display name, active rate cards, and current rate
    const enrichedRows = rows
      .map((r: any) => {
        let sitterRates = ratesBySitter.get(r.user_id) || [];
        if (sitterRates.length === 0) {
          sitterRates = [...defaultActiveRates];
        }

        // Filter to ensure only active modalities exist in sitter's services
        sitterRates = sitterRates.filter((sr: any) => activeModalitiesSet.has(sr.modality));

        if (sitterRates.length === 0) {
          return null;
        }

        const matchedRate = modality 
          ? sitterRates.find((sr: any) => sr.modality === modality) 
          : sitterRates[0];

        if (modality && !matchedRate) {
          return null;
        }

        const rateInPhp = matchedRate ? matchedRate.baseRate : (sitterRates[0]?.baseRate || 650);

        let displayName = r.name;
        if (!displayName || displayName.trim() === "") {
          if (r.first_name) {
            displayName = `${r.first_name} ${r.last_name || ""}`.trim();
          } else if (r.email) {
            const part = r.email.split("@")[0].replace(/[0-9_.-]/g, " ");
            displayName = part.charAt(0).toUpperCase() + part.slice(1);
          } else {
            displayName = `Verified Sitter #${r.user_id}`;
          }
        }

        return {
          ...r,
          id: r.user_id, // Normalize to user_id so links route to real sitter ID
          name: displayName,
          profile_picture: r.profile_picture,
          profilePicture: r.profile_picture,
          rate: rateInPhp,
          rateCards: sitterRates,
          services: sitterRates.map((s: any) => s.modality),
        };
      })
      .filter(Boolean);

    res.json(enrichedRows);
  } catch (error: any) {
    console.error("Search sitters error:", error);
    res.status(500).json({ error: "Failed to search sitters", cause: error.message });
  }
});

