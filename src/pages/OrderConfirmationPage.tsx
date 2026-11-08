import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import { 
  CheckCircle2, 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  Plus, 
  Sparkles, 
  Trash2, 
  Activity, 
  Utensils, 
  Footprints, 
  Pill, 
  HeartHandshake, 
  Printer, 
  ArrowRight,
  Eye,
  AlertCircle,
  ListOrdered,
  Camera,
  Check
} from "lucide-react";
import { cn } from "../lib/utils";
import { ProofViewerModal } from "../components/ProofViewerModal";

interface PetActivity {
  id: number;
  bookingId: number;
  petId?: number | null;
  petName?: string | null;
  title: string;
  activityType: string;
  scheduledDate: string;
  scheduledTime: string;
  instructions: string | null;
  status: "PENDING" | "COMPLETED" | "MISSED";
  proofRequired?: boolean;
  completedAt: string | null;
  completedBy: string | null;
  completedNotes: string | null;
  completedPhotoUrl: string | null;
}

export function OrderConfirmationPage() {
  const { id } = useParams();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  const { formatPrice } = useCurrency();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activities, setActivities] = useState<PetActivity[]>([]);
  const [selectedPetFilter, setSelectedPetFilter] = useState<string>("ALL");
  const [selectedTaskForViewProof, setSelectedTaskForViewProof] = useState<PetActivity | null>(null);
  
  // New activity form modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("FEEDING");
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("08:00");
  const [newInstructions, setNewInstructions] = useState("");
  const [newTargetPet, setNewTargetPet] = useState<string>("ALL");
  const [newProofRequired, setNewProofRequired] = useState<boolean>(true);
  const [isSubmittingActivity, setIsSubmittingActivity] = useState(false);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(false);
  const [isApprovingRoutine, setIsApprovingRoutine] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    fetchBookingDetails();
  }, [user, id]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Failed to load booking details");
      }

      const bookingData = await res.json();
      setData(bookingData);
      setActivities(bookingData.activities || []);
      
      // Default new activity date to start date of booking
      if (bookingData.booking?.startTime) {
        const startIso = new Date(bookingData.booking.startTime).toISOString().split("T")[0];
        setNewDate(startIso);
      }
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const isSitter = dbUser?.role === "ADMIN" || (data?.sitter && (dbUser?.id === data.sitter.id || user?.email === data.sitter.email));
  const isOwner = !isSitter;
  const routineApprovalStatus = data?.booking?.routineApprovalStatus || "PENDING_APPROVAL";
  const isRoutineApproved = routineApprovalStatus === "APPROVED";
  const petsList = data?.pets || [];

  const handleOwnerApproveProposedRoutine = async () => {
    try {
      setIsApprovingRoutine(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/routine/owner-approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve proposed routine");
      }

      setData((prev: any) => ({
        ...prev,
        booking: {
          ...prev.booking,
          routineApprovalStatus: "APPROVED"
        }
      }));

      toast({
        title: "Proposed Routine Approved! 🎉",
        description: "You have approved your pet sitter's care schedule adjustments.",
        type: "success"
      });
    } catch (e: any) {
      toast({ title: "Approval Failed", description: e.message, type: "error" });
    } finally {
      setIsApprovingRoutine(false);
    }
  };

  const handleApproveRoutine = async () => {
    try {
      setIsApprovingRoutine(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/routine/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve routine");
      }

      const updated = await res.json();
      setData((prev: any) => ({
        ...prev,
        booking: {
          ...prev.booking,
          routineApprovalStatus: "APPROVED",
          routineApprovedAt: updated.routineApprovedAt,
          routineApprovedBy: updated.routineApprovedBy
        }
      }));

      toast({
        title: "Routine Approved & Locked",
        description: "You have confirmed the pet care routine. Live tracker is activated for this stay.",
        type: "success"
      });
    } catch (e: any) {
      toast({ title: "Approval Failed", description: e.message, type: "error" });
    } finally {
      setIsApprovingRoutine(false);
    }
  };

  const handleReopenRoutine = async () => {
    try {
      setIsApprovingRoutine(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/routine/reopen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to unlock routine");
      }

      setData((prev: any) => ({
        ...prev,
        booking: {
          ...prev.booking,
          routineApprovalStatus: "PENDING_APPROVAL"
        }
      }));

      toast({
        title: "Routine Unlocked",
        description: "Routine reopened so the pet owner can add or modify schedule items.",
        type: "info"
      });
    } catch (e: any) {
      toast({ title: "Action Failed", description: e.message, type: "error" });
    } finally {
      setIsApprovingRoutine(false);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newTime) {
      toast({ title: "Missing Fields", description: "Please enter a title, date, and time.", type: "error" });
      return;
    }

    if (isOwner && isRoutineApproved) {
      toast({
        title: "Routine Locked",
        description: "This routine has been approved by your sitter and is locked. Please ask your sitter if you need modifications.",
        type: "error"
      });
      return;
    }

    const chosenPet = petsList.find((p: any) => p.name === newTargetPet || String(p.id) === newTargetPet);

    try {
      setIsSubmittingActivity(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          activityType: newType,
          scheduledDate: newDate,
          scheduledTime: newTime,
          instructions: newInstructions.trim(),
          petId: chosenPet ? chosenPet.id : undefined,
          petName: chosenPet ? chosenPet.name : (newTargetPet !== "ALL" ? newTargetPet : undefined),
          proofRequired: newProofRequired,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save activity");
      }

      const created = await res.json();
      setActivities(prev => [...prev, created].sort((a, b) => 
        `${a.scheduledDate} ${a.scheduledTime}`.localeCompare(`${b.scheduledDate} ${b.scheduledTime}`)
      ));
      toast({ title: "Activity Scheduled", description: "Added to pet's daily care schedule.", type: "success" });
      setShowAddModal(false);
      setNewTitle("");
      setNewInstructions("");
      setNewTargetPet("ALL");
      setNewProofRequired(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setIsSubmittingActivity(false);
    }
  };

  const handleToggleProofRequired = async (actId: number, currentVal: boolean) => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities/${actId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          proofRequired: !currentVal,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update requirement");
      }

      const updated = await res.json();
      setActivities(prev => prev.map(a => a.id === actId ? { ...a, proofRequired: updated.proofRequired } : a));
      toast({
        title: !currentVal ? "Photo Proof Required 📸" : "Photo Proof Optional",
        description: !currentVal 
          ? "Sitter will now be required to upload photo evidence before completing this task." 
          : "Photo requirement removed for this task.",
        type: "info"
      });
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, type: "error" });
    }
  };

  const handleGenerateRoutine = async () => {
    if (isOwner && isRoutineApproved) {
      toast({
        title: "Routine Locked",
        description: "This routine has been approved by your sitter and is locked.",
        type: "error"
      });
      return;
    }

    try {
      setIsGeneratingRoutine(true);
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities/generate-routine`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate standard routine");
      }

      const resData = await res.json();
      setActivities(resData.activities || []);
      toast({ 
        title: "Daily Routine Generated", 
        description: `Created standard meals, walks, and potty breaks for this trip!`, 
        type: "success" 
      });
    } catch (err: any) {
      toast({ title: "Generation Error", description: err.message, type: "error" });
    } finally {
      setIsGeneratingRoutine(false);
    }
  };

  const handleDeleteActivity = async (activityId: number) => {
    if (isOwner && isRoutineApproved) {
      toast({
        title: "Routine Locked",
        description: "Cannot delete activities from an approved and locked routine.",
        type: "error"
      });
      return;
    }

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities/${activityId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setActivities(prev => prev.filter(a => a.id !== activityId));
        toast({ title: "Removed", description: "Activity removed from schedule", type: "info" });
      } else {
        const err = await res.json().catch(() => ({}));
        toast({ title: "Cannot Delete", description: err.error || "Failed to delete", type: "error" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: e.message, type: "error" });
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "FEEDING":
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case "WALKING":
        return <Footprints className="w-4 h-4 text-emerald-600" />;
      case "MEDICATION":
        return <Pill className="w-4 h-4 text-rose-600" />;
      case "POTTY":
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-purple-600" />;
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="animate-spin w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-slate-600 font-medium">Generating your order details and itinerary...</p>
      </div>
    );
  }

  if (!data || !data.booking) {
    return (
      <div className="container mx-auto px-4 py-20 max-w-lg text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Booking Not Found</h2>
        <p className="text-slate-600 mb-6">We couldn't retrieve the details for order #{id}.</p>
        <Link to="/search" className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-medium">Return to Sitters</Link>
      </div>
    );
  }

  const { booking, sitter, financialSnapshot, payment, pets: bookedPets } = data;
  const startStr = new Date(booking.startTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const endStr = new Date(booking.endTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  const startTimeStr = new Date(booking.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const endTimeStr = new Date(booking.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <Link to="/search" className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors">
            ← Back to Find a Sitter
          </Link>
          <span className="text-slate-300">|</span>
          <Link to="/my-bookings" className="text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors flex items-center gap-1">
            <ListOrdered className="w-4 h-4" /> View All My Orders & History
          </Link>
        </div>
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => window.print()}
            className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print Order Summary
          </button>
          <Link
            to={`/bookings/${id}/live-tracker`}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Open Live Visit Tracker
          </Link>
        </div>
      </div>

      {/* Confirmation Banner */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-6 sm:p-8 mb-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-emerald-200/60 text-emerald-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Order Confirmed
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Ref: #BK-{booking.id}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Your Pet Care Service is Booked!
              </h1>
              <p className="text-sm text-emerald-900 mt-1">
                Your reservation with <strong>{sitter?.name || "your sitter"}</strong> has been confirmed. You can pay cash upon service delivery.
              </p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm border border-emerald-200/80 px-5 py-3.5 rounded-2xl text-right flex-shrink-0 shadow-xs">
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</span>
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {formatPrice(Number(booking.totalPrice) || 0, "PHP")}
            </span>
            <span className="block text-[11px] font-medium text-emerald-700 mt-0.5">
              {payment?.isCash ? "Cash on Service (Pesos)" : "Escrow Authorized"}
            </span>
          </div>
        </div>
      </div>

      {/* Order Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Sitter & Service Info */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" /> Sitter Details
          </h2>
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 font-bold text-lg flex items-center justify-center border border-blue-100">
              {sitter?.name ? sitter.name.charAt(0) : "S"}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">{sitter?.name || "Professional Sitter"}</h3>
              <p className="text-xs text-slate-500">{sitter?.email}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold">
                  Verified Caregiver
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Service:</span>
              <span className="font-bold text-slate-800">Pet Boarding / Care</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Service Modality:</span>
              <span className="font-semibold text-slate-800">Direct In-Person</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status:</span>
              <span className="font-bold text-emerald-600">Active & Confirmed</span>
            </div>
          </div>
        </div>

        {/* Schedule & Duration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-600" /> Trip Schedule & Times
          </h2>
          
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Service Start</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{startStr}</p>
              <p className="text-xs font-medium text-emerald-700 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> Check-in at {startTimeStr}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Service End</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{endStr}</p>
              <p className="text-xs font-medium text-emerald-700 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5" /> Pickup by {endTimeStr}
              </p>
            </div>
          </div>
        </div>

        {/* Financial Receipt Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" /> Payment & Billing (Pesos)
            </h2>

            <div className="space-y-2.5 text-xs text-slate-600 mb-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span>Base Rate Charge</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(
                    financialSnapshot 
                      ? (financialSnapshot.calculatedBaseTotal / 100) 
                      : (Number(booking.totalPrice) || 0),
                    "PHP"
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span>Platform Service Fee</span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(
                    financialSnapshot 
                      ? (financialSnapshot.calculatedOwnerFee / 100) 
                      : 0,
                    "PHP"
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 text-sm font-extrabold text-slate-900">
                <span>Total Due</span>
                <span className="text-emerald-700">
                  {formatPrice(Number(booking.totalPrice) || 0, "PHP")}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {payment?.isCash ? "Cash on Service (Default)" : "Card Processed"}
            </div>
            <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed">
              No upfront charges on your credit card. Please provide the exact cash amount directly to your sitter upon service completion.
            </p>
          </div>
        </div>
      </div>

      {/* OWNER TO CUSTOMER: Pet Activity Schedule by Time & Date */}
      <section className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 mb-8">
        {/* Routine Approval Status Banner */}
        {routineApprovalStatus === "PENDING_OWNER_APPROVAL" ? (
          <div className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                    Sitter Proposed Routine Adjustments
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                    Awaiting Owner Approval
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 max-w-xl leading-relaxed">
                  {data.booking?.routineProposalNotes ? (
                    <span><strong>Sitter note:</strong> "{data.booking.routineProposalNotes}"</span>
                  ) : (
                    "Your caregiver suggested routine schedule adjustments to better suit your pet's needs."
                  )}
                </p>
              </div>
            </div>

            {isOwner && (
              <button
                type="button"
                onClick={handleOwnerApproveProposedRoutine}
                disabled={isApprovingRoutine}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isApprovingRoutine ? "Approving..." : "Approve Proposed Routine"}
              </button>
            )}
          </div>
        ) : isRoutineApproved ? (
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
                    Pet Care Routine Confirmed & Approved
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
                    Locked for Execution
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1 max-w-xl leading-relaxed">
                  {isOwner 
                    ? "Your Pet Sitter has reviewed and approved this care routine. It is now active for live tracking. You have real-time oversight below while your sitter marks tasks as done."
                    : "You confirmed and approved this routine. Routine is active in your Live Tracker for check-ins and completion logs."
                  }
                </p>
              </div>
            </div>

            {isSitter && (
              <button
                type="button"
                onClick={handleReopenRoutine}
                disabled={isApprovingRoutine}
                className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-sm transition-colors whitespace-nowrap self-start sm:self-auto"
              >
                {isApprovingRoutine ? "Processing..." : "Unlock for Owner Revisions"}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                    {isSitter ? "Routine Awaiting Sitter Confirmation" : "Routine Draft (Pending Sitter Confirmation)"}
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200/70 text-amber-900 px-2 py-0.5 rounded-full">
                    Draft & Editable
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1 max-w-xl leading-relaxed">
                  {isOwner 
                    ? "You can add or customize routine tasks below. Once your Pet Sitter reviews and confirms the schedule, it will be locked for live execution."
                    : "Review the pet owner's requested schedule. Click 'Approve & Confirm Routine' to finalize the plan for live execution."
                  }
                </p>
              </div>
            </div>

            {isSitter && (
              <button
                type="button"
                onClick={handleApproveRoutine}
                disabled={isApprovingRoutine}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isApprovingRoutine ? "Approving..." : "Approve & Confirm Routine"}
              </button>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Pet Daily Schedule
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {activities.length} {activities.length === 1 ? "Activity" : "Activities"} Planned
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Pet Care Routine & Scheduled Activities
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              Specify meals, medication, walking routines, and potty breaks per pet. Sitters log and check off each task live!
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {(!isRoutineApproved || isSitter) && (
              <>
                <button
                  type="button"
                  onClick={handleGenerateRoutine}
                  disabled={isGeneratingRoutine}
                  className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isGeneratingRoutine ? "Generating..." : "Auto-Generate Daily Routine"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Scheduled Activity
                </button>
              </>
            )}

            {isRoutineApproved && isOwner && (
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Routine Approved & Locked (View Only)
              </span>
            )}
          </div>
        </div>

        {/* Per-Pet Filter Tabs */}
        {petsList.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1 text-xs">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">Filter Pet:</span>
            <button
              type="button"
              onClick={() => setSelectedPetFilter("ALL")}
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap",
                selectedPetFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All Pets ({activities.length})
            </button>
            {petsList.map((p: any) => {
              const count = activities.filter(a => a.petName === p.name || a.petId === p.id).length;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPetFilter(p.name)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1",
                    selectedPetFilter === p.name
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                  )}
                >
                  🐾 {p.name} {p.type ? `(${p.type})` : ""} <span className="opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Activities List */}
        <div className="pt-4">
          {activities.length === 0 ? (
            <div className="text-center py-12 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-3 text-purple-600">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">No scheduled activities yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Keep your sitter on track by adding feeding schedules, walk timings, and potty intervals, or click auto-generate for a ready-made plan.
              </p>
              {(!isRoutineApproved || isSitter) && (
                <button
                  type="button"
                  onClick={handleGenerateRoutine}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" /> 1-Click Auto-Populate Daily Schedule
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {activities
                .filter(act => {
                  if (selectedPetFilter === "ALL") return true;
                  return act.petName === selectedPetFilter || act.petId === Number(selectedPetFilter);
                })
                .map((act) => (
                <div 
                  key={act.id} 
                  className={cn(
                    "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                    act.status === "COMPLETED" 
                      ? "bg-emerald-50/50 border-emerald-200/70" 
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      act.status === "COMPLETED" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
                    )}>
                      {getActivityIcon(act.activityType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-slate-900">{act.title}</span>
                        {act.petName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                            🐾 {act.petName}
                          </span>
                        )}
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {act.activityType}
                        </span>
                        
                        {/* Proof of Care Status Badge / Tag */}
                        {act.proofRequired ? (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Camera className="w-3 h-3 text-amber-700" /> Photo Proof Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            Photo Optional
                          </span>
                        )}

                        {act.status === "COMPLETED" ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Done at {act.completedAt ? new Date(act.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Completed"}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                            Pending Sitter Execution
                          </span>
                        )}
                      </div>
                      
                      {act.instructions && (
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          <strong>Note:</strong> {act.instructions}
                        </p>
                      )}

                      {act.completedNotes && (
                        <p className="text-xs text-emerald-800 mt-1 italic">
                          <strong>Sitter Log:</strong> "{act.completedNotes}"
                        </p>
                      )}

                      {/* Photo proof badge and thumbnail */}
                      {act.completedPhotoUrl && (
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedTaskForViewProof(act)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
                          >
                            <Camera className="w-3.5 h-3.5 text-emerald-700" /> View Caregiver Proof Photo
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 sm:self-center self-end">
                    {/* Owner toggle for proof required */}
                    {(!isRoutineApproved || isSitter) && (
                      <button
                        type="button"
                        onClick={() => handleToggleProofRequired(act.id, Boolean(act.proofRequired))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors border flex items-center gap-1",
                          act.proofRequired 
                            ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100" 
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                        title="Click to toggle photo proof requirement for this task"
                      >
                        <Camera className="w-3 h-3" />
                        {act.proofRequired ? "Require Proof: ON" : "Require Proof: OFF"}
                      </button>
                    )}

                    <div className="text-right">
                      <span className="block text-xs font-bold text-slate-800">{act.scheduledTime}</span>
                      <span className="block text-[10px] text-slate-500 font-medium">{act.scheduledDate}</span>
                    </div>

                    {(!isRoutineApproved || isSitter) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteActivity(act.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                        title="Delete activity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Quick Action Navigation Footer */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold">Track Sitter Check-ins & Live Activity</h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            View live GPS check-ins, bathroom logs, meal updates, and photo cards during your pet's stay.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Link
            to={`/bookings/${id}/live-tracker`}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 font-bold text-sm rounded-xl flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            Launch Live Tracker <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Modal: Add Scheduled Activity */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-1">Add Pet Care Activity</h3>
            <p className="text-xs text-slate-500 mb-6">Schedule a specific meal, walk, or care task for your sitter to perform.</p>

            <form onSubmit={handleAddActivity} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Target Pet</label>
                <select
                  value={newTargetPet}
                  onChange={(e) => setNewTargetPet(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="ALL">🐾 All Pets (General Visit)</option>
                  {petsList.map((p: any) => (
                    <option key={p.id} value={p.name}>🐾 {p.name} {p.type ? `(${p.type})` : ""}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Activity Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Morning Kibble & Fresh Water"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="FEEDING">Feeding / Meal</option>
                    <option value="WALKING">Dog Walk</option>
                    <option value="POTTY">Potty Break</option>
                    <option value="MEDICATION">Medication</option>
                    <option value="PLAYTIME">Playtime / Cuddles</option>
                    <option value="OTHER">Custom Task</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Time *</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Instructions for Sitter (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. 1 cup dry food from green pantry bin. Don't forget 1 pump of fish oil."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Photo Proof Requirement Toggle */}
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <Camera className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Require Photo Proof of Care
                    </span>
                    <span className="text-[11px] text-amber-800">
                      Sitter must upload photo evidence to check off this task as completed.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={newProofRequired}
                  onChange={(e) => setNewProofRequired(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingActivity}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingActivity ? "Adding..." : "Save Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Proof Photo Viewer Modal */}
      <ProofViewerModal
        isOpen={Boolean(selectedTaskForViewProof)}
        activity={selectedTaskForViewProof}
        onClose={() => setSelectedTaskForViewProof(null)}
      />
    </div>
  );
}
