"use client";

import { create } from "zustand";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (message, type = "info", duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));

export const toast = {
  success: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, "success", duration),
  error: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, "error", duration),
  warning: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, "warning", duration),
  info: (msg: string, duration?: number) => useToastStore.getState().addToast(msg, "info", duration),
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const icons = {
    success: <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />,
    error: <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />,
    warning: <AlertTriangle className="w-4.5 h-4.5 text-amber-500 shrink-0" />,
    info: <Info className="w-4.5 h-4.5 text-blue-500 shrink-0" />,
  };

  const borderColors = {
    success: "border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-950/20",
    error: "border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20",
    warning: "border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20",
    info: "border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20",
  };

  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      className={`pointer-events-auto flex gap-3 p-3.5 rounded-xl border glass shadow-lg items-center ${borderColors[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 text-xs md:text-sm font-medium text-foreground leading-snug">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="p-0.5 hover:bg-muted/60 rounded-md transition-colors text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
