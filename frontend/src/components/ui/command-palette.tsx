"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { Search, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "./toast";

interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Actions" | "Chats";
  perform: () => void;
}

export function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { 
    chats, 
    activeChatId, 
    setActiveChatId, 
    createChat, 
    clearMessages, 
    toggleSidebar, 
    sidebarOpen,
    theme, 
    setTheme,
    provider,
    setProvider,
    model
  } = useAppStore();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const actions: ActionItem[] = [
    {
      id: "new-chat",
      title: "New conversation",
      subtitle: "Start fresh",
      category: "Actions",
      perform: () => { createChat(); toast.success("Created"); onClose(); }
    },
    {
      id: "toggle-sidebar",
      title: sidebarOpen ? "Hide sidebar" : "Show sidebar",
      category: "Actions",
      perform: () => { toggleSidebar(); onClose(); }
    },
    {
      id: "clear-chat",
      title: "Clear messages",
      subtitle: "Clear current conversation",
      category: "Actions",
      perform: () => { clearMessages(); toast.info("Cleared"); onClose(); }
    },
    {
      id: "theme-light",
      title: "Light mode",
      category: "Actions",
      perform: () => { setTheme("light"); onClose(); }
    },
    {
      id: "theme-dark",
      title: "Dark mode",
      category: "Actions",
      perform: () => { setTheme("dark"); onClose(); }
    },
    {
      id: "theme-system",
      title: "System theme",
      category: "Actions",
      perform: () => { setTheme("system"); onClose(); }
    },
    {
      id: "provider-local",
      title: "Switch to Local",
      subtitle: "LM Studio / Ollama",
      category: "Actions",
      perform: () => { setProvider("local"); toast.info("Local"); onClose(); }
    },
    {
      id: "provider-openai",
      title: "Switch to OpenAI",
      category: "Actions",
      perform: () => { setProvider("openai"); toast.info("OpenAI"); onClose(); }
    },
    {
      id: "provider-google",
      title: "Switch to Google",
      subtitle: "Gemini models",
      category: "Actions",
      perform: () => { setProvider("google"); toast.info("Google"); onClose(); }
    }
  ];

  const chatActions: ActionItem[] = chats.map(c => ({
    id: `chat-${c.id}`,
    title: c.title || "Untitled",
    subtitle: `${c.messages.length} messages`,
    category: "Chats",
    perform: () => { setActiveChatId(c.id); onClose(); }
  }));

  const allItems = [...actions, ...chatActions];

  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].perform();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filteredItems, onClose]);

  useEffect(() => {
    const selectedElement = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] p-4 sm:p-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-md bg-card rounded-xl border border-border shadow-lg flex flex-col overflow-hidden"
        >
          {/* Search input */}
          <div className="flex items-center gap-2.5 px-4 border-b border-border h-12 shrink-0">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 outline-none text-sm"
            />
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-muted border border-border text-[9px] font-[family-name:var(--font-geist-mono)] text-muted-foreground shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto max-h-[320px] p-1.5 select-none"
          >
            {filteredItems.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              ["Actions", "Chats"].map((cat) => {
                const catItems = filteredItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} className="mb-1">
                    <div className="px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
                      {cat}
                    </div>
                    {catItems.map((item) => {
                      const globalIndex = filteredItems.indexOf(item);
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <div
                          key={item.id}
                          data-index={globalIndex}
                          onClick={() => {
                            setSelectedIndex(globalIndex);
                            item.perform();
                          }}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-md transition-colors cursor-pointer ${
                            isSelected 
                              ? "bg-accent text-foreground" 
                              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-medium truncate">{item.title}</span>
                            {item.subtitle && (
                              <span className="text-[10px] text-muted-foreground truncate">{item.subtitle}</span>
                            )}
                          </div>
                          {isSelected && (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
            <div className="flex gap-3">
              <span>↑↓ navigate</span>
              <span>↵ select</span>
            </div>
            <span className="font-[family-name:var(--font-geist-mono)]">{model}</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
