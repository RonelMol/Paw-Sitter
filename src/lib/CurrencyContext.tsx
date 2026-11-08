import React, { createContext, useContext, useState, useEffect } from "react";

export type CurrencyCode = "PHP" | "USD" | "EUR" | "GBP" | "AUD" | "NZD" | "CAD" | "SGD" | "JPY";

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  flag: string;
  rateFromUSD: number; // 1 USD in this currency
  rateFromPHP: number; // 1 PHP in this currency
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PHP: {
    code: "PHP",
    symbol: "₱",
    name: "Philippine Peso",
    flag: "🇵🇭",
    rateFromUSD: 56.5,
    rateFromPHP: 1,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    flag: "🇺🇸",
    rateFromUSD: 1,
    rateFromPHP: 1 / 56.5,
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    rateFromUSD: 0.92,
    rateFromPHP: 0.92 / 56.5,
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound",
    flag: "🇬🇧",
    rateFromUSD: 0.79,
    rateFromPHP: 0.79 / 56.5,
  },
  AUD: {
    code: "AUD",
    symbol: "A$",
    name: "Australian Dollar",
    flag: "🇦🇺",
    rateFromUSD: 1.52,
    rateFromPHP: 1.52 / 56.5,
  },
  NZD: {
    code: "NZD",
    symbol: "NZ$",
    name: "New Zealand Dollar",
    flag: "🇳🇿",
    rateFromUSD: 1.65,
    rateFromPHP: 1.65 / 56.5,
  },
  CAD: {
    code: "CAD",
    symbol: "C$",
    name: "Canadian Dollar",
    flag: "🇨🇦",
    rateFromUSD: 1.36,
    rateFromPHP: 1.36 / 56.5,
  },
  SGD: {
    code: "SGD",
    symbol: "S$",
    name: "Singapore Dollar",
    flag: "🇸🇬",
    rateFromUSD: 1.35,
    rateFromPHP: 1.35 / 56.5,
  },
  JPY: {
    code: "JPY",
    symbol: "¥",
    name: "Japanese Yen",
    flag: "🇯🇵",
    rateFromUSD: 154.0,
    rateFromPHP: 154.0 / 56.5,
  },
};

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  setCurrency: (code: CurrencyCode) => void;
  /**
   * Formats an amount.
   * By default, baseCurrency is 'PHP' (matching platform pricing in Philippine Pesos).
   * If baseCurrency is 'USD', it converts from USD to the target currency.
   */
  formatPrice: (
    amount: number,
    options?: { baseCurrency?: "USD" | "PHP"; isCents?: boolean; compact?: boolean } | "USD" | "PHP"
  ) => string;
  convertAmount: (amount: number, baseCurrency?: "USD" | "PHP") => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  // Default currency is Philippine Peso (PHP)
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem("pawshield_currency");
    if (saved && saved in CURRENCIES) {
      return saved as CurrencyCode;
    }
    return "PHP";
  });

  const setCurrency = (code: CurrencyCode) => {
    if (code in CURRENCIES) {
      setCurrencyState(code);
      localStorage.setItem("pawshield_currency", code);
    }
  };

  const currentConfig = CURRENCIES[currency] || CURRENCIES.PHP;

  const convertAmount = (amount: number, baseCurrency: "USD" | "PHP" = "PHP"): number => {
    if (baseCurrency === "PHP") {
      // Base is PHP, convert to current selected currency
      return amount * currentConfig.rateFromPHP;
    } else {
      // Base is USD, convert to current selected currency
      return amount * currentConfig.rateFromUSD;
    }
  };

  const formatPrice = (
    amount: number,
    options?: { baseCurrency?: "USD" | "PHP"; isCents?: boolean; compact?: boolean } | "USD" | "PHP"
  ): string => {
    const opts = typeof options === "string" ? { baseCurrency: options } : (options || {});
    const { baseCurrency = "PHP", isCents = false, compact = false } = opts;
    let raw = Number(amount) || 0;
    if (isCents) {
      raw = raw / 100;
    }

    const converted = convertAmount(raw, baseCurrency);

    // Format with commas and 2 decimal places (or 0 if JPY)
    const decimals = currency === "JPY" ? 0 : 2;
    const formattedNumber = converted.toLocaleString(undefined, {
      minimumFractionDigits: compact ? 0 : decimals,
      maximumFractionDigits: decimals,
    });

    return `${currentConfig.symbol}${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyConfig: currentConfig,
        setCurrency,
        formatPrice,
        convertAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}
