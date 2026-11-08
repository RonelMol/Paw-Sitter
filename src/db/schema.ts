import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  pgEnum,
  check,
  boolean,
  numeric,
  date,
  time,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("user_role", ["PET_OWNER", "PET_SITTER", "ADMIN", "SUPPORT_AGENT"]);
export const serviceModalityEnum = pgEnum("service_modality", ["BOARDING", "HOUSE_SITTING", "DROP_IN", "DAY_CARE", "DOG_WALKING"]);
export const bookingStatusEnum = pgEnum("booking_status", ["PENDING", "CONFIRMED", "IN_PROGRESS", "CANCELLED", "COMPLETED"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "AUTHORIZED", "HELD_IN_ESCROW", "RELEASED", "REFUNDED", "DISPUTED"]);
export const meetAndGreetStatusEnum = pgEnum("meet_and_greet_status", ["REQUESTED", "SCHEDULED", "COMPLETED", "CANCELLED"]);

export const customRoles = pgTable("custom_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  permissions: jsonb("permissions").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(), 
  name: text("name"), // Added name here so it exists in db
  firstName: text("first_name"),
  middleName: text("middle_name"),
  lastName: text("last_name"),
  email: text("email").notNull().unique(),
  role: roleEnum("role").notNull().default("PET_OWNER"),
  customRoleId: integer("custom_role_id").references(() => customRoles.id),
  isVerified: boolean("is_verified").default(false).notNull(),
  stripeAccountId: text("stripe_account_id"),
  stripeCustomerId: text("stripe_customer_id"),
  passwordHash: text("password_hash"),
  isSuspended: boolean("is_suspended").default(false).notNull(),
  suspensionReason: text("suspension_reason"),
  suspendedAt: timestamp("suspended_at"),
  phone: text("phone"),
  countryCode: text("country_code").default("+63"),
  profilePicture: text("profile_picture"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sitterProfiles = pgTable("sitter_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  bio: text("bio"),
  experienceDetails: text("experience_details"),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  serviceRadiusMiles: integer("service_radius_miles").default(5).notNull(),
  rating: numeric("rating", { precision: 3, scale: 2 }),
  photos: jsonb("photos").default([]),
  proofAlbum: jsonb("proof_album").default([]),
  environmentInfo: jsonb("environment_info").default({}),
  petPreferences: jsonb("pet_preferences").default({}),
  dailyRoutine: jsonb("daily_routine").default({}),
  skillsList: jsonb("skills_list").default([]),
  sitterTier: text("sitter_tier").default("NOVICE"), // NOVICE, STANDARD, PRO
  ratesLocked: boolean("rates_locked").default(false),
  rateApprovalStatus: text("rate_approval_status").default("APPROVED"), // APPROVED, PENDING_REVIEW, REJECTED
  rateRejectionReason: text("rate_rejection_reason"),
  maxPetsPerBooking: integer("max_pets_per_booking").default(2),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sitterAvailabilities = pgTable("sitter_availabilities", {
  id: serial("id").primaryKey(),
  sitterId: integer("sitter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0-6 (Sun-Sat)
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
});

export const sitterBlockouts = pgTable("sitter_blockouts", {
  id: serial("id").primaryKey(),
  sitterId: integer("sitter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const sitterRateCards = pgTable("sitter_rate_cards", {
  id: serial("id").primaryKey(),
  sitterId: integer("sitter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  modality: serviceModalityEnum("modality").notNull(),
  baseRate: integer("base_rate").notNull(), // cents
  durationUnitMinutes: integer("duration_unit_minutes").notNull().default(60),
  extraPetFee: integer("extra_pet_fee").default(0),
  puppyRate: integer("puppy_rate").default(0),
  medicationSurcharge: integer("medication_surcharge").default(0),
  holidayMultiplier: numeric("holiday_multiplier", { precision: 3, scale: 2 }).default('1.0'),
  rushHourSurcharge: integer("rush_hour_surcharge").default(0),
  maxPetsPerBooking: integer("max_pets_per_booking").default(2),
  isAdminOverride: boolean("is_admin_override").default(false),
  status: text("status").default("ACTIVE"),
}, (table) => [
  check("base_rate_check", sql`${table.baseRate} > 0`)
]);

export const serviceRatePolicies = pgTable("service_rate_policies", {
  id: serial("id").primaryKey(),
  modality: text("modality").notNull().unique(),
  title: text("title").notNull(),
  fixedNewSitterRatePhp: integer("fixed_new_sitter_rate_php").notNull(),
  standardMinRatePhp: integer("standard_min_rate_php").notNull(),
  standardMaxRatePhp: integer("standard_max_rate_php").notNull(),
  proMaxRatePhp: integer("pro_max_rate_php").notNull(),
  maxPetsAllowed: integer("max_pets_allowed").default(4).notNull(),
  additionalPetFeePhp: integer("additional_pet_fee_php").default(250).notNull(),
  maxExtraPetFeePhp: integer("max_extra_pet_fee_php").default(500),
  maxPuppyRatePhp: integer("max_puppy_rate_php").default(400),
  maxMedicationSurchargePhp: integer("max_medication_surcharge_php").default(300),
  maxHolidayMultiplier: numeric("max_holiday_multiplier", { precision: 3, scale: 2 }).default('1.50'),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const googleSearchConsoleConfigs = pgTable("google_search_console_configs", {
  id: serial("id").primaryKey(),
  siteUrl: text("site_url").notNull().default("https://pawshield.ph"),
  verificationTag: text("verification_tag").default("google-site-verification=GSC_PAWSHIELD_AUTH_2026_TOKEN"),
  isVerified: boolean("is_verified").default(true),
  sitemapUrl: text("sitemap_url").default("https://pawshield.ph/sitemap.xml"),
  targetCountry: text("target_country").default("Philippines (PH)"),
  lastSyncedAt: timestamp("last_synced_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const platformFeeConfigs = pgTable("platform_fee_configs", {
  id: serial("id").primaryKey(),
  ownerFeePercentage: numeric("owner_fee_percentage", { precision: 7, scale: 4 }).notNull(),
  ownerFeeCap: integer("owner_fee_cap"), 
  sitterCommissionPercentage: numeric("sitter_commission_percentage", { precision: 7, scale: 4 }).notNull(),
  fixedTransactionFee: integer("fixed_transaction_fee").notNull(), 
  effectiveFrom: timestamp("effective_from").defaultNow().notNull(),
});

export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), 
  breed: text("breed"),
  age: integer("age"),
  weight: numeric("weight", { precision: 5, scale: 2 }), // weight in kg
  photoUrl: text("photo_url"), // Profile picture of pet
  foodType: text("food_type"), // Dry Kibble, Wet Canned, Raw Diet, Home Cooked, Mixed
  foodGramsPerMeal: numeric("food_grams_per_meal", { precision: 6, scale: 2 }), // grams
  foodFrequency: text("food_frequency"), // 1x Daily, 2x Daily (Morning/Evening), 3x Daily, Free Feed
  otherNotes: text("other_notes"), // other info for sitter to know
  vaccinationRecordsUrl: text("vaccination_records_url"),
  dietaryRestrictions: text("dietary_restrictions"),
  medicalConditions: text("medical_conditions"),
  medicationRequirements: text("medication_requirements"),
  behavioralNotes: text("behavioral_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const vetAuthorizations = pgTable("vet_authorizations", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").references(() => pets.id, { onDelete: "cascade" }).notNull(),
  clinicName: text("clinic_name").notNull(),
  clinicPhone: text("clinic_phone").notNull(),
  clinicAddress: text("clinic_address").notNull(),
  digitalSignature: text("digital_signature").notNull(),
  preAuthorizedSpendLimit: integer("pre_authorized_spend_limit").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetAndGreets = pgTable("meet_and_greets", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id).notNull(),
  sitterId: integer("sitter_id").references(() => users.id).notNull(),
  status: meetAndGreetStatusEnum("status").default("REQUESTED").notNull(),
  scheduledTime: timestamp("scheduled_time"),
  location: text("location"),
  ownerConfirmed: boolean("owner_confirmed").default(false),
  sitterConfirmed: boolean("sitter_confirmed").default(false),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  ownerId: integer("owner_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  sitterId: integer("sitter_id").references(() => users.id, { onDelete: "restrict" }).notNull(),
  status: bookingStatusEnum("status").notNull().default("PENDING"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalAmount: integer("total_amount").notNull(), 
  houseLocationAddress: text("house_location_address"),
  houseLocationDetails: jsonb("house_location_details").default({}),
  intakeQuestionnaire: jsonb("intake_questionnaire").default({}),
  routineApprovalStatus: text("routine_approval_status").default("PENDING_APPROVAL"), // PENDING_APPROVAL | APPROVED | PENDING_OWNER_APPROVAL
  routineProposalNotes: text("routine_proposal_notes"),
  routineApprovedAt: timestamp("routine_approved_at"),
  routineApprovedBy: integer("routine_approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  check("time_check", sql`${table.endTime} > ${table.startTime}`)
]);

export const bookingFinancialSnapshots = pgTable("booking_financial_snapshots", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull().unique(),
  baseRateApplied: integer("base_rate_applied").notNull(),
  durationUnitMinutesApplied: integer("duration_unit_minutes_applied").notNull(),
  extraPetFeeApplied: integer("extra_pet_fee_applied").default(0),
  puppyRateApplied: integer("puppy_rate_applied").default(0),
  medicationSurchargeApplied: integer("medication_surcharge_applied").default(0),
  holidayMultiplierApplied: numeric("holiday_multiplier_applied", { precision: 3, scale: 2 }).default('1.0'),
  rushHourSurchargeApplied: integer("rush_hour_surcharge_applied").default(0),
  platformOwnerFeePercentageApplied: numeric("platform_owner_fee_percentage_applied", { precision: 7, scale: 4 }).notNull(),
  platformSitterCommissionPercentageApplied: numeric("platform_sitter_commission_percentage_applied", { precision: 7, scale: 4 }).notNull(),
  ownerFeeCapApplied: integer("owner_fee_cap_applied"),
  fixedTransactionFeeApplied: integer("fixed_transaction_fee_applied").notNull(),
  calculatedBaseTotal: integer("calculated_base_total").notNull(),
  calculatedOwnerFee: integer("calculated_owner_fee").notNull(),
  calculatedSitterCommission: integer("calculated_sitter_commission").notNull(),
  calculatedSitterPayout: integer("calculated_sitter_payout").notNull(),
  calculatedTotalOwnerCharge: integer("calculated_total_owner_charge").notNull(),
  calculatedNetPlatformRevenue: integer("calculated_net_platform_revenue").notNull(),
  tipAmount: integer("tip_amount").default(0).notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  transferGroup: text("transfer_group").notNull().unique(),
  status: paymentStatusEnum("status").default("PENDING").notNull(),
  escrowReleaseTimestamp: timestamp("escrow_release_timestamp"),
  disputeFlag: boolean("dispute_flag").default(false),
});

export const visitCheckinCards = pgTable("visit_checkin_cards", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id).notNull(),
  checkInTime: timestamp("check_in_time").defaultNow().notNull(),
  latitude: numeric("latitude"),
  longitude: numeric("longitude"),
  pottyLog: text("potty_log"), 
  foodWaterTracking: text("food_water_tracking"),
  photoUrls: jsonb("photo_urls").default([]),
  notes: text("notes"),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  actorUid: text("actor_uid"),
  tableName: text("table_name").notNull(),
  recordId: integer("record_id").notNull(),
  action: text("action").notNull(),
  oldData: jsonb("old_data"),
  newData: jsonb("new_data"),
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const petCareActivities = pgTable("pet_care_activities", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  petId: integer("pet_id"),
  petName: text("pet_name"),
  title: text("title").notNull(),
  activityType: text("activity_type").notNull().default("FEEDING"), // FEEDING, WALKING, MEDICATION, POTTY, PLAYTIME, OTHER
  scheduledDate: text("scheduled_date").notNull(), // YYYY-MM-DD
  scheduledTime: text("scheduled_time").notNull(), // HH:MM
  instructions: text("instructions"),
  status: text("status").notNull().default("PENDING"), // PENDING, COMPLETED, MISSED
  proofRequired: boolean("proof_required").default(false), // Pet owner tags if photo proof is required
  completedAt: timestamp("completed_at"),
  completedBy: text("completed_by"),
  completedNotes: text("completed_notes"),
  completedPhotoUrl: text("completed_photo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingPets = pgTable("booking_pets", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  petId: integer("pet_id").references(() => pets.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adsenseConfigs = pgTable("adsense_configs", {
  id: serial("id").primaryKey(),
  publisherClientId: text("publisher_client_id").notNull().default("ca-pub-1234567890123456"),
  headerSlotId: text("header_slot_id").default("1234567890"),
  searchSlotId: text("search_slot_id").default("2345678901"),
  sidebarSlotId: text("sidebar_slot_id").default("3456789012"),
  footerSlotId: text("footer_slot_id").default("4567890123"),
  enableAutoAds: boolean("enable_auto_ads").default(true),
  enableTestMode: boolean("enable_test_mode").default(true),
  isEnabled: boolean("is_enabled").default(true),
  showOnLanding: boolean("show_on_landing").default(true),
  showOnSearch: boolean("show_on_search").default(true),
  showOnSitterProfile: boolean("show_on_sitter_profile").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  targetRole: text("target_role").notNull().default("ALL"), // PET_OWNER | PET_SITTER | ADMIN | SUPPORT_AGENT | ALL
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull().default("SYSTEM"), // BOOKING | PAYMENT | CARE_ACTIVITY | ACCOUNT | SECURITY | SYSTEM
  actionType: text("action_type").notNull(), // BOOKING_CREATED | BOOKING_CONFIRMED | BOOKING_COMPLETED | ACTIVITY_LOGGED | ACTIVITY_COMPLETED | VISIT_CHECKIN | ESCROW_HELD | ESCROW_RELEASED | USER_VERIFIED | FEE_UPDATED etc.
  entityType: text("entity_type"), // booking | activity | payment | user | system
  entityId: integer("entity_id"),
  linkUrl: text("link_url"),
  isRead: boolean("is_read").default(false).notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const buyMeCoffeeConfigs = pgTable("buy_me_coffee_configs", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  requireForCash: boolean("require_for_cash").default(true).notNull(),
  coffeeUrl: text("coffee_url").default("https://buymeacoffee.com/pawshield").notNull(),
  coffeePricePhp: integer("coffee_price_php").default(150).notNull(),
  customMessage: text("custom_message").default("Support PawShield Care! For Cash on Service bookings, a small community coffee (₱150) ensures instant booking slot reservation and platform guarantee."),
  manualTriggerOverride: boolean("manual_trigger_override").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const coffeeTips = pgTable("coffee_tips", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  bookingId: integer("booking_id"),
  supporterName: text("supporter_name"),
  amountPhp: integer("amount_php").notNull().default(150),
  referenceCode: text("reference_code"),
  notes: text("notes"),
  status: text("status").notNull().default("CONFIRMED"), // PENDING, CONFIRMED, VERIFIED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sitterVerifications = pgTable("sitter_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  legalFirstName: text("legal_first_name").notNull(),
  legalLastName: text("legal_last_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  normalizedMobile: text("normalized_mobile").notNull(),
  email: text("email").notNull(),
  normalizedEmail: text("normalized_email").notNull(),
  birthDate: text("birth_date"),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  idType: text("id_type").notNull(), // PhilSys National ID, UMID, Driver's License, Philippine Passport, Postal ID, SSS ID, PRC
  idNumber: text("id_number").notNull(),
  normalizedIdNumber: text("normalized_id_number").notNull(),
  idFrontUrl: text("id_front_url").notNull(),
  idBackUrl: text("id_back_url"),
  selfieWithIdUrl: text("selfie_with_id_url"),
  // Disbursement Bank for Sitter Payouts
  bankName: text("bank_name").notNull(), // BDO, BPI, Metrobank, UnionBank, GCash, Maya, Landbank, RCBC, etc.
  bankAccountName: text("bank_account_name").notNull(),
  bankAccountNumber: text("bank_account_number").notNull(),
  normalizedBankAccount: text("normalized_bank_account").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, APPROVED, REJECTED
  isDuplicateFlagged: boolean("is_duplicate_flagged").default(false).notNull(),
  duplicateReason: text("duplicate_reason"),
  adminNotes: text("admin_notes"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userMemberships = pgTable("user_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  planType: text("plan_type").notNull().default("FREE_TIER"), // FREE_TIER, PRO_MONTHLY, PRO_ANNUAL
  status: text("status").notNull().default("ACTIVE"), // ACTIVE, EXPIRED, CANCELLED
  acceptedBookingsCount: integer("accepted_bookings_count").default(0).notNull(),
  maxFreeBookings: integer("max_free_bookings").default(3).notNull(),
  monthlyFeePhp: integer("monthly_fee_php").default(499).notNull(),
  annualFeePhp: integer("annual_fee_php").default(4999).notNull(),
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  paymentReference: text("payment_reference"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  referralCode: text("referral_code").notNull().unique(),
  totalClicks: integer("total_clicks").default(0).notNull(),
  totalSignups: integer("total_signups").default(0).notNull(),
  totalBookingsCompleted: integer("total_bookings_completed").default(0).notNull(),
  rewardBalancePhp: integer("reward_balance_php").default(0).notNull(),
  lifetimeEarnedPhp: integer("lifetime_earned_php").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralAttributions = pgTable("referral_attributions", {
  id: serial("id").primaryKey(),
  referralCode: text("referral_code").notNull(),
  referrerUserId: integer("referrer_user_id").references(() => users.id).notNull(),
  referredUserId: integer("referred_user_id").references(() => users.id).notNull(),
  bookingId: integer("booking_id"),
  status: text("status").notNull().default("PENDING"), // PENDING, REWARDED, CANCELLED
  rewardEarnedPhp: integer("reward_earned_php").default(250).notNull(), // ₱250 reward
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appBugReports = pgTable("app_bug_reports", {
  id: serial("id").primaryKey(),
  moduleName: text("module_name").notNull(),
  severity: text("severity").notNull().default("LOW"), // CRITICAL, HIGH, MEDIUM, LOW, INFO
  issueType: text("issue_type").notNull(), // SYNTAX, RUNTIME, CURRENCY_MISMATCH, DUPLICATE_ACCOUNT, ACCESS_VIOLATION, CONFIG
  description: text("description").notNull(),
  rootCause: text("root_cause"),
  suggestedFix: text("suggested_fix"),
  status: text("status").notNull().default("OPEN"), // OPEN, RESOLVED, IGNORED
  aiAnalyzed: boolean("ai_analyzed").default(true).notNull(),
  aiModelUsed: text("ai_model_used").default("gemini-3.8-flash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bookingMessages = pgTable("booking_messages", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  senderRole: text("sender_role").notNull(), // PET_SITTER, PET_OWNER, ADMIN
  senderName: text("sender_name"),
  message: text("message").notNull(),
  isFlagged: boolean("is_flagged").default(false).notNull(),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const runtimeEnvironmentConfigs = pgTable("runtime_environment_configs", {
  id: serial("id").primaryKey(),
  configKey: text("config_key").notNull().unique(),
  configValue: text("config_value").notNull(),
  category: text("category").notNull().default("CUSTOM"),
  description: text("description"),
  isSecret: boolean("is_secret").default(false).notNull(),
  updatedBy: text("updated_by"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const aiQaRuns = pgTable("ai_qa_runs", {
  id: serial("id").primaryKey(),
  suiteName: text("suite_name").notNull(),
  targetModule: text("target_module").notNull().default("ALL"),
  status: text("status").notNull().default("COMPLETED"), // COMPLETED, FAILED, RUNNING
  totalTests: integer("total_tests").default(0).notNull(),
  passedCount: integer("passed_count").default(0).notNull(),
  failedCount: integer("failed_count").default(0).notNull(),
  warningCount: integer("warning_count").default(0).notNull(),
  durationMs: integer("duration_ms").default(0).notNull(),
  reportSummary: text("report_summary"),
  playwrightLogs: jsonb("playwright_logs").default([]).notNull(),
  triggeredBy: text("triggered_by").default("ADMIN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiQaFindings = pgTable("ai_qa_findings", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => aiQaRuns.id, { onDelete: "cascade" }).notNull(),
  moduleName: text("module_name").notNull(),
  actionTested: text("action_tested").notNull(), // CREATE, READ, UPDATE, DELETE, SECURITY_FILTER
  findingTitle: text("finding_title").notNull(),
  description: text("description").notNull(),
  reproductionSteps: text("reproduction_steps"),
  playwrightSelector: text("playwright_selector"),
  expectedBehavior: text("expected_behavior"),
  actualBehavior: text("actual_behavior"),
  initialSeverity: text("initial_severity").notNull().default("MEDIUM"), // CRITICAL, HIGH, MEDIUM, LOW
  
  // Agent 2 Verification fields
  verificationStatus: text("verification_status").notNull().default("PENDING"), // PENDING, VALID_BUG, FALSE_POSITIVE, INTENDED_DESIGN, CANNOT_REPRODUCE
  verifiedByAgent2: boolean("verified_by_agent_2").default(false).notNull(),
  agent2ConfidencePct: integer("agent_2_confidence_pct").default(0),
  agent2Verdict: text("agent_2_verdict"),
  agent2Analysis: text("agent_2_analysis"),
  agent2SuggestedFix: text("agent_2_suggested_fix"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sitterPayoutDisbursements = pgTable("sitter_payout_disbursements", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").references(() => bookings.id, { onDelete: "set null" }),
  sitterId: integer("sitter_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").default("PHP").notNull(),
  status: text("status").default("RELEASED").notNull(), // RELEASED, PENDING, CANCELLED, REVERSED
  payoutChannel: text("payout_channel").default("MANUAL_BANK").notNull(), // GCASH, MAYA, BDO, BPI, UNIONBANK, METROBANK, STRIPE, CASH, OTHER
  referenceNumber: text("reference_number"),
  bankName: text("bank_name"),
  accountName: text("account_name"),
  accountNumber: text("account_number"),
  adminNotes: text("admin_notes"),
  processedByAdminId: integer("processed_by_admin_id").references(() => users.id),
  disbursedAt: timestamp("disbursed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const disbursementSubmissionsTrail = pgTable("disbursement_submissions_trail", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  bankName: text("bank_name").notNull(),
  bankAccountName: text("bank_account_name").notNull(),
  bankAccountNumber: text("bank_account_number").notNull(),
  accountType: text("account_type").default("E-Wallet"),
  proofAttachmentUrl: text("proof_attachment_url"),
  status: text("status").default("PENDING_APPROVAL").notNull(), // PENDING_APPROVAL, APPROVED, REJECTED
  adminNotes: text("admin_notes"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appKycSubmissionsTrail = pgTable("app_kyc_submissions_trail", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  legalFirstName: text("legal_first_name").notNull(),
  legalMiddleName: text("legal_middle_name"),
  legalLastName: text("legal_last_name").notNull(),
  mobileNumber: text("mobile_number").notNull(),
  countryCode: text("country_code").default("+63"),
  idType: text("id_type").notNull(),
  idNumber: text("id_number").notNull(),
  idFrontUrl: text("id_front_url"),
  idBackUrl: text("id_back_url"),
  selfieWithIdUrl: text("selfie_with_id_url"),
  address: text("address"),
  city: text("city"),
  province: text("province"),
  status: text("status").default("PENDING").notNull(), // PENDING, APPROVED, REJECTED
  rejectionReason: text("rejection_reason"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adsenseComplianceAudits = pgTable("adsense_compliance_audits", {
  id: serial("id").primaryKey(),
  auditScope: text("audit_scope").notNull().default("FULL_APP"),
  status: text("status").notNull().default("COMPLETED"), // RUNNING, COMPLETED, FAILED
  complianceScore: integer("compliance_score").default(0).notNull(), // 0 to 100
  riskLevel: text("risk_level").notNull().default("LOW"), // LOW, MEDIUM, HIGH, CRITICAL
  totalRulesChecked: integer("total_rules_checked").default(0).notNull(),
  passedRulesCount: integer("passed_rules_count").default(0).notNull(),
  violationsCount: integer("violations_count").default(0).notNull(),
  warningsCount: integer("warnings_count").default(0).notNull(),
  pagesAudited: jsonb("pages_audited").default([]).notNull(),
  policyBreakdown: jsonb("policy_breakdown").default({}).notNull(),
  findings: jsonb("findings").default([]).notNull(),
  fullReportMarkdown: text("full_report_markdown"),
  remediationPlan: jsonb("remediation_plan").default([]).notNull(),
  triggeredBy: text("triggered_by").default("ADMIN"),
  durationMs: integer("duration_ms").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const aiStrategicPlans = pgTable("ai_strategic_plans", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  status: text("status").notNull().default("COMPLETED"), // DRAFT, COMPLETED, IN_PROGRESS, ARCHIVED
  overallHealthScore: integer("overall_health_score").default(0).notNull(),
  adsenseReadinessPct: integer("adsense_readiness_pct").default(0).notNull(),
  qaStabilityPct: integer("qa_stability_pct").default(0).notNull(),
  uxBenchmarkScore: integer("ux_benchmark_score").default(0).notNull(),
  agentRunsIngested: jsonb("agent_runs_ingested").default({}).notNull(),
  executiveSummary: text("executive_summary").notNull(),
  prioritizedActionItems: jsonb("prioritized_action_items").default([]).notNull(),
  chronologicalRoadmap: jsonb("chronological_roadmap").default([]).notNull(),
  crossAgentSynergies: jsonb("cross_agent_synergies").default([]).notNull(),
  fullMarkdownReport: text("full_markdown_report"),
  actionProgress: jsonb("action_progress").default({}).notNull(),
  triggeredBy: text("triggered_by").default("ADMIN"),
  durationMs: integer("duration_ms").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const consoleErrorTelemetry = pgTable("console_error_telemetry", {
  id: serial("id").primaryKey(),
  fingerprint: text("fingerprint").notNull(),
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"),
  pageRoute: text("page_route").notNull().default("/"),
  moduleName: text("module_name").notNull().default("ClientApp"),
  componentPart: text("component_part").default("Global"),
  triggerAction: text("trigger_action").default("RUNTIME_EVENT"),
  severity: text("severity").notNull().default("HIGH"), // CRITICAL, HIGH, MEDIUM, LOW
  metadata: jsonb("metadata").default({}).notNull(),
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});

export const aiAgentBrainMemory = pgTable("ai_agent_brain_memory", {
  id: serial("id").primaryKey(),
  memoryType: text("memory_type").notNull().default("CONSOLE_ROOT_CAUSE"),
  fingerprint: text("fingerprint").notNull().unique(),
  title: text("title").notNull(),
  pageRoute: text("page_route").notNull(),
  moduleName: text("module_name").notNull(),
  componentPart: text("component_part").notNull(),
  triggerEvent: text("trigger_event").notNull(),
  rootCauseAnalysis: text("root_cause_analysis").notNull(),
  remediationCode: text("remediation_code"),
  confidencePct: integer("confidence_pct").default(95).notNull(),
  isResolved: boolean("is_resolved").default(false).notNull(),
  occurrenceCount: integer("occurrence_count").default(1).notNull(),
  firstDetectedAt: timestamp("first_detected_at").defaultNow().notNull(),
  lastUpdatedBrainAt: timestamp("last_updated_brain_at").defaultNow().notNull(),
});

export const owaspSecurityAudits = pgTable("owasp_security_audits", {
  id: serial("id").primaryKey(),
  scanType: text("scan_type").notNull().default("FULL_OWASP_2026"),
  overallScore: integer("overall_score").notNull().default(100),
  grade: text("grade").notNull().default("A+"),
  riskLevel: text("risk_level").notNull().default("LOW"), // CRITICAL, HIGH, MEDIUM, LOW, CLEAN
  totalTests: integer("total_tests").notNull().default(0),
  passedTests: integer("passed_tests").notNull().default(0),
  failedTests: integer("failed_tests").notNull().default(0),
  warningTests: integer("warning_tests").notNull().default(0),
  durationMs: integer("duration_ms").notNull().default(0),
  testResults: jsonb("test_results").default([]).notNull(),
  categorySummaries: jsonb("category_summaries").default([]).notNull(),
  remediationPrompts: jsonb("remediation_prompts").default([]).notNull(),
  triggeredBy: text("triggered_by").default("ADMIN"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sitterProfile: one(sitterProfiles),
  rateCards: many(sitterRateCards),
  availabilities: many(sitterAvailabilities),
  blockouts: many(sitterBlockouts),
  pets: many(pets),
  bookingsAsOwner: many(bookings, { relationName: "ownerBookings" }),
  bookingsAsSitter: many(bookings, { relationName: "sitterBookings" }),
  notifications: many(notifications),
  membership: one(userMemberships),
  referral: one(referrals),
}));
