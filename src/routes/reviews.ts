import { Router, Response } from "express";
import { pool } from "../db/index.ts";
import { AuthRequest, requireAuth, requireRole } from "../middleware/auth.ts";

export const reviewsRouter = Router();

/**
 * GET /api/reviews/target/:targetUserId
 * Public/Authenticated: Get approved/visible reviews for a target user (Sitter or Owner)
 */
reviewsRouter.get("/target/:targetUserId", async (req, res: Response) => {
  try {
    const targetUserId = parseInt(req.params.targetUserId, 10);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ error: "Invalid target user ID" });
    }

    const result = await pool.query(
      `
      SELECT 
        r.id,
        r.booking_id,
        r.reviewer_id,
        r.reviewee_id,
        r.reviewer_role,
        r.target_role,
        r.rating,
        r.comment,
        r.photo_urls,
        r.pet_behavior_tags,
        r.is_hidden,
        r.created_at,
        u.name as reviewer_name,
        u.profile_picture as reviewer_avatar,
        u.email as reviewer_email
      FROM reviews r
      JOIN users u ON u.id = r.reviewer_id
      WHERE r.reviewee_id = $1 AND r.is_hidden = FALSE
      ORDER BY r.created_at DESC
      `,
      [targetUserId]
    );

    res.json({
      reviews: result.rows,
      count: result.rows.length,
      averageRating:
        result.rows.length > 0
          ? Number(
              (
                result.rows.reduce((acc, curr) => acc + curr.rating, 0) /
                result.rows.length
              ).toFixed(1)
            )
          : null,
    });
  } catch (error: any) {
    console.error("Error fetching reviews for target user:", error);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

/**
 * GET /api/reviews/eligible-bookings
 * Authenticated: Get completed bookings that the logged in user can review (or has reviewed)
 */
reviewsRouter.get("/eligible-bookings", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Find completed bookings where user is either owner or sitter
    const query = `
      SELECT 
        b.id as booking_id,
        b.status as booking_status,
        b.start_time,
        b.end_time,
        b.total_amount,
        b.owner_id,
        b.sitter_id,
        owner.name as owner_name,
        owner.profile_picture as owner_avatar,
        sitter.name as sitter_name,
        sitter.profile_picture as sitter_avatar,
        r.id as existing_review_id,
        r.rating as existing_rating,
        r.comment as existing_comment,
        r.photo_urls as existing_photos,
        r.pet_behavior_tags as existing_tags,
        r.created_at as review_created_at
      FROM bookings b
      JOIN users owner ON owner.id = b.owner_id
      JOIN users sitter ON sitter.id = b.sitter_id
      LEFT JOIN reviews r ON r.booking_id = b.id AND r.reviewer_id = $1
      WHERE (b.owner_id = $1 OR b.sitter_id = $1)
      ORDER BY b.created_at DESC
      LIMIT 50
    `;

    const result = await pool.query(query, [userId]);
    res.json({ bookings: result.rows });
  } catch (error: any) {
    console.error("Error fetching eligible review bookings:", error);
    res.status(500).json({ error: "Failed to fetch eligible bookings" });
  }
});

/**
 * POST /api/reviews
 * Authenticated: Submit a review for a booking & user (Owner -> Sitter OR Sitter -> Owner)
 */
reviewsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviewerId = req.user?.id;
    const {
      bookingId,
      revieweeId,
      rating,
      comment,
      photoUrls = [],
      petBehaviorTags = [],
    } = req.body;

    if (!reviewerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!revieweeId || !rating || !comment || comment.trim().length === 0) {
      return res.status(400).json({ error: "Rating and review comment are required." });
    }

    const numRating = parseInt(rating, 10);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ error: "Rating must be an integer between 1 and 5 stars." });
    }

    // Determine roles
    const reviewerRole = req.user?.role || "PET_OWNER";
    const targetRole = reviewerRole === "PET_SITTER" ? "PET_OWNER" : "PET_SITTER";

    // Insert or update review
    const insertQuery = `
      INSERT INTO reviews (
        booking_id,
        reviewer_id,
        reviewee_id,
        reviewer_role,
        target_role,
        rating,
        comment,
        photo_urls,
        pet_behavior_tags,
        is_hidden,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE, NOW(), NOW())
      RETURNING *
    `;

    const photosJson = JSON.stringify(Array.isArray(photoUrls) ? photoUrls : []);
    const tagsJson = JSON.stringify(Array.isArray(petBehaviorTags) ? petBehaviorTags : []);

    const result = await pool.query(insertQuery, [
      bookingId ? parseInt(bookingId, 10) : null,
      reviewerId,
      parseInt(revieweeId, 10),
      reviewerRole,
      targetRole,
      numRating,
      comment.trim(),
      photosJson,
      tagsJson,
    ]);

    res.status(201).json({
      success: true,
      message: "Review submitted successfully!",
      review: result.rows[0],
    });
  } catch (error: any) {
    console.error("Error creating review:", error);
    res.status(500).json({ error: error.message || "Failed to submit review" });
  }
});

/**
 * PUT /api/reviews/:id
 * Authenticated: Reviewer can edit their own review, OR Admin can edit any review
 */
reviewsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const { rating, comment, photoUrls, petBehaviorTags, isHidden } = req.body;

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    // Check existing
    const existing = await pool.query("SELECT * FROM reviews WHERE id = $1", [reviewId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = existing.rows[0];
    const isAdmin = userRole === "ADMIN";
    const isOwnerOfReview = review.reviewer_id === userId;

    if (!isAdmin && !isOwnerOfReview) {
      return res.status(403).json({ error: "Forbidden: You cannot modify this review" });
    }

    const newRating = rating !== undefined ? parseInt(rating, 10) : review.rating;
    const newComment = comment !== undefined ? comment.trim() : review.comment;
    const newPhotos = photoUrls !== undefined ? JSON.stringify(photoUrls) : JSON.stringify(review.photo_urls || []);
    const newTags = petBehaviorTags !== undefined ? JSON.stringify(petBehaviorTags) : JSON.stringify(review.pet_behavior_tags || []);
    const newHidden = isHidden !== undefined && isAdmin ? isHidden : review.is_hidden;

    const updateRes = await pool.query(
      `
      UPDATE reviews
      SET rating = $1, comment = $2, photo_urls = $3, pet_behavior_tags = $4, is_hidden = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
      `,
      [newRating, newComment, newPhotos, newTags, newHidden, reviewId]
    );

    res.json({
      success: true,
      message: "Review updated successfully",
      review: updateRes.rows[0],
    });
  } catch (error: any) {
    console.error("Error updating review:", error);
    res.status(500).json({ error: "Failed to update review" });
  }
});

/**
 * DELETE /api/reviews/:id
 * Admin OR Owner of review can delete
 */
reviewsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reviewId = parseInt(req.params.id, 10);
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (isNaN(reviewId)) {
      return res.status(400).json({ error: "Invalid review ID" });
    }

    const existing = await pool.query("SELECT * FROM reviews WHERE id = $1", [reviewId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    const review = existing.rows[0];
    const isAdmin = userRole === "ADMIN";
    const isOwnerOfReview = review.reviewer_id === userId;

    if (!isAdmin && !isOwnerOfReview) {
      return res.status(403).json({ error: "Forbidden: You cannot delete this review" });
    }

    await pool.query("DELETE FROM reviews WHERE id = $1", [reviewId]);

    res.json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting review:", error);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

/**
 * GET /api/reviews/admin/all
 * Admin: Get all reviews with full control (moderation, deletion, role filtering)
 */
reviewsRouter.get("/admin/all", requireAuth, requireRole(["ADMIN"]), async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.*,
        reviewer.name as reviewer_name,
        reviewer.email as reviewer_email,
        reviewer.role as reviewer_actual_role,
        reviewer.profile_picture as reviewer_avatar,
        reviewee.name as reviewee_name,
        reviewee.email as reviewee_email,
        reviewee.role as reviewee_actual_role,
        reviewee.profile_picture as reviewee_avatar,
        b.id as booking_id_ref,
        b.status as booking_status
      FROM reviews r
      LEFT JOIN users reviewer ON reviewer.id = r.reviewer_id
      LEFT JOIN users reviewee ON reviewee.id = r.reviewee_id
      LEFT JOIN bookings b ON b.id = r.booking_id
      ORDER BY r.created_at DESC
    `);

    res.json({ reviews: result.rows, count: result.rows.length });
  } catch (error: any) {
    console.error("Admin review fetch error:", error);
    res.status(500).json({ error: "Failed to fetch platform reviews" });
  }
});
