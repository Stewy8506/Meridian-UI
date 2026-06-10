"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";

export function CustomCssInjector() {
  const { customCss } = useAppStore();

  useEffect(() => {
    // Sync settings from server on initial mount
    const { syncWithServer } = useAppStore.getState();
    syncWithServer();
  }, []);

  if (!customCss) return null;

  return (
    <style id="user-custom-css" dangerouslySetInnerHTML={{ __html: customCss }} />
  );
}
