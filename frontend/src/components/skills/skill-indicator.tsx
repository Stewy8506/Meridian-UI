"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api-client";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SimpleSkill {
  name: string;
  display_name: string;
  category: string;
  is_dangerous: boolean;
}

export function SkillIndicator() {
  const [enabledSkills, setEnabledSkills] = useState<SimpleSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchEnabledSkills = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<SimpleSkill[]>("/api/skills?enabled_only=true");
      setEnabledSkills(data);
    } catch (error) {
      console.error("Failed to load active skills:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchEnabledSkills();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative select-none" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "px-2 py-1 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-accent flex items-center gap-1 cursor-pointer transition-colors",
          isOpen && "bg-accent text-foreground"
        )}
      >
        <span>Skills</span>
        <span className="text-[9px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">
          {loading ? "…" : enabledSkills.length}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1 w-52 bg-popover border border-border rounded-lg shadow-md z-40 p-1.5">
          <div className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.1em] px-2 py-1 border-b border-border mb-1">
            Active skills
          </div>

          {loading && enabledSkills.length === 0 ? (
            <div className="py-3 flex justify-center">
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            </div>
          ) : enabledSkills.length === 0 ? (
            <div className="py-2 px-2 text-[10px] text-muted-foreground">
              No skills enabled.
            </div>
          ) : (
            <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
              {enabledSkills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-accent transition-colors"
                >
                  <span className="font-medium truncate" title={skill.display_name}>
                    {skill.display_name}
                  </span>
                  <span className="text-[9px] text-muted-foreground font-[family-name:var(--font-geist-mono)] shrink-0 ml-2">
                    {skill.category}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
