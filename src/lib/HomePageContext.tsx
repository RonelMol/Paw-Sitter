import React, { createContext, useContext, useState, useEffect } from "react";

export interface FeatureCardConfig {
  id: string;
  icon: "ShieldCheck" | "Star" | "CalendarCheck" | "Heart" | "Award" | "CheckCircle2";
  title: string;
  description: string;
  badge?: string;
}

export interface ServiceCardConfig {
  id: string;
  title: string;
  description: string;
  icon: "Home" | "CalendarCheck" | "Footprints" | "HeartHandshake" | "Utensils";
}

export interface TestimonialConfig {
  id: string;
  name: string;
  petName: string;
  petType: string;
  location: string;
  rating: number;
  review: string;
  avatarUrl?: string;
}

export interface FaqConfig {
  id: string;
  question: string;
  answer: string;
}

export interface HomePageConfig {
  // Brand & Logo
  logoUrl?: string; // custom uploaded image data URL or image path
  logoText: string;
  logoTagline: string;
  
  // Hero Section
  heroHeadline: string;
  heroSubheadline: string;
  heroPrimaryBtnText: string;
  heroSecondaryBtnText: string;
  heroStyle: "slate" | "emerald" | "indigo" | "sunset" | "ocean";
  heroImageUrl?: string;

  // Features (Why Choose Us)
  whyTitle: string;
  whySubtitle: string;
  featureCards: FeatureCardConfig[];

  // Tailored Services
  servicesTitle: string;
  servicesSubtitle: string;
  serviceCards: ServiceCardConfig[];
  servicesImageUrl?: string;

  // Social Proof & Testimonials
  testimonials: TestimonialConfig[];

  // AdSense High-Value Inventory Editorial Section
  editorialTitle: string;
  editorialBody: string;
  editorialPoints: string[];

  // Search Engine & Knowledge FAQs
  faqs: FaqConfig[];

  // SEO & Marketing Metadata
  seoKeywords: string[];
  marketingCampaigns?: any[];
  aiAgentControlled: boolean;
  aiLastOptimizedAt?: string;
  aiAuditScore?: number;
}

export const DEFAULT_HOMEPAGE_CONFIG: HomePageConfig = {
  logoUrl: "",
  logoText: "PawShield",
  logoTagline: "Verified Pet Care Network",
  
  heroHeadline: "Loving, Verified Pet Sitters in Your Neighborhood.",
  heroSubheadline: "PawShield connects caring pet parents with background-checked local sitters for cage-free home boarding, house sitting, drop-in visits, and daily dog walking.",
  heroPrimaryBtnText: "Find a Sitter Now",
  heroSecondaryBtnText: "Become a Sitter",
  heroStyle: "slate",
  heroImageUrl: "",

  whyTitle: "Why Choose PawShield Pet Care?",
  whySubtitle: "We prioritize safety, verified trust, and health above all else with transparent pricing in Philippine Pesos.",
  featureCards: [
    {
      id: "card-1",
      icon: "ShieldCheck",
      title: "100% Verified Sitters",
      description: "Every sitter passes government ID verification, phone screening, and home safety checks before accepting bookings.",
      badge: "Government ID Verified",
    },
    {
      id: "card-2",
      icon: "Star",
      title: "Genuine Pet Parent Reviews",
      description: "Read honest feedback and 5-star ratings left exclusively by pet owners who completed verified stays on PawShield.",
      badge: "Verified Stay Reviews",
    },
    {
      id: "card-3",
      icon: "CalendarCheck",
      title: "Protected Escrow Payments",
      description: "Your money is held safely in platform escrow. Sitter payout is released only after your pet is returned happy and safe.",
      badge: "100% Escrow Protected",
    },
    {
      id: "card-4",
      icon: "Award",
      title: "₱50,000 Vet Care Guarantee",
      description: "Rest easy knowing every booking includes up to ₱50,000 in emergency veterinary medical reimbursement coverage.",
      badge: "Medical Coverage",
    },
  ],

  servicesTitle: "Pet Care Services Tailored For Every Companion",
  servicesSubtitle: "From high-energy puppies to senior cats needing medication, our sitters provide customized 1-on-1 attention.",
  serviceCards: [
    {
      id: "srv-1",
      title: "Pet Boarding",
      description: "Your dog or cat stays overnight in a loving sitter's home with dedicated 1-on-1 affection, safe play, and cozy bedding.",
      icon: "Home",
    },
    {
      id: "srv-2",
      title: "House Sitting",
      description: "A trusted sitter stays at your residence to maintain your pet's normal routine, water plants, and keep home secure.",
      icon: "CalendarCheck",
    },
    {
      id: "srv-3",
      title: "Drop-In Visits",
      description: "30-60 minute home drop-ins for food refills, medicine administration, litter box cleanups, and joyful companionship.",
      icon: "Footprints",
    },
    {
      id: "srv-4",
      title: "Dog Walking & Play",
      description: "Energizing neighborhood walks with live GPS tracking, bathroom check-ins, and water breaks tailored to your pup's pace.",
      icon: "Footprints",
    },
  ],
  servicesImageUrl: "",

  testimonials: [
    {
      id: "test-1",
      name: "Camille Santos",
      petName: "Mochi",
      petType: "Pomeranian",
      location: "BGC, Taguig",
      rating: 5,
      review: "I was super nervous leaving Mochi for a 5-day work trip, but our sitter Maria sent hourly video check-ins and photo logs. The escrow payment gave me complete peace of mind!",
      avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80",
    },
    {
      id: "test-2",
      name: "Dr. Paolo Mendoza",
      petName: "Kona & Luna",
      petType: "Golden Retrievers",
      location: "Makati City",
      rating: 5,
      review: "PawShield is hands down the most trustworthy pet care platform in the Philippines. Both of my goldens have special dietary routines, and their sitter followed every instruction to the letter.",
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80",
    },
    {
      id: "test-3",
      name: "Janine Rodriguez",
      petName: "Oreo",
      petType: "British Shorthair",
      location: "Quezon City",
      rating: 5,
      review: "Cats hate traveling or boarding in noisy vet cages. Having a verified drop-in cat sitter come to our condo kept Oreo relaxed and purring happily the whole weekend!",
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    },
  ],

  editorialTitle: "Why Pinoy Pet Parents Choose Home Boarding Over Traditional Kennels",
  editorialBody: "Leaving your pet while at work, traveling, or on vacation can be stressful. For decades, pet parents only had traditional kennels or impersonal boarding facilities as options. Today, PawShield transforms pet care across the Philippines by connecting pet families with trusted, background-checked neighborhood caregivers who welcome pets directly into warm, cage-free homes. With individual 1-on-1 care, your pet maintains their familiar diet, walking routines, and bedtime habits without the stress or pathogen exposure of crowded cages. Every reservation is fortified with 100% Escrow Financial Protection, continuous photo and GPS tracking, and our comprehensive ₱50,000 Emergency Veterinary Medical Guarantee.",
  editorialPoints: [
    "Cage-free, personalized 1-on-1 home environment",
    "Strict government ID and background verification for all sitters",
    "Full escrow payment protection until pet is safely home",
    "Automatic ₱50,000 emergency veterinary coverage on every stay",
    "Real-time GPS walking routes and daily photo/video updates",
  ],

  faqs: [
    {
      id: "faq-1",
      question: "How does PawShield Escrow Payment Protection work?",
      answer: "When you book a sitter, your payment is held securely in platform escrow. The funds are never transferred to the sitter until after the stay has concluded and you confirm that your pet is healthy and returned safely.",
    },
    {
      id: "faq-2",
      question: "How are pet sitters vetted and verified?",
      answer: "Every pet sitter candidate must submit official government identification, pass a manual background review, verify their residential address, and complete a pet care safety assessment before their profile goes live.",
    },
    {
      id: "faq-3",
      question: "What is the ₱50,000 Emergency Veterinary Guarantee?",
      answer: "Every booking made through PawShield includes veterinary medical protection covering unexpected injuries or illness during the stay up to ₱50,000, supported by our 24/7 emergency escalation desk.",
    },
    {
      id: "faq-4",
      question: "Can I do a Meet & Greet with the sitter before booking?",
      answer: "Yes, absolutely! We strongly encourage pet parents to arrange a complimentary Meet & Greet in person or via video call before confirming a multi-day stay so you and your pet feel 100% comfortable.",
    },
    {
      id: "faq-5",
      question: "What happens if I need to cancel my pet's booking?",
      answer: "PawShield offers flexible cancellation policies. Most sitters provide a 100% refund when canceled at least 48 hours before the reservation begins, processed directly back to your original payment method.",
    },
    {
      id: "faq-6",
      question: "How do I become a verified pet sitter on PawShield?",
      answer: "Animal lovers can click 'Become a Sitter', complete the onboarding application, set their custom rates in ₱ PHP, and submit credentials. Approved sitters can earn up to ₱35,000/month hosting pets in their neighborhood.",
    },
  ],

  seoKeywords: [
    "pet sitter philippines", "dog boarding manila", "cat sitting bgc",
    "pet sitter quezon city", "dog walker makati", "pet boarding cebu"
  ],
  aiAgentControlled: true,
  aiLastOptimizedAt: new Date().toISOString(),
  aiAuditScore: 98,
};

interface HomePageContextType {
  config: HomePageConfig;
  updateConfig: (partial: Partial<HomePageConfig>) => void;
  resetConfig: () => void;
  isCustomizerOpen: boolean;
  setIsCustomizerOpen: (open: boolean) => void;
  saveToServer: () => Promise<void>;
  loading: boolean;
}

const HomePageContext = createContext<HomePageContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = "pawshield_homepage_config";

export function HomePageProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HomePageConfig>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_HOMEPAGE_CONFIG, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn("Failed reading saved homepage config:", e);
    }
    return DEFAULT_HOMEPAGE_CONFIG;
  });

  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch initial config from server if available
  useEffect(() => {
    const fetchRemote = async () => {
      try {
        const res = await fetch("/api/homepage-config");
        if (res.ok) {
          const remote = await res.json();
          if (remote && remote.logoText) {
            setConfig(prev => ({
              ...prev,
              ...remote,
              featureCards: (Array.isArray(remote.featureCards) && remote.featureCards.length > 0)
                ? remote.featureCards
                : prev.featureCards,
              serviceCards: (Array.isArray(remote.serviceCards) && remote.serviceCards.length > 0)
                ? remote.serviceCards
                : prev.serviceCards,
              testimonials: (Array.isArray(remote.testimonials) && remote.testimonials.length > 0)
                ? remote.testimonials
                : prev.testimonials,
              faqs: (Array.isArray(remote.faqs) && remote.faqs.length > 0)
                ? remote.faqs
                : prev.faqs,
            }));
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remote));
          }
        }
      } catch (err) {
        // silent fallback to localStorage
      }
    };
    fetchRemote();
  }, []);

  const updateConfig = (partial: Partial<HomePageConfig>) => {
    setConfig(prev => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn("Storage write note:", e);
      }
      return next;
    });
  };

  const resetConfig = () => {
    setConfig(DEFAULT_HOMEPAGE_CONFIG);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_HOMEPAGE_CONFIG));
    } catch (e) {}
  };

  const saveToServer = async () => {
    setLoading(true);
    try {
      await fetch("/api/homepage-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
    } catch (err) {
      console.warn("Failed to persist homepage config to server:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <HomePageContext.Provider
      value={{
        config,
        updateConfig,
        resetConfig,
        isCustomizerOpen,
        setIsCustomizerOpen,
        saveToServer,
        loading,
      }}
    >
      {children}
    </HomePageContext.Provider>
  );
}

export function useHomePage() {
  const ctx = useContext(HomePageContext);
  if (!ctx) {
    throw new Error("useHomePage must be used within a HomePageProvider");
  }
  return ctx;
}
