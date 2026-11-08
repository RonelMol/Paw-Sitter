import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface AdSenseConfig {
  publisherClientId: string;
  headerSlotId: string;
  searchSlotId: string;
  sidebarSlotId: string;
  footerSlotId: string;
  enableAutoAds: boolean;
  enableTestMode: boolean;
  isEnabled: boolean;
  showOnLanding: boolean;
  showOnSearch: boolean;
  showOnSitterProfile: boolean;
}

const DEFAULT_CONFIG: AdSenseConfig = {
  publisherClientId: "ca-pub-1234567890123456",
  headerSlotId: "1234567890",
  searchSlotId: "2345678901",
  sidebarSlotId: "3456789012",
  footerSlotId: "4567890123",
  enableAutoAds: true,
  enableTestMode: true,
  isEnabled: true,
  showOnLanding: true,
  showOnSearch: true,
  showOnSitterProfile: true,
};

interface AdSenseContextValue {
  config: AdSenseConfig;
  loading: boolean;
  refreshConfig: () => Promise<void>;
  updateLocalConfig: (newConfig: Partial<AdSenseConfig>) => void;
}

const AdSenseContext = createContext<AdSenseContextValue>({
  config: DEFAULT_CONFIG,
  loading: false,
  refreshConfig: async () => {},
  updateLocalConfig: () => {},
});

export const useAdSense = () => useContext(AdSenseContext);

export function AdSenseProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AdSenseConfig>(() => {
    // Try localStorage first for instant hydration
    try {
      const saved = localStorage.getItem("pawshield_adsense_config");
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      // ignore
    }
    return DEFAULT_CONFIG;
  });
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/adsense/config");
      if (res.ok) {
        const data = await res.json();
        if (data && data.publisherClientId) {
          setConfig((prev) => {
            const next = { ...prev, ...data };
            try {
              localStorage.setItem("pawshield_adsense_config", JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch AdSense config from server:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Inject Google AdSense script when publisher ID is configured and enabled
  useEffect(() => {
    if (!config.isEnabled || !config.publisherClientId) return;

    const pubId = config.publisherClientId.trim();
    if (!pubId || pubId === "ca-pub-") return;

    const existingScript = document.getElementById("google-adsense-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-adsense-script";
      script.async = true;
      script.crossOrigin = "anonymous";
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(pubId)}`;
      document.head.appendChild(script);
    }

    // Also update or set the google-adsense-account meta tag
    let metaTag = document.querySelector('meta[name="google-adsense-account"]');
    if (!metaTag) {
      metaTag = document.createElement("meta");
      metaTag.setAttribute("name", "google-adsense-account");
      document.head.appendChild(metaTag);
    }
    metaTag.setAttribute("content", pubId);
  }, [config.isEnabled, config.publisherClientId]);

  const updateLocalConfig = (newConfig: Partial<AdSenseConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...newConfig };
      try {
        localStorage.setItem("pawshield_adsense_config", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <AdSenseContext.Provider
      value={{
        config,
        loading,
        refreshConfig: fetchConfig,
        updateLocalConfig,
      }}
    >
      {children}
    </AdSenseContext.Provider>
  );
}
