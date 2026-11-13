import type { Request, Response, NextFunction } from "express";
import { adminAuth } from "../lib/firebase-admin.ts";
import type { DecodedIdToken } from "firebase-admin/auth";
import { db } from "../db/index.ts";
import { users } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import { verifySessionToken } from "../lib/server-auth.ts";

export interface AuthRequest extends Request {
  user?: DecodedIdToken | any;
  dbUser?: any;
}
export const AuthRequest = {};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split("Bearer ")[1];
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Unauthorized: Missing token" });
  }

  let decodedToken: any = null;

  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (fbErr) {
    // If Firebase ID token verification fails, check if it's a signed app session token
    const sessionUser = verifySessionToken(token);
    if (sessionUser) {
      decodedToken = {
        uid: sessionUser.uid,
        email: sessionUser.email,
        name: sessionUser.name,
      };
    } else {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
  }

  try {
    req.user = decodedToken;

    // Fetch db user for role and suspension checking
    const dbUserResults = await db
      .select()
      .from(users)
      .where(eq(users.uid, decodedToken.uid))
      .limit(1);

    const superAdmins = ["rolanmolano77@gmail.com", "gitstackitsolution@gmail.com", "admin@pawshield.com"];
    const userEmail = (decodedToken.email || "").toLowerCase();

    if (dbUserResults.length > 0) {
      req.dbUser = dbUserResults[0];
      // Automatically guarantee super-admin access for project owner
      if (superAdmins.includes(userEmail) && req.dbUser.role !== "ADMIN") {
        await db.update(users).set({ role: "ADMIN" }).where(eq(users.id, req.dbUser.id));
        req.dbUser.role = "ADMIN";
      }
    } else {
      // Check if user was pre-provisioned in database by email
      const emailMatch = userEmail
        ? await db.select().from(users).where(eq(users.email, userEmail)).limit(1)
        : [];

      if (emailMatch.length > 0) {
        const isSuperAdmin = superAdmins.includes(userEmail);
        const updated = await db.update(users)
          .set({
            uid: decodedToken.uid,
            name: decodedToken.name || emailMatch[0].name,
            role: isSuperAdmin ? "ADMIN" : emailMatch[0].role
          })
          .where(eq(users.id, emailMatch[0].id))
          .returning();
        req.dbUser = updated[0];
      } else {
        // If user is authenticated but not in DB yet, create them with ADMIN if owner
        const newRole = superAdmins.includes(userEmail) ? "ADMIN" : "PET_OWNER";
        const inserted = await db.insert(users).values({
          uid: decodedToken.uid,
          email: userEmail || "no-email@example.com",
          name: decodedToken.name || null,
          role: newRole,
        }).onConflictDoUpdate({
          target: users.uid,
          set: { role: newRole }
        }).returning();
        req.dbUser = inserted[0];
      }
    }

    // Check if user account is suspended
    if (req.dbUser?.isSuspended) {
      // Allow /api/auth/me and /api/notifications so user gets real-time status and message
      const isStatusEndpoint = req.path === "/me" || req.path === "/auth/me" || req.path.includes("notifications");
      if (!isStatusEndpoint) {
        return res.status(403).json({
          error: "Account Suspended",
          isSuspended: true,
          suspensionReason: req.dbUser.suspensionReason || "Your account has been suspended by administration.",
          suspendedAt: req.dbUser.suspendedAt
        });
      }
    }

    next();
  } catch (error) {
    console.error("Error processing authenticated user:", error);
    return res.status(401).json({ error: "Unauthorized: Failed to authenticate user" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.dbUser) {
      return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
    }
    // Super admins always have access across all role-protected endpoints
    if (req.dbUser.role === "ADMIN" || roles.includes(req.dbUser.role)) {
      return next();
    }
    return res.status(403).json({ error: "Forbidden: Insufficient privileges" });
  };
};
