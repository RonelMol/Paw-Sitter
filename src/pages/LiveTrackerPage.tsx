import React, { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { 
  ShieldCheck, 
  MapPin, 
  Camera, 
  Droplets, 
  Bone, 
  Activity, 
  Clock, 
  CheckCircle2, 
  Receipt, 
  Plus, 
  Utensils, 
  Footprints, 
  Pill, 
  Sparkles, 
  ArrowLeft,
  Calendar,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
  Eye
} from "lucide-react";
import { cn } from "../lib/utils";
import { BookingChatModal } from "../components/BookingChatModal";
import { TaskProofModal } from "../components/TaskProofModal";
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

export function LiveTrackerPage() {
  const { id } = useParams();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [activities, setActivities] = useState<PetActivity[]>([]);
  const [selectedPetFilter, setSelectedPetFilter] = useState<string>("ALL");
  const [status, setStatus] = useState<"PENDING" | "CHECKED_IN" | "IN_PROGRESS" | "COMPLETED">("IN_PROGRESS");
  const [activeTab, setActiveTab] = useState<"TIMELINE" | "SCHEDULE">("SCHEDULE");
  const [chatOpen, setChatOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isApprovingRoutine, setIsApprovingRoutine] = useState(false);

  // Modals for proof of care
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<PetActivity | null>(null);
  const [selectedTaskForViewProof, setSelectedTaskForViewProof] = useState<PetActivity | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const fetchBookingAndActivities = useCallback(async (silent = false) => {
    if (!id) return;
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);

      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setBookingData(data);
        setActivities(data.activities || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchBookingAndActivities();
  }, [fetchBookingAndActivities]);

  // Live polling every 5 seconds for real-time synchronization between Sitter and Owner
  useEffect(() => {
    const interval = setInterval(() => {
      fetchBookingAndActivities(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchBookingAndActivities]);

  const isSitter = dbUser?.role === "ADMIN" || (bookingData?.sitter && dbUser?.id === bookingData.sitter.id);
  const isOwner = !isSitter;
  const isRoutineApproved = bookingData?.booking?.routineApprovalStatus === "APPROVED";

  const handleApproveRoutine = async () => {
    if (!id) return;
    setIsApprovingRoutine(true);
    try {
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

      toast({
        title: "Routine Approved & Confirmed! ✓",
        description: "You have verified the care routine. You can now execute and check off tasks.",
        type: "success"
      });
      await fetchBookingAndActivities(false);
    } catch (e: any) {
      toast({ title: "Approval Failed", description: e.message, type: "error" });
    } finally {
      setIsApprovingRoutine(false);
    }
  };

  const handleTaskClick = (act: PetActivity) => {
    if (!isSitter) {
      toast({
        title: "Pet Owner View-Only",
        description: "Only your assigned Pet Sitter can check off routine tasks as they perform them.",
        type: "info"
      });
      return;
    }

    if (!isRoutineApproved) {
      toast({
        title: "Routine Approval Required ⚠️",
        description: "You must review and click 'Approve & Confirm Routine' before tasks can be checked off.",
        type: "error"
      });
      return;
    }

    if (act.status === "COMPLETED") {
      // Reopen task
      handleToggleTask(act.id, "COMPLETED");
    } else {
      // Open proof modal for sitter verification
      setSelectedTaskForProof(act);
    }
  };

  const handleToggleTask = async (activityId: number, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities/${activityId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          completedNotes: newStatus === "COMPLETED" ? `Completed as scheduled by sitter (${dbUser?.name || "Caregiver"}).` : null
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setActivities(prev => prev.map(a => a.id === activityId ? updated : a));
        toast({
          title: newStatus === "COMPLETED" ? "Task Completed" : "Task Reopened",
          description: `Updated status to ${newStatus}.`,
          type: "success"
        });
        await fetchBookingAndActivities(true);
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update status");
      }
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, type: "error" });
    }
  };

  const handleProofSubmit = async (data: { photoUrl?: string; notes?: string }) => {
    if (!selectedTaskForProof || !id) return;
    setIsSubmittingProof(true);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/bookings/${id}/activities/${selectedTaskForProof.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: "COMPLETED",
          completedPhotoUrl: data.photoUrl,
          completedNotes: data.notes || `Completed by sitter (${dbUser?.name || "Caregiver"}).`,
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to submit task proof");
      }

      toast({
        title: "Task Verified & Completed! 🎉",
        description: `Proof of care photo and logs recorded for ${selectedTaskForProof.title}.`,
        type: "success"
      });

      setSelectedTaskForProof(null);
      await fetchBookingAndActivities(true);
    } catch (e: any) {
      toast({ title: "Submission Failed", description: e.message, type: "error" });
      throw e;
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "FEEDING":
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case "WALKING":
      case "WALK":
        return <Footprints className="w-4 h-4 text-emerald-600" />;
      case "MEDICATION":
        return <Pill className="w-4 h-4 text-rose-600" />;
      case "POTTY":
        return <Sparkles className="w-4 h-4 text-blue-600" />;
      default:
        return <Activity className="w-4 h-4 text-purple-600" />;
    }
  };

  const petsList = bookingData?.pets || [];

  const filteredActivities = activities.filter((act) => {
    if (selectedPetFilter === "ALL") return true;
    if (selectedPetFilter === "GENERAL") return !act.petName && !act.petId;
    return act.petName === selectedPetFilter || act.petId === Number(selectedPetFilter);
  });

  const completedCount = activities.filter(a => a.status === "COMPLETED").length;
  const totalCount = activities.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <Link to="/search" className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchBookingAndActivities(false)}
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            title="Force refresh live status"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-slate-500", refreshing && "animate-spin text-emerald-600")} />
            {refreshing ? "Syncing..." : "Live Sync"}
          </button>
          <Link 
            to={`/bookings/${id}/order-summary`}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Receipt className="w-3.5 h-3.5 text-blue-600" /> View Order Details & Itinerary
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
        {/* Main Status Header */}
        <div className="bg-slate-900 p-6 sm:p-8 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Live Sitter Care Log
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • Booking #{id}
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {bookingData?.booking?.modality || "Pet Care"} In Progress
            </h1>
            
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              Sitter GPS Location Active • Updated seconds ago
            </p>
          </div>

          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto">
            <button
              onClick={() => setChatOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <MessageSquare className="w-4 h-4" /> Message Sitter
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Routine Execution: <strong className="text-white">{progressPct}% Done</strong>
            </div>
          </div>
        </div>

        {/* Routine Approval Banner */}
        {!isRoutineApproved ? (
          <div className="bg-amber-50 border-b border-amber-200 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-xs sm:text-sm text-amber-950 block">
                  {isSitter ? "Routine Confirmation Required Before Task Check-Off" : "Pet Care Routine Pending Sitter Confirmation"}
                </span>
                <p className="text-xs text-amber-800 mt-0.5">
                  {isSitter 
                    ? "Please review and confirm the routine tasks below before checking off items or providing care logs."
                    : "Your sitter must review and confirm the requested routine schedule before beginning live check-offs."}
                </p>
              </div>
            </div>

            {isSitter && (
              <button
                type="button"
                onClick={handleApproveRoutine}
                disabled={isApprovingRoutine}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isApprovingRoutine ? "Approving..." : "Approve & Confirm Routine"}
              </button>
            )}
          </div>
        ) : (
          <div className="bg-emerald-50/70 border-b border-emerald-200/80 px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Pet Care Routine Confirmed & Approved by Sitter
            </div>
            <span className="text-[10px] font-bold uppercase bg-emerald-200/70 text-emerald-900 px-2 py-0.5 rounded-full">
              Live Verified
            </span>
          </div>
        )}

        <div className="p-6 sm:p-8">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <TrackerMetric icon={<Droplets className="w-5 h-5 text-blue-500" />} label="Fresh Water" time="8:45 AM" />
            <TrackerMetric icon={<Bone className="w-5 h-5 text-amber-600" />} label="Meal Served" time="8:45 AM" />
            <TrackerMetric icon={<CheckCircle2 className="w-5 h-5 text-green-600" />} label="Potty Break" time="8:30 AM" />
            <TrackerMetric icon={<Camera className="w-5 h-5 text-purple-500" />} label="Photos" time="Latest 9:20" />
          </div>

          {/* Progress Bar for Activities */}
          {totalCount > 0 && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-8">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-slate-700 uppercase tracking-wider">Scheduled Routine Tasks</span>
                <span className="text-purple-700">{completedCount} of {totalCount} completed ({progressPct}%)</span>
              </div>
              <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Tab Selector: Scheduled Routine vs Live Event Log */}
          <div className="flex items-center gap-2 border-b border-slate-200 mb-6 pb-2">
            <button
              onClick={() => setActiveTab("SCHEDULE")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer",
                activeTab === "SCHEDULE" 
                  ? "bg-purple-50 text-purple-700 border border-purple-200" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Calendar className="w-3.5 h-3.5" /> Scheduled Routine & Tasks ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab("TIMELINE")}
              className={cn(
                "px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer",
                activeTab === "TIMELINE" 
                  ? "bg-blue-50 text-blue-700 border border-blue-200" 
                  : "text-slate-500 hover:text-slate-900"
              )}
            >
              <Clock className="w-3.5 h-3.5" /> Activity Timeline
            </button>
          </div>

          {/* Tab 1: Scheduled Tasks with Live Checklist */}
          {activeTab === "SCHEDULE" && (
            <div>
              {/* Role Awareness Banner */}
              {isOwner && (
                <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-700 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-900 leading-relaxed">
                    <strong className="font-bold">Pet Owner Live Oversight:</strong> You have real-time view-only tracking of each routine activity. Tasks are checked off by your assigned Pet Sitter as they perform them, accompanied by photo evidence when required.
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Pet Care Routine (By Time & Date)
                  </h3>
                  <p className="text-xs text-slate-500">
                    {filteredActivities.length} {filteredActivities.length === 1 ? "activity" : "activities"} shown
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/bookings/${id}/order-summary`}
                    className="text-xs font-bold text-purple-700 hover:text-purple-800 bg-purple-50 px-3 py-1.5 rounded-xl border border-purple-200 transition-colors"
                  >
                    {isSitter ? "Manage Routine in Order Details" : "View Order Details"}
                  </Link>
                </div>
              </div>

              {/* Per-Pet Filter Tabs */}
              {petsList.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-3 text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-1">Filter Pet:</span>
                  <button
                    type="button"
                    onClick={() => setSelectedPetFilter("ALL")}
                    className={cn(
                      "px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap cursor-pointer",
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
                          "px-3 py-1 rounded-lg font-bold transition-colors whitespace-nowrap flex items-center gap-1 cursor-pointer",
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

              {filteredActivities.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Utensils className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No scheduled tasks for this filter</p>
                  <p className="text-xs text-slate-500 mb-3">You can view all activities by switching to "All Pets".</p>
                  <button
                    type="button"
                    onClick={() => setSelectedPetFilter("ALL")}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    Show All Activities
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredActivities.map((act) => (
                    <div 
                      key={act.id} 
                      className={cn(
                        "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        act.status === "COMPLETED" 
                          ? "bg-emerald-50/60 border-emerald-200" 
                          : "bg-white border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {isSitter ? (
                          <button
                            type="button"
                            onClick={() => handleTaskClick(act)}
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors cursor-pointer",
                              act.status === "COMPLETED"
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 hover:border-emerald-500 bg-white"
                            )}
                            title={act.status === "COMPLETED" ? "Click to re-open" : "Click to complete with proof"}
                          >
                            {act.status === "COMPLETED" && <CheckCircle2 className="w-4 h-4" />}
                          </button>
                        ) : (
                          <div
                            className={cn(
                              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border",
                              act.status === "COMPLETED"
                                ? "bg-emerald-600 border-emerald-600 text-white"
                                : "border-slate-300 bg-slate-100 text-slate-400"
                            )}
                            title={act.status === "COMPLETED" ? "Task Completed by Sitter" : "Awaiting Sitter Execution"}
                          >
                            {act.status === "COMPLETED" ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("font-bold text-sm", act.status === "COMPLETED" ? "line-through text-slate-500" : "text-slate-900")}>
                              {act.title}
                            </span>
                            {act.petName && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                                🐾 {act.petName}
                              </span>
                            )}
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {act.activityType}
                            </span>

                            {act.proofRequired && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Camera className="w-3 h-3 text-amber-600" /> Photo Proof Required
                              </span>
                            )}
                          </div>
                          
                          {act.instructions && (
                            <p className="text-xs text-slate-600 mt-1">
                              <strong>Instructions:</strong> {act.instructions}
                            </p>
                          )}
                          
                          {act.completedNotes && (
                            <p className="text-xs text-emerald-800 mt-1 italic">
                              <strong>Sitter Note:</strong> "{act.completedNotes}"
                            </p>
                          )}

                          {act.completedPhotoUrl && (
                            <div className="mt-2">
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
                        <div className="text-right">
                          <span className="block text-xs font-bold text-slate-800">{act.scheduledTime}</span>
                          <span className="block text-[10px] text-slate-500">{act.scheduledDate}</span>
                        </div>

                        {isSitter ? (
                          <button
                            type="button"
                            onClick={() => handleTaskClick(act)}
                            className={cn(
                              "px-3 py-1.5 text-xs font-bold rounded-xl transition-colors border cursor-pointer",
                              act.status === "COMPLETED"
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200"
                                : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800 shadow-xs"
                            )}
                          >
                            {act.status === "COMPLETED" ? "Done ✓" : (act.proofRequired ? "Mark Done with Photo 📸" : "Mark Done")}
                          </button>
                        ) : (
                          <div className={cn(
                            "px-3 py-1 text-xs font-bold rounded-lg border",
                            act.status === "COMPLETED"
                              ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          )}>
                            {act.status === "COMPLETED" ? "Completed ✓" : "Pending Sitter"}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Activity Timeline */}
          {activeTab === "TIMELINE" && (
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-6">Live Activity Stream</h3>
              <div className="relative border-l-2 border-slate-100 ml-3 space-y-8 pb-4">
                <div className="relative pl-8">
                  <div className="absolute -left-2.5 top-1 bg-white border-2 border-purple-500 w-5 h-5 rounded-full" />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded uppercase tracking-wider">09:20 AM</span>
                  </div>
                  <p className="text-slate-800 font-medium">Having a great walk in the park! Tail wagging non-stop.</p>
                  <img 
                    src="https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=400&h=300" 
                    alt="Update" 
                    className="mt-3 rounded-xl max-w-sm w-full object-cover border border-slate-200" 
                  />
                </div>

                <div className="relative pl-8">
                  <div className="absolute -left-2.5 top-1 bg-white border-2 border-amber-500 w-5 h-5 rounded-full" />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded uppercase tracking-wider">08:45 AM</span>
                  </div>
                  <p className="text-slate-800 font-medium">Fed morning meal. Drank fresh water.</p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute -left-2.5 top-1 bg-white border-2 border-green-500 w-5 h-5 rounded-full" />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded uppercase tracking-wider">08:30 AM</span>
                  </div>
                  <p className="text-slate-800 font-medium">Potty break successful (pee & poo logged).</p>
                </div>

                <div className="relative pl-8">
                  <div className="absolute -left-2.5 top-1 bg-white border-2 border-blue-500 w-5 h-5 rounded-full" />
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-wider">08:15 AM</span>
                  </div>
                  <p className="text-slate-800 font-medium">Sitter arrived and checked in via GPS.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <BookingChatModal
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        bookingId={Number(id)}
      />

      {/* Task Proof Submission Modal (Sitter) */}
      <TaskProofModal
        isOpen={Boolean(selectedTaskForProof)}
        activity={selectedTaskForProof}
        onClose={() => setSelectedTaskForProof(null)}
        onSubmit={handleProofSubmit}
        isSubmitting={isSubmittingProof}
      />

      {/* Proof Photo Viewer Modal (Owner & Sitter) */}
      <ProofViewerModal
        isOpen={Boolean(selectedTaskForViewProof)}
        activity={selectedTaskForViewProof}
        onClose={() => setSelectedTaskForViewProof(null)}
      />
    </div>
  );
}

function TrackerMetric({ icon, label, time }: { icon: React.ReactNode; label: string; time: string }) {
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-white shadow-xs border border-slate-200 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <span className="text-xs font-extrabold text-slate-800">{time}</span>
      </div>
    </div>
  );
}
