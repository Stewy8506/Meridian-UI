"use client";

import { useState, useEffect } from "react";
import { Database, Check, ChevronDown, Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { apiRequest } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";

interface KB {
  id: string;
  name: string;
  document_count: number;
}

export function RagToggle() {
  const { activeChatId, activeKbIds, toggleChatKb } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [kbs, setKbs] = useState<KB[]>([]);
  const [loading, setLoading] = useState(false);

  const currentKbIds = activeChatId ? activeKbIds[activeChatId] || [] : [];

  const fetchKBs = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<KB[]>("/api/knowledge");
      setKbs(data);
    } catch (err) {
      console.error("Failed to load collections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchKBs();
    }
  }, [isOpen]);

  const handleToggle = (kbId: string) => {
    if (!activeChatId) return;
    toggleChatKb(activeChatId, kbId);
  };

  return (
    <div className="relative select-none">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-medium transition-colors ${
          currentKbIds.length > 0
            ? "bg-accent text-foreground border-foreground/15"
            : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/15"
        }`}
      >
        <Database className="w-3 h-3" />
        <span>Docs{currentKbIds.length > 0 ? ` ${currentKbIds.length}` : ""}</span>
        <ChevronDown className="w-2.5 h-2.5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 bottom-full mb-1.5 w-52 rounded-lg border border-border bg-popover p-1.5 shadow-md z-40 text-left"
            >
              <div className="px-2 py-1 text-[9px] font-medium text-muted-foreground uppercase tracking-[0.1em] border-b border-border pb-1.5 mb-1">
                Knowledge sources
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-3 gap-1.5 text-[10px] text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Loading...</span>
                </div>
              ) : kbs.length === 0 ? (
                <div className="text-center py-3 text-[10px] text-muted-foreground">
                  No collections yet.
                </div>
              ) : (
                <div className="space-y-0.5 max-h-40 overflow-y-auto">
                  {kbs.map((kb) => {
                    const isSelected = currentKbIds.includes(kb.id);
                    return (
                      <button
                        key={kb.id}
                        onClick={() => handleToggle(kb.id)}
                        disabled={!activeChatId}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs transition-colors text-left ${
                          isSelected
                            ? "bg-accent text-foreground font-medium"
                            : "hover:bg-accent text-foreground"
                        }`}
                      >
                        <div className="min-w-0">
                          <span className="truncate block text-xs">{kb.name}</span>
                          <span className="text-[9px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">
                            {kb.document_count} files
                          </span>
                        </div>

                        {isSelected && (
                          <Check className="w-3 h-3 text-foreground shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
