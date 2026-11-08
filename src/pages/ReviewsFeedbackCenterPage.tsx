import { useState, useEffect } from "react";
import { Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import {
  Star,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Camera,
  Trash2,
  Edit3,
  ShieldCheck,
  User,
  Heart,
  Plus,
  Eye,
  EyeOff,
  Sparkles,
  Calendar,
  X
} from "lucide-react";

interface EligibleBooking {
  booking_id: number;
  booking_status: string;
  start_time: string;
  end_time: string;
  total_amount: number;
  owner_id: number;
  sitter_id: number;
  owner_name: string;
  owner_avatar?: string;
  sitter_name: string;
  sitter_avatar?: string;
  existing_review_id?: number;
  existing_rating?: number;
  existing_comment?: string;
  existing_photos?: string[];
  existing_tags?: string[];
  review_created_at?: string;
}

interface AdminReviewItem {
  id: number;
  booking_id: number;
  reviewer_id: number;
  reviewee_id: number;
  reviewer_role: string;
  target_role: string;
  rating: number;
  comment: string;
  photo_urls: string[];
  pet_behavior_tags: string[];
  is_hidden: boolean;
  created_at: string;
  reviewer_name: string;
  reviewer_email: string;
  reviewer_actual_role: string;
  reviewer_avatar?: string;
  reviewee_name: string;
  reviewee_email: string;
  reviewee_actual_role: string;
  reviewee_avatar?: string;
}

export function ReviewsFeedbackCenterPage() {
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  const isPetSitter = dbUser?.role === "PET_SITTER";
  const isAdmin = dbUser?.role === "ADMIN";

  // Data state
  const [eligibleBookings, setEligibleBookings] = useState<EligibleBooking[]>([]);
  const [adminReviews, setAdminReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeBooking, setActiveBooking] = useState<EligibleBooking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [newPhotoInput, setNewPhotoInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Admin filter state
  const [adminRoleFilter, setAdminRoleFilter] = useState<"ALL" | "PET_OWNER" | "PET_SITTER">("ALL");
  const [adminSearch, setAdminSearch] = useState("");

  const predefinedTags = isPetSitter
    ? ["Punctual Owner", "Friendly Pet", "Clear Feeding Instructions", "Clean Home", "Responsive In Chat", "Accurate Pet Profile", "High Emergency Spend Limit"]
    : ["Punctual Sitter", "Great Photo Check-ins", "Loving Pet Care", "Followed Medical Instructions", "Cleaned Pet Area", "Highly Recommended", "Instant Communication"];

  useEffect(() => {
    fetchData();
  }, [user, dbUser]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (isAdmin) {
        const res = await fetch("/api/reviews/admin/all", {
          headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAdminReviews(data.reviews || []);
        }
      }

      // Fetch user bookings eligible for review
      const bRes = await fetch("/api/reviews/eligible-bookings", {
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
      });
      if (bRes.ok) {
        const bData = await bRes.json();
        setEligibleBookings(bData.bookings || []);
      }
    } catch (err) {
      console.error("Error fetching review center data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReviewModal = (b: EligibleBooking) => {
    setActiveBooking(b);
    setRating(b.existing_rating || 5);
    setComment(b.existing_comment || "");
    setPhotoUrls(b.existing_photos || []);
    setSelectedTags(b.existing_tags || []);
    setModalOpen(true);
  };

  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddPhoto = () => {
    if (!newPhotoInput.trim()) return;
    if (photoUrls.length >= 6) {
      toast({ title: "Photo Limit Reached", description: "Maximum 6 photos allowed per review.", type: "error" });
      return;
    }
    setPhotoUrls([...photoUrls, newPhotoInput.trim()]);
    setNewPhotoInput("");
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== idx));
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBooking) return;
    if (!comment.trim()) {
      toast({ title: "Comment Required", description: "Please share a written experience or behavioral note.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const revieweeId = isPetSitter ? activeBooking.owner_id : activeBooking.sitter_id;
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({
          bookingId: activeBooking.booking_id,
          revieweeId,
          rating,
          comment: comment.trim(),
          photoUrls,
          petBehaviorTags: selectedTags,
        }),
      });

      if (res.ok) {
        toast({ title: "Review Submitted! 🎉", description: "Review submitted and verified successfully.", type: "success" });
        setModalOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: "Submission Failed", description: err.error || "Failed to save review", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to submit review", type: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdminToggleVisibility = async (reviewId: number, currentHidden: boolean) => {
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user?.getIdToken()}`,
        },
        body: JSON.stringify({ isHidden: !currentHidden }),
      });
      if (res.ok) {
        toast({ title: "Visibility Updated", description: `Review marked as ${!currentHidden ? "Hidden" : "Public"}.`, type: "success" });
        fetchData();
      }
    } catch {
      toast({ title: "Action Failed", description: "Could not toggle review visibility.", type: "error" });
    }
  };

  const handleAdminDeleteReview = async (reviewId: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${await user?.getIdToken()}` },
      });
      if (res.ok) {
        toast({ title: "Review Deleted", description: "Review removed from system.", type: "success" });
        fetchData();
      }
    } catch {
      toast({ title: "Action Failed", description: "Failed to delete review.", type: "error" });
    }
  };

  // Sample photo helpers
  const sampleVerificationPhotos = [
    "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1537151625747-768eb6cf92b2?auto=format&fit=crop&w=400&q=80"
  ];

  const filteredAdminReviews = adminReviews.filter((r) => {
    if (adminRoleFilter !== "ALL" && r.reviewer_role !== adminRoleFilter) return false;
    if (adminSearch.trim()) {
      const q = adminSearch.toLowerCase();
      return (
        r.reviewer_name?.toLowerCase().includes(q) ||
        r.reviewee_name?.toLowerCase().includes(q) ||
        r.comment?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/20 mb-3">
            <Sparkles className="w-3.5 h-3.5" /> Two-Way Verified Ratings & Behavioral Feedback
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Client & Sitter Experience Center
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-2xl leading-relaxed">
            PawShield protects trust with bilateral accountability. Pet Owners review sitter care quality & photos, while Pet Sitters rate pet behavior, home preparedness, and clear instructions.
          </p>
        </div>
      </div>

      {/* ADMIN CONTROLS SECTION */}
      {isAdmin && (
        <section className="bg-white rounded-3xl p-6 border border-amber-200 shadow-md mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h2 className="text-lg font-black text-slate-900">Admin Review Moderation Console</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Full authority to view, filter by role, edit visibility, or remove flagged feedback across Pet Owners & Pet Sitters.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={adminRoleFilter}
                onChange={(e: any) => setAdminRoleFilter(e.target.value)}
                className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 outline-none"
              >
                <option value="ALL">All Roles ({adminReviews.length})</option>
                <option value="PET_OWNER">By Pet Owners</option>
                <option value="PET_SITTER">By Pet Sitters</option>
              </select>
              <input
                type="text"
                placeholder="Search reviews or users..."
                value={adminSearch}
                onChange={(e) => setAdminSearch(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none w-44"
              />
            </div>
          </div>

          {filteredAdminReviews.length === 0 ? (
            <div className="text-center py-8 bg-slate-50 rounded-2xl">
              <p className="text-xs text-slate-500 font-semibold">No platform reviews matching your filter.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAdminReviews.map((r) => (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    r.is_hidden ? "bg-rose-50/50 border-rose-200 opacity-75" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold text-xs">
                        {(r.reviewer_name?.[0] || "U").toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{r.reviewer_name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                            {r.reviewer_role}
                          </span>
                          <span className="text-slate-400 text-xs">→</span>
                          <span className="text-xs font-semibold text-slate-700">{r.reviewee_name}</span>
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {r.target_role}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {new Date(r.created_at).toLocaleDateString()} • Booking #{r.booking_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {Array.from({ length: r.rating }).map((_, idx) => (
                          <Star key={idx} className="w-3.5 h-3.5 fill-amber-500" />
                        ))}
                      </div>

                      <button
                        onClick={() => handleAdminToggleVisibility(r.id, r.is_hidden)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs flex items-center gap-1 font-semibold"
                        title={r.is_hidden ? "Unhide Review" : "Hide from Public Profile"}
                      >
                        {r.is_hidden ? <Eye className="w-3.5 h-3.5 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 text-amber-600" />}
                        {r.is_hidden ? "Unhide" : "Hide"}
                      </button>

                      <button
                        onClick={() => handleAdminDeleteReview(r.id)}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs flex items-center gap-1 font-semibold"
                        title="Delete permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-700 italic bg-slate-50 p-3 rounded-xl mb-2">
                    "{r.comment}"
                  </p>

                  {/* Behavior Tags */}
                  {r.pet_behavior_tags && r.pet_behavior_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {r.pet_behavior_tags.map((t, idx) => (
                        <span key={idx} className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-100">
                          ✓ {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Photo Gallery */}
                  {r.photo_urls && r.photo_urls.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {r.photo_urls.map((p, idx) => (
                        <img
                          key={idx}
                          src={p}
                          alt="Stay photo"
                          className="w-12 h-12 rounded-lg object-cover border border-slate-200"
                          referrerPolicy="no-referrer"
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* USER BOOKINGS TO REVIEW */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-600" />
            {isPetSitter ? "Completed Stays — Review Pet & Owner" : "My Pet Stays — Rate Your Caregiver"}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {isPetSitter
              ? "Share honest feedback regarding pet temperament, clarity of instructions, and house readiness. Helps build a trustworthy pet parent community!"
              : "Review your sitter's attentiveness, photo updates, and pet care. Attach real stay photos to showcase their profile!"}
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400 font-semibold">
            Loading your verified stay bookings...
          </div>
        ) : eligibleBookings.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Heart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600">No completed bookings found yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Once a stay or walk is completed, it will appear here for you to leave a star rating and upload stay photos!
            </p>
            <Link
              to={isPetSitter ? "/sitter/dashboard" : "/search"}
              className="mt-4 inline-block px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl"
            >
              {isPetSitter ? "Go to Sitter Hub" : "Find a Sitter Now"}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {eligibleBookings.map((b) => {
              const otherName = isPetSitter ? b.owner_name : b.sitter_name;
              const otherAvatar = isPetSitter ? b.owner_avatar : b.sitter_avatar;
              const hasReviewed = Boolean(b.existing_review_id);

              return (
                <div
                  key={b.booking_id}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-200 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Booking #{b.booking_id} • {b.booking_status}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(b.start_time).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 mb-4">
                      {otherAvatar ? (
                        <img
                          src={otherAvatar}
                          alt={otherName}
                          className="w-11 h-11 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-purple-100 text-purple-800 flex items-center justify-center font-black text-sm">
                          {(otherName?.[0] || "U").toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-black text-slate-900">{otherName}</p>
                        <p className="text-[11px] text-slate-500">
                          {isPetSitter ? "Pet Parent & Fur Baby" : "Verified Caregiver"}
                        </p>
                      </div>
                    </div>

                    {hasReviewed && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 mb-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-emerald-700">Your Submitted Review:</span>
                          <div className="flex items-center text-amber-500">
                            {Array.from({ length: b.existing_rating || 5 }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-amber-500" />
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 italic line-clamp-2">
                          "{b.existing_comment}"
                        </p>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleOpenReviewModal(b)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                      hasReviewed
                        ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                        : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-md shadow-purple-200"
                    }`}
                  >
                    {hasReviewed ? <Edit3 className="w-3.5 h-3.5" /> : <Star className="w-3.5 h-3.5" />}
                    {hasReviewed ? "Edit Review & Photos" : "Write Review & Add Photos"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* WRITE / EDIT REVIEW MODAL */}
      {modalOpen && activeBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {isPetSitter ? "Review Pet & Owner Behavior" : "Review Sitter & Care Experience"}
                </h3>
                <p className="text-xs text-slate-500">Booking #{activeBooking.booking_id}</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Overall Rating (1 to 5 Stars)</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <button
                      type="button"
                      key={starVal}
                      onClick={() => setRating(starVal)}
                      className={`p-2 rounded-xl transition-all transform hover:scale-110 active:scale-95 ${
                        rating >= starVal ? "bg-amber-50 text-amber-500 border border-amber-200" : "bg-slate-50 text-slate-300 border border-slate-200"
                      }`}
                    >
                      <Star className={`w-6 h-6 ${rating >= starVal ? "fill-amber-400" : ""}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-700 ml-2">
                    {rating === 5 ? "5.0 - Exceptional Experience" : rating === 4 ? "4.0 - Great Care" : rating === 3 ? "3.0 - Satisfactory" : `${rating}.0 Stars`}
                  </span>
                </div>
              </div>

              {/* Pet Behavior / Experience Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  {isPetSitter ? "Pet & Owner Behavior Attributes" : "Key Strengths & Highlights"}
                </label>
                <div className="flex flex-wrap gap-2">
                  {predefinedTags.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-all ${
                          isSelected
                            ? "bg-purple-600 text-white shadow-xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written Experience Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Written Feedback & Recommendations <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    isPetSitter
                      ? "Share how the pet behaved, whether feeding instructions were accurate, and any notes for future sitters..."
                      : "Describe how well the sitter communicated, took care of medications, sent photo check-ins, and kept your pet comfortable..."
                  }
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full p-3 text-xs border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* Photo Upload Gallery */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-purple-600" />
                    Upload Stay Pictures ({photoUrls.length}/6)
                  </label>
                  <span className="text-[10px] text-slate-400">Shown in public profile</span>
                </div>

                <div className="flex gap-2 mb-2">
                  <input
                    type="url"
                    placeholder="Paste image URL (e.g. https://...)"
                    value={newPhotoInput}
                    onChange={(e) => setNewPhotoInput(e.target.value)}
                    className="flex-1 p-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddPhoto}
                    className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs font-bold rounded-xl flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>

                {/* Quick Add Samples */}
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-[10px] text-slate-400">Quick sample:</span>
                  {sampleVerificationPhotos.map((sUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!photoUrls.includes(sUrl) && photoUrls.length < 6) {
                          setPhotoUrls([...photoUrls, sUrl]);
                        }
                      }}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium"
                    >
                      Photo #{idx + 1}
                    </button>
                  ))}
                </div>

                {/* Photo Previews */}
                {photoUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {photoUrls.map((url, idx) => (
                      <div key={idx} className="relative rounded-xl overflow-hidden aspect-square border border-slate-200 group">
                        <img src={url} alt={`Upload ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center opacity-90 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting ? "Saving Review..." : "Publish Review & Photos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
