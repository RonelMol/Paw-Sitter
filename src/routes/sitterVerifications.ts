import { Router, type Response } from "express";
import { pool } from "../db/index.ts";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth.ts";

export const sitterVerificationsRouter = Router();

function normalizePhone(phone: string): string {
  if (!phone) return "";
  // strip all non-numeric
  let digits = phone.replace(/\D/g, "");
  // if starts with 63, replace with 0
  if (digits.startsWith("63") && digits.length === 12) {
    digits = "0" + digits.substring(2);
  }
  return digits;
}

function normalizeId(idNum: string): string {
  if (!idNum) return "";
  return idNum.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeBank(account: string): string {
  if (!account) return "";
  return account.replace(/\D/g, "");
}

// POST /api/sitter-verifications/register & POST /api/sitter-verifications - Submit KYC Application
const handleKycSubmission = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const legalFirstName = req.body.legalFirstName || req.body.firstName;
    const legalMiddleName = req.body.legalMiddleName || req.body.middleName || "";
    const legalLastName = req.body.legalLastName || req.body.lastName;
    const mobileNumber = req.body.mobileNumber || req.body.phone;
    const countryCode = req.body.countryCode || "+63";
    const email = req.body.email;
    const birthDate = req.body.birthDate || req.body.dateOfBirth || "";
    const address = req.body.address || req.body.addressLine || "";
    const city = req.body.city || "";
    const province = req.body.province || req.body.stateProvince || "";
    const idType = req.body.idType;
    const idNumber = req.body.idNumber;
    const idFrontUrl = req.body.idFrontUrl || "";
    const idBackUrl = req.body.idBackUrl || "";
    const selfieWithIdUrl = req.body.selfieWithIdUrl || req.body.idSelfieUrl || "";
    const bankName = req.body.bankName;
    const bankAccountName = req.body.bankAccountName;
    const bankAccountNumber = req.body.bankAccountNumber;
    const bio = req.body.bio;
    const experienceDetails = req.body.experienceDetails;

    if (!legalFirstName || !legalLastName || !mobileNumber || !idType || !idNumber) {
      return res.status(400).json({
        error: "Missing required KYC fields: Legal First Name, Legal Last Name, Mobile Number, Government ID Type, and ID Number are required."
      });
    }

    const normMobile = normalizePhone(mobileNumber);
    const normEmail = (email || req.dbUser.email || "").trim().toLowerCase();
    const normIdNum = normalizeId(idNumber);

    // ANTI-DUPLICATE DETECTION ENGINE:
    // Check if another account (different user_id) has registered with the same:
    // 1. Mobile number
    // 2. National ID Number
    // 3. Same Legal First Name + Last Name + Birth Date
    const duplicateCheck = await pool.query(`
      SELECT sv.*, u.email as existing_user_email 
      FROM sitter_verifications sv
      JOIN users u ON u.id = sv.user_id
      WHERE sv.user_id != $1
        AND (
          sv.normalized_mobile = $2 
          OR sv.normalized_id_number = $3 
          OR (LOWER(sv.legal_first_name) = LOWER($4) AND LOWER(sv.legal_last_name) = LOWER($5) AND sv.birth_date = $6)
        )
      LIMIT 1
    `, [userId, normMobile, normIdNum, legalFirstName.trim(), legalLastName.trim(), birthDate || ""]);

    if (duplicateCheck.rows.length > 0) {
      const match = duplicateCheck.rows[0];
      let conflictField = "Mobile number";
      if (match.normalized_id_number === normIdNum) conflictField = "Government ID Number";
      else if (match.normalized_mobile === normMobile) conflictField = "Mobile Phone Number";
      else conflictField = "Legal Full Name and Birthday";

      return res.status(409).json({
        duplicateBlocked: true,
        error: `Anti-Fraud Duplicate Protection: An existing account is already registered with this ${conflictField}. Creating duplicate accounts is prohibited under PawShield safety policies.`,
        field: conflictField,
      });
    }

    // Check existing verification status
    const existingVerif = await pool.query(`SELECT * FROM sitter_verifications WHERE user_id = $1`, [userId]);
    const existingRow = existingVerif.rows[0];

    // Disbursement bank is optional; default safely
    const finalBankName = (bankName && bankName.trim()) || existingRow?.bank_name || "GCash";
    const finalBankAccountName = (bankAccountName && bankAccountName.trim()) || existingRow?.bank_account_name || `${legalFirstName.trim()} ${legalLastName.trim()}`;
    const finalBankAccountNumber = (bankAccountNumber && bankAccountNumber.trim()) || existingRow?.bank_account_number || "";
    const finalNormBank = normalizeBank(finalBankAccountNumber);

    // Insert or update sitter verification record (starts in PENDING for Admin review)
    const result = await pool.query(`
      INSERT INTO sitter_verifications (
        user_id, legal_first_name, legal_last_name, legal_middle_name, mobile_number, normalized_mobile, country_code,
        email, normalized_email, birth_date, address, city, province,
        id_type, id_number, normalized_id_number, id_front_url, id_back_url, selfie_with_id_url,
        bank_name, bank_account_name, bank_account_number, normalized_bank_account,
        status, is_duplicate_flagged
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, 'PENDING', FALSE)
      ON CONFLICT (user_id) DO UPDATE SET
        legal_first_name = EXCLUDED.legal_first_name,
        legal_middle_name = EXCLUDED.legal_middle_name,
        legal_last_name = EXCLUDED.legal_last_name,
        mobile_number = EXCLUDED.mobile_number,
        normalized_mobile = EXCLUDED.normalized_mobile,
        country_code = EXCLUDED.country_code,
        email = EXCLUDED.email,
        normalized_email = EXCLUDED.normalized_email,
        birth_date = EXCLUDED.birth_date,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        province = EXCLUDED.province,
        id_type = EXCLUDED.id_type,
        id_number = EXCLUDED.id_number,
        normalized_id_number = EXCLUDED.normalized_id_number,
        id_front_url = EXCLUDED.id_front_url,
        id_back_url = EXCLUDED.id_back_url,
        selfie_with_id_url = EXCLUDED.selfie_with_id_url,
        status = 'PENDING'
      RETURNING *
    `, [
      userId, legalFirstName.trim(), legalLastName.trim(), (legalMiddleName || "").trim(), mobileNumber, normMobile, countryCode || "+63",
      req.dbUser.email, normEmail, birthDate || "", address || "", city || "", province || "",
      idType, idNumber, normIdNum, idFrontUrl || "", idBackUrl || "", selfieWithIdUrl || "",
      finalBankName, finalBankAccountName, finalBankAccountNumber, finalNormBank
    ]);

    // Record submission into app_kyc_submissions_trail
    await pool.query(`
      INSERT INTO app_kyc_submissions_trail (
        user_id, legal_first_name, legal_middle_name, legal_last_name, mobile_number,
        country_code, id_type, id_number, id_front_url, id_back_url, selfie_with_id_url,
        address, city, province, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'PENDING')
    `, [
      userId, legalFirstName.trim(), (legalMiddleName || "").trim(), legalLastName.trim(), mobileNumber,
      countryCode || "+63", idType, idNumber, idFrontUrl || "", idBackUrl || "", selfieWithIdUrl || "",
      address || "", city || "", province || ""
    ]);

    // Ensure user role is PET_SITTER
    await pool.query(`UPDATE users SET role = 'PET_SITTER', name = $1 WHERE id = $2`, [
      `${legalFirstName.trim()} ${legalLastName.trim()}`,
      userId
    ]);

    // Upsert sitter profile
    await pool.query(`
      INSERT INTO sitter_profiles (user_id, bio, experience_details, service_radius_miles)
      VALUES ($1, $2, $3, 10)
      ON CONFLICT (user_id) DO UPDATE SET
        bio = COALESCE(EXCLUDED.bio, sitter_profiles.bio),
        experience_details = COALESCE(EXCLUDED.experience_details, sitter_profiles.experience_details)
    `, [userId, bio || "Passionate pet sitter with verified Philippine Government ID.", experienceDetails || "Pet care & first-aid verified."]);

    // Initialize membership record with 3 free bookings
    await pool.query(`
      INSERT INTO user_memberships (user_id, plan_type, status, accepted_bookings_count, max_free_bookings)
      VALUES ($1, 'FREE_TIER', 'ACTIVE', 0, 3)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId]);

    // Generate referral code if doesn't exist
    const refCode = `PS-${legalFirstName.toUpperCase().slice(0, 3)}${userId}${Math.floor(100 + Math.random() * 900)}`;
    await pool.query(`
      INSERT INTO referrals (user_id, referral_code, reward_balance_php)
      VALUES ($1, $2, 0)
      ON CONFLICT (user_id) DO NOTHING
    `, [userId, refCode]);

    res.json({
      success: true,
      message: "KYC Application submitted successfully. Your Philippine Government ID is now pending platform review.",
      verification: result.rows[0],
      membership: {
        planType: "FREE_TIER",
        acceptedBookingsCount: 0,
        maxFreeBookings: 3,
        canAcceptMore: true,
      }
    });
  } catch (error: any) {
    console.error("Sitter KYC error:", error);
    res.status(500).json({ error: "Failed to process KYC submission", cause: error.message });
  }
};

sitterVerificationsRouter.post("/register", requireAuth, handleKycSubmission);
sitterVerificationsRouter.post("/", requireAuth, handleKycSubmission);
sitterVerificationsRouter.post("/me", requireAuth, handleKycSubmission);
sitterVerificationsRouter.patch("/me", requireAuth, handleKycSubmission);

// GET /api/sitter-verifications/me & /my - Fetch current user's verification & bank status
const handleGetMyVerification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const vResult = await pool.query(`SELECT * FROM sitter_verifications WHERE user_id = $1`, [userId]);
    const mResult = await pool.query(`SELECT * FROM user_memberships WHERE user_id = $1`, [userId]);
    const row = vResult.rows[0] || null;

    const verif = row ? {
      ...row,
      legalFirstName: row.legal_first_name || "",
      legalMiddleName: row.legal_middle_name || "",
      legalLastName: row.legal_last_name || "",
      mobileNumber: row.mobile_number || "",
      phone: row.mobile_number || "",
      countryCode: row.country_code || "+63",
      birthDate: row.birth_date || "",
      dateOfBirth: row.birth_date || "",
      addressLine: row.address || "",
      city: row.city || "",
      stateProvince: row.province || "",
      postalCode: row.postal_code || "",
      idType: row.id_type || "",
      idNumber: row.id_number || "",
      idFrontUrl: row.id_front_url || "",
      idBackUrl: row.id_back_url || "",
      idSelfieUrl: row.selfie_with_id_url || "",
      selfieWithIdUrl: row.selfie_with_id_url || "",
      bankName: row.bank_name || "",
      bankAccountName: row.bank_account_name || "",
      bankAccountNumber: row.bank_account_number || "",
      status: row.status || "PENDING",
    } : null;

    res.json({
      isRegistered: vResult.rows.length > 0,
      verification: verif,
      isLocked: verif?.status === "APPROVED" && req.dbUser.role !== "ADMIN",
      membership: mResult.rows[0] || {
        planType: "FREE_TIER",
        acceptedBookingsCount: 0,
        maxFreeBookings: 3,
        status: "ACTIVE",
      }
    });
  } catch (error: any) {
    console.error("Fetch my verification error:", error);
    res.status(500).json({ error: "Failed to fetch verification status" });
  }
};

sitterVerificationsRouter.get("/me", requireAuth, handleGetMyVerification);
sitterVerificationsRouter.get("/my", requireAuth, handleGetMyVerification);

// GET /api/sitter-verifications/all - Admin view
sitterVerificationsRouter.get("/all", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT sv.*, u.name as user_name, u.email as user_email, u.is_verified as user_is_verified,
             um.plan_type, um.accepted_bookings_count, um.status as membership_status
      FROM sitter_verifications sv
      LEFT JOIN users u ON u.id = sv.user_id
      LEFT JOIN user_memberships um ON um.user_id = sv.user_id
      ORDER BY sv.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Fetch all verifications error:", error);
    res.status(500).json({ error: "Failed to fetch verifications" });
  }
});

// PATCH /api/sitter-verifications/:id/status - Admin Approve/Reject KYC
sitterVerificationsRouter.patch("/:id/status", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const verifId = parseInt(req.params.id, 10);
    const { status, adminNotes } = req.body; // 'APPROVED' or 'REJECTED'

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED, REJECTED, or PENDING" });
    }

    const updatedVerif = await pool.query(`
      UPDATE sitter_verifications 
      SET status = $1, admin_notes = $2, reviewed_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [status, adminNotes || null, verifId]);

    if (updatedVerif.rows.length === 0) {
      return res.status(404).json({ error: "Verification record not found" });
    }

    const verif = updatedVerif.rows[0];
    const isApproved = status === "APPROVED";

    // Synchronize is_verified in users table
    await pool.query(`UPDATE users SET is_verified = $1 WHERE id = $2`, [isApproved, verif.user_id]);

    res.json({
      success: true,
      message: `KYC application has been ${status.toLowerCase()}. Disbursement account is now ${isApproved ? 'locked in read-only mode' : 'unlocked'}.`,
      verification: verif,
    });
  } catch (error: any) {
    console.error("Admin KYC update status error:", error);
    res.status(500).json({ error: "Failed to update KYC status", cause: error.message });
  }
});

// GET /api/sitter-verifications/me/disbursement - Fetch current sitter's disbursement account
sitterVerificationsRouter.get("/me/disbursement", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const existing = await pool.query(`SELECT * FROM sitter_verifications WHERE user_id = $1`, [userId]);
    if (existing.rows.length === 0) {
      const defaultDisb = {
        bankName: "",
        bankAccountName: req.dbUser.name || "",
        bankAccountNumber: "",
        status: "NOT_SET",
      };
      return res.json({
        disbursement: defaultDisb,
        isConfigured: false,
        isLocked: false,
        bankName: "",
        bankAccountName: req.dbUser.name || "",
        bankAccountNumber: "",
        status: "NOT_SET",
        kycStatus: "NOT_SET",
      });
    }

    const row = existing.rows[0];
    const isConfigured = Boolean(row.bank_name && row.bank_account_number && row.bank_name !== "PENDING_DISBURSEMENT");
    const isLocked = row.status === "APPROVED" && req.dbUser.role !== "ADMIN";

    const disb = {
      bankName: isConfigured ? row.bank_name : "",
      bankAccountName: row.bank_account_name || req.dbUser.name || "",
      bankAccountNumber: isConfigured ? row.bank_account_number : "",
      status: row.status,
    };

    res.json({
      disbursement: disb,
      isConfigured,
      isLocked,
      bankName: disb.bankName,
      bankAccountName: disb.bankAccountName,
      bankAccountNumber: disb.bankAccountNumber,
      status: row.status,
      kycStatus: row.status,
    });
  } catch (error: any) {
    console.error("Fetch disbursement error:", error);
    res.status(500).json({ error: "Failed to fetch disbursement account" });
  }
});

// POST & PATCH /api/sitter-verifications/me/disbursement - Sitter updates disbursement bank / e-wallet
const handleUpdateDisbursement = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.dbUser.id;
    const { bankName, bankAccountName, bankAccountNumber } = req.body;

    if (!bankName || !bankAccountNumber) {
      return res.status(400).json({ error: "Bank / E-Wallet Provider and Account Number are required." });
    }

    const existing = await pool.query(`SELECT * FROM sitter_verifications WHERE user_id = $1`, [userId]);
    if (existing.rows.length > 0 && existing.rows[0].status === "APPROVED" && req.dbUser.role !== "ADMIN") {
      return res.status(403).json({
        error: "Your Payout Disbursement Account is locked in read-only mode by Admin to safeguard your payouts. Contact platform administration to request modifications.",
        isLocked: true,
      });
    }

    const normBank = normalizeBank(bankAccountNumber);
    const accName = bankAccountName?.trim() || req.dbUser.name || "Sitter";
    const accountType = req.body.accountType || (bankName.includes("GCash") || bankName.includes("Maya") ? "E-Wallet" : "Bank");
    const proofAttachmentUrl = req.body.proofAttachmentUrl || req.body.proofDocumentUrl || null;

    let result;
    if (existing.rows.length > 0) {
      result = await pool.query(`
        UPDATE sitter_verifications
        SET bank_name = $1,
            bank_account_name = $2,
            bank_account_number = $3,
            normalized_bank_account = $4
        WHERE user_id = $5
        RETURNING *
      `, [bankName.trim(), accName, bankAccountNumber.trim(), normBank, userId]);
    } else {
      // Create initial verification record with disbursement details
      const userName = req.dbUser.name || "Pet Sitter";
      const nameParts = userName.split(" ");
      const firstName = nameParts[0] || "Pet";
      const lastName = nameParts.slice(1).join(" ") || "Sitter";
      const userEmail = req.dbUser.email || "";
      const userPhone = req.dbUser.phone || "09000000000";

      result = await pool.query(`
        INSERT INTO sitter_verifications (
          user_id, legal_first_name, legal_last_name, mobile_number, normalized_mobile,
          email, normalized_email, address, city, province,
          id_type, id_number, normalized_id_number, id_front_url,
          bank_name, bank_account_name, bank_account_number, normalized_bank_account,
          status, is_duplicate_flagged
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, 'Metro Manila', 'Manila', 'Metro Manila',
          'PHILSYS_ID', 'PENDING_KYC', 'PENDINGKYC', '',
          $8, $9, $10, $11,
          'PENDING', FALSE
        )
        RETURNING *
      `, [
        userId, firstName, lastName, userPhone, normalizePhone(userPhone),
        userEmail, userEmail.toLowerCase(),
        bankName.trim(), accName, bankAccountNumber.trim(), normBank
      ]);
    }

    // Record submission into disbursement_submissions_trail
    await pool.query(`
      INSERT INTO disbursement_submissions_trail (
        user_id, bank_name, bank_account_name, bank_account_number, account_type, proof_attachment_url, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_APPROVAL')
    `, [userId, bankName.trim(), accName, bankAccountNumber.trim(), accountType, proofAttachmentUrl]);

    res.json({
      success: true,
      message: "Payout Disbursement Account submitted successfully for platform verification. Your earnings will be disbursed upon admin approval.",
      verification: result.rows[0],
    });
  } catch (error: any) {
    console.error("Update disbursement error:", error);
    res.status(500).json({ error: "Failed to update disbursement account", cause: error.message });
  }
};

sitterVerificationsRouter.post("/me/disbursement", requireAuth, handleUpdateDisbursement);
sitterVerificationsRouter.patch("/me/disbursement", requireAuth, handleUpdateDisbursement);

// GET /api/sitter-verifications/me/disbursement-trail - Sitter's historical disbursement submissions trail
sitterVerificationsRouter.get("/me/disbursement-trail", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM disbursement_submissions_trail
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.dbUser.id]);
    res.json({
      success: true,
      trail: result.rows,
    });
  } catch (error: any) {
    console.error("Fetch disbursement trail error:", error);
    res.status(500).json({ error: "Failed to fetch disbursement trail", cause: error.message });
  }
});

// GET /api/sitter-verifications/me/kyc-trail - Sitter's historical App KYC submissions trail
sitterVerificationsRouter.get("/me/kyc-trail", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT * FROM app_kyc_submissions_trail
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [req.dbUser.id]);
    res.json({
      success: true,
      trail: result.rows,
    });
  } catch (error: any) {
    console.error("Fetch KYC trail error:", error);
    res.status(500).json({ error: "Failed to fetch KYC trail", cause: error.message });
  }
});

// GET /api/sitter-verifications/admin/disbursement-trail - Admin review of all disbursement submissions
sitterVerificationsRouter.get("/admin/disbursement-trail", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT dst.*, u.name as user_name, u.email as user_email
      FROM disbursement_submissions_trail dst
      LEFT JOIN users u ON u.id = dst.user_id
      ORDER BY dst.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Admin fetch disbursement trails error:", error);
    res.status(500).json({ error: "Failed to fetch disbursement submissions" });
  }
});

// PATCH /api/sitter-verifications/admin/disbursement-trail/:id - Admin approve or reject disbursement submission
sitterVerificationsRouter.patch("/admin/disbursement-trail/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const trailId = parseInt(req.params.id, 10);
    const { status, adminNotes } = req.body;
    if (!["APPROVED", "REJECTED", "PENDING_APPROVAL"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED, REJECTED, or PENDING_APPROVAL" });
    }

    const updated = await pool.query(`
      UPDATE disbursement_submissions_trail
      SET status = $1, admin_notes = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, adminNotes || null, req.dbUser.id, trailId]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "Disbursement submission not found" });
    }

    const rec = updated.rows[0];
    if (status === "APPROVED") {
      await pool.query(`
        UPDATE sitter_verifications
        SET bank_name = $1, bank_account_name = $2, bank_account_number = $3
        WHERE user_id = $4
      `, [rec.bank_name, rec.bank_account_name, rec.bank_account_number, rec.user_id]);
    }

    res.json({ success: true, submission: rec });
  } catch (error: any) {
    console.error("Admin update disbursement trail error:", error);
    res.status(500).json({ error: "Failed to update disbursement status", cause: error.message });
  }
});

// GET /api/sitter-verifications/admin/kyc-trail - Admin review of all App KYC submissions
sitterVerificationsRouter.get("/admin/kyc-trail", requireAuth, requireRole(["ADMIN"]), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT akt.*, u.name as user_name, u.email as user_email
      FROM app_kyc_submissions_trail akt
      LEFT JOIN users u ON u.id = akt.user_id
      ORDER BY akt.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error("Admin fetch KYC trails error:", error);
    res.status(500).json({ error: "Failed to fetch KYC submissions" });
  }
});

// PATCH /api/sitter-verifications/admin/kyc-trail/:id - Admin approve or reject App KYC submission
sitterVerificationsRouter.patch("/admin/kyc-trail/:id", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const trailId = parseInt(req.params.id, 10);
    const { status, rejectionReason } = req.body;
    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ error: "Status must be APPROVED, REJECTED, or PENDING" });
    }

    const updated = await pool.query(`
      UPDATE app_kyc_submissions_trail
      SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [status, rejectionReason || null, req.dbUser.id, trailId]);

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: "KYC submission not found" });
    }

    const rec = updated.rows[0];
    const isApproved = status === "APPROVED";

    await pool.query(`
      UPDATE sitter_verifications
      SET status = $1, admin_notes = $2, reviewed_at = NOW()
      WHERE user_id = $3
    `, [status, rejectionReason || null, rec.user_id]);

    await pool.query(`UPDATE users SET is_verified = $1 WHERE id = $2`, [isApproved, rec.user_id]);

    res.json({ success: true, submission: rec });
  } catch (error: any) {
    console.error("Admin update KYC trail error:", error);
    res.status(500).json({ error: "Failed to update KYC status", cause: error.message });
  }
});


