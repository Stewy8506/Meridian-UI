"use client";

import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/store/app-store";
import { 
  Search, MessageSquare, Laptop, Moon, Sun, 
  Settings, PlusSquare, Trash2, SidebarClose, SidebarOpen, ChevronRight, Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "./toast";

interface ActionItem {
  id: string;
  title: string;
  subtitle?: string;
  category: "Actions" | "Navigation" | "Chats";
  icon: React.ReactNode;
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

  // Auto-focus input when opened
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
      title: "New Chat",
      subtitle: "Start a fresh conversation",
      category: "Actions",
      icon: <PlusSquare className="w-4 h-4 text-emerald-500" />,
      perform: () => {
        const id = createChat();
        toast.success("New chat created");
        onClose();
      }
    },
    {
      id: "toggle-sidebar",
      title: sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar",
      subtitle: "Show/hide workspace sidebar",
      category: "Actions",
      icon: sidebarOpen ? <SidebarClose className="w-4 h-4 text-indigo-400" /> : <SidebarOpen className="w-4 h-4 text-indigo-400" />,
      perform: () => {
        toggleSidebar();
        onClose();
      }
    },
    {
      id: "clear-chat",
      title: "Clear Current Chat",
      subtitle: "Clear all messages in active session",
      category: "Actions",
      icon: <Trash2 className="w-4 h-4 text-rose-500" />,
      perform: () => {
        clearMessages();
        toast.info("Chat messages cleared");
        onClose();
      }
    },
    {
      id: "theme-light",
      title: "Switch to Light Mode",
      subtitle: "Set theme to light",
      category: "Actions",
      icon: <Sun className="w-4 h-4 text-amber-500" />,
      perform: () => {
        setTheme("light");
        toast.success("Light theme activated");
        onClose();
      }
    },
    {
      id: "theme-dark",
      title: "Switch to Dark Mode",
      subtitle: "Set theme to dark",
      category: "Actions",
      icon: <Moon className="w-4 h-4 text-indigo-400" />,
      perform: () => {
        setTheme("dark");
        toast.success("Dark theme activated");
        onClose();
      }
    },
    {
      id: "theme-system",
      title: "Switch to System Theme",
      subtitle: "Follow system appearance",
      category: "Actions",
      icon: <Laptop className="w-4 h-4 text-muted-foreground" />,
      perform: () => {
        setTheme("system");
        toast.success("System theme activated");
        onClose();
      }
    },
    {
      id: "provider-local",
      title: "Use Local Provider",
      subtitle: "Switch API backend to Local (LM Studio/Ollama)",
      category: "Actions",
      icon: <Terminal className="w-4 h-4 text-amber-500" />,
      perform: () => {
        setProvider("local");
        toast.info("Switched to Local provider");
        onClose();
      }
    },
    {
      id: "provider-openai",
      title: "Use OpenAI Provider",
      subtitle: "Switch API backend to OpenAI models",
      category: "Actions",
      icon: <Terminal className="w-4 h-4 text-emerald-500" />,
      perform: () => {
        setProvider("openai");
        toast.info("Switched to OpenAI provider");
        onClose();
      }
    },
    {
      id: "provider-google",
      title: "Use Google Gemini Provider",
      subtitle: "Switch API backend to Google Gemini models",
      category: "Actions",
      icon: <Terminal className="w-4 h-4 text-blue-500" />,
      perform: () => {
        setProvider("google");
        toast.info("Switched to Google Gemini provider");
        onClose();
      }
    }
  ];

  // Map chats into actions
  const chatActions: ActionItem[] = chats.map(c => ({
    id: `chat-${c.id}`,
    title: c.title || "Untitled Chat",
    subtitle: `${c.messages.length} message${c.messages.length === 1 ? '' : 's'} • Created ${new Date(c.createdAt).toLocaleDateString()}`,
    category: "Chats",
    icon: <MessageSquare className="w-4 h-4 text-violet-400" />,
    perform: () => {
      setActiveChatId(c.id);
      onClose();
    }
  }));

  const allItems = [...actions, ...chatActions];

  // Filter items based on query
  const filteredItems = allItems.filter(item => 
    item.title.toLowerCase().includes(query.toLowerCase()) || 
    (item.subtitle && item.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  // Keyboard navigation
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

  // Adjust scroll when selection changes
  useEffect(() => {
    const selectedElement = containerRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-4 sm:p-0">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />

        {/* Raycast Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative w-full max-w-lg glass-card rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-border/80"
        >
          {/* Input field */}
          <div className="flex items-center gap-3 px-4 border-b border-border/50 h-13 shrink-0">
            <Search className="w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search chats, models, themes, actions..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              className="flex-1 bg-transparent border-none text-foreground placeholder:text-muted-foreground outline-none text-sm h-full"
            />
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground shadow-sm uppercase shrink-0">
              ESC
            </kbd>
          </div>

          {/* Results list */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto max-h-[360px] p-2 space-y-1 scrollbar-thin select-none"
          >
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground italic">
                No results found for "{query}"
              </div>
            ) : (
              // Group items logically by category
              ["Actions", "Chats"].map((cat) => {
                const catItems = filteredItems.filter(i => i.category === cat);
                if (catItems.length === 0) return null;

                return (
                  <div key={cat} className="space-y-1">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
                      {cat}
                    </div>
                    {catItems.map((item) => {
                      // Find index of this item in the global filteredItems array
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
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-primary/15 text-foreground font-medium shadow-sm border-l-3 border-primary" 
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="shrink-0">{item.icon}</span>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs md:text-sm font-medium truncate">{item.title}</span>
                              {item.subtitle && (
                                <span className="text-[10px] md:text-xs text-muted-foreground/80 truncate mt-0.5">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <ChevronRight className="w-4 h-4 text-primary shrink-0 animate-pulse" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer info */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between text-[10px] text-muted-foreground shrink-0 select-none">
            <div className="flex gap-3">
              <span>↑↓ Navigation</span>
              <span>↵ Select</span>
            </div>
            <div>
              Active Model: <span className="font-semibold text-primary">{model}</span> ({provider})
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
