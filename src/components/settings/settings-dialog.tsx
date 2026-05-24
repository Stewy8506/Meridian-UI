"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SettingsDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
  const { provider, setProvider, model, setModel } = useAppStore();

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-card border border-border shadow-lg rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {['local', 'google', 'openai'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p as any)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                        provider === p 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  placeholder="e.g. Qwen 3.5 or gemma-4"
                />
                <p className="text-xs text-muted-foreground">
                  The exact model identifier as expected by the provider (e.g., 'gemini-1.5-pro' for Google, or 'stheno-v3' for Local).
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
                Save & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
