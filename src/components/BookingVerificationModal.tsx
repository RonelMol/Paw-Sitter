import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  Heart,
  Shield,
  CreditCard,
  Banknote,
  X,
  Sparkles,
  FileText,
} from "lucide-react";
import { useCurrency } from "../lib/CurrencyContext";

export interface BookingVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  sitterName: string;
  modality?: string;
  modalityLabel?: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  petsCount?: number;
  activitiesCount?: number;
  scheduledActivitiesCount?: number;
  primaryVet?: string;
  emergencyVet?: string;
  authSpend?: string | number;
  paymentMethod: "CASH" | "STRIPE";
  totalAmount?: number;
  totalAmountFormatted?: string;
  baseRateFormatted?: string;
  feeFormatted?: string;
  instructions?: string;
  isSubmitting: boolean;
}

export function BookingVerificationModal({
  isOpen,
  onClose,
  onConfirm,
  sitterName,
  modality,
  modalityLabel,
  startDate,
  startTime,
  endDate,
  endTime,
  petsCount,
  activitiesCount,
  scheduledActivitiesCount,
  primaryVet,
  emergencyVet,
  authSpend,
  paymentMethod,
  totalAmount = 0,
  totalAmountFormatted,
  baseRateFormatted,
  feeFormatted,
  instructions,
  isSubmitting,
}: BookingVerificationModalProps) {
  const { formatPrice, currencyConfig } = useCurrency();
  const [isVerifiedCheck, setIsVerifiedCheck] = useState(false);

  if (!isOpen) return null;

  const displayModality = modalityLabel || modality || "Pet Sitting";
  const numActivities = scheduledActivitiesCount ?? activitiesCount ?? 0;
  const displayTotal = totalAmountFormatted || formatPrice(totalAmount, "PHP");
  const displaySpend =
    typeof authSpend === "string" && authSpend.toLowerCase() === "unlimited"
      ? "Unlimited"
      : typeof authSpend === "number"
      ? formatPrice(authSpend, "PHP")
      : typeof authSpend === "string" && !isNaN(Number(authSpend))
      ? formatPrice(Number(authSpend), "PHP")
      : authSpend || formatPrice(500, "PHP");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header Notification Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-100 bg-white/10 px-2 py-0.5 rounded-full inline-block mb-1">
                Step 4 Notification
              </span>
              <h3 className="text-xl font-extrabold text-white leading-tight">
                Verify All Details Before Confirmation
              </h3>
            </div>
          </div>
          <p className="text-xs text-emerald-50 mt-2 leading-relaxed">
            Please double-check all reservation parameters below. Once verified, your booking will be confirmed with {sitterName}.
          </p>
        </div>

        {/* Modal Body: High Contrast Details Review */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-700">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Service & Professional Sitter
                </span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">{sitterName}</span>
                <span className="text-xs text-emerald-700 font-semibold">{displayModality}</span>
                {petsCount !== undefined && petsCount > 0 && (
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    For {petsCount} selected {petsCount === 1 ? "pet" : "pets"}
                  </span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                {sitterName ? sitterName[0] : "S"}
              </div>
            </div>

            {/* Schedule */}
            <div className="flex items-start gap-2.5 text-xs text-slate-800">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Dates & Times:</span>
                <span>
                  {startDate} ({startTime}) — {endDate} ({endTime})
                </span>
              </div>
            </div>

            {/* Routine Activities */}
            <div className="flex items-start gap-2.5 text-xs text-slate-800">
              <Clock className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Care Routine:</span>
                <span>
                  {numActivities > 0
                    ? `${numActivities} scheduled routine tasks (feeding, medication, potty walks)`
                    : "Standard customized daily pet care"}
                </span>
              </div>
            </div>

            {/* Platform Terms & Waiver */}
            <div className="flex items-start gap-2.5 text-xs text-slate-800">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Platform Waiver & Safe Care:</span>
                <span className="text-slate-600">
                  PawShield does not sell insurance. Sitter and owner contract independently. The platform assumes zero liability for pet illness, damages, or off-platform scams.
                </span>
              </div>
            </div>

            {/* Special Instructions if present */}
            {instructions && (
              <div className="flex items-start gap-2.5 text-xs text-slate-800 pt-1">
                <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Special Notes:</span>
                  <span className="text-slate-600 italic line-clamp-2">{instructions}</span>
                </div>
              </div>
            )}

            {/* Payment & Total */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {paymentMethod === "CASH" ? (
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <Banknote className="w-4 h-4 text-emerald-600" />
                    <span>Cash on Service</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                    <CreditCard className="w-4 h-4 text-blue-600" />
                    <span>Stripe Escrow Card</span>
                  </div>
                )}
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">
                  Total Charge ({currencyConfig.code})
                </span>
                <span className="text-lg font-black text-emerald-700">
                  {displayTotal}
                </span>
              </div>
            </div>
          </div>

          {/* Verification Affirmation Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 cursor-pointer select-none transition-colors hover:bg-emerald-50">
            <input
              type="checkbox"
              id="verify-booking-checkbox"
              checked={isVerifiedCheck}
              onChange={(e) => setIsVerifiedCheck(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500 cursor-pointer"
            />
            <span className="text-xs text-emerald-950 font-medium leading-relaxed">
              <strong>I confirm all details are accurate:</strong> The dates, care routine, platform non-liability waiver, and total cost of <strong>{displayTotal}</strong> are verified and agreed upon.
            </span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors"
          >
            Review Again / Edit
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!isVerifiedCheck || isSubmitting}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isSubmitting ? "Placing Booking..." : "Yes, Confirm & Place Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}
