import { db } from "../db/index.ts";
import {
  sitterRateCards,
  platformFeeConfigs,
  pets,
  bookingFinancialSnapshots,
  serviceModalityEnum,
  serviceRatePolicies,
  sitterProfiles
} from "../db/schema.ts";
import { eq, inArray, desc } from "drizzle-orm";

export interface QuoteRequest {
  sitterId: number;
  modality: typeof serviceModalityEnum.enumValues[number];
  startTime: Date;
  endTime: Date;
  petIds: number[];
  isHoliday?: boolean; // Flag driven by calendar service/request
  isRushHour?: boolean; // Flag driven by calendar service/request
}
export const QuoteRequest = {};

export interface QuoteResponse {
  petCapacity: {
    maxAllowed: number;
    requestedCount: number;
    exceedsCapacity: boolean;
    policyLimit: number;
  };
  baseCalculation: {
    blocks: number;
    baseRate: number;
    subtotal: number;
  };
  surcharges: {
    extraPetsCount: number;
    extraPetFee: number;
    puppyCount: number;
    puppyRate: number;
    medicationCount: number;
    medicationSurcharge: number;
    surchargesSubtotal: number;
  };
  modifiers: {
    holidayMultiplier: number;
    rushHourSurcharge: number;
    modifiersSubtotal: number;
  };
  totals: {
    calculatedBaseTotal: number;
    calculatedOwnerFee: number;
    calculatedSitterCommission: number;
    calculatedSitterPayout: number;
    calculatedTotalOwnerCharge: number;
    calculatedNetPlatformRevenue: number;
  };
  appliedRates: {
    baseRateApplied: number;
    durationUnitMinutesApplied: number;
    extraPetFeeApplied: number;
    puppyRateApplied: number;
    medicationSurchargeApplied: number;
    holidayMultiplierApplied: string;
    rushHourSurchargeApplied: number;
    platformOwnerFeePercentageApplied: string;
    platformSitterCommissionPercentageApplied: string;
    ownerFeeCapApplied: number | null;
    fixedTransactionFeeApplied: number;
  }
}

export class PricingEngine {
  /**
   * Generates a dynamic pricing quote based on sitter rates, pets, and platform fees.
   */
  static async calculateQuote(request: QuoteRequest): Promise<QuoteResponse> {
    const { sitterId, modality, startTime, endTime, petIds, isHoliday, isRushHour } = request;

    if (endTime <= startTime) {
      throw new Error("End time must be after start time");
    }

    // 1. Fetch Sitter Rate Card with fallback
    const rates = await db.select().from(sitterRateCards)
      .where(eq(sitterRateCards.sitterId, sitterId));
    const activeRate = rates.find(r => r.modality === modality);

    // Fetch policy for modality to get admin-controlled additional pet fee and max pets allowed
    const policies = await db.select().from(serviceRatePolicies).where(eq(serviceRatePolicies.modality, modality));
    const policy = policies.length > 0 ? policies[0] : null;

    if (policy && policy.isActive === false) {
      throw new Error(`The service '${policy.title || modality}' is currently paused/disabled on the marketplace by platform administrators.`);
    }

    // Fetch sitter profile for capacity
    const profiles = await db.select().from(sitterProfiles).where(eq(sitterProfiles.userId, sitterId));
    const profile = profiles.length > 0 ? profiles[0] : null;

    const maxPolicyPets = policy?.maxPetsAllowed ?? 4;
    const sitterMaxPets = activeRate?.maxPetsPerBooking ?? profile?.maxPetsPerBooking ?? 2;
    const effectiveMaxPets = Math.min(maxPolicyPets, sitterMaxPets);
    const petCount = petIds.length;
    const exceedsCapacity = petCount > effectiveMaxPets;

    const modalityDefaults: Record<string, { baseRate: number; durationUnitMinutes: number }> = {
      BOARDING: { baseRate: (policy?.fixedNewSitterRatePhp || 650) * 100, durationUnitMinutes: 1440 },
      HOUSE_SITTING: { baseRate: (policy?.fixedNewSitterRatePhp || 750) * 100, durationUnitMinutes: 1440 },
      DROP_IN: { baseRate: (policy?.fixedNewSitterRatePhp || 350) * 100, durationUnitMinutes: 60 },
      DAY_CARE: { baseRate: (policy?.fixedNewSitterRatePhp || 500) * 100, durationUnitMinutes: 480 },
      DOG_WALKING: { baseRate: (policy?.fixedNewSitterRatePhp || 350) * 100, durationUnitMinutes: 60 },
    };
    const def = modalityDefaults[modality] || { baseRate: 45000, durationUnitMinutes: 60 };
    const defaultExtraPetFeeCents = (policy?.additionalPetFeePhp ?? 250) * 100;

    // Sitter rate cards store base_rate in cents (e.g. 65000 for ₱650)
    let rawBaseRate = activeRate?.baseRate ?? def.baseRate;
    if (rawBaseRate < 10000) {
      // If stored as raw pesos (e.g. 650), convert to cents (65000)
      rawBaseRate = rawBaseRate * 100;
    }

    let rawExtraPetFee = activeRate?.extraPetFee ?? defaultExtraPetFeeCents;
    if (rawExtraPetFee < 10000 && rawExtraPetFee > 0) {
      rawExtraPetFee = rawExtraPetFee * 100;
    }

    let rawPuppyRate = activeRate?.puppyRate ?? 25000;
    if (rawPuppyRate < 10000 && rawPuppyRate > 0) {
      rawPuppyRate = rawPuppyRate * 100;
    }

    let rawMedicationSurcharge = activeRate?.medicationSurcharge ?? 0;
    if (rawMedicationSurcharge < 10000 && rawMedicationSurcharge > 0) {
      rawMedicationSurcharge = rawMedicationSurcharge * 100;
    }

    const effectiveRate = {
      id: activeRate?.id ?? 0,
      sitterId,
      modality,
      baseRate: rawBaseRate,
      durationUnitMinutes: activeRate?.durationUnitMinutes ?? def.durationUnitMinutes,
      extraPetFee: rawExtraPetFee,
      puppyRate: rawPuppyRate,
      medicationSurcharge: rawMedicationSurcharge,
      holidayMultiplier: activeRate?.holidayMultiplier ?? "1.00",
      rushHourSurcharge: activeRate?.rushHourSurcharge ?? 0,
    };

    // 2. Fetch Latest Platform Fee Config with fallback
    const feeConfigs = await db.select().from(platformFeeConfigs)
      .orderBy(desc(platformFeeConfigs.effectiveFrom))
      .limit(1);

    const feeConfig = feeConfigs.length > 0 ? feeConfigs[0] : {
      id: 1,
      ownerFeePercentage: "0.0500",
      ownerFeeCap: 5000,
      sitterCommissionPercentage: "0.2000",
      fixedTransactionFee: 0,
      effectiveFrom: new Date()
    };

    // 3. Fetch Pet Details
    let puppyCount = 0;
    let medicationCount = 0;
    const totalPets = petIds.length;

    if (totalPets > 0) {
      try {
        const petRecords = await db.select().from(pets).where(inArray(pets.id, petIds));
        for (const pet of petRecords) {
          if (pet.age !== null && pet.age < 1) puppyCount++;
          if (pet.medicationRequirements && pet.medicationRequirements.trim().length > 0) medicationCount++;
        }
      } catch (petErr) {
        console.warn("Could not load specific pets, defaulting counts:", petErr);
      }
    }
    const extraPetsCount = Math.max(0, totalPets - 1);

    // 4. Time Calculation
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    const blocks = Math.max(1, Math.ceil(durationMinutes / effectiveRate.durationUnitMinutes));

    // 5. Calculate Subtotals
    const baseSubtotal = blocks * effectiveRate.baseRate;

    const extraPetFee = effectiveRate.extraPetFee ?? 0;
    const puppyRate = effectiveRate.puppyRate ?? 0;
    const medicationSurcharge = effectiveRate.medicationSurcharge ?? 0;

    const surchargesSubtotal = (
      (extraPetsCount * extraPetFee * blocks) +
      (puppyCount * puppyRate * blocks) +
      (medicationCount * medicationSurcharge * blocks)
    );

    // 6. Apply Modifiers
    const holidayMult = isHoliday ? parseFloat(effectiveRate.holidayMultiplier || "1.0") : 1.0;
    const rushHourSurcharge = isRushHour ? (effectiveRate.rushHourSurcharge ?? 0) * blocks : 0;

    const calculatedBaseTotal = Math.round((baseSubtotal + surchargesSubtotal) * holidayMult) + rushHourSurcharge;

    // 7. Platform Fees
    const rawOwnerFee = parseFloat(feeConfig.ownerFeePercentage || "0");
    const rawSitterCommission = parseFloat(feeConfig.sitterCommissionPercentage || "0");
    const ownerFeeRate = rawOwnerFee > 1 ? rawOwnerFee / 100 : rawOwnerFee;
    const sitterCommissionRate = rawSitterCommission > 1 ? rawSitterCommission / 100 : rawSitterCommission;
    const fixedFee = feeConfig.fixedTransactionFee || 0;

    let calculatedOwnerFee = Math.round(calculatedBaseTotal * ownerFeeRate);
    if (feeConfig.ownerFeeCap !== null && calculatedOwnerFee > feeConfig.ownerFeeCap) {
      calculatedOwnerFee = feeConfig.ownerFeeCap;
    }
    calculatedOwnerFee += fixedFee;

    const calculatedSitterCommission = Math.round(calculatedBaseTotal * sitterCommissionRate);
    const calculatedSitterPayout = calculatedBaseTotal - calculatedSitterCommission;
    const calculatedTotalOwnerCharge = calculatedBaseTotal + calculatedOwnerFee;
    const calculatedNetPlatformRevenue = calculatedOwnerFee + calculatedSitterCommission;

    return {
      petCapacity: {
        maxAllowed: effectiveMaxPets,
        requestedCount: petCount,
        exceedsCapacity,
        policyLimit: maxPolicyPets,
      },
      baseCalculation: {
        blocks,
        baseRate: effectiveRate.baseRate,
        subtotal: baseSubtotal
      },
      surcharges: {
        extraPetsCount,
        extraPetFee,
        puppyCount,
        puppyRate,
        medicationCount,
        medicationSurcharge,
        surchargesSubtotal
      },
      modifiers: {
        holidayMultiplier: holidayMult,
        rushHourSurcharge: isRushHour ? (effectiveRate.rushHourSurcharge ?? 0) : 0,
        modifiersSubtotal: (Math.round((baseSubtotal + surchargesSubtotal) * holidayMult) - (baseSubtotal + surchargesSubtotal)) + rushHourSurcharge
      },
      totals: {
        calculatedBaseTotal,
        calculatedOwnerFee,
        calculatedSitterCommission,
        calculatedSitterPayout,
        calculatedTotalOwnerCharge,
        calculatedNetPlatformRevenue
      },
      appliedRates: {
        baseRateApplied: effectiveRate.baseRate,
        durationUnitMinutesApplied: effectiveRate.durationUnitMinutes,
        extraPetFeeApplied: extraPetFee,
        puppyRateApplied: puppyRate,
        medicationSurchargeApplied: medicationSurcharge,
        holidayMultiplierApplied: effectiveRate.holidayMultiplier || "1.0",
        rushHourSurchargeApplied: effectiveRate.rushHourSurcharge ?? 0,
        platformOwnerFeePercentageApplied: feeConfig.ownerFeePercentage,
        platformSitterCommissionPercentageApplied: feeConfig.sitterCommissionPercentage,
        ownerFeeCapApplied: feeConfig.ownerFeeCap,
        fixedTransactionFeeApplied: feeConfig.fixedTransactionFee
      }
    };
  }

  /**
   * Persists the pricing calculation into the booking_financial_snapshots table.
   */
  static async saveSnapshot(bookingId: number, quote: QuoteResponse): Promise<void> {
    await db.insert(bookingFinancialSnapshots).values({
      bookingId,
      baseRateApplied: quote.appliedRates.baseRateApplied,
      durationUnitMinutesApplied: quote.appliedRates.durationUnitMinutesApplied,
      extraPetFeeApplied: quote.appliedRates.extraPetFeeApplied,
      puppyRateApplied: quote.appliedRates.puppyRateApplied,
      medicationSurchargeApplied: quote.appliedRates.medicationSurchargeApplied,
      holidayMultiplierApplied: quote.appliedRates.holidayMultiplierApplied,
      rushHourSurchargeApplied: quote.appliedRates.rushHourSurchargeApplied,
      platformOwnerFeePercentageApplied: quote.appliedRates.platformOwnerFeePercentageApplied,
      platformSitterCommissionPercentageApplied: quote.appliedRates.platformSitterCommissionPercentageApplied,
      ownerFeeCapApplied: quote.appliedRates.ownerFeeCapApplied,
      fixedTransactionFeeApplied: quote.appliedRates.fixedTransactionFeeApplied,
      calculatedBaseTotal: quote.totals.calculatedBaseTotal,
      calculatedOwnerFee: quote.totals.calculatedOwnerFee,
      calculatedSitterCommission: quote.totals.calculatedSitterCommission,
      calculatedSitterPayout: quote.totals.calculatedSitterPayout,
      calculatedTotalOwnerCharge: quote.totals.calculatedTotalOwnerCharge,
      calculatedNetPlatformRevenue: quote.totals.calculatedNetPlatformRevenue
    });
  }
}
