import React, { useState } from "react";
import { Link } from "react-router";
import { useToast } from "./ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  PawPrint,
  Utensils,
  Footprints,
  Pill,
  ShieldCheck,
  DollarSign,
  Check,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Save,
  Send,
  Sparkles,
  Info,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

interface SitterBookingReviewModalProps {
  booking: any;
  onClose: () => void;
  onStatusChange: (bookingId: number, status: "CONFIRMED" | "CANCELLED") => Promise<void>;
  onBookingUpdated?: (updatedBooking: any) => void;
  actionLoading?: boolean;
}

export function SitterBookingReviewModal({
  booking,
  onClose,
  onStatusChange,
  onBookingUpdated,
  actionLoading = false,
}: SitterBookingReviewModalProps) {
  const { toast } = useToast();
  const { formatPrice } = useCurrency();

  const [activeSubTab, setActiveSubTab] = useState<"OVERVIEW" | "LOCATION" | "PETS" | "ROUTINE" | "FINANCIALS">("OVERVIEW");
  const [activities, setActivities] = useState<any[]>(booking.activities || []);
  const [routineStatus, setRoutineStatus] = useState<string>(booking.routineApprovalStatus || "PENDING_APPROVAL");
  const [routineNotes, setRoutineNotes] = useState<string>(booking.routineProposalNotes || "");

  // Routine proposal state
  const [isProposingRoutine, setIsProposingRoutine] = useState(false);
  const [proposalMessage, setProposalMessage] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);

  // New task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    activityType: "FEEDING",
    scheduledTime: "09:00",
    scheduledDate: booking.startTime ? new Date(booking.startTime).toISOString().split("T")[0] : "",
    instructions: "",
    proofRequired: true,
  });

  // Editing existing task
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTaskData, setEditingTaskData] = useState<any>(null);

  const startD = booking.startTime ? new Date(booking.startTime) : null;
  const endD = booking.endTime ? new Date(booking.endTime) : null;

  const startFormatted = startD ? startD.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "TBD";
  const endFormatted = endD ? endD.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "TBD";

  const owner = booking.owner || {};
  const ownerName = owner.name || booking.ownerName || "Pet Parent";
  const ownerEmail = owner.email || booking.userEmail || "Not provided";
  const ownerPhone = owner.phone || booking.ownerPhone || (booking.intakeQuestionnaire as any)?.dropOffContact || "0917 123 4567";

  const intakeQ = (booking.intakeQuestionnaire as any) || {};
  const houseDetails = (booking.houseLocationDetails as any) || {};
  const serviceAddress = booking.houseLocationAddress || intakeQ.dayCareLocation || "Customer Residence (Manila, Philippines)";
  const landmark = houseDetails.landmark || intakeQ.landmark || "";
  const homeType = houseDetails.homeType || intakeQ.homeType || "Single-Family Residence";
  const fencedYard = houseDetails.fencedYard || intakeQ.fencedYard || "Fenced yard / secure premises";
  const dropOffContact = houseDetails.dropOffContact || intakeQ.dropOffContact || ownerPhone;
  const optionalNotes = intakeQ.optionalSitterNotes || booking.notes || "";
  const primaryVet = intakeQ.primaryVet || "Central Animal Hospital";
  const emergencyVet = intakeQ.emergencyVet || "24/7 Metropolitan Veterinary Emergency Clinic";

  const petsList = Array.isArray(booking.pets) && booking.pets.length > 0 ? booking.pets : [
    {
      name: booking.petName || "Family Pet",
      breed: booking.petBreed || "Mixed Breed",
      species: "DOG",
      ageYears: 3,
      weightLbs: 25,
      otherNotes: "Friendly, gentle with caregivers.",
    }
  ];

  const financial = booking.financialSnapshot;
  const calculatedPayout = financial?.calculatedSitterPayout
    ? financial.calculatedSitterPayout / 100
    : parseFloat(booking.totalPrice) || (booking.totalAmount ? (booking.totalAmount * 0.8) / 100 : 0);

  const totalCharge = financial?.calculatedTotalOwnerCharge
    ? financial.calculatedTotalOwnerCharge / 100
    : parseFloat(booking.totalPrice) || (booking.totalAmount ? booking.totalAmount / 100 : 0);

  // Propose Routine to Pet Owner
  const handleProposeRoutine = async () => {
    if (!proposalMessage.trim()) {
      toast({
        title: "Proposal Note Required",
        description: "Please explain the routine adjustments to the pet owner (e.g. adjusted walk times or meal portions).",
        type: "error",
      });
      return;
    }

    setSubmittingProposal(true);
    try {
      const token = localStorage.getItem("pawshield_token");
      const res = await fetch(`/api/bookings/${booking.id}/routine/propose-sitter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          notes: proposalMessage.trim(),
          activities,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast({
          title: "Routine Changes Proposed! 📋",
          description: "The proposed routine has been sent to the pet parent for approval.",
          type: "success",
        });
        setRoutineStatus("PENDING_OWNER_APPROVAL");
        setRoutineNotes(proposalMessage.trim());
        setIsProposingRoutine(false);
        if (data.activities) setActivities(data.activities);
        if (onBookingUpdated) onBookingUpdated(data.booking);
      } else {
        toast({ title: "Proposal Failed", description: data.error || "Could not propose routine", type: "error" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, type: "error" });
    } finally {
      setSubmittingProposal(false);
    }
  };

  // Add Task to List
  const handleAddTask = () => {
    if (!newTask.title.trim()) {
      toast({ title: "Title Required", description: "Please provide a task title.", type: "error" });
      return;
    }
    const created = {
      ...newTask,
      id: Date.now(),
      status: "PENDING",
      is_sitter_proposed: true,
    };
    setActivities([...activities, created]);
    setShowAddTask(false);
    setNewTask({
      title: "",
      activityType: "FEEDING",
      scheduledTime: "09:00",
      scheduledDate: booking.startTime ? new Date(booking.startTime).toISOString().split("T")[0] : "",
      instructions: "",
      proofRequired: true,
    });
    toast({ title: "Task Added", description: "Remember to click 'Propose Routine to Owner' to finalize.", type: "info" });
  };

  // Delete Task
  const handleDeleteTask = (index: number) => {
    const updated = activities.filter((_, idx) => idx !== index);
    setActivities(updated);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 animate-in fade-in my-6 flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30">
                Booking #BK-{booking.id}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {booking.modality || "HOUSE_SITTING"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                booking.status === "CONFIRMED" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
              }`}>
                {booking.status}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-white">
              Full Job Specifications & Care Details
            </h2>
            <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{startFormatted} – {endFormatted}</span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 sm:px-6 pt-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            onClick={() => setActiveSubTab("OVERVIEW")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === "OVERVIEW"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            1. Client & Overview
          </button>
          <button
            onClick={() => setActiveSubTab("LOCATION")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === "LOCATION"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            2. Service Location & Access
          </button>
          <button
            onClick={() => setActiveSubTab("PETS")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === "PETS"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            3. Pet Profile & Vet ({petsList.length})
          </button>
          <button
            onClick={() => setActiveSubTab("ROUTINE")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
              activeSubTab === "ROUTINE"
                ? "border-purple-600 text-purple-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>4. Care Routine ({activities.length})</span>
            {routineStatus === "PENDING_OWNER_APPROVAL" && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveSubTab("FINANCIALS")}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
              activeSubTab === "FINANCIALS"
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            5. Escrow Payout
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs text-slate-700">

          {/* TAB 1: OVERVIEW & CLIENT */}
          {activeSubTab === "OVERVIEW" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Client Info Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
                  Pet Parent / Customer Information
                </span>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-lg flex items-center justify-center border border-emerald-200 shrink-0">
                      {ownerName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                        {ownerName}
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </h3>
                      <p className="text-slate-500 text-[11px]">{ownerEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${ownerPhone}`}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {ownerPhone}
                    </a>
                  </div>
                </div>
              </div>

              {/* Service & Schedule Snapshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
                    Service Modality
                  </span>
                  <div className="font-black text-sm text-purple-950">
                    {booking.modality === "HOUSE_SITTING"
                      ? "House Sitting (Caregiver stays at Owner's home)"
                      : booking.modality === "BOARDING"
                      ? "Pet Boarding (Care at Sitter's home)"
                      : booking.modality === "DAY_CARE"
                      ? "Doggy Day Care (Up to 480 mins daytime care)"
                      : booking.modality === "DOG_WALKING"
                      ? "Dog Walking (Neighborhood exercise)"
                      : "Drop-In Visit"}
                  </div>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                    Guaranteed Sitter Payout
                  </span>
                  <div className="font-black text-lg text-emerald-700">
                    {formatPrice(calculatedPayout)}
                  </div>
                  <span className="text-[10px] text-emerald-800 block">
                    Held securely in platform escrow
                  </span>
                </div>
              </div>

              {/* Special Instructions */}
              {optionalNotes && (
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-amber-600" />
                    Special Owner Instructions & Notes
                  </span>
                  <p className="text-slate-800 text-xs italic leading-relaxed pt-1">
                    "{optionalNotes}"
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LOCATION & ACCESS */}
          {activeSubTab === "LOCATION" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Primary Service Location & Address
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(serviceAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open in Google Maps
                  </a>
                </div>

                <div className="flex items-start gap-2.5">
                  <MapPin className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{serviceAddress}</h4>
                    {landmark && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        <strong>Landmark / Directions:</strong> {landmark}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* House & Property Specifications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Residence Type</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-purple-600" />
                    {homeType}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Yard & Boundary Security</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    {fencedYard}
                  </div>
                </div>

                <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1 sm:col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Drop-Off / On-Site Emergency Contact</span>
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-blue-600" />
                    {dropOffContact}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PETS & MEDICAL */}
          {activeSubTab === "PETS" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="space-y-3">
                {petsList.map((pet: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black text-lg border border-amber-200 shrink-0">
                        <PawPrint className="w-6 h-6 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-slate-900">{pet.name}</h4>
                        <p className="text-slate-500 text-xs">
                          {pet.breed || "Breed not specified"} • {pet.species || "Pet"} • {pet.ageYears ? `${pet.ageYears} yrs old` : "Adult"}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {pet.foodType && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Diet / Food Type</span>
                          <span className="font-bold text-slate-800">{pet.foodType} ({pet.foodFrequency || "Twice daily"})</span>
                        </div>
                      )}
                      {pet.medicationInstructions && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Medication Details</span>
                          <span className="font-bold text-rose-700">{pet.medicationInstructions}</span>
                        </div>
                      )}
                      {pet.otherNotes && (
                        <div className="p-2.5 bg-white rounded-xl border border-slate-200 sm:col-span-2">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Temperament & Notes</span>
                          <span className="text-slate-700">{pet.otherNotes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Veterinary Release & Emergency Authorization */}
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Pre-Authorized Veterinary Release
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Primary Veterinarian</span>
                    <span className="font-bold text-slate-800">{primaryVet}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">24/7 Emergency Clinic</span>
                    <span className="font-bold text-slate-800">{emergencyVet}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CARE ROUTINE (Interactive Sitter Modification & Proposal) */}
          {activeSubTab === "ROUTINE" && (
            <div className="space-y-4 animate-in fade-in">
              {/* Routine Status Banner */}
              <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                routineStatus === "APPROVED"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : routineStatus === "PENDING_OWNER_APPROVAL"
                  ? "bg-amber-50 border-amber-200 text-amber-950"
                  : "bg-purple-50 border-purple-200 text-purple-950"
              }`}>
                <div className="flex items-center gap-2">
                  {routineStatus === "APPROVED" ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : routineStatus === "PENDING_OWNER_APPROVAL" ? (
                    <Clock className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
                  ) : (
                    <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-extrabold text-xs block">
                      {routineStatus === "APPROVED"
                        ? "Care Routine Approved & Active"
                        : routineStatus === "PENDING_OWNER_APPROVAL"
                        ? "Routine Changes Proposed (Awaiting Owner Approval)"
                        : "Daily Care Routine (Review or Propose Adjustments)"}
                    </span>
                    <span className="text-[11px] opacity-80 block">
                      {routineStatus === "PENDING_OWNER_APPROVAL"
                        ? `Note to owner: "${routineNotes || 'Custom routine schedule submitted'}"`
                        : "You can adjust tasks, times, or add custom activities before or after booking confirmation."}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsProposingRoutine(!isProposingRoutine)}
                  className="px-3 py-1.5 bg-white border border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl font-bold text-xs shrink-0 shadow-2xs"
                >
                  {isProposingRoutine ? "Cancel Note" : "Propose to Owner"}
                </button>
              </div>

              {/* Proposal Note Input Box */}
              {isProposingRoutine && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-xs font-bold text-purple-950 mb-1">
                      Explain Routine Changes to Pet Owner *
                    </label>
                    <textarea
                      rows={2}
                      value={proposalMessage}
                      onChange={(e) => setProposalMessage(e.target.value)}
                      placeholder="e.g. Adjusted afternoon walk to 8:30 AM to avoid midday heat, and added midday hydration check..."
                      className="w-full p-2.5 bg-white border border-purple-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 resize-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsProposingRoutine(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-purple-100 rounded-xl font-bold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={submittingProposal}
                      onClick={handleProposeRoutine}
                      className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingProposal ? "Sending..." : "Submit Proposal to Owner"}
                    </button>
                  </div>
                </div>
              )}

              {/* Activity List */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800">
                    Scheduled Daily Activities ({activities.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddTask(!showAddTask)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                </div>

                {/* Add Task Form */}
                {showAddTask && (
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-in fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Task Title *</label>
                        <input
                          type="text"
                          value={newTask.title}
                          onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                          placeholder="e.g. Afternoon Medication / Walk"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Time</label>
                        <input
                          type="time"
                          value={newTask.scheduledTime}
                          onChange={(e) => setNewTask({ ...newTask, scheduledTime: e.target.value })}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Instructions</label>
                      <input
                        type="text"
                        value={newTask.instructions}
                        onChange={(e) => setNewTask({ ...newTask, instructions: e.target.value })}
                        placeholder="Specific feeding portions or walking instructions"
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700">
                        <input
                          type="checkbox"
                          checked={newTask.proofRequired}
                          onChange={(e) => setNewTask({ ...newTask, proofRequired: e.target.checked })}
                          className="rounded text-purple-600"
                        />
                        Require photo proof upon completion
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddTask(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 rounded-lg font-bold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleAddTask}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs"
                        >
                          Save to List
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Activities Rows */}
                {activities.length === 0 ? (
                  <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                    No custom care activities scheduled yet. You can add routines above.
                  </div>
                ) : (
                  activities.map((act, idx) => (
                    <div
                      key={act.id || idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                          {act.scheduledTime || "09:00"}
                        </span>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 text-xs truncate">{act.title}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {act.instructions || (act.proofRequired ? "Photo proof requested" : "Standard care")}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {act.proofRequired && (
                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Photo Proof
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(idx)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                          title="Remove task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: FINANCIALS */}
          {activeSubTab === "FINANCIALS" && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                  Sitter Earnings Summary
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-slate-600">Net Sitter Payout</span>
                  <span className="text-xl font-black text-emerald-700">{formatPrice(calculatedPayout)}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60">
                  <span>Total Client Charge</span>
                  <span className="font-bold text-slate-700">{formatPrice(totalCharge)}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11px] text-slate-500">
                  <span>Escrow Guarantee Status</span>
                  <span className="font-bold text-emerald-700">✓ 100% Protected</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 leading-relaxed">
                Earnings are released directly to your verified Philippine disbursement account (GCash / Bank) upon successful completion of the booking.
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            {booking.status === "PENDING"
              ? "Review all customer & pet specifications before confirming."
              : `Booking is currently ${booking.status}.`}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {booking.status === "PENDING" ? (
              <>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onStatusChange(booking.id, "CANCELLED")}
                  className="px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Decline Request
                </button>

                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onStatusChange(booking.id, "CONFIRMED")}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  {actionLoading ? "Confirming..." : "Accept & Confirm Booking"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Close Window
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
