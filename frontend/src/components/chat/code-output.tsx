"use client";

import React, { useState } from "react";
import { Play, Check, XCircle, Terminal, Loader2 } from "lucide-react";

interface CodeOutputProps {
  code: string;
  language: string;
}

export function CodeOutput({ code, language }: CodeOutputProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    stdout: string;
    stderr: string;
  } | null>(null);

  const handleRun = async () => {
    if (language !== "python") return; // Currently only python supported
    
    setIsRunning(true);
    setResult(null);
    
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      
      const data = await response.json();
      if (response.ok && data.status === "success") {
        setResult(data.result);
      } else {
        setResult({
          success: false,
          stdout: "",
          stderr: data.detail || "Execution failed",
        });
      }
    } catch (e: any) {
      setResult({
        success: false,
        stdout: "",
        stderr: e.message || "Network error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  if (language !== "python") {
    return null;
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <button
          className="inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none bg-secondary text-secondary-foreground hover:bg-secondary/80 h-7 px-3 text-xs gap-1 disabled:opacity-50"
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          Run code
        </button>
      </div>
      
      {result && (
        <div className="bg-[#0a0a0a] rounded-md border border-border overflow-hidden text-xs font-mono">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/50 text-muted-foreground">
            <Terminal className="h-3.5 w-3.5" />
            <span>Output</span>
            {result.success ? (
              <span className="ml-auto flex items-center gap-1 text-green-500">
                <Check className="h-3 w-3" /> Success
              </span>
            ) : (
               <span className="ml-auto flex items-center gap-1 text-red-500">
                <XCircle className="h-3 w-3" /> Error
              </span>
            )}
          </div>
          <div className="p-3 overflow-x-auto">
            {result.stdout && (
              <pre className="text-foreground whitespace-pre-wrap mb-2">
                {result.stdout}
              </pre>
            )}
            {result.stderr && (
              <pre className="text-red-400 whitespace-pre-wrap">
                {result.stderr}
              </pre>
            )}
            {!result.stdout && !result.stderr && (
              <span className="text-muted-foreground italic">No output</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
