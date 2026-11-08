import React from "react";
import { Link } from "react-router";
import { ShieldCheck } from "lucide-react";
import { useHomePage } from "../lib/HomePageContext";
import { cn } from "../lib/utils";

interface BrandLogoProps {
  className?: string;
  showTagline?: boolean;
  size?: "sm" | "md" | "lg";
}

export function BrandLogo({ className, showTagline = false, size = "md" }: BrandLogoProps) {
  const { config } = useHomePage();

  return (
    <Link to="/" className={cn("flex items-center gap-2.5 group", className)}>
      {config.logoUrl ? (
        <img
          src={config.logoUrl}
          alt={config.logoText || "Brand Logo"}
          className={cn(
            "object-contain rounded-lg transition-transform group-hover:scale-105",
            size === "sm" ? "h-6 max-w-[120px]" : size === "lg" ? "h-10 max-w-[200px]" : "h-8 max-w-[160px]"
          )}
        />
      ) : (
        <div
          className={cn(
            "rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
            size === "sm" ? "w-7 h-7" : size === "lg" ? "w-10 h-10" : "w-8 h-8"
          )}
        >
          <ShieldCheck className={cn(size === "sm" ? "h-4 w-4" : size === "lg" ? "h-6 w-6" : "h-5 w-5")} />
        </div>
      )}

      <div className="flex flex-col">
        <span
          className={cn(
            "font-extrabold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors leading-none",
            size === "sm" ? "text-base" : size === "lg" ? "text-2xl" : "text-xl"
          )}
        >
          {config.logoText || "PawShield"}
        </span>
        {showTagline && config.logoTagline && (
          <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
            {config.logoTagline}
          </span>
        )}
      </div>
    </Link>
  );
}
