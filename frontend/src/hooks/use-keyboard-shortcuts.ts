"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

interface ShortcutConfig {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: (e: KeyboardEvent) => void;
}

export function useKeyboardShortcuts({
  onOpenCommandPalette,
  onFocusInput,
  onOpenShortcutOverlay,
}: {
  onOpenCommandPalette?: () => void;
  onFocusInput?: () => void;
  onOpenShortcutOverlay?: () => void;
}) {
  const { toggleSidebar, createChat, chats, setActiveChatId } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Command Palette: Ctrl+K / Cmd+K
      if (cmdOrCtrl && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenCommandPalette?.();
      }

      // 2. New Chat: Ctrl+N / Cmd+Alt+N (to avoid standard Ctrl+N new window clashes on some browsers)
      if ((cmdOrCtrl && e.key.toLowerCase() === "n" && !e.shiftKey) || (cmdOrCtrl && e.altKey && e.key.toLowerCase() === "n")) {
        e.preventDefault();
        createChat();
      }

      // 3. Toggle Sidebar: Ctrl+Shift+S / Cmd+Shift+S
      if (cmdOrCtrl && e.shiftKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        toggleSidebar();
      }

      // 4. Focus Chat Input: Ctrl+/ or Cmd+/
      if (cmdOrCtrl && e.key === "/") {
        e.preventDefault();
        onFocusInput?.();
      }

      // 5. Open Shortcuts Overlay: Ctrl+? (Ctrl+Shift+/) or Alt+Shift+?
      if (cmdOrCtrl && e.key === "?") {
        e.preventDefault();
        onOpenShortcutOverlay?.();
      }

      // 6. Switch Chat by Index: Alt+1 to Alt+9
      if (e.altKey && /^[1-9]$/.test(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (chats[index]) {
          e.preventDefault();
          setActiveChatId(chats[index].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [chats, toggleSidebar, createChat, setActiveChatId, onOpenCommandPalette, onFocusInput, onOpenShortcutOverlay]);
}
