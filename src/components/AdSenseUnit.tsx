import React, { useEffect, useRef } from "react";
import { useAdSense } from "../lib/AdSenseContext";
import { Info, Sparkles } from "lucide-react";

interface AdSenseUnitProps {
  slotId?: string;
  format?: "auto" | "rectangle" | "horizontal" | "vertical" | "fluid";
  className?: string;
  label?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export function AdSenseUnit({
  slotId,
  format = "auto",
  className = "",
  label = "Advertisement",
  style,
}: AdSenseUnitProps) {
  const { config } = useAdSense();
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  // Fallback to configured default slots if slotId not passed
  const activeSlotId = slotId || (format === "horizontal" ? config.headerSlotId : config.sidebarSlotId) || "1234567890";

  useEffect(() => {
    if (!config.isEnabled) return;
    if (pushedRef.current) return;

    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        pushedRef.current = true;
      }
    } catch (e) {
      // Catch duplicate push or blocked script
    }
  }, [config.isEnabled, activeSlotId]);

  if (!config.isEnabled) {
    return null;
  }

  // Visual dimension styling based on format
  const getFormatClasses = () => {
    switch (format) {
      case "horizontal":
        return "min-h-[90px] w-full max-w-[728px]";
      case "rectangle":
        return "min-h-[250px] w-full max-w-[300px]";
      case "vertical":
        return "min-h-[600px] w-full max-w-[160px] md:max-w-[300px]";
      case "fluid":
        return "min-h-[120px] w-full";
      default:
        return "min-h-[100px] w-full";
    }
  };

  return (
    <div
      className={`my-8 sm:my-6 flex flex-col items-center justify-center overflow-hidden transition-all ${className}`}
      style={style}
    >
      {/* Mandatory Google AdSense Labeling (Prevents Accidental Click Policy Violations) */}
      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-600 select-none">
        <span>{label}</span>
      </div>

      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-center shadow-xs ${getFormatClasses()}`}
      >
        {/* AdSense Live Unit / Script Container */}
        <ins
          ref={adRef}
          className="adsbygoogle block w-full"
          style={{ display: "block" }}
          data-ad-client={config.publisherClientId}
          data-ad-slot={activeSlotId}
          data-ad-format={format === "auto" ? "auto" : undefined}
          data-full-width-responsive="true"
          data-adtest={config.enableTestMode ? "on" : undefined}
        />

        {/* Visual Compliant Indicator when in Test/Dev Mode or loading */}
        {config.enableTestMode && (
          <div className="py-3 px-4 w-full flex flex-col items-center justify-center text-slate-500">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Google AdSense Test Mode
              </span>
              <span className="text-xs text-slate-500 font-mono">Slot: {activeSlotId}</span>
            </div>
            <p className="text-xs text-slate-500 max-w-sm">
              Ad slot reserved for Google AdSense. Test mode is active to protect your publisher account from invalid click violations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
