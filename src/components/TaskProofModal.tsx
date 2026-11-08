import React, { useState, useRef } from "react";
import { 
  Camera, 
  Upload, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileText, 
  Clock, 
  Sparkles,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "../lib/utils";

interface TaskProofModalProps {
  isOpen: boolean;
  activity: any | null;
  onClose: () => void;
  onSubmit: (data: { photoUrl?: string; notes?: string }) => Promise<void>;
  isSubmitting?: boolean;
}

const SAMPLE_PROOF_PHOTOS = [
  { label: "Fed Meal Bowl", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80" },
  { label: "Water & Food Refilled", url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80" },
  { label: "Outdoor Walk Log", url: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80" },
  { label: "Medication Administered", url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=600&auto=format&fit=crop&q=80" },
  { label: "Potty & Playtime", url: "https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600&auto=format&fit=crop&q=80" },
];

export function TaskProofModal({
  isOpen,
  activity,
  onClose,
  onSubmit,
  isSubmitting = false,
}: TaskProofModalProps) {
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [confirmedChecklist, setConfirmedChecklist] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !activity) return null;

  const proofRequired = Boolean(activity.proofRequired);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
      setErrorMsg(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (proofRequired && (!photoUrl || !photoUrl.trim())) {
      setErrorMsg("Photographic proof is required by the pet owner for this task before it can be marked done.");
      return;
    }

    try {
      await onSubmit({
        photoUrl: photoUrl || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit task proof.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 animate-in fade-in my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Proof of Care Verification</span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                Complete Task with Proof
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Info Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-5 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-900">{activity.title}</span>
            <div className="flex items-center gap-1.5">
              {activity.petName && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  🐾 {activity.petName}
                </span>
              )}
              <span className="text-[10px] font-bold uppercase bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                {activity.activityType}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> {activity.scheduledTime} ({activity.scheduledDate})
            </span>
            {proofRequired ? (
              <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                <Camera className="w-3 h-3 text-amber-600" /> Photo Proof Required by Owner
              </span>
            ) : (
              <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Photo Proof Optional
              </span>
            )}
          </div>

          {activity.instructions && (
            <p className="text-xs text-slate-600 pt-1 border-t border-slate-200/60 leading-relaxed">
              <strong>Instructions:</strong> {activity.instructions}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Photo Proof Upload Area */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Task Photo Evidence {proofRequired ? <span className="text-rose-600">*</span> : "(Optional)"}</span>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setPhotoUrl("")}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Remove Photo
                </button>
              )}
            </label>

            {photoUrl ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 bg-slate-900 group aspect-video max-h-48">
                <img src={photoUrl} alt="Task proof" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-xl shadow"
                  >
                    Change Photo
                  </button>
                </div>
                <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                  <CheckCircle2 className="w-3 h-3" /> Photo Attached
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all hover:bg-purple-50/50 hover:border-purple-400 flex flex-col items-center justify-center gap-2",
                    proofRequired ? "border-amber-300 bg-amber-50/30" : "border-slate-300 bg-slate-50/50"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-700">Take Photo or Upload Image</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Capture bowl, pet walk, or medication evidence</p>
                  </div>
                </div>

                {/* Quick Presets for Demo / Testing */}
                <div className="pt-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Sample Evidence (1-Click Test):
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {SAMPLE_PROOF_PHOTOS.map((sample, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setPhotoUrl(sample.url);
                          setErrorMsg(null);
                        }}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-800 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors border border-slate-200 flex items-center gap-1"
                      >
                        <ImageIcon className="w-3 h-3 text-purple-600" /> {sample.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          {/* Sitter Care Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Care Notes & Observations (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ate full portion, gave fresh water bowl, very energetic and happy!"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Security & Verification Checkbox */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedChecklist}
                onChange={(e) => setConfirmedChecklist(e.target.checked)}
                className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
              />
              <span className="leading-snug">
                I certify as the assigned pet caregiver that I have personally completed this scheduled routine item and that this photo represents true care provided.
              </span>
            </label>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !confirmedChecklist || (proofRequired && !photoUrl)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? "Verifying..." : "Verify & Complete Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
