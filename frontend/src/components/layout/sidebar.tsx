"use client";

import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";
import { MessageSquare, Settings, Plus, LayoutPanelLeft } from "lucide-react";
import { motion } from "framer-motion";

import { SettingsDialog } from "@/components/settings/settings-dialog";
import { useState, useEffect } from "react";

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-[260px] h-full bg-card border-r border-border shrink-0" />;
  }

  return (
    <>
      <motion.div
        initial={{ width: 260 }}
        animate={{ width: sidebarOpen ? 260 : 0, opacity: sidebarOpen ? 1 : 0 }}
        className={cn(
          "h-full bg-card border-r border-border flex flex-col transition-all overflow-hidden whitespace-nowrap",
          !sidebarOpen && "border-none"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-border/50">
          <h2 className="font-semibold text-sm tracking-wide">Workspace</h2>
          <button onClick={toggleSidebar} className="p-1 hover:bg-muted rounded-md transition-colors">
            <LayoutPanelLeft className="w-4 h-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <div className="p-3">
          <button className="w-full flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-sm font-medium hover:bg-primary/20 transition-colors">
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {/* Placeholder for chat history */}
          <div className="text-xs font-semibold text-muted-foreground px-3 py-2 uppercase tracking-wider">
            Recent
          </div>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors text-left truncate">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">Explain Quantum Computing</span>
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors text-left truncate">
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">React vs Next.js</span>
          </button>
        </div>

        <div className="p-3 border-t border-border/50">
          <button onClick={() => setSettingsOpen(true)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground rounded-md transition-colors text-left">
            <Settings className="w-4 h-4 shrink-0" />
            Settings
          </button>
        </div>
      </motion.div>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}
