"use client";

import { create } from "zustand";
import { X } from "lucide-react";
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
  addToast: (message, type = "info", duration = 3000) => {
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
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-1.5 max-w-xs w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastCard({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  useEffect(() => {
    if (toast.duration === 0) return;
    const timer = setTimeout(() => {
      onClose();
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.12 } }}
      className="pointer-events-auto flex gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card shadow-md items-center"
    >
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
        toast.type === "error" ? "bg-destructive" 
        : toast.type === "warning" ? "bg-foreground/50" 
        : "bg-foreground/30"
      }`} />
      <div className="flex-1 text-xs font-medium text-foreground leading-snug">
        {toast.message}
      </div>
      <button
        onClick={onClose}
        className="p-0.5 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}
