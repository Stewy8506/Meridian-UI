"use client";

import { useState, useEffect } from "react";
import { Database, FileText, Check, ChevronDown, RefreshCw } from "lucide-react";
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
      console.error("Failed to load collections for selector:", err);
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
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-sm ${
          currentKbIds.length > 0
            ? "bg-primary/15 text-primary border-primary"
            : "bg-muted/40 border-border/80 text-muted-foreground hover:text-foreground"
        }`}
      >
        <Database className="w-3.5 h-3.5" />
        <span>Docs {currentKbIds.length > 0 && `(${currentKbIds.length})`}</span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {/* Popover list */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop close area */}
            <div 
              className="fixed inset-0 z-30" 
              onClick={() => setIsOpen(false)} 
            />
            
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 bottom-full mb-2 w-64 rounded-2xl border border-border bg-card/90 backdrop-blur-md p-2.5 shadow-xl z-40 text-left"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider block border-b border-border/50 pb-2 mb-2">
                Query context sources
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-4 gap-2 text-[11px] text-muted-foreground">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Loading sources...</span>
                </div>
              ) : kbs.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-muted-foreground italic leading-normal">
                  No knowledge collections. Ingest files in Files tab.
                </div>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {kbs.map((kb) => {
                    const isSelected = currentKbIds.includes(kb.id);
                    return (
                      <button
                        key={kb.id}
                        onClick={() => handleToggle(kb.id)}
                        disabled={!activeChatId}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                          isSelected
                            ? "bg-primary/10 text-primary font-bold"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <div className="min-w-0">
                            <span className="truncate block leading-tight">{kb.name}</span>
                            <span className="text-[9px] text-muted-foreground font-mono leading-none block mt-0.5">
                              {kb.document_count} files
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary shrink-0" />
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
