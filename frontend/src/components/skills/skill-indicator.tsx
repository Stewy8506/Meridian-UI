"use client";

import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api-client";
import { Wrench, Check, Shield, Circle, Loader2 } from "lucide-react";
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

  // Close dropdown on click outside
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
    <div className="relative font-sans select-none" ref={dropdownRef}>
      {/* Indicator Chip */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 px-3 rounded-xl border border-white/5 bg-zinc-900/60 dark:bg-zinc-950/40 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/40 hover:border-white/10 flex items-center gap-1.5 cursor-pointer transition-all duration-200",
          isOpen && "bg-zinc-800/60 border-white/10 text-white"
        )}
      >
        <Wrench className="w-3.5 h-3.5 text-purple-400" />
        <span>Skills</span>
        <span className="bg-purple-500/20 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
          {loading ? "..." : enabledSkills.length || 0}
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-white/5 rounded-2xl shadow-xl z-40 p-3 flex flex-col gap-1.5 animate-fadeIn">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest px-2.5 pb-1 border-b border-white/5 mb-1.5">
            Active Capabilities
          </div>

          {loading && enabledSkills.length === 0 ? (
            <div className="py-4 flex justify-center">
              <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
            </div>
          ) : enabledSkills.length === 0 ? (
            <div className="py-3 px-2.5 text-xs text-zinc-500">
              No skills currently enabled.
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto scrollbar-thin flex flex-col gap-0.5 pr-0.5">
              {enabledSkills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex items-center justify-between px-2.5 py-2 hover:bg-white/5 rounded-xl text-xs text-zinc-200 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Circle className="w-1.5 h-1.5 fill-purple-400 text-purple-400 shrink-0" />
                    <span className="font-medium truncate max-w-[130px]" title={skill.display_name}>
                      {skill.display_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[9px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md uppercase font-mono">
                      {skill.category}
                    </span>
                    {skill.is_dangerous && (
                      <span title="Has execution risks">
                        <Shield className="w-3 h-3 text-rose-400" />
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
