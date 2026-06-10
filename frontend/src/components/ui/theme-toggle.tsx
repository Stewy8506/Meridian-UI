"use client";

import { useAppStore } from "@/store/app-store";
import { Sun, Moon, Laptop } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ThemeToggle() {
  const { theme, setTheme } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme, mounted]);

  // Listen to system theme changes if system is selected
  useEffect(() => {
    if (!mounted || theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, mounted]);

  if (!mounted) {
    return <div className="w-9 h-9 rounded-lg bg-muted/40 animate-pulse" />;
  }

  const iconMap = {
    light: <Sun className="w-[18px] h-[18px] text-amber-500" />,
    dark: <Moon className="w-[18px] h-[18px] text-indigo-400" />,
    system: <Laptop className="w-[18px] h-[18px] text-muted-foreground" />,
  };

  const themeLabelMap = {
    light: "Light",
    dark: "Dark",
    system: "System",
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/40 hover:bg-muted/60 hover:text-foreground transition-all duration-200 shadow-sm"
        title="Change theme"
      >
        <motion.div
          key={theme}
          initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ duration: 0.15 }}
        >
          {iconMap[theme]}
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop click area */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 mt-2 w-32 rounded-xl border border-border bg-card/90 backdrop-blur-md p-1 shadow-lg z-20"
            >
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-left ${
                    theme === t
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="shrink-0">{iconMap[t]}</span>
                  <span>{themeLabelMap[t]}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
