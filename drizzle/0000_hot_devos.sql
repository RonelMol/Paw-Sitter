CREATE TYPE "public"."booking_status" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."meet_and_greet_status" AS ENUM('REQUESTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'HELD_IN_ESCROW', 'RELEASED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('PET_OWNER', 'PET_SITTER', 'ADMIN', 'SUPPORT_AGENT');--> statement-breakpoint
CREATE TYPE "public"."service_modality" AS ENUM('BOARDING', 'HOUSE_SITTING', 'DROP_IN', 'DAY_CARE', 'DOG_WALKING');--> statement-breakpoint
CREATE TABLE "adsense_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"publisher_client_id" text DEFAULT 'ca-pub-1234567890123456' NOT NULL,
	"header_slot_id" text DEFAULT '1234567890',
	"search_slot_id" text DEFAULT '2345678901',
	"sidebar_slot_id" text DEFAULT '3456789012',
	"footer_slot_id" text DEFAULT '4567890123',
	"enable_auto_ads" boolean DEFAULT true,
	"enable_test_mode" boolean DEFAULT true,
	"is_enabled" boolean DEFAULT true,
	"show_on_landing" boolean DEFAULT true,
	"show_on_search" boolean DEFAULT true,
	"show_on_sitter_profile" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_qa_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"module_name" text NOT NULL,
	"action_tested" text NOT NULL,
	"finding_title" text NOT NULL,
	"description" text NOT NULL,
	"reproduction_steps" text,
	"playwright_selector" text,
	"expected_behavior" text,
	"actual_behavior" text,
	"initial_severity" text DEFAULT 'MEDIUM' NOT NULL,
	"verification_status" text DEFAULT 'PENDING' NOT NULL,
	"verified_by_agent_2" boolean DEFAULT false NOT NULL,
	"agent_2_confidence_pct" integer DEFAULT 0,
	"agent_2_verdict" text,
	"agent_2_analysis" text,
	"agent_2_suggested_fix" text,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_qa_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"suite_name" text NOT NULL,
	"target_module" text DEFAULT 'ALL' NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"passed_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"warning_count" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"report_summary" text,
	"playwright_logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggered_by" text DEFAULT 'ADMIN',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_bug_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"module_name" text NOT NULL,
	"severity" text DEFAULT 'LOW' NOT NULL,
	"issue_type" text NOT NULL,
	"description" text NOT NULL,
	"root_cause" text,
	"suggested_fix" text,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"ai_analyzed" boolean DEFAULT true NOT NULL,
	"ai_model_used" text DEFAULT 'gemini-3.8-flash',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_kyc_submissions_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"legal_first_name" text NOT NULL,
	"legal_middle_name" text,
	"legal_last_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"country_code" text DEFAULT '+63',
	"id_type" text NOT NULL,
	"id_number" text NOT NULL,
	"id_front_url" text,
	"id_back_url" text,
	"selfie_with_id_url" text,
	"address" text,
	"city" text,
	"province" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_uid" text,
	"table_name" text NOT NULL,
	"record_id" integer NOT NULL,
	"action" text NOT NULL,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_financial_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"base_rate_applied" integer NOT NULL,
	"duration_unit_minutes_applied" integer NOT NULL,
	"extra_pet_fee_applied" integer DEFAULT 0,
	"puppy_rate_applied" integer DEFAULT 0,
	"medication_surcharge_applied" integer DEFAULT 0,
	"holiday_multiplier_applied" numeric(3, 2) DEFAULT '1.0',
	"rush_hour_surcharge_applied" integer DEFAULT 0,
	"platform_owner_fee_percentage_applied" numeric(7, 4) NOT NULL,
	"platform_sitter_commission_percentage_applied" numeric(7, 4) NOT NULL,
	"owner_fee_cap_applied" integer,
	"fixed_transaction_fee_applied" integer NOT NULL,
	"calculated_base_total" integer NOT NULL,
	"calculated_owner_fee" integer NOT NULL,
	"calculated_sitter_commission" integer NOT NULL,
	"calculated_sitter_payout" integer NOT NULL,
	"calculated_total_owner_charge" integer NOT NULL,
	"calculated_net_platform_revenue" integer NOT NULL,
	"tip_amount" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "booking_financial_snapshots_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "booking_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_role" text NOT NULL,
	"sender_name" text,
	"message" text NOT NULL,
	"is_flagged" boolean DEFAULT false NOT NULL,
	"flag_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"sitter_id" integer NOT NULL,
	"status" "booking_status" DEFAULT 'PENDING' NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"total_amount" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "time_check" CHECK ("bookings"."end_time" > "bookings"."start_time")
);
--> statement-breakpoint
CREATE TABLE "buy_me_coffee_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"require_for_cash" boolean DEFAULT true NOT NULL,
	"coffee_url" text DEFAULT 'https://buymeacoffee.com/pawshield' NOT NULL,
	"coffee_price_php" integer DEFAULT 150 NOT NULL,
	"custom_message" text DEFAULT 'Support PawShield Care! For Cash on Service bookings, a small community coffee (₱150) ensures instant booking slot reservation and platform guarantee.',
	"manual_trigger_override" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coffee_tips" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"booking_id" integer,
	"supporter_name" text,
	"amount_php" integer DEFAULT 150 NOT NULL,
	"reference_code" text,
	"notes" text,
	"status" text DEFAULT 'CONFIRMED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "disbursement_submissions_trail" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bank_name" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"account_type" text DEFAULT 'E-Wallet',
	"proof_attachment_url" text,
	"status" text DEFAULT 'PENDING_APPROVAL' NOT NULL,
	"admin_notes" text,
	"reviewed_by" integer,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meet_and_greets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"sitter_id" integer NOT NULL,
	"status" "meet_and_greet_status" DEFAULT 'REQUESTED' NOT NULL,
	"scheduled_time" timestamp,
	"location" text,
	"owner_confirmed" boolean DEFAULT false,
	"sitter_confirmed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"target_role" text DEFAULT 'ALL' NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"type" text DEFAULT 'SYSTEM' NOT NULL,
	"action_type" text NOT NULL,
	"entity_type" text,
	"entity_id" integer,
	"link_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"transfer_group" text NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"escrow_release_timestamp" timestamp,
	"dispute_flag" boolean DEFAULT false,
	CONSTRAINT "payments_transfer_group_unique" UNIQUE("transfer_group")
);
--> statement-breakpoint
CREATE TABLE "pet_care_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"title" text NOT NULL,
	"activity_type" text DEFAULT 'FEEDING' NOT NULL,
	"scheduled_date" text NOT NULL,
	"scheduled_time" text NOT NULL,
	"instructions" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"completed_at" timestamp,
	"completed_by" text,
	"completed_notes" text,
	"completed_photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_id" integer NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"breed" text,
	"age" integer,
	"weight" numeric(5, 2),
	"vaccination_records_url" text,
	"dietary_restrictions" text,
	"medical_conditions" text,
	"medication_requirements" text,
	"behavioral_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_fee_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_fee_percentage" numeric(7, 4) NOT NULL,
	"owner_fee_cap" integer,
	"sitter_commission_percentage" numeric(7, 4) NOT NULL,
	"fixed_transaction_fee" integer NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"referral_code" text NOT NULL,
	"referrer_user_id" integer NOT NULL,
	"referred_user_id" integer NOT NULL,
	"booking_id" integer,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reward_earned_php" integer DEFAULT 250 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"referral_code" text NOT NULL,
	"total_clicks" integer DEFAULT 0 NOT NULL,
	"total_signups" integer DEFAULT 0 NOT NULL,
	"total_bookings_completed" integer DEFAULT 0 NOT NULL,
	"reward_balance_php" integer DEFAULT 0 NOT NULL,
	"lifetime_earned_php" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "referrals_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "runtime_environment_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_key" text NOT NULL,
	"config_value" text NOT NULL,
	"category" text DEFAULT 'CUSTOM' NOT NULL,
	"description" text,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_by" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "runtime_environment_configs_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "sitter_availabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"sitter_id" integer NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitter_blockouts" (
	"id" serial PRIMARY KEY NOT NULL,
	"sitter_id" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitter_payout_disbursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer,
	"sitter_id" integer NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'PHP' NOT NULL,
	"status" text DEFAULT 'RELEASED' NOT NULL,
	"payout_channel" text DEFAULT 'MANUAL_BANK' NOT NULL,
	"reference_number" text,
	"bank_name" text,
	"account_name" text,
	"account_number" text,
	"admin_notes" text,
	"processed_by_admin_id" integer,
	"disbursed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitter_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"bio" text,
	"experience_details" text,
	"latitude" numeric,
	"longitude" numeric,
	"service_radius_miles" integer DEFAULT 5 NOT NULL,
	"rating" numeric(3, 2),
	"photos" jsonb DEFAULT '[]'::jsonb,
	"proof_album" jsonb DEFAULT '[]'::jsonb,
	"environment_info" jsonb DEFAULT '{}'::jsonb,
	"pet_preferences" jsonb DEFAULT '{}'::jsonb,
	"daily_routine" jsonb DEFAULT '{}'::jsonb,
	"skills_list" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sitter_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "sitter_rate_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"sitter_id" integer NOT NULL,
	"modality" "service_modality" NOT NULL,
	"base_rate" integer NOT NULL,
	"duration_unit_minutes" integer DEFAULT 60 NOT NULL,
	"extra_pet_fee" integer DEFAULT 0,
	"puppy_rate" integer DEFAULT 0,
	"medication_surcharge" integer DEFAULT 0,
	"holiday_multiplier" numeric(3, 2) DEFAULT '1.0',
	"rush_hour_surcharge" integer DEFAULT 0,
	CONSTRAINT "base_rate_check" CHECK ("sitter_rate_cards"."base_rate" > 0)
);
--> statement-breakpoint
CREATE TABLE "sitter_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"legal_first_name" text NOT NULL,
	"legal_last_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"normalized_mobile" text NOT NULL,
	"email" text NOT NULL,
	"normalized_email" text NOT NULL,
	"birth_date" text,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"province" text NOT NULL,
	"id_type" text NOT NULL,
	"id_number" text NOT NULL,
	"normalized_id_number" text NOT NULL,
	"id_front_url" text NOT NULL,
	"id_back_url" text,
	"selfie_with_id_url" text,
	"bank_name" text NOT NULL,
	"bank_account_name" text NOT NULL,
	"bank_account_number" text NOT NULL,
	"normalized_bank_account" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"is_duplicate_flagged" boolean DEFAULT false NOT NULL,
	"duplicate_reason" text,
	"admin_notes" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_memberships" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"plan_type" text DEFAULT 'FREE_TIER' NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"accepted_bookings_count" integer DEFAULT 0 NOT NULL,
	"max_free_bookings" integer DEFAULT 3 NOT NULL,
	"monthly_fee_php" integer DEFAULT 499 NOT NULL,
	"annual_fee_php" integer DEFAULT 4999 NOT NULL,
	"activated_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"payment_reference" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_memberships_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"name" text,
	"first_name" text,
	"middle_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"role" "user_role" DEFAULT 'PET_OWNER' NOT NULL,
	"custom_role_id" integer,
	"is_verified" boolean DEFAULT false NOT NULL,
	"stripe_account_id" text,
	"stripe_customer_id" text,
	"password_hash" text,
	"is_suspended" boolean DEFAULT false NOT NULL,
	"suspension_reason" text,
	"suspended_at" timestamp,
	"phone" text,
	"country_code" text DEFAULT '+63',
	"profile_picture" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vet_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"pet_id" integer NOT NULL,
	"clinic_name" text NOT NULL,
	"clinic_phone" text NOT NULL,
	"clinic_address" text NOT NULL,
	"digital_signature" text NOT NULL,
	"pre_authorized_spend_limit" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visit_checkin_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"check_in_time" timestamp DEFAULT now() NOT NULL,
	"latitude" numeric,
	"longitude" numeric,
	"potty_log" text,
	"food_water_tracking" text,
	"photo_urls" jsonb DEFAULT '[]'::jsonb,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "ai_qa_findings" ADD CONSTRAINT "ai_qa_findings_run_id_ai_qa_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ai_qa_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_kyc_submissions_trail" ADD CONSTRAINT "app_kyc_submissions_trail_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_kyc_submissions_trail" ADD CONSTRAINT "app_kyc_submissions_trail_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_financial_snapshots" ADD CONSTRAINT "booking_financial_snapshots_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_messages" ADD CONSTRAINT "booking_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coffee_tips" ADD CONSTRAINT "coffee_tips_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_submissions_trail" ADD CONSTRAINT "disbursement_submissions_trail_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disbursement_submissions_trail" ADD CONSTRAINT "disbursement_submissions_trail_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_and_greets" ADD CONSTRAINT "meet_and_greets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meet_and_greets" ADD CONSTRAINT "meet_and_greets_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pets" ADD CONSTRAINT "pets_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_availabilities" ADD CONSTRAINT "sitter_availabilities_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_blockouts" ADD CONSTRAINT "sitter_blockouts_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_payout_disbursements" ADD CONSTRAINT "sitter_payout_disbursements_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_payout_disbursements" ADD CONSTRAINT "sitter_payout_disbursements_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_payout_disbursements" ADD CONSTRAINT "sitter_payout_disbursements_processed_by_admin_id_users_id_fk" FOREIGN KEY ("processed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD CONSTRAINT "sitter_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_rate_cards" ADD CONSTRAINT "sitter_rate_cards_sitter_id_users_id_fk" FOREIGN KEY ("sitter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitter_verifications" ADD CONSTRAINT "sitter_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_custom_role_id_custom_roles_id_fk" FOREIGN KEY ("custom_role_id") REFERENCES "public"."custom_roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vet_authorizations" ADD CONSTRAINT "vet_authorizations_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_checkin_cards" ADD CONSTRAINT "visit_checkin_cards_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;