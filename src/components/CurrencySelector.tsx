import React, { useState, useRef, useEffect } from "react";
import { useCurrency, CURRENCIES, CurrencyCode } from "../lib/CurrencyContext";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "../lib/utils";

interface CurrencySelectorProps {
  className?: string;
  variant?: "header" | "compact" | "badge";
}

export function CurrencySelector({ className, variant = "header" }: CurrencySelectorProps) {
  const { currency, currencyConfig, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const currencyList = Object.values(CURRENCIES);

  return (
    <div className={cn("relative inline-block text-left", className)} ref={dropdownRef}>
      <button
        type="button"
        id="currency-switcher-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all",
          variant === "header"
            ? "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800 focus:ring-2 focus:ring-slate-300"
            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm"
        )}
        title="Switch Currency (Default: Philippine Peso ₱)"
      >
        <span className="text-sm">{currencyConfig.flag}</span>
        <span className="font-bold tracking-tight">{currencyConfig.code}</span>
        <span className="text-slate-500 font-normal">({currencyConfig.symbol})</span>
        <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100">
          <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Select Currency
            </p>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Default: 🇵🇭 Philippine Peso (PHP)
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 divide-y divide-slate-50">
            {currencyList.map((c) => {
              const isSelected = c.code === currency;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setCurrency(c.code);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full px-3 py-2 text-left rounded-xl text-xs flex items-center justify-between transition-colors",
                    isSelected
                      ? "bg-emerald-50 text-emerald-900 font-bold border border-emerald-200/60"
                      : "text-slate-700 hover:bg-slate-100 font-medium"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base leading-none">{c.flag}</span>
                    <div>
                      <span className="font-semibold block">{c.code} ({c.symbol})</span>
                      <span className="text-[10px] text-slate-500 font-normal">{c.name}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
