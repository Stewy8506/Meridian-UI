"use client";

import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, AlignLeft, FileCode, Loader2 } from "lucide-react";
import { toast } from "../ui/toast";
import { CodeOutput } from "./code-output";
import { useAppStore } from "@/store/app-store";
import { apiRequest } from "@/lib/api-client";

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

const inferFilename = (code: string, lang: string): string => {
  const lines = code.split("\n");
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    const match = firstLine.match(/^(?:#|\/\/|\/\*|<!--)\s*([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  const extensions: Record<string, string> = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    html: "html",
    css: "css",
    markdown: "md",
    json: "json",
    mermaid: "mermaid"
  };
  const ext = extensions[lang] || "txt";
  return `code_${Math.random().toString(36).substring(7)}.${ext}`;
};

export function CodeBlock({ children }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [pushingToCanvas, setPushingToCanvas] = useState(false);

  const rawCode = extractText(children).trim();
  const lineCount = rawCode.split("\n").length;
  const isLongCode = lineCount > 25;

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
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handlePushToCanvas = async () => {
    setPushingToCanvas(true);
    try {
      const inferredFilename = inferFilename(rawCode, language);
      const res = await apiRequest<any>("/api/canvas", {
        method: "POST",
        body: JSON.stringify({
          filename: inferredFilename,
          content: rawCode,
          language: language
        })
      });
      if (res.status === "success") {
        useAppStore.getState().setActiveCanvasFileId(res.document.id);
        useAppStore.getState().setCanvasOpen(true);
        toast.success(`Sent to Canvas as ${inferredFilename}`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send to Canvas");
    } finally {
      setPushingToCanvas(false);
    }
  };

  return (
    <div className="my-4 border border-border rounded-lg overflow-hidden flex flex-col text-left font-[family-name:var(--font-geist-mono)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted border-b border-border select-none">
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {language}
        </span>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className={`p-1 rounded transition-colors ${
              showLineNumbers 
                ? "bg-accent text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            title="Toggle line numbers"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handlePushToCanvas}
            disabled={pushingToCanvas}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors disabled:opacity-50"
            title="Open in Canvas"
          >
            {pushingToCanvas ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileCode className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handleCopy}
            className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="relative flex min-w-0">
        {showLineNumbers && (
          <div className="px-3 py-3 border-r border-border text-right text-muted-foreground/30 text-[11px] select-none font-[family-name:var(--font-geist-mono)]">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="h-[1.7em] leading-[1.7em]">
                {i + 1}
              </div>
            ))}
          </div>
        )}

        <div 
          className={`flex-1 overflow-x-auto min-w-0 ${
            isLongCode && isCollapsed ? "max-h-[300px] overflow-hidden" : ""
          }`}
        >
          <pre className="p-3 text-xs leading-[1.7em] overflow-x-auto whitespace-pre font-[family-name:var(--font-geist-mono)] scrollbar-hide">
            {children}
          </pre>
        </div>

        {isLongCode && isCollapsed && (
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-card to-transparent pointer-events-none" />
        )}
      </div>

      {language === "python" && (
        <div className="px-3 pb-3">
          <CodeOutput code={rawCode} language={language} />
        </div>
      )}

      {/* Collapse toggle */}
      {isLongCode && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-muted hover:bg-accent text-[10px] font-medium text-muted-foreground hover:text-foreground border-t border-border transition-colors select-none"
        >
          {isCollapsed ? (
            <>
              <span>Show all ({lineCount} lines)</span>
              <ChevronDown className="w-3 h-3" />
            </>
          ) : (
            <>
              <span>Collapse</span>
              <ChevronUp className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
