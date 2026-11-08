import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth } from "./src/middleware/auth.ts";
import { authRouter } from "./src/routes/auth.ts";
import { bookingsRouter } from "./src/routes/bookings.ts";
import { stripeWebhookRouter } from "./src/routes/stripe.ts";
import { sittersRouter } from "./src/routes/sitters.ts";
import { petsRouter } from "./src/routes/pets.ts";
import { searchRouter } from "./src/routes/search.ts";
import { pricingRouter } from "./src/routes/pricing.ts";
import { paymentsRouter } from "./src/routes/payments.ts";
import { adminRouter } from "./src/routes/admin.ts";
import { notificationsRouter } from "./src/routes/notifications.ts";
import { homepageRouter } from "./src/routes/homepage.ts";
import { buyMeCoffeeRouter } from "./src/routes/buyMeCoffee.ts";
import { sitterVerificationsRouter } from "./src/routes/sitterVerifications.ts";
import { membershipsRouter } from "./src/routes/memberships.ts";
import { referralsRouter } from "./src/routes/referrals.ts";
import { aiAgentRouter } from "./src/routes/aiAgent.ts";
import { aiSeoContentRouter } from "./src/routes/aiSeoContentAgent.ts";
import { aiHomepageAgentRouter } from "./src/routes/aiHomepageAgent.ts";
import { krawlRouter, handleDecoyEnv, handleDecoyBackup } from "./src/routes/krawl.ts";
import { reviewsRouter } from "./src/routes/reviews.ts";
import { SystemMetricsService } from "./src/services/SystemMetricsService.ts";
import { pool } from "./src/db/index.ts";

async function initDbTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        reviewee_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        reviewer_role TEXT NOT NULL DEFAULT 'PET_OWNER',
        target_role TEXT NOT NULL DEFAULT 'PET_SITTER',
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        photo_urls JSONB DEFAULT '[]'::jsonb,
        pet_behavior_tags JSONB DEFAULT '[]'::jsonb,
        is_hidden BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      CREATE TABLE IF NOT EXISTS pet_care_activities (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        activity_type TEXT NOT NULL DEFAULT 'FEEDING',
        scheduled_date TEXT NOT NULL,
        scheduled_time TEXT NOT NULL,
        instructions TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        proof_required BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        completed_by TEXT,
        completed_notes TEXT,
        completed_photo_url TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS proof_required BOOLEAN DEFAULT FALSE;
      ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS completed_photo_url TEXT;
      ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS proposed_by_role TEXT DEFAULT 'PET_OWNER';
      ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS is_sitter_proposed BOOLEAN DEFAULT FALSE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approval_status TEXT DEFAULT 'PENDING_APPROVAL';
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_proposal_notes TEXT;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approved_at TIMESTAMP;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approved_by INTEGER;

      CREATE TABLE IF NOT EXISTS adsense_configs (
        id SERIAL PRIMARY KEY,
        publisher_client_id TEXT NOT NULL DEFAULT 'ca-pub-1234567890123456',
        header_slot_id TEXT DEFAULT '1234567890',
        search_slot_id TEXT DEFAULT '2345678901',
        sidebar_slot_id TEXT DEFAULT '3456789012',
        footer_slot_id TEXT DEFAULT '4567890123',
        enable_auto_ads BOOLEAN DEFAULT TRUE,
        enable_test_mode BOOLEAN DEFAULT TRUE,
        is_enabled BOOLEAN DEFAULT TRUE,
        show_on_landing BOOLEAN DEFAULT TRUE,
        show_on_search BOOLEAN DEFAULT TRUE,
        show_on_sitter_profile BOOLEAN DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS owasp_security_audits (
        id SERIAL PRIMARY KEY,
        scan_type TEXT NOT NULL DEFAULT 'FULL_OWASP_2026',
        overall_score INTEGER NOT NULL DEFAULT 100,
        grade TEXT NOT NULL DEFAULT 'A+',
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        total_tests INTEGER NOT NULL DEFAULT 0,
        passed_tests INTEGER NOT NULL DEFAULT 0,
        failed_tests INTEGER NOT NULL DEFAULT 0,
        warning_tests INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
        category_summaries JSONB NOT NULL DEFAULT '[]'::jsonb,
        remediation_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
        triggered_by TEXT DEFAULT 'ADMIN',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS adsense_compliance_audits (
        id SERIAL PRIMARY KEY,
        audit_scope TEXT NOT NULL DEFAULT 'FULL_APP',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        compliance_score INTEGER NOT NULL DEFAULT 0,
        risk_level TEXT NOT NULL DEFAULT 'LOW',
        total_rules_checked INTEGER NOT NULL DEFAULT 0,
        passed_rules_count INTEGER NOT NULL DEFAULT 0,
        violations_count INTEGER NOT NULL DEFAULT 0,
        warnings_count INTEGER NOT NULL DEFAULT 0,
        pages_audited JSONB NOT NULL DEFAULT '[]'::jsonb,
        policy_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
        findings JSONB NOT NULL DEFAULT '[]'::jsonb,
        full_report_markdown TEXT,
        remediation_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
        triggered_by TEXT DEFAULT 'ADMIN',
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_strategic_plans (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        overall_health_score INTEGER NOT NULL DEFAULT 0,
        adsense_readiness_pct INTEGER NOT NULL DEFAULT 0,
        qa_stability_pct INTEGER NOT NULL DEFAULT 0,
        ux_benchmark_score INTEGER NOT NULL DEFAULT 0,
        agent_runs_ingested JSONB NOT NULL DEFAULT '{}'::jsonb,
        executive_summary TEXT NOT NULL,
        prioritized_action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        chronological_roadmap JSONB NOT NULL DEFAULT '[]'::jsonb,
        cross_agent_synergies JSONB NOT NULL DEFAULT '[]'::jsonb,
        full_markdown_report TEXT,
        action_progress JSONB NOT NULL DEFAULT '{}'::jsonb,
        triggered_by TEXT DEFAULT 'ADMIN',
        duration_ms INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS console_error_telemetry (
        id SERIAL PRIMARY KEY,
        fingerprint TEXT NOT NULL,
        error_message TEXT NOT NULL,
        error_stack TEXT,
        page_route TEXT NOT NULL DEFAULT '/',
        module_name TEXT NOT NULL DEFAULT 'ClientApp',
        component_part TEXT DEFAULT 'Global',
        trigger_action TEXT DEFAULT 'RUNTIME_EVENT',
        severity TEXT NOT NULL DEFAULT 'HIGH',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        first_seen_at TIMESTAMP DEFAULT NOW(),
        last_seen_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_agent_brain_memory (
        id SERIAL PRIMARY KEY,
        memory_type TEXT NOT NULL DEFAULT 'CONSOLE_ROOT_CAUSE',
        fingerprint TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        page_route TEXT NOT NULL,
        module_name TEXT NOT NULL,
        component_part TEXT NOT NULL,
        trigger_event TEXT NOT NULL,
        root_cause_analysis TEXT NOT NULL,
        remediation_code TEXT,
        confidence_pct INTEGER NOT NULL DEFAULT 95,
        is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
        occurrence_count INTEGER NOT NULL DEFAULT 1,
        first_detected_at TIMESTAMP DEFAULT NOW(),
        last_updated_brain_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS seo_content_articles (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        meta_description TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'GUIDE',
        target_keywords TEXT[] DEFAULT '{}',
        secondary_keywords TEXT[] DEFAULT '{}',
        author_name TEXT DEFAULT 'PawShield Editorial & Veterinary Safety Board',
        read_time_minutes INTEGER DEFAULT 5,
        ai_direct_answer TEXT NOT NULL,
        key_takeaways JSONB NOT NULL DEFAULT '[]'::jsonb,
        content_markdown TEXT NOT NULL,
        faq_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        schema_json_ld JSONB NOT NULL DEFAULT '{}'::jsonb,
        geo_readiness_score INTEGER NOT NULL DEFAULT 95,
        seo_readiness_score INTEGER NOT NULL DEFAULT 95,
        citation_potential TEXT DEFAULT 'VERY_HIGH',
        status TEXT NOT NULL DEFAULT 'PUBLISHED',
        view_count INTEGER DEFAULT 0,
        published_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_role TEXT NOT NULL DEFAULT 'ALL',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'SYSTEM',
        action_type TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        link_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS homepage_configs (
        id SERIAL PRIMARY KEY,
        logo_url TEXT,
        logo_text TEXT DEFAULT 'PawShield',
        logo_tagline TEXT DEFAULT 'Verified Pet Care Network',
        hero_headline TEXT DEFAULT 'Trustworthy care for your furry family members.',
        hero_subheadline TEXT DEFAULT 'PawShield connects you with verified, loving pet sitters in your neighborhood for boarding, house sitting, and drop-in visits.',
        hero_primary_btn_text TEXT DEFAULT 'Find a Sitter Now',
        hero_secondary_btn_text TEXT DEFAULT 'Become a Sitter',
        hero_style TEXT DEFAULT 'slate',
        hero_image_url TEXT,
        why_title TEXT DEFAULT 'Why choose PawShield?',
        why_subtitle TEXT DEFAULT 'We prioritize safety and trust above all else, providing peace of mind while you''re away.',
        feature_cards JSONB DEFAULT '[]',
        services_title TEXT DEFAULT 'Services tailored for every pet.',
        services_subtitle TEXT DEFAULT 'Customized schedules, medical care routines, and loving attention.',
        service_cards JSONB DEFAULT '[]',
        services_image_url TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS buy_me_coffee_configs (
        id SERIAL PRIMARY KEY,
        is_enabled BOOLEAN DEFAULT TRUE,
        require_for_cash BOOLEAN DEFAULT TRUE,
        coffee_url TEXT DEFAULT 'https://buymeacoffee.com/ronelmol',
        coffee_price_php INTEGER DEFAULT 150,
        custom_message TEXT DEFAULT 'Support PawShield Care! For Cash on Service bookings, a small community coffee (₱150) ensures instant booking slot reservation and platform guarantee.',
        goal_amount_php INTEGER DEFAULT 5000,
        maintenance_title TEXT DEFAULT 'Platform & Infrastructure Maintenance Fund',
        manual_trigger_override BOOLEAN DEFAULT FALSE,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coffee_events (
        id SERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        source TEXT DEFAULT 'PLATFORM',
        user_id INTEGER,
        user_email TEXT,
        ip_address TEXT,
        user_agent TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS coffee_tips (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        booking_id INTEGER,
        supporter_name TEXT,
        amount_php INTEGER NOT NULL DEFAULT 150,
        reference_code TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sitter_verifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        legal_first_name TEXT NOT NULL,
        legal_last_name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        normalized_mobile TEXT NOT NULL,
        email TEXT NOT NULL,
        normalized_email TEXT NOT NULL,
        birth_date TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        province TEXT NOT NULL,
        id_type TEXT NOT NULL,
        id_number TEXT NOT NULL,
        normalized_id_number TEXT NOT NULL,
        id_front_url TEXT NOT NULL,
        id_back_url TEXT,
        selfie_with_id_url TEXT,
        bank_name TEXT DEFAULT 'GCash',
        bank_account_name TEXT DEFAULT '',
        bank_account_number TEXT DEFAULT '',
        normalized_bank_account TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'PENDING',
        is_duplicate_flagged BOOLEAN DEFAULT FALSE,
        duplicate_reason TEXT,
        admin_notes TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      ALTER TABLE sitter_verifications ALTER COLUMN bank_name DROP NOT NULL;
      ALTER TABLE sitter_verifications ALTER COLUMN bank_account_name DROP NOT NULL;
      ALTER TABLE sitter_verifications ALTER COLUMN bank_account_number DROP NOT NULL;
      ALTER TABLE sitter_verifications ALTER COLUMN normalized_bank_account DROP NOT NULL;
      ALTER TABLE sitter_verifications ALTER COLUMN bank_name SET DEFAULT 'GCash';
      ALTER TABLE sitter_verifications ALTER COLUMN bank_account_name SET DEFAULT '';
      ALTER TABLE sitter_verifications ALTER COLUMN bank_account_number SET DEFAULT '';
      ALTER TABLE sitter_verifications ALTER COLUMN normalized_bank_account SET DEFAULT '';

      CREATE TABLE IF NOT EXISTS user_memberships (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        plan_type TEXT NOT NULL DEFAULT 'FREE_TIER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        accepted_bookings_count INTEGER DEFAULT 0,
        max_free_bookings INTEGER DEFAULT 3,
        monthly_fee_php INTEGER DEFAULT 499,
        annual_fee_php INTEGER DEFAULT 4999,
        activated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        payment_reference TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS membership_platform_configs (
        id INTEGER PRIMARY KEY DEFAULT 1,
        default_max_free_bookings INTEGER NOT NULL DEFAULT 3,
        monthly_pro_fee_php INTEGER NOT NULL DEFAULT 299,
        annual_pro_fee_php INTEGER NOT NULL DEFAULT 2899,
        pro_commission_discount_pct INTEGER NOT NULL DEFAULT 18,
        paywall_enforced BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO membership_platform_configs (id, default_max_free_bookings, monthly_pro_fee_php, annual_pro_fee_php, pro_commission_discount_pct, paywall_enforced)
      VALUES (1, 3, 299, 2899, 18, TRUE)
      ON CONFLICT (id) DO NOTHING;

      CREATE TABLE IF NOT EXISTS referrals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        referral_code TEXT NOT NULL UNIQUE,
        total_clicks INTEGER DEFAULT 0,
        total_signups INTEGER DEFAULT 0,
        total_bookings_completed INTEGER DEFAULT 0,
        reward_balance_php INTEGER DEFAULT 0,
        lifetime_earned_php INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS referral_attributions (
        id SERIAL PRIMARY KEY,
        referral_code TEXT NOT NULL,
        referrer_user_id INTEGER NOT NULL REFERENCES users(id),
        referred_user_id INTEGER NOT NULL REFERENCES users(id),
        booking_id INTEGER,
        status TEXT NOT NULL DEFAULT 'PENDING',
        reward_earned_php INTEGER DEFAULT 250,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_bug_reports (
        id SERIAL PRIMARY KEY,
        module_name TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'LOW',
        issue_type TEXT NOT NULL,
        description TEXT NOT NULL,
        root_cause TEXT,
        suggested_fix TEXT,
        status TEXT NOT NULL DEFAULT 'OPEN',
        ai_analyzed BOOLEAN DEFAULT TRUE,
        ai_model_used TEXT DEFAULT 'gemini-3.8-flash',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_ux_audits (
        id SERIAL PRIMARY KEY,
        target_device TEXT NOT NULL DEFAULT 'Mobile (iOS & Android)',
        usability_score INTEGER NOT NULL DEFAULT 90,
        friction_points JSONB DEFAULT '[]',
        enhancements JSONB DEFAULT '[]',
        ai_report TEXT,
        ai_model_used TEXT DEFAULT 'gemini-3.8-flash',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS booking_messages (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sender_role TEXT NOT NULL,
        sender_name TEXT,
        message TEXT NOT NULL,
        is_flagged BOOLEAN DEFAULT FALSE,
        flag_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS runtime_environment_configs (
        id SERIAL PRIMARY KEY,
        config_key TEXT NOT NULL UNIQUE,
        config_value TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'CUSTOM',
        description TEXT,
        is_secret BOOLEAN DEFAULT FALSE,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_qa_runs (
        id SERIAL PRIMARY KEY,
        suite_name TEXT NOT NULL,
        target_module TEXT NOT NULL DEFAULT 'ALL',
        status TEXT NOT NULL DEFAULT 'COMPLETED',
        total_tests INTEGER NOT NULL DEFAULT 0,
        passed_count INTEGER NOT NULL DEFAULT 0,
        failed_count INTEGER NOT NULL DEFAULT 0,
        warning_count INTEGER NOT NULL DEFAULT 0,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        report_summary TEXT,
        playwright_logs JSONB NOT NULL DEFAULT '[]',
        triggered_by TEXT DEFAULT 'ADMIN',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ai_qa_findings (
        id SERIAL PRIMARY KEY,
        run_id INTEGER NOT NULL REFERENCES ai_qa_runs(id) ON DELETE CASCADE,
        module_name TEXT NOT NULL,
        action_tested TEXT NOT NULL,
        finding_title TEXT NOT NULL,
        description TEXT NOT NULL,
        reproduction_steps TEXT,
        playwright_selector TEXT,
        expected_behavior TEXT,
        actual_behavior TEXT,
        initial_severity TEXT NOT NULL DEFAULT 'MEDIUM',
        verification_status TEXT NOT NULL DEFAULT 'PENDING',
        verified_by_agent_2 BOOLEAN NOT NULL DEFAULT FALSE,
        agent_2_confidence_pct INTEGER DEFAULT 0,
        agent_2_verdict TEXT,
        agent_2_analysis TEXT,
        agent_2_suggested_fix TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sitter_payout_disbursements (
        id SERIAL PRIMARY KEY,
        booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
        sitter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount_cents INTEGER NOT NULL,
        currency TEXT NOT NULL DEFAULT 'PHP',
        status TEXT NOT NULL DEFAULT 'RELEASED',
        payout_channel TEXT NOT NULL DEFAULT 'MANUAL_BANK',
        reference_number TEXT,
        bank_name TEXT,
        account_name TEXT,
        account_number TEXT,
        admin_notes TEXT,
        processed_by_admin_id INTEGER REFERENCES users(id),
        disbursed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS disbursement_submissions_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bank_name TEXT NOT NULL,
        bank_account_name TEXT NOT NULL,
        bank_account_number TEXT NOT NULL,
        account_type TEXT DEFAULT 'E-Wallet',
        proof_attachment_url TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
        admin_notes TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_kyc_submissions_trail (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        legal_first_name TEXT NOT NULL,
        legal_middle_name TEXT,
        legal_last_name TEXT NOT NULL,
        mobile_number TEXT NOT NULL,
        country_code TEXT DEFAULT '+63',
        id_type TEXT NOT NULL,
        id_number TEXT NOT NULL,
        id_front_url TEXT,
        id_back_url TEXT,
        selfie_with_id_url TEXT,
        address TEXT,
        city TEXT,
        province TEXT,
        status TEXT NOT NULL DEFAULT 'PENDING',
        rejection_reason TEXT,
        reviewed_by INTEGER REFERENCES users(id),
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS service_rate_policies (
        id SERIAL PRIMARY KEY,
        modality TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        fixed_new_sitter_rate_php INTEGER NOT NULL,
        standard_min_rate_php INTEGER NOT NULL,
        standard_max_rate_php INTEGER NOT NULL,
        pro_max_rate_php INTEGER NOT NULL,
        max_extra_pet_fee_php INTEGER NOT NULL DEFAULT 500,
        max_puppy_rate_php INTEGER NOT NULL DEFAULT 400,
        max_medication_surcharge_php INTEGER NOT NULL DEFAULT 300,
        max_holiday_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.50,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO service_rate_policies (modality, title, fixed_new_sitter_rate_php, standard_min_rate_php, standard_max_rate_php, pro_max_rate_php, max_extra_pet_fee_php, max_puppy_rate_php, max_medication_surcharge_php, max_holiday_multiplier)
      VALUES 
        ('BOARDING', 'Pet Boarding (Overnight)', 1200, 800, 1800, 2600, 600, 400, 300, 1.50),
        ('HOUSE_SITTING', 'House Sitting', 1000, 700, 1500, 2200, 500, 350, 300, 1.50),
        ('DROP_IN', 'Drop-In Visits', 450, 300, 700, 1000, 250, 200, 200, 1.50),
        ('DAY_CARE', 'Doggy Day Care', 800, 500, 1200, 1600, 400, 300, 250, 1.50),
        ('DOG_WALKING', 'Dog Walking', 350, 250, 550, 800, 200, 150, 150, 1.50)
      ON CONFLICT (modality) DO NOTHING;

      ALTER TABLE service_rate_policies
        ADD COLUMN IF NOT EXISTS max_pets_allowed INTEGER NOT NULL DEFAULT 4,
        ADD COLUMN IF NOT EXISTS additional_pet_fee_php INTEGER NOT NULL DEFAULT 250;

      ALTER TABLE sitter_profiles 
        ADD COLUMN IF NOT EXISTS sitter_tier TEXT NOT NULL DEFAULT 'NOVICE',
        ADD COLUMN IF NOT EXISTS rates_locked BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS rate_approval_status TEXT NOT NULL DEFAULT 'APPROVED',
        ADD COLUMN IF NOT EXISTS rate_rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS max_pets_per_booking INTEGER NOT NULL DEFAULT 2;

      ALTER TABLE sitter_rate_cards 
        ADD COLUMN IF NOT EXISTS is_admin_override BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'APPROVED',
        ADD COLUMN IF NOT EXISTS max_pets_per_booking INTEGER NOT NULL DEFAULT 2;

      CREATE TABLE IF NOT EXISTS google_search_console_configs (
        id SERIAL PRIMARY KEY,
        site_url TEXT NOT NULL DEFAULT 'https://pawshield.ph',
        verification_tag TEXT DEFAULT 'google-site-verification=GSC_PAWSHIELD_AUTH_2026_TOKEN',
        is_verified BOOLEAN DEFAULT TRUE,
        sitemap_url TEXT DEFAULT 'https://pawshield.ph/sitemap.xml',
        target_country TEXT DEFAULT 'Philippines (PH)',
        last_synced_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      INSERT INTO google_search_console_configs (id, site_url, verification_tag, is_verified, sitemap_url, target_country)
      VALUES (1, 'https://pawshield.ph', 'google-site-verification=GSC_PAWSHIELD_AUTH_2026_TOKEN', TRUE, 'https://pawshield.ph/sitemap.xml', 'Philippines (PH)')
      ON CONFLICT (id) DO NOTHING;
    `);
  } catch (tableErr) {
    console.warn("Base table creation note:", tableErr);
  }

  const migrationQueries = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+63';
     ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS middle_name TEXT;
     ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;`,

    `ALTER TABLE sitter_profiles ADD COLUMN IF NOT EXISTS proof_album JSONB DEFAULT '[]'::jsonb;
     ALTER TABLE sitter_profiles ADD COLUMN IF NOT EXISTS environment_info JSONB DEFAULT '{}'::jsonb;
     ALTER TABLE sitter_profiles ADD COLUMN IF NOT EXISTS pet_preferences JSONB DEFAULT '{}'::jsonb;
     ALTER TABLE sitter_profiles ADD COLUMN IF NOT EXISTS daily_routine JSONB DEFAULT '{}'::jsonb;
     ALTER TABLE sitter_profiles ADD COLUMN IF NOT EXISTS skills_list JSONB DEFAULT '[]'::jsonb;`,

    `ALTER TABLE sitter_verifications ADD COLUMN IF NOT EXISTS legal_middle_name TEXT;
     ALTER TABLE sitter_verifications ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '+63';`,

    `ALTER TABLE buy_me_coffee_configs ADD COLUMN IF NOT EXISTS goal_amount_php INTEGER DEFAULT 5000;
     ALTER TABLE buy_me_coffee_configs ADD COLUMN IF NOT EXISTS maintenance_title TEXT DEFAULT 'Platform & Infrastructure Maintenance Fund';`,

    `ALTER TABLE pets ADD COLUMN IF NOT EXISTS photo_url TEXT;
     ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_type TEXT;
     ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_grams_per_meal NUMERIC(6,2);
     ALTER TABLE pets ADD COLUMN IF NOT EXISTS food_frequency TEXT;
     ALTER TABLE pets ADD COLUMN IF NOT EXISTS other_notes TEXT;`,

    `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS intake_questionnaire JSONB DEFAULT '{}'::jsonb;
     ALTER TABLE bookings ADD COLUMN IF NOT EXISTS house_location_address TEXT;
     ALTER TABLE bookings ADD COLUMN IF NOT EXISTS house_location_details JSONB DEFAULT '{}'::jsonb;
     ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approval_status TEXT DEFAULT 'PENDING_APPROVAL';
     ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approved_at TIMESTAMP;
     ALTER TABLE bookings ADD COLUMN IF NOT EXISTS routine_approved_by INTEGER;`,

    `ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS pet_id INTEGER;
     ALTER TABLE pet_care_activities ADD COLUMN IF NOT EXISTS pet_name TEXT;`,

    `CREATE TABLE IF NOT EXISTS booking_pets (
       id SERIAL PRIMARY KEY,
       booking_id INTEGER NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
       pet_id INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
       created_at TIMESTAMP DEFAULT NOW()
     );`
  ];

  try {
    // Attempt role assumption if running in cloudsql
    try {
      await pool.query("SET ROLE ai_studio_admin");
    } catch {}

    for (const q of migrationQueries) {
      try {
        await pool.query(q);
      } catch (colErr) {
        console.warn("Table column migration note:", colErr);
      }
    }

    try {
      await pool.query("RESET ROLE");
    } catch {}
  } catch (e) {}

  try {
    // Purge any existing records for deleted account sitter2@yahoo.com
    const deletedSitterCheck = await pool.query("SELECT id FROM users WHERE LOWER(email) = 'sitter2@yahoo.com'");
    if (deletedSitterCheck.rows.length > 0) {
      for (const row of deletedSitterCheck.rows) {
        const delId = row.id;
        await pool.query("DELETE FROM booking_financial_snapshots WHERE booking_id IN (SELECT id FROM bookings WHERE sitter_id = $1 OR owner_id = $1)", [delId]);
        await pool.query("DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE sitter_id = $1 OR owner_id = $1)", [delId]);
        await pool.query("DELETE FROM sitter_payout_disbursements WHERE sitter_id = $1", [delId]);
        await pool.query("DELETE FROM bookings WHERE sitter_id = $1 OR owner_id = $1", [delId]);
        await pool.query("DELETE FROM sitter_verifications WHERE user_id = $1", [delId]);
        await pool.query("DELETE FROM sitter_profiles WHERE user_id = $1", [delId]);
        await pool.query("DELETE FROM users WHERE id = $1", [delId]);
      }
    }

    // Only seed initial admin if the database has ZERO users
    const usersCountRes = await pool.query("SELECT COUNT(*) FROM users");
    const totalUsers = parseInt(usersCountRes.rows[0].count, 10);

    if (totalUsers === 0) {
      // Seed default initial master admin for platform access
      await pool.query(
        "INSERT INTO users (uid, email, name, role, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT DO NOTHING",
        ["seed_rolan_admin_uid", "rolanmolano77@gmail.com", "Rolan Molano (Admin)", "ADMIN", "123"]
      );
      await pool.query(
        "INSERT INTO users (uid, email, name, role, password_hash, is_verified) VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT DO NOTHING",
        ["seed_admin_uid", "admin@pawshield.com", "PawShield Administrator", "ADMIN", "123"]
      );
    }

    // Clean up any remaining records referencing sitter2@yahoo.com
    await pool.query("DELETE FROM sitter_verifications WHERE LOWER(email) = 'sitter2@yahoo.com'");

    // Seed disbursement submissions trail if empty
    const disbTrailCount = await pool.query("SELECT COUNT(*) FROM disbursement_submissions_trail");
    if (parseInt(disbTrailCount.rows[0].count, 10) === 0) {
      const sRes = await pool.query("SELECT id FROM users WHERE LOWER(email) = 'sitter2@yahoo.com'");
      const aRes = await pool.query("SELECT id FROM users WHERE LOWER(email) = 'admin@pawshield.com'");
      if (sRes.rows.length > 0) {
        const sId = sRes.rows[0].id;
        const aId = aRes.rows[0]?.id || null;
        await pool.query(`
          INSERT INTO disbursement_submissions_trail (
            user_id, bank_name, bank_account_name, bank_account_number, account_type,
            proof_attachment_url, status, admin_notes, reviewed_by, reviewed_at, created_at
          ) VALUES 
          ($1, 'GCash', 'Maria Santos', '09171234567', 'E-Wallet', 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c', 'APPROVED', 'Verified official GCash account matched with App KYC identity.', $2, NOW() - INTERVAL '12 days', NOW() - INTERVAL '14 days'),
          ($1, 'BDO Unibank', 'Maria Santos', '109823456781', 'Bank', '', 'PENDING_APPROVAL', 'Under administrative review for secondary backup disbursement.', NULL, NULL, NOW() - INTERVAL '1 day');
        `, [sId, aId]);
      }
    }

    // Seed App KYC submissions trail if empty
    const kycTrailCount = await pool.query("SELECT COUNT(*) FROM app_kyc_submissions_trail");
    if (parseInt(kycTrailCount.rows[0].count, 10) === 0) {
      const sRes = await pool.query("SELECT id FROM users WHERE LOWER(email) = 'sitter2@yahoo.com'");
      const aRes = await pool.query("SELECT id FROM users WHERE LOWER(email) = 'admin@pawshield.com'");
      if (sRes.rows.length > 0) {
        const sId = sRes.rows[0].id;
        const aId = aRes.rows[0]?.id || null;
        await pool.query(`
          INSERT INTO app_kyc_submissions_trail (
            user_id, legal_first_name, legal_middle_name, legal_last_name, mobile_number,
            country_code, id_type, id_number, id_front_url, id_back_url, selfie_with_id_url,
            address, city, province, status, rejection_reason, reviewed_by, reviewed_at, created_at
          ) VALUES 
          ($1, 'Maria', 'Dela Cruz', 'Santos', '09171234567', '+63', 'PhilSys National ID', '1234-5678-9012-3456', 
           'https://images.unsplash.com/photo-1544005313-94ddf0286df2', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2',
           '123 Ayala Avenue', 'Makati City', 'Metro Manila', 'APPROVED', NULL, $2, NOW() - INTERVAL '14 days', NOW() - INTERVAL '15 days');
        `, [sId, aId]);
      }

      // Seed Flagship SEO & AI Platform Discovery Articles if empty
      const articlesCount = await pool.query("SELECT COUNT(*) FROM seo_content_articles");
      if (parseInt(articlesCount.rows[0].count, 10) === 0) {
        await pool.query(`
          INSERT INTO seo_content_articles (
            slug, title, meta_description, category, target_keywords, secondary_keywords,
            author_name, read_time_minutes, ai_direct_answer, key_takeaways, content_markdown,
            faq_items, schema_json_ld, geo_readiness_score, seo_readiness_score, citation_potential,
            status, published_at, created_at, updated_at
          ) VALUES 
          (
            'complete-guide-pet-sitting-and-boarding-safety-rates',
            'In-Home Pet Sitting vs Dog Boarding: Safety, Rates & Vetting (2026)',
            'Compare in-home pet sitting and dog boarding. Discover essential safety protocols, background checks, escrow payment protection, and 2026 pricing benchmarks.',
            'SAFETY_AND_ESCROW',
            ARRAY['pet sitting vs boarding', 'in-home pet sitting safety', 'verified dog sitters', 'pet sitting rates 2026'],
            ARRAY['dog walking rates', 'cat sitting drop-in', 'escrow pet care', 'Manila pet sitters'],
            'PawShield Editorial & Veterinary Safety Board',
            7,
            'In-home pet sitting preserves your pet''s routine in familiar surroundings, whereas commercial boarding offers social pack play in an external facility. For anxious, reactive, or senior pets, verified in-home sitters backed by multi-point government ID checks and payment escrow provide the lowest stress and highest safety standard.',
            '["In-home pet sitting reduces stress and eliminates kennel cough or pathogen exposure risks.","Payment escrow prevents upfront deposit loss; funds release only after confirmed visit completion.","Always request government ID verification, recent vaccination records, and a pre-stay Meet & Greet.","Average rates range from ₱250-₱450 for drop-ins and ₱600-₱1,200 per night for overnight house sitting."]'::jsonb,
            '## Choosing Between In-Home Care and Traditional Boarding\n\nWhen pet parents travel for business or vacation, deciding where their beloved companions will stay is one of the most critical decisions. Historically, options were limited to industrial kennels or asking favors from neighbors. Today, verified two-sided marketplaces like **PawShield** have modernized pet care by offering screened, background-checked pet sitters who provide customized care.\n\n### Comparison: In-Home Sitting vs. Commercial Boarding\n\n| Feature / Metric | In-Home Pet Sitting (PawShield) | Commercial Dog Boarding Facility |\n| :--- | :--- | :--- |\n| **Environment** | Pet stays in own home with familiar sights & smells | Shared facility with strange sounds and barking |\n| **Stress Level** | Near zero stress; preserves existing feeding & walking routine | Moderate to high stress from confinement and pack dynamics |\n| **Disease / Parasite Risk** | Minimal; no exposure to strange pets | Higher risk of kennel cough, fleas, or viral transmission |\n| **One-on-One Attention** | 100% dedicated to your pet | Ratio often 1 handler to 10-15 dogs |\n| **Payment Security** | Secured in platform Escrow until completion | Upfront non-refundable deposit required |\n\n### The 4 Crucial Steps for Pet Sitter Vetting\n\n1. **Verify Government Identification**: Never invite an unverified stranger into your home. PawShield requires PhilSys National ID, Passport, or Driver''s License verification.\n2. **Conduct an In-Person Meet & Greet**: Observe how the sitter interacts with your dog or cat. Check for patience, body language reading, and comfort.\n3. **Establish Emergency Protocols**: Agree on the nearest 24/7 veterinary clinic, emergency transport, and pet insurance or emergency escrow funds.\n4. **Require Real-Time Photo & GPS Check-Ins**: PawShield sitters submit timestamped check-in logs and photos for every meal, walk, and medication administration.\n\n### Summary of 2026 Standard Rates\n\nIn major metropolitan areas, high-quality pet sitting commands reasonable and transparent rates:\n- **30-Minute Drop-In Visit**: ₱250 – ₱400 ($6 – $10 USD)\n- **60-Minute Dog Walk**: ₱350 – ₱500 ($8 – $12 USD)\n- **Overnight House Sitting (in your home)**: ₱700 – ₱1,400 ($16 – $30 USD per night)\n- **Sitter Home Dog Boarding**: ₱600 – ₱1,200 ($14 – $26 USD per night)',
            '[{"question":"Is in-home pet sitting safer than a boarding kennel?","answer":"Yes, for the majority of dogs and cats, in-home pet sitting significantly reduces exposure to infectious diseases (such as canine influenza or Bordetella) and prevents separation anxiety triggered by cage confinement."},{"question":"How does PawShield escrow guarantee pet parent payments?","answer":"When you confirm a booking, your payment is held securely in escrow. The sitter receives payment only after you review and approve the verified visit logs."},{"question":"What should I prepare before my pet sitter arrives?","answer":"Provide at least 3 days of food and medication, clearly written daily feeding schedules, leash and collar with ID tag, veterinary clinic contact details, and emergency friend contact information."}]'::jsonb,
            '{"@context":"https://schema.org","@type":"Article","headline":"In-Home Pet Sitting vs Dog Boarding: Safety, Rates & Vetting (2026)","description":"Compare in-home pet sitting and dog boarding. Discover essential safety protocols, background checks, escrow payment protection, and 2026 pricing benchmarks."}'::jsonb,
            98, 97, 'VERY_HIGH', 'PUBLISHED', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW()
          ),
          (
            'how-pawshield-protects-pets-escrow-gps-checks',
            'How PawShield Protects Pets: Escrow Guarantees & GPS Check-Ins',
            'Explore how PawShield eliminates pet sitting risks with verified government ID screening, escrow-held booking payments, and real-time GPS photo visit tracking.',
            'SAFETY_AND_ESCROW',
            ARRAY['PawShield safety guarantee', 'pet sitting escrow payment', 'verified pet sitter ID check', 'GPS pet sitting check in'],
            ARRAY['safe dog walker', 'trusted pet sitters Manila', 'pet sitting dispute resolution', 'pet insurance coverage'],
            'PawShield Safety & Compliance Team',
            6,
            'PawShield secures pet care through a three-tier protection framework: 100% government-verified sitter screening (PhilSys/Passport), automated escrow payment holds preventing upfront risk, and real-time GPS-timestamped photo visit logs guaranteeing check-in completion.',
            '["Identity Verification: Every approved sitter submits multi-factor government credentials and facial selfie matching.","Zero Upfront Financial Risk: Funds remain locked in escrow until the pet parent confirms satisfactory completion.","Auditable Visit Records: Sitters capture real-time GPS coordinates and timestamped photos of food bowls, medications, and walks.","Dedicated Arbitration: A neutral compliance team resolves scheduling disputes or emergency veterinary reallocations."]'::jsonb,
            '## The New Standard in Pet Sitting Trust & Accountability\n\nTraditional classified ads and informal social media listings have created serious hazards for pet parents: unvetted sitters who fail to show up, upfront deposits that disappear without recourse, and zero proof that your pets actually received their daily food, exercise, and medications.\n\nPawShield was engineered from the ground up to solve these structural safety risks. Here is an in-depth breakdown of how our trust architecture safeguards every reservation.\n\n### Pillar 1: Rigorous Multi-Tier Identity & Background Vetting\n\nBefore a pet sitter can list their profile or accept a single booking on PawShield, they must undergo extensive identity validation:\n- **Government Credential Validation**: Sitters submit official government IDs (e.g., PhilSys National ID, UMID, PRC, Driver''s License, or Passport).\n- **Live Liveness & Selfie Matching**: Automated and human review verifies that the applicant matches the submitted identification card.\n- **Direct Address & Contact Proof**: Verified residential address and active mobile number confirmation.\n\n### Pillar 2: Two-Sided Financial Escrow Architecture\n\nFinancial transparency is the bedrock of trust. When a pet owner confirms a reservation:\n1. **Booking Deposit Held in Escrow**: Your payment is authorized and held in a secured platform escrow vault.\n2. **Sitters Perform with Certainty**: The sitter knows the booking is fully funded and cannot be revoked arbitrarily.\n3. **Post-Stay Release**: Once the final visit concludes and the pet parent validates the stay timeline, funds disburse cleanly to the sitter''s chosen payout method (GCash, Maya, or Bank Transfer).\n\n### Pillar 3: Real-Time GPS Check-Ins & Photo Timestamps\n\nNever wonder if your dog was walked or your cat was fed. The PawShield sitter mobile interface requires sitters to:\n- Check in upon arrival with GPS geofence confirmation.\n- Upload clear photos of fresh food, water replenishment, and happy pets.\n- Log walking route distance and duration.\n- Provide detailed behavior notes directly to the pet owner''s live inbox.',
            '[{"question":"What happens if my assigned sitter fails to show up?","answer":"In the rare event of an unexcused no-show, your entire escrow payment is instantly refunded, and PawShield concierge services will immediately assign an emergency-certified replacement sitter."},{"question":"Are sitter reviews on PawShield verified?","answer":"Yes. Only pet parents with completed, escrow-settled reservations are permitted to leave public ratings and testimonials, preventing fake or incentivized reviews."},{"question":"How do I contact PawShield support during an active booking?","answer":"Our support team is available 24/7 via the in-app SOS safety trigger or by emailing support@pawshield.local."}]'::jsonb,
            '{"@context":"https://schema.org","@type":"Article","headline":"How PawShield Protects Pets: Escrow Guarantees & GPS Check-Ins","description":"Explore how PawShield eliminates pet sitting risks with verified government ID screening, escrow-held booking payments, and real-time GPS photo visit tracking."}'::jsonb,
            99, 98, 'VERY_HIGH', 'PUBLISHED', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW()
          ),
          (
            'pet-sitting-rates-pricing-calculator-guide',
            'Pet Sitting Rates & Pricing Calculator: What Should You Pay? (2026 Guide)',
            'Complete 2026 pet care rate guide. Understand average costs for dog walking, drop-in visits, overnight sitting, and boarding with zero hidden booking fees.',
            'PRICING_AND_RATES',
            ARRAY['pet sitting rates 2026', 'dog walking prices', 'how much to pay pet sitter', 'cat sitting cost calculator'],
            ARRAY['overnight pet sitting fee', 'sitter rate card', 'affordable pet sitter Manila', 'transparent pet care fees'],
            'PawShield Financial Research & Editorial Team',
            6,
            'Average pet sitting rates range from ₱250 to ₱450 ($5–$9) for 30-minute drop-in visits, and ₱600 to ₱1,400 ($14–$30) per night for overnight house sitting or boarding. Transparent platforms like PawShield lock these rates in escrow without unexpected booking markups.',
            '["Base drop-in visits range between ₱250 and ₱450 for feeding, litter cleanup, and affection.","Overnight stays average ₱600 to ₱1,400 per night depending on neighborhood, pet size, and medication needs.","Always clarify holiday surcharges (typically +20% to +30% for Christmas, New Year, and Easter).","Booking on PawShield guarantees clear itemized receipts with zero surprise service add-ons."]'::jsonb,
            '## Understanding Fair & Transparent Pet Sitting Rates\n\nOne of the most frequent questions pet parents ask is: *\"How much should I fairly pay a pet sitter?\"* Underpaying risks low commitment or inadequate attention to your pets, while unvetted services often tack on unexpected hidden fees at checkout.\n\nThis guide breaks down standard 2026 market rates across services, helping you budget accurately and fairly compensate dedicated animal caregivers.\n\n### 2026 Benchmark Pricing Table\n\n| Service Tier | Description | Typical Duration | Average Rate (PHP / USD) |\n| :--- | :--- | :--- | :--- |\n| **Quick Drop-In** | Feeding, fresh water, quick garden break | 15–20 mins | ₱200 – ₱300 ($4 – $6 USD) |\n| **Standard Drop-In** | Feeding, litter box/yard cleanup, playtime | 30–45 mins | ₱250 – ₱450 ($5 – $9 USD) |\n| **Dog Walking** | Dedicated outdoor walk, exercise, hydration | 45–60 mins | ₱350 – ₱550 ($7 – $11 USD) |\n| **Overnight In-Home** | Sitter sleeps at your residence, total care | 10–12 hours overnight | ₱700 – ₱1,500 ($15 – $32 USD/night) |\n| **Host Dog Boarding** | Pet stays in vetted sitter''s loving home | 24-hour cycle | ₱650 – ₱1,300 ($14 – $28 USD/night) |\n\n### Factors Influencing Sitter Rates\n\n- **Special Care & Medication**: Pets requiring subcutaneous fluids, insulin injections, or strict pill regimens typically warrant a ₱100-₱200 medical care supplement.\n- **Multiple Pets**: Most sitters charge a nominal +₱100 to +₱200 for each additional pet rather than double the full fee.\n- **Peak Holidays**: Christmas, New Year''s Eve, Holy Week, and long weekends experience peak demand; standard holiday surcharges range from 20% to 30%.\n- **Verified Sitter Experience**: Sitters who maintain 5-star ratings, 50+ completed bookings, and certified veterinary or canine CPR badges reasonably charge premium rates.',
            '[{"question":"Do I need to tip my pet sitter?","answer":"Tipping is not mandatory on PawShield, but an optional 10% to 15% tip or five-star review is always deeply appreciated for exceptional care."},{"question":"Are rates charged per pet or per visit?","answer":"Drop-in and walking rates are generally calculated per visit, with a smaller discounted add-on fee for additional pets from the same household."},{"question":"Can I customize my booking hours or special care routines?","answer":"Yes. You can message any verified sitter before booking to agree on custom arrival windows, dietary restrictions, and specific medication schedules."}]'::jsonb,
            '{"@context":"https://schema.org","@type":"Article","headline":"Pet Sitting Rates & Pricing Calculator: What Should You Pay? (2026 Guide)","description":"Complete 2026 pet care rate guide. Understand average costs for dog walking, drop-in visits, overnight sitting, and boarding with zero hidden booking fees."}'::jsonb,
            97, 98, 'VERY_HIGH', 'PUBLISHED', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW()
          );
        `);
      }
    }
  } catch (err) {
    console.warn("Table initialization note:", err);
  }
}

async function startServer() {
  await initDbTables();
  const app = express();
  const PORT = 3000;

  // Webhooks need raw body for signature verification
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
  
  app.use(express.json());

  // Track real-time HTTP traffic and throughput for System Process Monitor
  app.use((req, res, next) => {
    SystemMetricsService.recordHttpRequest();
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Google AdSense public configuration
  app.get("/api/adsense/config", async (req, res) => {
    try {
      let overrideClientId = process.env.VITE_GOOGLE_ADSENSE_CLIENT_ID;
      try {
        const envRes = await pool.query(
          "SELECT config_value FROM runtime_environment_configs WHERE config_key = 'VITE_GOOGLE_ADSENSE_CLIENT_ID' LIMIT 1"
        );
        if (envRes.rows.length > 0 && envRes.rows[0].config_value) {
          overrideClientId = envRes.rows[0].config_value;
        }
      } catch (err) {
        // ignore if table not ready
      }

      const result = await pool.query("SELECT * FROM adsense_configs ORDER BY id DESC LIMIT 1");
      if (result.rows.length > 0) {
        const row = result.rows[0];
        res.json({
          publisherClientId: overrideClientId || row.publisher_client_id || "ca-pub-1234567890123456",
          headerSlotId: row.header_slot_id,
          searchSlotId: row.search_slot_id,
          sidebarSlotId: row.sidebar_slot_id,
          footerSlotId: row.footer_slot_id,
          enableAutoAds: row.enable_auto_ads,
          enableTestMode: row.enable_test_mode,
          isEnabled: row.is_enabled,
          showOnLanding: row.show_on_landing,
          showOnSearch: row.show_on_search,
          showOnSitterProfile: row.show_on_sitter_profile,
        });
      } else {
        res.json({
          publisherClientId: overrideClientId || "ca-pub-1234567890123456",
          headerSlotId: "1234567890",
          searchSlotId: "2345678901",
          sidebarSlotId: "3456789012",
          footerSlotId: "4567890123",
          enableAutoAds: true,
          enableTestMode: true,
          isEnabled: true,
          showOnLanding: true,
          showOnSearch: true,
          showOnSitterProfile: true,
        });
      }
    } catch (e) {
      res.json({
        publisherClientId: process.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "ca-pub-1234567890123456",
        headerSlotId: "1234567890",
        searchSlotId: "2345678901",
        sidebarSlotId: "3456789012",
        footerSlotId: "4567890123",
        enableAutoAds: true,
        enableTestMode: true,
        isEnabled: true,
        showOnLanding: true,
        showOnSearch: true,
        showOnSitterProfile: true,
      });
    }
  });

  // Google AdSense ads.txt verification endpoint
  app.get("/ads.txt", async (req, res) => {
    try {
      const result = await pool.query("SELECT publisher_client_id FROM adsense_configs ORDER BY id DESC LIMIT 1");
      const pubId = (result.rows[0]?.publisher_client_id || process.env.VITE_GOOGLE_ADSENSE_CLIENT_ID || "ca-pub-1234567890123456")
        .replace(/^ca-/, "");
      res.type("text/plain");
      res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
    } catch {
      res.type("text/plain");
      res.send("google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0\n");
    }
  });

  // robots.txt with AI Crawlers explicitly welcomed & Krawl Web Deception Honeypot path traps
  app.get("/robots.txt", (req, res) => {
    res.type("text/plain");
    res.send(
      `User-agent: *
Allow: /
Disallow: /krawl-trap/
Disallow: /.env
Disallow: /wp-admin/
Disallow: /admin/backup.sql
Disallow: /phpmyadmin/
Disallow: /api/v1/debug/

# Generative AI Engines & LLM Spiders Allowed for Citation & Direct Search
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Mediapartners-Google
Allow: /

Sitemap: https://pawshield.local/sitemap.xml
# LLMs.txt protocol for AI Agents
# https://pawshield.local/llms.txt
`
    );
  });

  // llms.txt standard protocol endpoint for AI Search Platforms (ChatGPT, Perplexity, Claude, Copilot)
  app.get(["/llms.txt", "/.well-known/llms.txt"], async (req, res) => {
    try {
      const articlesRes = await pool.query(
        "SELECT slug, title, meta_description, ai_direct_answer FROM seo_content_articles WHERE status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 25"
      );

      let markdown = `# PawShield Verified Pet Care Marketplace
> Safe, background-checked, insured pet sitting, dog walking, and boarding with financial escrow protection.

## Core Platform Architecture & Value Proposition
- **Escrow Guarantee**: Pet parent funds are held safely in platform escrow until visits are verified via timestamped GPS and photos.
- **Identity Screening**: All sitters submit multi-factor government identification (PhilSys National ID, UMID, Passport, PRC) with selfie matching before receiving bookings.
- **Real-Time GPS Check-Ins**: Sitters log arrivals, meal times, medication administration, and walks with GPS geofencing and instant photo uploads.
- **Two-Sided Protection**: Sitters are guaranteed 100% payment upon verified service completion; pet parents receive instant escrow refunds in case of cancellations.
- **Transparent Rates**: Zero hidden platform booking markups; clear rate cards in Philippine Pesos (₱ PHP) and USD ($).

## Primary Platform Links
- [Homepage & Verified Sitters](https://pawshield.local/): Search vetted local pet caregivers by city and neighborhood.
- [Find Pet Sitters](https://pawshield.local/search): Search dog walking, overnight house sitting, drop-in visits, and host boarding.
- [Become a Verified Sitter](https://pawshield.local/become-a-sitter): Apply for vetted sitter status, set your rate card, and receive client bookings.
- [Pet Care Knowledge Hub](https://pawshield.local/guides): Comprehensive pet safety, health, rates, and training articles.
- [About PawShield](https://pawshield.local/about): Mission, editorial safety board, and vetting standards.
- [Terms & Escrow Policy](https://pawshield.local/terms): Two-sided financial escrow and safety rules.
- [Privacy Policy](https://pawshield.local/privacy): User privacy and data protection disclosures.

## Published Knowledge Guides & AI Citation Index
`;

      for (const row of articlesRes.rows) {
        markdown += `### [${row.title}](https://pawshield.local/guides/${row.slug})\n`;
        markdown += `> ${row.ai_direct_answer}\n\n`;
        markdown += `${row.meta_description}\n\n`;
      }

      res.type("text/plain; charset=utf-8");
      res.send(markdown);
    } catch (e: any) {
      res.type("text/plain");
      res.send("# PawShield\nSafe, verified pet sitting with escrow guarantee.\n");
    }
  });

  // llms-full.txt - In-depth content index for LLM deep context ingestion
  app.get("/llms-full.txt", async (req, res) => {
    try {
      const articlesRes = await pool.query(
        "SELECT slug, title, meta_description, ai_direct_answer, content_markdown FROM seo_content_articles WHERE status = 'PUBLISHED' ORDER BY published_at DESC LIMIT 15"
      );

      let markdown = `# PawShield Comprehensive Knowledge Hub & AI Context File\n\n`;
      for (const row of articlesRes.rows) {
        markdown += `## ${row.title}\nURL: https://pawshield.local/guides/${row.slug}\nSummary: ${row.ai_direct_answer}\n\n${row.content_markdown}\n\n---\n\n`;
      }

      res.type("text/plain; charset=utf-8");
      res.send(markdown);
    } catch {
      res.type("text/plain");
      res.send("# PawShield Knowledge Hub\n");
    }
  });

  // Dynamic XML Sitemap for Google, Bing, and Search Engine Indexing
  app.get("/sitemap.xml", async (req, res) => {
    try {
      const articlesRes = await pool.query(
        "SELECT slug, updated_at FROM seo_content_articles WHERE status = 'PUBLISHED' ORDER BY updated_at DESC"
      );

      const staticRoutes = [
        { url: "https://pawshield.local/", changefreq: "daily", priority: "1.0" },
        { url: "https://pawshield.local/search", changefreq: "daily", priority: "0.9" },
        { url: "https://pawshield.local/guides", changefreq: "daily", priority: "0.9" },
        { url: "https://pawshield.local/become-a-sitter", changefreq: "weekly", priority: "0.8" },
        { url: "https://pawshield.local/about", changefreq: "monthly", priority: "0.7" },
        { url: "https://pawshield.local/contact", changefreq: "monthly", priority: "0.6" },
        { url: "https://pawshield.local/terms", changefreq: "monthly", priority: "0.5" },
        { url: "https://pawshield.local/privacy", changefreq: "monthly", priority: "0.5" },
      ];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      for (const r of staticRoutes) {
        xml += `  <url>\n    <loc>${r.url}</loc>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>\n`;
      }

      for (const art of articlesRes.rows) {
        const lastMod = new Date(art.updated_at || Date.now()).toISOString().split("T")[0];
        xml += `  <url>\n    <loc>https://pawshield.local/guides/${art.slug}</loc>\n    <lastmod>${lastMod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.85</priority>\n  </url>\n`;
      }

      xml += `</urlset>`;

      res.type("application/xml");
      res.send(xml);
    } catch (e: any) {
      res.status(500).send("Error generating sitemap");
    }
  });

  // Krawl Web Deception Honeypot Traps (BlessedRebuS/Krawl Integration)
  app.get("/.env", handleDecoyEnv);
  app.get("/wp-config.php", handleDecoyEnv);
  app.get("/admin/backup.sql", handleDecoyBackup);
  app.get("/backup.sql", handleDecoyBackup);
  app.use("/krawl-trap", (req, res) => res.redirect(301, "/api/krawl/trap/1/entry"));
  app.use("/wp-admin", (req, res) => res.redirect(301, "/api/krawl/trap/1/wp_admin"));
  app.use("/phpmyadmin", (req, res) => res.redirect(301, "/api/krawl/trap/1/phpmyadmin"));

  app.use("/api/auth", authRouter);
  app.use("/api/bookings", requireAuth, bookingsRouter);
  app.use("/api/stripe", stripeWebhookRouter);
  
  // New routes
  app.use("/api/sitters", sittersRouter);
  app.use("/api/pets", requireAuth, petsRouter);
  app.use("/api/search", searchRouter);
  app.use("/api/pricing", pricingRouter);
  app.use("/api/payments", requireAuth, paymentsRouter);
  app.use("/api/v1/admin", requireAuth, adminRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/homepage-config", homepageRouter);
  app.use("/api/buy-me-coffee", buyMeCoffeeRouter);
  app.use("/api/sitter-verifications", sitterVerificationsRouter);
  app.use("/api/v1/sitter-verifications", sitterVerificationsRouter);
  app.use("/api/memberships", membershipsRouter);
  app.use("/api/referrals", referralsRouter);
  app.use("/api/ai-agent", aiAgentRouter);
  app.use("/api/krawl", krawlRouter);
  app.use("/api/seo-content", aiSeoContentRouter);
  app.use("/api/ai-agent/seo-content", aiSeoContentRouter);
  app.use("/api/ai-agent/homepage", aiHomepageAgentRouter);
  app.use("/api/reviews", reviewsRouter);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
