"use client";

import { useState } from "react";
import { 
  Globe, Calculator, Clock, Binary, BookOpen, 
  Terminal, Code, Cpu, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 
} from "lucide-react";
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

  const getSkillIcon = () => {
    switch (name.toLowerCase()) {
      case "web_search":
        return <Globe className="w-4 h-4 text-sky-400" />;
      case "wikipedia":
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case "arxiv_search":
        return <BookOpen className="w-4 h-4 text-orange-400" />;
      case "calculator":
        return <Calculator className="w-4 h-4 text-teal-400" />;
      case "datetime_tool":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "uuid_generate":
        return <Binary className="w-4 h-4 text-indigo-400" />;
      case "code_execute":
        return <Terminal className="w-4 h-4 text-rose-400" />;
      case "json_transform":
        return <Code className="w-4 h-4 text-purple-400" />;
      default:
        return <Cpu className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getDisplayName = () => {
    return name
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className={cn(
      "my-2 rounded-xl overflow-hidden border transition-all duration-200",
      isError 
        ? "bg-rose-500/5 border-rose-500/20 dark:bg-rose-950/10 dark:border-rose-900/30" 
        : "bg-zinc-900/40 border-white/5 dark:bg-zinc-950/20"
    )}>
      {/* Header Accordion Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900/60 dark:bg-zinc-950/40 hover:bg-zinc-800/40 transition-colors text-xs font-semibold text-zinc-300 select-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          {getSkillIcon()}
          <span>Used Skill: {getDisplayName()}</span>
          {time && (
            <span className="text-[10px] text-zinc-500 font-mono">
              ({parseFloat(time).toFixed(0)}ms)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isError ? (
            <span className="flex items-center gap-1 text-rose-400 text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded-full">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400 text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Success
            </span>
          )}
          {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500" /> : <ChevronDown className="w-4 h-4 text-zinc-500" />}
        </div>
      </button>

      {/* Collapsible Content */}
      {isOpen && (
        <div className="border-t border-white/5 p-4 text-sm bg-zinc-950/50">
          {isError ? (
            <div className="text-rose-400 font-mono text-xs whitespace-pre-wrap">
              {content}
            </div>
          ) : (
            <div className="text-zinc-300 whitespace-pre-wrap break-words font-mono text-xs max-h-80 overflow-y-auto scrollbar-thin">
              {content}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
