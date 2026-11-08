import React from "react";
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Clock, 
  User, 
  Calendar, 
  Camera,
  ExternalLink
} from "lucide-react";

interface ProofViewerModalProps {
  isOpen: boolean;
  activity: any | null;
  onClose: () => void;
}

export function ProofViewerModal({
  isOpen,
  activity,
  onClose,
}: ProofViewerModalProps) {
  if (!isOpen || !activity) return null;

  const photoUrl = activity.completedPhotoUrl;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in my-8">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">Verified Proof of Care</h3>
                <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  Verified ✓
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Uploaded by your pet caregiver upon task completion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photo Container */}
        <div className="bg-slate-950 flex items-center justify-center min-h-64 max-h-96 overflow-hidden relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt="Care proof"
              className="w-full max-h-96 object-contain bg-slate-900"
            />
          ) : (
            <div className="p-8 text-center text-slate-400">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs">No photographic image attached to this record.</p>
            </div>
          )}
        </div>

        {/* Metadata Details */}
        <div className="p-5 sm:p-6 space-y-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="font-black text-slate-900 text-base">{activity.title}</h4>
              {activity.petName && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  🐾 {activity.petName}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {activity.activityType}
              </span>
            </div>
            {activity.instructions && (
              <p className="text-xs text-slate-500">
                <strong>Schedule Note:</strong> {activity.instructions}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Caregiver / Sitter</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                {activity.completedBy || "Verified Sitter"}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion Time</span>
              <span className="font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {activity.completedAt ? new Date(activity.completedAt).toLocaleString() : "Recorded Live"}
              </span>
            </div>
          </div>

          {activity.completedNotes && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl text-xs text-emerald-950">
              <strong className="block text-[10px] uppercase font-bold text-emerald-800 mb-0.5">
                Sitter Observation Log:
              </strong>
              "{activity.completedNotes}"
            </div>
          )}

          <div className="flex items-center justify-end pt-2 border-t border-slate-100">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              Close Viewer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
