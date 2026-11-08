import React, { createContext, useContext, useState, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  addToast: (titleOrMessage: string, type?: ToastType, description?: string) => void;
}

const ToastContext = createContext<ToastContextType>({} as ToastContextType);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = ({ title, description, type }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type: type || "info" }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const addToast = (titleOrMessage: string, type: ToastType = "info", description?: string) => {
    toast({ title: titleOrMessage, type, description });
  };

  return (
    <ToastContext.Provider value={{ toast, addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg p-4 shadow-lg min-w-[300px] border transform transition-all duration-300 translate-y-0 opacity-100",
              t.type === "success" && "bg-green-50 border-green-200 text-green-900",
              t.type === "error" && "bg-red-50 border-red-200 text-red-900",
              t.type === "info" && "bg-white border-slate-200 text-slate-900"
            )}
          >
            <div className="flex-1">
              <h4 className="font-semibold text-sm">{t.title}</h4>
              {t.description && <p className="text-sm opacity-90 mt-1">{t.description}</p>}
            </div>
            <button
              onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
              className="text-current opacity-50 hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
