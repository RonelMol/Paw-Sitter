import { Router, type Request, type Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.ts";
import { db } from "../db/index.ts";
import { users, sitterProfiles } from "../db/schema.ts";
import { getStripe } from "../lib/stripe.ts";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword, generateSessionToken } from "../lib/server-auth.ts";
import { adminAuth } from "../lib/firebase-admin.ts";

export const authRouter = Router();

// POST /api/auth/login-email - Direct email/password authentication
authRouter.post("/login-email", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existingUsers = await db.select().from(users).where(eq(users.email, cleanEmail));

    if (existingUsers.length === 0) {
      return res.status(401).json({
        error: "Account not found. This account does not exist or has been permanently deleted from the database."
      });
    }

    const user = existingUsers[0];

    // Check suspension status
    if (user.isSuspended) {
      return res.status(403).json({
        error: `Your account has been suspended: ${user.suspensionReason || "Account suspended by platform administration."}`,
        isSuspended: true,
        suspensionReason: user.suspensionReason || "Account suspended by platform administration.",
        suspendedAt: user.suspendedAt
      });
    }

    // Verify password
    const isPwValid = verifyPassword(password, user.passwordHash);
    if (!isPwValid) {
      return res.status(401).json({ error: "Invalid email address or password. Please try again." });
    }

    // Generate session token
    const token = generateSessionToken({
      id: user.id,
      uid: user.uid,
      email: user.email,
      role: user.role,
      name: user.name || undefined
    });

    let customToken: string | null = null;
    try {
      customToken = await adminAuth.createCustomToken(user.uid);
    } catch (tokenErr) {
      // Firebase custom token creation optional
    }

    res.json({
      success: true,
      token,
      customToken,
      user
    });
  } catch (err: any) {
    console.error("Login email error:", err, "Cause:", err.cause);
    res.status(500).json({ error: "Authentication failed", cause: err.message, innerCause: String(err.cause?.message || err.cause) });
  }
});

// POST /api/auth/register-email - Direct email/password registration
authRouter.post("/register-email", async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = "PET_OWNER", phone } = req.body;
    if (!email || !email.includes("@") || !password) {
      return res.status(400).json({ error: "Valid email and password are required." });
    }

    if (password.length < 3) {
      return res.status(400).json({ error: "Password must be at least 3 characters." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists. Please sign in." });
    }

    const uid = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const passwordHash = hashPassword(password);

    const inserted = await db.insert(users).values({
      uid,
      email: cleanEmail,
      name: name?.trim() || null,
      role: role === "PET_SITTER" ? "PET_SITTER" : role === "ADMIN" ? "ADMIN" : "PET_OWNER",
      passwordHash,
      phone: phone?.trim() || null,
      isVerified: role === "PET_SITTER" ? false : true
    }).returning();

    const newUser = inserted[0];

    if (newUser.role === "PET_SITTER") {
      await db.insert(sitterProfiles).values({
        userId: newUser.id,
        bio: "Passionate verified pet caregiver.",
        experienceDetails: "",
        serviceRadiusMiles: 10,
        photos: []
      }).onConflictDoNothing();
    }

    const token = generateSessionToken({
      id: newUser.id,
      uid: newUser.uid,
      email: newUser.email,
      role: newUser.role,
      name: newUser.name || undefined
    });

    let customToken: string | null = null;
    try {
      customToken = await adminAuth.createCustomToken(newUser.uid);
    } catch {
      // Optional
    }

    res.json({
      success: true,
      token,
      customToken,
      user: newUser
    });
  } catch (err: any) {
    console.error("Register email error:", err);
    res.status(500).json({ error: "Registration failed", cause: err.message });
  }
});

// POST /api/auth/change-password - Change user password
authRouter.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 3) {
      return res.status(400).json({ error: "New password must be at least 3 characters." });
    }

    const user = req.dbUser;
    if (user.passwordHash && currentPassword) {
      const isValid = verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect." });
      }
    }

    const newHash = hashPassword(newPassword);
    await db.update(users)
      .set({ passwordHash: newHash })
      .where(eq(users.id, user.id));

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err: any) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to update password", cause: err.message });
  }
});

authRouter.post("/sync", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { uid, email } = req.user!;
    const { role } = req.body; // allow setting role initially

    // Basic validation
    if (role && !["PET_OWNER", "PET_SITTER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const existingUsers = await db.select().from(users).where(eq(users.uid, uid));
    
    if (existingUsers.length > 0) {
      return res.json(existingUsers[0]);
    }

    // Check if user was pre-provisioned by admin with their email
    if (email) {
      const existingByEmail = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
      if (existingByEmail.length > 0) {
        const updated = await db.update(users)
          .set({ uid })
          .where(eq(users.id, existingByEmail[0].id))
          .returning();
        return res.json(updated[0]);
      }
    }

    // Create Stripe customer/account based on role
    let stripeCustomerId = null;
    let stripeAccountId = null;

    try {
      const stripe = getStripe();
      if (role === "PET_OWNER" || !role) {
        const customer = await stripe.customers.create({ email });
        stripeCustomerId = customer.id;
      } else if (role === "PET_SITTER") {
        const account = await stripe.accounts.create({
          type: "express",
          email,
          capabilities: {
            transfers: { requested: true },
          },
        });
        stripeAccountId = account.id;
      }
    } catch (stripeError) {
      console.warn("Stripe initialization skipped or failed:", stripeError);
      // We can continue without stripe IDs if keys aren't set up yet for local dev
    }

    const result = await db.insert(users)
      .values({
        uid,
        email: email || "no-email@example.com",
        role: role || "PET_OWNER",
        stripeCustomerId,
        stripeAccountId,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: { email: email || "no-email@example.com" },
      })
      .returning();

    res.json(result[0]);
  } catch (error: any) {
    console.error("Sync user error:", error);
    res.status(500).json({ error: "Failed to sync user", cause: error.message });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.dbUser) {
    res.json(req.dbUser);
  } else {
    res.status(404).json({ error: "User not found in DB" });
  }
});

authRouter.patch("/me/role", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    // Role switching is strictly restricted to platform administrators
    if (req.dbUser.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied: Switching account roles is restricted to Platform Administrators only." });
    }

    const { role } = req.body;
    if (!["ADMIN", "PET_SITTER", "PET_OWNER"].includes(role)) {
      return res.status(400).json({ error: "Invalid role specified" });
    }
    const updated = await db.update(users)
      .set({ role })
      .where(eq(users.id, req.dbUser!.id))
      .returning();
    
    res.json(updated[0]);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update role", cause: err.message });
  }
});

authRouter.patch("/me/profile", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, profilePicture, photoUrl } = req.body;
    const updates: any = {};
    if (name !== undefined && typeof name === "string") updates.name = name.trim();
    if (phone !== undefined && typeof phone === "string") updates.phone = phone.trim();
    if (profilePicture !== undefined) updates.profilePicture = profilePicture;
    else if (photoUrl !== undefined) updates.profilePicture = photoUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No profile fields provided to update" });
    }

    const updated = await db.update(users)
      .set(updates)
      .where(eq(users.id, req.dbUser!.id))
      .returning();

    res.json({ success: true, user: updated[0] });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update profile", cause: err.message });
  }
});
