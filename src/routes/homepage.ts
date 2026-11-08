import { Router } from "express";
import { pool } from "../db/index.ts";

export const homepageRouter = Router();

// Ensure homepage_configs table exists and has all extended columns
async function ensureHomepageTable() {
  try {
    await pool.query(`
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
        testimonials JSONB DEFAULT '[]',
        faqs JSONB DEFAULT '[]',
        editorial_title TEXT,
        editorial_body TEXT,
        editorial_points JSONB DEFAULT '[]',
        seo_keywords JSONB DEFAULT '[]',
        marketing_campaigns JSONB DEFAULT '[]',
        ai_agent_controlled BOOLEAN DEFAULT TRUE,
        ai_last_optimized_at TIMESTAMP DEFAULT NOW(),
        ai_audit_score INT DEFAULT 96,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Ensure newly added columns exist in case table was created earlier
    await pool.query(`
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS testimonials JSONB DEFAULT '[]';
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS faqs JSONB DEFAULT '[]';
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS editorial_title TEXT;
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS editorial_body TEXT;
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS editorial_points JSONB DEFAULT '[]';
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS seo_keywords JSONB DEFAULT '[]';
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS marketing_campaigns JSONB DEFAULT '[]';
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS ai_agent_controlled BOOLEAN DEFAULT TRUE;
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS ai_last_optimized_at TIMESTAMP DEFAULT NOW();
      ALTER TABLE homepage_configs ADD COLUMN IF NOT EXISTS ai_audit_score INT DEFAULT 96;
    `);

    // Check if initial seed is needed
    const countRes = await pool.query("SELECT COUNT(*) FROM homepage_configs");
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      await seedDefaultRichHomepage();
    }
  } catch (err) {
    console.warn("Homepage table check note:", err);
  }
}

export const DEFAULT_RICH_FEATURE_CARDS = [
  {
    id: "card-1",
    icon: "ShieldCheck",
    title: "100% Verified Sitters",
    description: "Every sitter passes government ID verification, phone screening, and home safety checks before accepting their first booking.",
    badge: "Government ID Verified",
  },
  {
    id: "card-2",
    icon: "Star",
    title: "Genuine Pet Parent Reviews",
    description: "Read honest feedback and 5-star ratings left exclusively by pet owners who completed verified stays on PawShield.",
    badge: "Verified Stay Reviews",
  },
  {
    id: "card-3",
    icon: "CalendarCheck",
    title: "Protected Escrow Payments",
    description: "Your money is held safely in platform escrow. Sitter payout is released only after your pet is returned happy and safe.",
    badge: "100% Escrow Protected",
  },
  {
    id: "card-4",
    icon: "Award",
    title: "₱50,000 Vet Care Guarantee",
    description: "Rest easy knowing every booking includes up to ₱50,000 in emergency veterinary medical reimbursement coverage.",
    badge: "Medical Coverage",
  },
];

export const DEFAULT_RICH_SERVICE_CARDS = [
  {
    id: "srv-1",
    title: "Pet Boarding",
    description: "Your dog or cat stays overnight in a loving sitter's home with dedicated 1-on-1 affection, safe play, and cozy bedding.",
    icon: "Home",
  },
  {
    id: "srv-2",
    title: "House Sitting",
    description: "A trusted sitter stays at your residence to maintain your pet's normal routine, water plants, and keep home secure.",
    icon: "CalendarCheck",
  },
  {
    id: "srv-3",
    title: "Drop-In Visits",
    description: "30-60 minute home drop-ins for food refills, medicine administration, litter box cleanups, and joyful companionship.",
    icon: "Footprints",
  },
  {
    id: "srv-4",
    title: "Dog Walking & Play",
    description: "Energizing neighborhood walks with live GPS tracking, bathroom check-ins, and water breaks tailored to your pup's pace.",
    icon: "Footprints",
  },
];

export const DEFAULT_RICH_TESTIMONIALS = [
  {
    id: "test-1",
    name: "Camille Santos",
    petName: "Mochi",
    petType: "Pomeranian",
    location: "BGC, Taguig",
    rating: 5,
    review: "I was super nervous leaving Mochi for a 5-day work trip, but our sitter Maria sent hourly video check-ins and photo logs. The escrow payment gave me complete peace of mind!",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "test-2",
    name: "Dr. Paolo Mendoza",
    petName: "Kona & Luna",
    petType: "Golden Retrievers",
    location: "Makati City",
    rating: 5,
    review: "PawShield is hands down the most trustworthy pet care platform in the Philippines. Both of my goldens have special dietary routines, and their sitter followed every instruction to the letter.",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
  },
  {
    id: "test-3",
    name: "Janine Rodriguez",
    petName: "Oreo",
    petType: "British Shorthair",
    location: "Quezon City",
    rating: 5,
    review: "Cats hate traveling or boarding in noisy vet cages. Having a verified drop-in cat sitter come to our condo kept Oreo relaxed and purring happily the whole weekend!",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
  },
];

export const DEFAULT_RICH_FAQS = [
  {
    id: "faq-1",
    question: "How does PawShield Escrow Payment Protection work?",
    answer: "When you book a sitter, your payment is held securely in platform escrow. The funds are never transferred to the sitter until after the stay has concluded and you confirm that your pet is healthy and returned safely.",
  },
  {
    id: "faq-2",
    question: "How are pet sitters vetted and verified?",
    answer: "Every pet sitter candidate must submit official government identification, pass a manual background review, verify their residential address, and complete a pet care safety assessment before their profile goes live.",
  },
  {
    id: "faq-3",
    question: "What is the ₱50,000 Emergency Veterinary Guarantee?",
    answer: "Every booking made through PawShield includes veterinary medical protection covering unexpected injuries or illness during the stay up to ₱50,000, supported by our 24/7 emergency escalation desk.",
  },
  {
    id: "faq-4",
    question: "Can I do a Meet & Greet with the sitter before booking?",
    answer: "Yes, absolutely! We strongly encourage pet parents to arrange a complimentary Meet & Greet in person or via video call before confirming a multi-day stay so you and your pet feel 100% comfortable.",
  },
  {
    id: "faq-5",
    question: "What happens if I need to cancel my pet's booking?",
    answer: "PawShield offers flexible cancellation policies. Most sitters provide a 100% refund when canceled at least 48 hours before the reservation begins, processed directly back to your original payment method.",
  },
  {
    id: "faq-6",
    question: "How do I become a verified pet sitter on PawShield?",
    answer: "Animal lovers can click 'Become a Sitter', complete the onboarding application, set their custom rates in ₱ PHP, and submit credentials. Approved sitters can earn up to ₱35,000/month hosting pets in their neighborhood.",
  },
];

export const DEFAULT_EDITORIAL_BODY = `Leaving your pet while at work, traveling, or on vacation can be stressful. For decades, pet parents only had traditional kennels or impersonal boarding facilities as options. Today, PawShield transforms pet care across the Philippines by connecting pet families with trusted, background-checked neighborhood caregivers who welcome pets directly into warm, cage-free homes.

With individual 1-on-1 care, your pet maintains their familiar diet, walking routines, and bedtime habits without the stress or pathogen exposure of crowded cages. Every reservation is fortified with 100% Escrow Financial Protection, continuous photo and GPS tracking, and our comprehensive ₱50,000 Emergency Veterinary Medical Guarantee.`;

async function seedDefaultRichHomepage() {
  await pool.query(`
    INSERT INTO homepage_configs (
      logo_text, logo_tagline, hero_headline, hero_subheadline,
      hero_primary_btn_text, hero_secondary_btn_text, hero_style,
      why_title, why_subtitle, feature_cards, services_title, services_subtitle,
      service_cards, testimonials, faqs, editorial_title, editorial_body,
      editorial_points, seo_keywords, ai_agent_controlled, ai_audit_score
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
    )
  `, [
    "PawShield",
    "Verified Pet Care Network",
    "Loving, Verified Pet Sitters in Your Neighborhood.",
    "PawShield connects caring pet parents with background-checked local sitters for cage-free home boarding, house sitting, drop-in visits, and daily dog walking.",
    "Find a Sitter Now",
    "Become a Sitter",
    "slate",
    "Why Choose PawShield Pet Care?",
    "We prioritize safety, verified trust, and health above all else with transparent pricing in Philippine Pesos.",
    JSON.stringify(DEFAULT_RICH_FEATURE_CARDS),
    "Pet Care Services Tailored For Every Companion",
    "From high-energy puppies to senior cats needing medication, our sitters provide customized 1-on-1 attention.",
    JSON.stringify(DEFAULT_RICH_SERVICE_CARDS),
    JSON.stringify(DEFAULT_RICH_TESTIMONIALS),
    JSON.stringify(DEFAULT_RICH_FAQS),
    "Why Pinoy Pet Parents Choose Home Boarding Over Traditional Kennels",
    DEFAULT_EDITORIAL_BODY,
    JSON.stringify([
      "Cage-free, personalized 1-on-1 home environment",
      "Strict government ID and background verification for all sitters",
      "Full escrow payment protection until pet is safely home",
      "Automatic ₱50,000 emergency veterinary coverage on every stay",
      "Real-time GPS walking routes and daily photo/video updates",
    ]),
    JSON.stringify([
      "pet sitter philippines", "dog boarding manila", "cat sitting bgc",
      "pet sitter quezon city", "dog walker makati", "pet boarding cebu",
      "background checked pet sitter", "verified dog boarding",
    ]),
    true,
    98
  ]);
}

homepageRouter.get("/", async (req, res) => {
  try {
    await ensureHomepageTable();
    const result = await pool.query("SELECT * FROM homepage_configs ORDER BY id DESC LIMIT 1");
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return res.json({
        logoUrl: row.logo_url,
        logoText: row.logo_text || "PawShield",
        logoTagline: row.logo_tagline || "Verified Pet Care Network",
        heroHeadline: row.hero_headline || "Loving, Verified Pet Sitters in Your Neighborhood.",
        heroSubheadline: row.hero_subheadline || "PawShield connects caring pet parents with background-checked local sitters for cage-free home boarding, house sitting, drop-in visits, and daily dog walking.",
        heroPrimaryBtnText: row.hero_primary_btn_text || "Find a Sitter Now",
        heroSecondaryBtnText: row.hero_secondary_btn_text || "Become a Sitter",
        heroStyle: row.hero_style || "slate",
        heroImageUrl: row.hero_image_url,
        whyTitle: row.why_title || "Why Choose PawShield Pet Care?",
        whySubtitle: row.why_subtitle || "We prioritize safety, verified trust, and health above all else with transparent pricing in Philippine Pesos.",
        featureCards: (Array.isArray(row.feature_cards) && row.feature_cards.length > 0) ? row.feature_cards : DEFAULT_RICH_FEATURE_CARDS,
        servicesTitle: row.services_title || "Pet Care Services Tailored For Every Companion",
        servicesSubtitle: row.services_subtitle || "From high-energy puppies to senior cats needing medication, our sitters provide customized 1-on-1 attention.",
        serviceCards: (Array.isArray(row.service_cards) && row.service_cards.length > 0) ? row.service_cards : DEFAULT_RICH_SERVICE_CARDS,
        servicesImageUrl: row.services_image_url,
        testimonials: (Array.isArray(row.testimonials) && row.testimonials.length > 0) ? row.testimonials : DEFAULT_RICH_TESTIMONIALS,
        faqs: (Array.isArray(row.faqs) && row.faqs.length > 0) ? row.faqs : DEFAULT_RICH_FAQS,
        editorialTitle: row.editorial_title || "Why Pinoy Pet Parents Choose Home Boarding Over Traditional Kennels",
        editorialBody: row.editorial_body || DEFAULT_EDITORIAL_BODY,
        editorialPoints: Array.isArray(row.editorial_points) ? row.editorial_points : [
          "Cage-free, personalized 1-on-1 home environment",
          "Strict government ID and background verification for all sitters",
          "Full escrow payment protection until pet is safely home",
          "Automatic ₱50,000 emergency veterinary coverage on every stay",
          "Real-time GPS walking routes and daily photo/video updates",
        ],
        seoKeywords: Array.isArray(row.seo_keywords) ? row.seo_keywords : [
          "pet sitter philippines", "dog boarding manila", "cat sitting bgc",
          "pet sitter quezon city", "dog walker makati", "pet boarding cebu"
        ],
        marketingCampaigns: Array.isArray(row.marketing_campaigns) ? row.marketing_campaigns : [],
        aiAgentControlled: row.ai_agent_controlled !== false,
        aiLastOptimizedAt: row.ai_last_optimized_at || new Date().toISOString(),
        aiAuditScore: row.ai_audit_score || 96,
      });
    }
    return res.json({});
  } catch (error) {
    console.error("Error fetching homepage config:", error);
    return res.status(500).json({ error: "Failed to fetch homepage config" });
  }
});

homepageRouter.put("/", async (req, res) => {
  try {
    await ensureHomepageTable();
    const {
      logoUrl,
      logoText,
      logoTagline,
      heroHeadline,
      heroSubheadline,
      heroPrimaryBtnText,
      heroSecondaryBtnText,
      heroStyle,
      heroImageUrl,
      whyTitle,
      whySubtitle,
      featureCards,
      servicesTitle,
      servicesSubtitle,
      serviceCards,
      servicesImageUrl,
      testimonials,
      faqs,
      editorialTitle,
      editorialBody,
      editorialPoints,
      seoKeywords,
      marketingCampaigns,
      aiAgentControlled,
      aiAuditScore,
    } = req.body;

    const existing = await pool.query("SELECT id FROM homepage_configs ORDER BY id DESC LIMIT 1");

    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        `UPDATE homepage_configs SET
          logo_url = $1,
          logo_text = $2,
          logo_tagline = $3,
          hero_headline = $4,
          hero_subheadline = $5,
          hero_primary_btn_text = $6,
          hero_secondary_btn_text = $7,
          hero_style = $8,
          hero_image_url = $9,
          why_title = $10,
          why_subtitle = $11,
          feature_cards = $12,
          services_title = $13,
          services_subtitle = $14,
          service_cards = $15,
          services_image_url = $16,
          testimonials = $17,
          faqs = $18,
          editorial_title = $19,
          editorial_body = $20,
          editorial_points = $21,
          seo_keywords = $22,
          marketing_campaigns = $23,
          ai_agent_controlled = $24,
          ai_last_optimized_at = NOW(),
          ai_audit_score = $25,
          updated_at = NOW()
        WHERE id = $26`,
        [
          logoUrl,
          logoText,
          logoTagline,
          heroHeadline,
          heroSubheadline,
          heroPrimaryBtnText,
          heroSecondaryBtnText,
          heroStyle,
          heroImageUrl,
          whyTitle,
          whySubtitle,
          JSON.stringify(featureCards || DEFAULT_RICH_FEATURE_CARDS),
          servicesTitle,
          servicesSubtitle,
          JSON.stringify(serviceCards || DEFAULT_RICH_SERVICE_CARDS),
          servicesImageUrl,
          JSON.stringify(testimonials || DEFAULT_RICH_TESTIMONIALS),
          JSON.stringify(faqs || DEFAULT_RICH_FAQS),
          editorialTitle,
          editorialBody,
          JSON.stringify(editorialPoints || []),
          JSON.stringify(seoKeywords || []),
          JSON.stringify(marketingCampaigns || []),
          aiAgentControlled ?? true,
          aiAuditScore || 96,
          id,
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO homepage_configs (
          logo_url, logo_text, logo_tagline, hero_headline, hero_subheadline,
          hero_primary_btn_text, hero_secondary_btn_text, hero_style, hero_image_url,
          why_title, why_subtitle, feature_cards, services_title, services_subtitle,
          service_cards, services_image_url, testimonials, faqs, editorial_title,
          editorial_body, editorial_points, seo_keywords, marketing_campaigns,
          ai_agent_controlled, ai_audit_score
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        )`,
        [
          logoUrl,
          logoText,
          logoTagline,
          heroHeadline,
          heroSubheadline,
          heroPrimaryBtnText,
          heroSecondaryBtnText,
          heroStyle,
          heroImageUrl,
          whyTitle,
          whySubtitle,
          JSON.stringify(featureCards || DEFAULT_RICH_FEATURE_CARDS),
          servicesTitle,
          servicesSubtitle,
          JSON.stringify(serviceCards || DEFAULT_RICH_SERVICE_CARDS),
          servicesImageUrl,
          JSON.stringify(testimonials || DEFAULT_RICH_TESTIMONIALS),
          JSON.stringify(faqs || DEFAULT_RICH_FAQS),
          editorialTitle,
          editorialBody,
          JSON.stringify(editorialPoints || []),
          JSON.stringify(seoKeywords || []),
          JSON.stringify(marketingCampaigns || []),
          aiAgentControlled ?? true,
          aiAuditScore || 96,
        ]
      );
    }

    return res.json({ success: true, message: "Homepage configuration saved successfully" });
  } catch (error) {
    console.error("Error updating homepage config:", error);
    return res.status(500).json({ error: "Failed to update homepage config" });
  }
});
