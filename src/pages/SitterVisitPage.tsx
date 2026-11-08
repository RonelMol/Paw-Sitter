import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Play, 
  Square, 
  AlertCircle, 
  Trash2, 
  Cross, 
  Utensils, 
  Footprints, 
  Pill, 
  Sparkles, 
  RefreshCw,
  Eye,
  Check,
  AlertTriangle
} from "lucide-react";
import { cn } from "../lib/utils";
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
  completedPhotoUrl?: string | null;
}

export function SitterVisitPage() {
  const { bookingId } = useParams();
  const { user, dbUser } = useAuth();
  const { toast } = useToast();

  const [bookingData, setBookingData] = useState<any>(null);
  const [activities, setActivities] = useState<PetActivity[]>([]);
  const [status, setStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED">("PENDING");
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [processing, setProcessing] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [isApprovingRoutine, setIsApprovingRoutine] = useState(false);

  // Modals for proof of care
  const [selectedTaskForProof, setSelectedTaskForProof] = useState<PetActivity | null>(null);
  const [selectedTaskForViewProof, setSelectedTaskForViewProof] = useState<PetActivity | null>(null);
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  const [checklist, setChecklist] = useState({
    pee: false,
    poo: false,
    water: false,
    food: false,
    meds: false
  });

  const [photos, setPhotos] = useState<string[]>([
    "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80"
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchBookingInfo = useCallback(async () => {
    if (!bookingId) return;
    try {
      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setBookingData(d);
        if (d.activities) {
          setActivities(d.activities);
          const hasFood = d.activities.some((a: PetActivity) => a.activityType === "FEEDING" && a.status === "COMPLETED");
          const hasWalk = d.activities.some((a: PetActivity) => a.activityType === "WALKING" && a.status === "COMPLETED");
          const hasMeds = d.activities.some((a: PetActivity) => a.activityType === "MEDICATION" && a.status === "COMPLETED");
          const hasPotty = d.activities.some((a: PetActivity) => a.activityType === "POTTY" && a.status === "COMPLETED");
          if (hasFood || hasWalk || hasMeds || hasPotty) {
            setChecklist(prev => ({
              ...prev,
              food: prev.food || hasFood,
              pee: prev.pee || hasPotty || hasWalk,
              poo: prev.poo || hasPotty || hasWalk,
              water: prev.water || hasFood,
              meds: prev.meds || hasMeds
            }));
          }
        }
        if (d.booking?.status === "COMPLETED") {
          setStatus("COMPLETED");
        } else if (d.booking?.status === "IN_PROGRESS") {
          setStatus("IN_PROGRESS");
          if (!startTime) setStartTime(new Date(Date.now() - 15 * 60 * 1000));
        }
      }
    } catch (e) {
      console.warn("Error loading booking details:", e);
    } finally {
      setLoadingData(false);
    }
  }, [bookingId, user, startTime]);

  useEffect(() => {
    fetchBookingInfo();
  }, [fetchBookingInfo]);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (status === "IN_PROGRESS" && startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.max(0, now.getTime() - startTime.getTime());
        const hrs = Math.floor(diff / 3600000).toString().padStart(2, '0');
        const mins = Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0');
        const secs = Math.floor((diff % 60000) / 1000).toString().padStart(2, '0');
        setElapsed(`${hrs}:${mins}:${secs}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, startTime]);

  const isRoutineApproved = bookingData?.booking?.routineApprovalStatus === "APPROVED";

  const handleApproveRoutine = async () => {
    if (!bookingId) return;
    setIsApprovingRoutine(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}/routine/approve`, {
        method: "POST",
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to approve routine");
      }

      toast({
        title: "Routine Approved & Confirmed! ✓",
        description: "You have verified the pet schedule. You can now execute and check off tasks.",
        type: "success"
      });
      await fetchBookingInfo();
    } catch (e: any) {
      toast({ title: "Approval Failed", description: e.message, type: "error" });
    } finally {
      setIsApprovingRoutine(false);
    }
  };

  const handleTaskClick = (act: PetActivity) => {
    if (!isRoutineApproved) {
      toast({
        title: "Routine Approval Required ⚠️",
        description: "Please click 'Approve & Confirm Routine' before checking off tasks.",
        type: "error"
      });
      return;
    }

    if (act.status === "COMPLETED") {
      // If already completed, toggle back to pending
      handleToggleActivity(act.id, "COMPLETED");
    } else {
      // If pending, open proof modal
      setSelectedTaskForProof(act);
    }
  };

  const handleToggleActivity = async (activityId: number, currentStatus: string) => {
    const newStatus = currentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";
    
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}/activities/${activityId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: newStatus,
          completedNotes: newStatus === "COMPLETED" ? `Completed as scheduled by sitter (${dbUser?.name || "Caregiver"}).` : null
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update activity status");
      }

      toast({
        title: newStatus === "COMPLETED" ? "Task Completed ✓" : "Task Reopened",
        description: `Routine item updated and synced live with the pet parent.`,
        type: newStatus === "COMPLETED" ? "success" : "info"
      });
      await fetchBookingInfo();
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, type: "error" });
      fetchBookingInfo();
    }
  };

  const handleProofSubmit = async (data: { photoUrl?: string; notes?: string }) => {
    if (!selectedTaskForProof || !bookingId) return;
    setIsSubmittingProof(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}/activities/${selectedTaskForProof.id}`, {
        method: "PATCH",
        headers,
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
        description: `Photo proof and notes recorded for ${selectedTaskForProof.title}.`,
        type: "success"
      });

      setSelectedTaskForProof(null);
      await fetchBookingInfo();
    } catch (e: any) {
      toast({ title: "Submission Failed", description: e.message, type: "error" });
      throw e;
    } finally {
      setIsSubmittingProof(false);
    }
  };

  const handleStart = async (useSimulatedLocation = false) => {
    setProcessing(true);

    const proceedWithCoordinates = async (latitude: number, longitude: number) => {
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (user) {
          try {
            const token = await user.getIdToken();
            headers["Authorization"] = `Bearer ${token}`;
          } catch {}
        }

        if (bookingId) {
          await fetch(`/api/bookings/${bookingId}/check-in`, {
            method: "POST",
            headers,
            body: JSON.stringify({ latitude, longitude }),
          });
        }
        toast({
          title: "Visit Started & Check-In Recorded 🎉",
          description: `Location pinned at (${latitude.toFixed(4)}, ${longitude.toFixed(4)}). Live tracking is now active!`,
          type: "success"
        });
        setStatus("IN_PROGRESS");
        setStartTime(new Date());
      } catch (e: any) {
        setStatus("IN_PROGRESS");
        setStartTime(new Date());
        toast({ title: "Visit Started", description: "Visit session active in local mode.", type: "info" });
      } finally {
        setProcessing(false);
      }
    };

    if (useSimulatedLocation || !navigator.geolocation) {
      await proceedWithCoordinates(14.5995, 120.9842);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await proceedWithCoordinates(latitude, longitude);
      },
      async (_err) => {
        toast({
          title: "Location Permission Notice",
          description: "Using simulated GPS coordinates so you can continue testing without interruption.",
          type: "info"
        });
        await proceedWithCoordinates(14.5995, 120.9842);
      },
      { timeout: 5000, enableHighAccuracy: true }
    );
  };

  const handleSimulateAll = async () => {
    if (!bookingId) return;
    setProcessing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch(`/api/bookings/${bookingId}/simulate-visit`, {
        method: "POST",
        headers,
      });

      if (res.ok) {
        setStatus("IN_PROGRESS");
        setStartTime(new Date(Date.now() - 25 * 60 * 1000));
        setChecklist({
          pee: true,
          poo: true,
          water: true,
          food: true,
          meds: true,
        });
        setPhotos([
          "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&auto=format&fit=crop&q=80",
          "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&auto=format&fit=crop&q=80"
        ]);
        await fetchBookingInfo();
        toast({
          title: "Full Process Simulated! ⚡",
          description: "GPS check-in, pet care routine approval, checklist items, and all activities marked completed.",
          type: "success"
        });
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Simulation failed");
      }
    } catch (e: any) {
      toast({ title: "Simulation Note", description: e.message || "Simulating locally...", type: "info" });
      setStatus("IN_PROGRESS");
      setStartTime(new Date());
    } finally {
      setProcessing(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const urls = newFiles.map(file => URL.createObjectURL(file as Blob));
      setPhotos(prev => [...prev, ...urls]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setProcessing(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      if (bookingId) {
        await fetch(`/api/bookings/${bookingId}/check-out`, {
          method: "POST",
          headers,
        });
      }

      toast({
        title: "Visit Completed! 🎉",
        description: "Full report card, routines, and photos recorded for the pet parent.",
        type: "success"
      });
      setStatus("COMPLETED");
      await fetchBookingInfo();
    } catch (e: any) {
      toast({ title: "Completion Note", description: e.message || "Visit marked completed.", type: "info" });
      setStatus("COMPLETED");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <Link to="/sitter/dashboard?tab=BOOKINGS" className="text-sm text-slate-500 hover:text-slate-800 font-medium">
          ← Back to Sitter Portal
        </Link>
        <div className="flex items-center gap-2">
          <div className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
            Booking #{bookingId}
          </div>
          <button
            onClick={fetchBookingInfo}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            title="Refresh Status"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
        
        {/* Header / Timer */}
        <div className="bg-slate-900 p-8 text-center text-white relative">
           <h1 className="text-2xl font-bold mb-2">Live Visit Execution & Care Log</h1>
           <p className="text-xs text-slate-400 max-w-md mx-auto">
             Real-time check-in, pet care tasks, and GPS logs are synced directly with the pet owner.
           </p>
           <div className="text-5xl font-mono font-light tracking-wider my-4 font-variant-numeric: tabular-nums">
             {elapsed}
           </div>
           
           {status === "PENDING" && (
             <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
               <button 
                 onClick={() => handleStart(false)} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-3 rounded-full font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
               >
                 <Play className="w-5 h-5 fill-white" /> {processing ? "Locating..." : "Start Visit (GPS)"}
               </button>
               <button 
                 onClick={() => handleStart(true)} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-5 py-3 rounded-full font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
               >
                 <MapPin className="w-4 h-4 text-emerald-400" /> Start with Simulated GPS
               </button>
               <button 
                 onClick={handleSimulateAll} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-full font-semibold text-xs transition-colors cursor-pointer"
               >
                 <Sparkles className="w-4 h-4" /> 1-Click Fast Simulation
               </button>
             </div>
           )}

           {status === "IN_PROGRESS" && (
             <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
               <button 
                 onClick={handleComplete} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-7 py-3 rounded-full font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
               >
                 <Square className="w-5 h-5 fill-white" /> Complete Visit & Check-Out
               </button>
               <button 
                 onClick={handleSimulateAll} 
                 disabled={processing}
                 className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2.5 rounded-full font-semibold text-xs border border-slate-700 transition-colors cursor-pointer"
               >
                 <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Auto-Fill Checklist & Photos
               </button>
             </div>
           )}

           {status === "COMPLETED" && (
             <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl max-w-md mx-auto flex items-center justify-center gap-2 text-emerald-300 text-sm font-semibold">
               <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Visit Completed & Synchronized
             </div>
           )}
        </div>

        {/* Action Content */}
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* Sitter Routine Approval Card / Gate */}
          {!isRoutineApproved ? (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-amber-950 text-base">
                      Routine Approval Required by Sitter
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      Step 1 of Care
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 max-w-xl leading-relaxed">
                    As a security policy, you must review and confirm the pet owner's requested schedule before checking off tasks or completing the visit.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleApproveRoutine}
                disabled={isApprovingRoutine}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 whitespace-nowrap self-start sm:self-auto cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isApprovingRoutine ? "Approving..." : "Approve & Confirm Routine"}
              </button>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    ✓ Pet Care Routine Approved & Confirmed
                  </span>
                  <p className="text-[11px] text-emerald-800">
                    You have verified this routine. You may now execute tasks and provide photo proof.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase bg-emerald-200/80 text-emerald-900 px-2.5 py-1 rounded-full">
                Ready for Live Check-offs
              </span>
            </div>
          )}

          {/* Scheduled Routine Tasks Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" /> Scheduled Pet Care Routine
                </h3>
                <p className="text-xs text-slate-500">
                  Click any item to verify and record proof. Changes sync in real-time to the owner's screen.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                {activities.filter(a => a.status === "COMPLETED").length}/{activities.length} Completed
              </span>
            </div>

            {activities.length === 0 ? (
              <div className="p-5 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500 mb-2">No routine tasks scheduled yet for this booking.</p>
                <Link
                  to={`/bookings/${bookingId}/confirmation`}
                  className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                >
                  Configure Pet Schedule in Order Page →
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                      act.status === "COMPLETED"
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleTaskClick(act)}
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border transition-colors cursor-pointer",
                          act.status === "COMPLETED"
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white hover:border-emerald-500"
                        )}
                        title={act.status === "COMPLETED" ? "Click to re-open task" : "Click to complete with proof"}
                      >
                        {act.status === "COMPLETED" && <CheckCircle2 className="w-4 h-4" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn("font-bold text-xs sm:text-sm", act.status === "COMPLETED" ? "line-through text-slate-500" : "text-slate-900")}>
                            {act.title}
                          </span>
                          {act.petName && (
                            <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-purple-100 text-purple-800">
                              🐾 {act.petName}
                            </span>
                          )}
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {act.activityType}
                          </span>
                          {act.proofRequired && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Camera className="w-3 h-3 text-amber-600" /> Photo Proof Required
                            </span>
                          )}
                        </div>

                        {act.instructions && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{act.instructions}</p>
                        )}

                        {act.completedNotes && (
                          <p className="text-[11px] text-emerald-800 mt-1 italic">
                            <strong>Sitter Log:</strong> "{act.completedNotes}"
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 text-right flex-shrink-0 self-end sm:self-center">
                      {act.completedPhotoUrl && (
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForViewProof(act)}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Camera className="w-3 h-3" /> View Photo Proof
                        </button>
                      )}

                      <span className="text-xs font-bold text-slate-700">{act.scheduledTime}</span>
                      
                      <button
                        type="button"
                        onClick={() => handleTaskClick(act)}
                        className={cn(
                          "text-[10px] font-bold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer",
                          act.status === "COMPLETED"
                            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-200"
                            : "bg-slate-900 hover:bg-slate-800 text-white border-slate-900 shadow-xs"
                        )}
                      >
                        {act.status === "COMPLETED" ? "Done ✓" : (act.proofRequired ? "Add Proof & Complete 📸" : "Complete Task")}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quick Care Checklist */}
          <section>
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" /> Quick Care Checklist
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <ToggleCard active={checklist.pee} onClick={() => setChecklist(c => ({...c, pee: !c.pee}))} icon={<Droplets />} label="Pee (1)" />
              <ToggleCard active={checklist.poo} onClick={() => setChecklist(c => ({...c, poo: !c.poo}))} icon={<AlertCircle />} label="Poo (2)" />
              <ToggleCard active={checklist.water} onClick={() => setChecklist(c => ({...c, water: !c.water}))} icon={<Droplets className="text-blue-500" />} label="Refilled Water" />
              <ToggleCard active={checklist.food} onClick={() => setChecklist(c => ({...c, food: !c.food}))} icon={<Bone className="text-amber-600" />} label="Fed Meals" />
              <ToggleCard active={checklist.meds} onClick={() => setChecklist(c => ({...c, meds: !c.meds}))} icon={<Cross className="text-red-500" />} label="Medication" />
            </div>
          </section>

          {/* Photo Updates */}
          <section>
             <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" /> Photo Updates & Proof of Care Gallery
            </h3>
            
            <div className="flex flex-wrap gap-4">
               {photos.map((url, i) => (
                 <div key={i} className="relative w-24 h-24 rounded-xl border border-slate-200 group overflow-hidden">
                   <img src={url} alt="Update" className="w-full h-full object-cover" />
                   <button onClick={() => removePhoto(i)} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center transition-all cursor-pointer">
                     <Trash2 className="text-white w-6 h-6" />
                   </button>
                 </div>
               ))}
               
               <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-400 transition-colors cursor-pointer">
                 <Camera className="w-6 h-6 mb-1 text-slate-400" />
                 <span className="text-xs font-semibold">Add Photo</span>
               </button>
               <input type="file" multiple accept="image/*" className="hidden" ref={fileInputRef} onChange={handlePhotoSelect} />
            </div>
          </section>

        </div>
      </div>

      {/* Task Proof Submission Modal */}
      <TaskProofModal
        isOpen={Boolean(selectedTaskForProof)}
        activity={selectedTaskForProof}
        onClose={() => setSelectedTaskForProof(null)}
        onSubmit={handleProofSubmit}
        isSubmitting={isSubmittingProof}
      />

      {/* Proof Photo Viewer Modal */}
      <ProofViewerModal
        isOpen={Boolean(selectedTaskForViewProof)}
        activity={selectedTaskForViewProof}
        onClose={() => setSelectedTaskForViewProof(null)}
      />
    </div>
  );
}

function ToggleCard({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer",
        active ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      )}
    >
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", active ? "bg-blue-100" : "bg-slate-100")}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-wide">{label}</span>
    </button>
  );
}
