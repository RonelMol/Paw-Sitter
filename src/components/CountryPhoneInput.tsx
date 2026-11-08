import React, { useState, useEffect } from "react";
import { Check, AlertCircle, ChevronDown, Phone } from "lucide-react";

export interface CountryInfo {
  code: string; // e.g. "+63"
  country: string; // e.g. "Philippines"
  iso: string; // e.g. "PH"
  flag: string; // e.g. "🇵🇭"
  placeholder: string; // e.g. "917 123 4567"
  example: string;
  minDigits: number;
  maxDigits: number;
  startsValid?: (digits: string) => boolean;
}

export const SUPPORTED_COUNTRIES: CountryInfo[] = [
  {
    code: "+63",
    country: "Philippines",
    iso: "PH",
    flag: "🇵🇭",
    placeholder: "917 123 4567",
    example: "+63 917 123 4567",
    minDigits: 10,
    maxDigits: 10,
    startsValid: (digits) => digits.startsWith("9"),
  },
  {
    code: "+64",
    country: "New Zealand",
    iso: "NZ",
    flag: "🇳🇿",
    placeholder: "21 123 4567",
    example: "+64 21 123 4567",
    minDigits: 8,
    maxDigits: 10,
    startsValid: (digits) => digits.startsWith("2"),
  },
  {
    code: "+1",
    country: "United States",
    iso: "US",
    flag: "🇺🇸",
    placeholder: "555 123 4567",
    example: "+1 555 123 4567",
    minDigits: 10,
    maxDigits: 10,
  },
  {
    code: "+61",
    country: "Australia",
    iso: "AU",
    flag: "🇦🇺",
    placeholder: "412 345 678",
    example: "+61 412 345 678",
    minDigits: 9,
    maxDigits: 9,
    startsValid: (digits) => digits.startsWith("4"),
  },
  {
    code: "+44",
    country: "United Kingdom",
    iso: "GB",
    flag: "🇬🇧",
    placeholder: "7123 456789",
    example: "+44 7123 456789",
    minDigits: 10,
    maxDigits: 10,
    startsValid: (digits) => digits.startsWith("7"),
  },
  {
    code: "+65",
    country: "Singapore",
    iso: "SG",
    flag: "🇸🇬",
    placeholder: "8123 4567",
    example: "+65 8123 4567",
    minDigits: 8,
    maxDigits: 8,
    startsValid: (digits) => digits.startsWith("8") || digits.startsWith("9"),
  },
  {
    code: "+1",
    country: "Canada",
    iso: "CA",
    flag: "🇨🇦",
    placeholder: "416 123 4567",
    example: "+1 416 123 4567",
    minDigits: 10,
    maxDigits: 10,
  },
  {
    code: "+81",
    country: "Japan",
    iso: "JP",
    flag: "🇯🇵",
    placeholder: "90 1234 5678",
    example: "+81 90 1234 5678",
    minDigits: 10,
    maxDigits: 11,
  },
  {
    code: "+971",
    country: "United Arab Emirates",
    iso: "AE",
    flag: "🇦🇪",
    placeholder: "50 123 4567",
    example: "+971 50 123 4567",
    minDigits: 9,
    maxDigits: 9,
    startsValid: (digits) => digits.startsWith("5"),
  },
];

interface CountryPhoneInputProps {
  value: string; // can be full or local, e.g. "+639171234567" or "09171234567"
  defaultCountryCode?: string;
  onChange: (fullPhone: string, isValid: boolean, countryCode: string, nationalNumber: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export function CountryPhoneInput({
  value,
  defaultCountryCode = "+63",
  onChange,
  label = "Phone Number",
  required = false,
  disabled = false,
  id = "phone-input"
}: CountryPhoneInputProps) {
  // Parse initial country code and local number from value
  const detectInitial = () => {
    if (!value) return { country: SUPPORTED_COUNTRIES[0], national: "" };
    const clean = value.trim();
    for (const c of SUPPORTED_COUNTRIES) {
      if (clean.startsWith(c.code)) {
        const nat = clean.slice(c.code.length).replace(/^0+/, "");
        return { country: c, national: nat };
      }
    }
    // Check if starts with 09 -> Philippines
    if (clean.startsWith("09")) {
      return { country: SUPPORTED_COUNTRIES[0], national: clean.slice(1) };
    }
    return { country: SUPPORTED_COUNTRIES[0], national: clean.replace(/\D/g, "") };
  };

  const initial = detectInitial();
  const [selectedCountry, setSelectedCountry] = useState<CountryInfo>(initial.country);
  const [nationalNumber, setNationalNumber] = useState<string>(initial.national);

  // Sync if value changes externally
  useEffect(() => {
    if (!value) return;
    const detected = detectInitial();
    setSelectedCountry(detected.country);
    setNationalNumber(detected.national);
  }, [value]);

  // Validate current input
  const cleanDigits = nationalNumber.replace(/\D/g, "");
  let isValid = false;
  let validationMessage = "";

  if (!cleanDigits) {
    if (required) {
      validationMessage = "Phone number is required";
    }
  } else {
    if (cleanDigits.length < selectedCountry.minDigits) {
      validationMessage = `Too short: needs ${selectedCountry.minDigits} digits for ${selectedCountry.country}`;
    } else if (cleanDigits.length > selectedCountry.maxDigits) {
      validationMessage = `Too long: maximum ${selectedCountry.maxDigits} digits`;
    } else if (selectedCountry.startsValid && !selectedCountry.startsValid(cleanDigits)) {
      validationMessage = `Invalid prefix for ${selectedCountry.country} (e.g. ${selectedCountry.placeholder})`;
    } else {
      isValid = true;
      validationMessage = "Valid phone format";
    }
  }

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = SUPPORTED_COUNTRIES.find((c) => c.iso === e.target.value) || SUPPORTED_COUNTRIES[0];
    setSelectedCountry(found);
    const full = `${found.code}${cleanDigits}`;
    let valid = false;
    if (cleanDigits.length >= found.minDigits && cleanDigits.length <= found.maxDigits) {
      if (!found.startsValid || found.startsValid(cleanDigits)) {
        valid = true;
      }
    }
    onChange(full, valid, found.code, cleanDigits);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/\D/g, "");
    // If user typed 0917... for PH, strip leading 0
    if (selectedCountry.iso === "PH" && raw.startsWith("09")) {
      raw = raw.slice(1);
    }
    setNationalNumber(raw);
    const full = `${selectedCountry.code}${raw}`;
    let valid = false;
    if (raw.length >= selectedCountry.minDigits && raw.length <= selectedCountry.maxDigits) {
      if (!selectedCountry.startsValid || selectedCountry.startsValid(raw)) {
        valid = true;
      }
    }
    onChange(full, valid, selectedCountry.code, raw);
  };

  return (
    <div className="space-y-1.5" id={`${id}-wrapper`}>
      {label && (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {cleanDigits.length > 0 && (
            <span
              className={`text-[10px] font-semibold flex items-center gap-1 ${
                isValid ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {isValid ? <Check className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              {validationMessage}
            </span>
          )}
        </div>
      )}

      <div className="flex rounded-xl border border-slate-200 bg-slate-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-transparent transition-all overflow-hidden">
        {/* Country selector */}
        <div className="relative border-r border-slate-200 bg-slate-100/70 hover:bg-slate-100 flex items-center px-2.5 shrink-0 transition-colors">
          <span className="text-base mr-1.5">{selectedCountry.flag}</span>
          <span className="text-xs font-bold text-slate-700">{selectedCountry.code}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1 pointer-events-none" />
          <select
            value={selectedCountry.iso}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Select country for phone number"
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full disabled:cursor-not-allowed"
          >
            {SUPPORTED_COUNTRIES.map((c) => (
              <option key={c.iso} value={c.iso}>
                {c.flag} {c.country} ({c.code})
              </option>
            ))}
          </select>
        </div>

        {/* National Number Input */}
        <div className="relative flex-1 flex items-center">
          <input
            id={id}
            type="tel"
            value={nationalNumber}
            onChange={handleNumberChange}
            disabled={disabled}
            placeholder={selectedCountry.placeholder}
            className="w-full px-3.5 py-2.5 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Format: {selectedCountry.example}</span>
        <span>Country: {selectedCountry.country}</span>
      </div>
    </div>
  );
}
