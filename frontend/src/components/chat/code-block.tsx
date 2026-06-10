"use client";

import { useState, useRef } from "react";
import { Copy, Check, Play, ChevronDown, ChevronUp, AlignLeft } from "lucide-react";
import { toast } from "../ui/toast";

interface CodeBlockProps {
  children: React.ReactNode;
}

function extractText(node: any): string {
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return node.toString();
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node.props && node.props.children) return extractText(node.props.children);
  return "";
}

export function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [runLoading, setRunLoading] = useState(false);

  // Extract raw code string
  const rawCode = extractText(children).trim();
  const lineCount = rawCode.split("\n").length;
  const isLongCode = lineCount > 25;

  // Extract language from className (if present on code child)
  let language = "code";
  if (children && typeof children === "object" && "props" in children) {
    const codeProps = (children as any).props || {};
    const className = codeProps.className || "";
    const match = className.match(/language-(\w+)/);
    if (match) {
      language = match[1];
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy code");
    }
  };

  const handleRunCode = () => {
    setRunLoading(true);
    toast.info(`Running ${language} code sandbox...`);
    setTimeout(() => {
      setRunLoading(false);
      toast.success("Execution completed (mock sandbox)");
    }, 1500);
  };

  return (
    <div className="my-4 border border-border/80 bg-[#0e1117] rounded-xl overflow-hidden shadow-md flex flex-col text-left font-mono">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-border/50 select-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] md:text-xs font-semibold text-muted-foreground uppercase tracking-wider ml-2 bg-muted/20 px-2 py-0.5 rounded-md border border-border/10">
            {language}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Line Numbers Toggle */}
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1.5 rounded-md transition-colors ${
              showLineNumbers 
                ? "bg-primary/10 text-primary hover:bg-primary/20" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`}
            title="Toggle line numbers"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            title="Copy code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Run Code Placeholder */}
          {["python", "javascript", "js", "ts", "typescript", "bash", "sh"].includes(language.toLowerCase()) && (
            <button
              onClick={handleRunCode}
              disabled={runLoading}
              className="p-1.5 text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 rounded-md transition-all disabled:opacity-50 shrink-0"
              title="Run code block"
            >
              <Play className={`w-3.5 h-3.5 ${runLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Code body wrapper with optional collapsibility */}
      <div className="relative flex min-w-0">
        {/* Line Numbers column */}
        {showLineNumbers && (
          <div className="px-3 py-4 border-r border-border/10 text-right text-muted-foreground/40 text-xs md:text-sm select-none bg-[#090d16] font-sans">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="h-6 leading-6">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        {/* Code Content */}
        <div 
          className={`flex-1 overflow-x-auto min-w-0 bg-[#0e1117] ${
            isLongCode && isCollapsed ? "max-h-[300px] overflow-hidden" : ""
          }`}
        >
          <pre className="p-4 text-xs md:text-sm leading-6 overflow-x-auto whitespace-pre font-mono scrollbar-thin">
            {children}
          </pre>
        </div>

        {/* Shadow Overlay for Collapsed State */}
        {isLongCode && isCollapsed && (
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0e1117] to-transparent pointer-events-none" />
        )}
      </div>

      {/* Collapse/Expand Toggle */}
      {isLongCode && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#161b22] hover:bg-[#1f242c] text-xs font-semibold text-muted-foreground hover:text-foreground border-t border-border/30 transition-all select-none"
        >
          {isCollapsed ? (
            <>
              <span>Show more ({lineCount - 12} lines)</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              <span>Show less</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
