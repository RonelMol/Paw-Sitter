ALTER TYPE "public"."booking_status" ADD VALUE 'IN_PROGRESS' BEFORE 'CANCELLED';--> statement-breakpoint
CREATE TABLE "adsense_compliance_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"audit_scope" text DEFAULT 'FULL_APP' NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"compliance_score" integer DEFAULT 0 NOT NULL,
	"risk_level" text DEFAULT 'LOW' NOT NULL,
	"total_rules_checked" integer DEFAULT 0 NOT NULL,
	"passed_rules_count" integer DEFAULT 0 NOT NULL,
	"violations_count" integer DEFAULT 0 NOT NULL,
	"warnings_count" integer DEFAULT 0 NOT NULL,
	"pages_audited" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"policy_breakdown" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"full_report_markdown" text,
	"remediation_plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggered_by" text DEFAULT 'ADMIN',
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_agent_brain_memory" (
	"id" serial PRIMARY KEY NOT NULL,
	"memory_type" text DEFAULT 'CONSOLE_ROOT_CAUSE' NOT NULL,
	"fingerprint" text NOT NULL,
	"title" text NOT NULL,
	"page_route" text NOT NULL,
	"module_name" text NOT NULL,
	"component_part" text NOT NULL,
	"trigger_event" text NOT NULL,
	"root_cause_analysis" text NOT NULL,
	"remediation_code" text,
	"confidence_pct" integer DEFAULT 95 NOT NULL,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"first_detected_at" timestamp DEFAULT now() NOT NULL,
	"last_updated_brain_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_agent_brain_memory_fingerprint_unique" UNIQUE("fingerprint")
);
--> statement-breakpoint
CREATE TABLE "ai_strategic_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'COMPLETED' NOT NULL,
	"overall_health_score" integer DEFAULT 0 NOT NULL,
	"adsense_readiness_pct" integer DEFAULT 0 NOT NULL,
	"qa_stability_pct" integer DEFAULT 0 NOT NULL,
	"ux_benchmark_score" integer DEFAULT 0 NOT NULL,
	"agent_runs_ingested" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"executive_summary" text NOT NULL,
	"prioritized_action_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"chronological_roadmap" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cross_agent_synergies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"full_markdown_report" text,
	"action_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"triggered_by" text DEFAULT 'ADMIN',
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_pets" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"pet_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "console_error_telemetry" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"page_route" text DEFAULT '/' NOT NULL,
	"module_name" text DEFAULT 'ClientApp' NOT NULL,
	"component_part" text DEFAULT 'Global',
	"trigger_action" text DEFAULT 'RUNTIME_EVENT',
	"severity" text DEFAULT 'HIGH' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "google_search_console_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"site_url" text DEFAULT 'https://pawshield.ph' NOT NULL,
	"verification_tag" text DEFAULT 'google-site-verification=GSC_PAWSHIELD_AUTH_2026_TOKEN',
	"is_verified" boolean DEFAULT true,
	"sitemap_url" text DEFAULT 'https://pawshield.ph/sitemap.xml',
	"target_country" text DEFAULT 'Philippines (PH)',
	"last_synced_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "owasp_security_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"scan_type" text DEFAULT 'FULL_OWASP_2026' NOT NULL,
	"overall_score" integer DEFAULT 100 NOT NULL,
	"grade" text DEFAULT 'A+' NOT NULL,
	"risk_level" text DEFAULT 'LOW' NOT NULL,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"passed_tests" integer DEFAULT 0 NOT NULL,
	"failed_tests" integer DEFAULT 0 NOT NULL,
	"warning_tests" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer DEFAULT 0 NOT NULL,
	"test_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_summaries" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"remediation_prompts" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"triggered_by" text DEFAULT 'ADMIN',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_rate_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"modality" text NOT NULL,
	"title" text NOT NULL,
	"fixed_new_sitter_rate_php" integer NOT NULL,
	"standard_min_rate_php" integer NOT NULL,
	"standard_max_rate_php" integer NOT NULL,
	"pro_max_rate_php" integer NOT NULL,
	"max_pets_allowed" integer DEFAULT 4 NOT NULL,
	"additional_pet_fee_php" integer DEFAULT 250 NOT NULL,
	"max_extra_pet_fee_php" integer DEFAULT 500,
	"max_puppy_rate_php" integer DEFAULT 400,
	"max_medication_surcharge_php" integer DEFAULT 300,
	"max_holiday_multiplier" numeric(3, 2) DEFAULT '1.50',
	"is_active" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "service_rate_policies_modality_unique" UNIQUE("modality")
);
--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "house_location_address" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "house_location_details" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "intake_questionnaire" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "routine_approval_status" text DEFAULT 'PENDING_APPROVAL';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "routine_proposal_notes" text;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "routine_approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "routine_approved_by" integer;--> statement-breakpoint
ALTER TABLE "pet_care_activities" ADD COLUMN "pet_id" integer;--> statement-breakpoint
ALTER TABLE "pet_care_activities" ADD COLUMN "pet_name" text;--> statement-breakpoint
ALTER TABLE "pet_care_activities" ADD COLUMN "proof_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "photo_url" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "food_type" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "food_grams_per_meal" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "food_frequency" text;--> statement-breakpoint
ALTER TABLE "pets" ADD COLUMN "other_notes" text;--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD COLUMN "sitter_tier" text DEFAULT 'NOVICE';--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD COLUMN "rates_locked" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD COLUMN "rate_approval_status" text DEFAULT 'APPROVED';--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD COLUMN "rate_rejection_reason" text;--> statement-breakpoint
ALTER TABLE "sitter_profiles" ADD COLUMN "max_pets_per_booking" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "sitter_rate_cards" ADD COLUMN "max_pets_per_booking" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "sitter_rate_cards" ADD COLUMN "is_admin_override" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sitter_rate_cards" ADD COLUMN "status" text DEFAULT 'ACTIVE';--> statement-breakpoint
ALTER TABLE "booking_pets" ADD CONSTRAINT "booking_pets_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_pets" ADD CONSTRAINT "booking_pets_pet_id_pets_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pets"("id") ON DELETE cascade ON UPDATE no action;