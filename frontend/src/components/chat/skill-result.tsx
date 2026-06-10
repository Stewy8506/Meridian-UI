"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SkillResultProps {
  name: string;
  time?: string;
  status?: string;
  content: string;
}

export function SkillResult({ name, time, status, content }: SkillResultProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isError = status === "error";

  const getDisplayName = () => {
    return name
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={cn(
      "my-2 rounded-lg overflow-hidden border transition-colors",
      isError ? "border-destructive/20" : "border-border"
    )}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted hover:bg-accent transition-colors text-xs font-medium text-foreground select-none cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isError ? "bg-destructive" : "bg-foreground/40"
          )} />
          <span>{getDisplayName()}</span>
          {time && (
            <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">
              {parseFloat(time).toFixed(0)}ms
            </span>
          )}
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t border-border p-3">
          <div className={cn(
            "whitespace-pre-wrap break-words font-[family-name:var(--font-geist-mono)] text-xs max-h-80 overflow-y-auto",
            isError ? "text-destructive" : "text-muted-foreground"
          )}>
            {content}
          </div>
        </div>
      )}
    </div>
  );
}
