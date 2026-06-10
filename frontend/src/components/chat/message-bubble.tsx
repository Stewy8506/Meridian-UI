"use client";

import { useState } from "react";
import { Message } from "@/store/app-store";
import { 
  Copy, Check, Edit2, RotateCcw, 
  ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Loader2, Brain, FileCode 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./code-block";
import { toast } from "../ui/toast";
import { cn } from "@/lib/utils";
import { SkillResult } from "./skill-result";
import { TTSPlayer } from "./tts-player";

interface ContentSegment {
  type: 'thought' | 'skill' | 'text' | 'canvas_write';
  content: string;
  isStreaming?: boolean;
  skillName?: string;
  skillTime?: string;
  skillStatus?: string;
  filename?: string;
  language?: string;
}

function parseMessageContent(content: string): ContentSegment[] {
  if (!content) return [];
  
  const segments: ContentSegment[] = [];
  const tokenRegex = /(<thought>[\s\S]*?(?:<\/thought>|$)|<skill_result[^>]*>[\s\S]*?(?:<\/skill_result>|$)|<canvas_write[^>]*>[\s\S]*?(?:<\/canvas_write>|$))/g;
  
  const parts = content.split(tokenRegex);
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith('<thought>')) {
      let thoughtText = part.slice(9);
      let isStreaming = true;
      
      if (thoughtText.endsWith('</thought>')) {
        thoughtText = thoughtText.slice(0, -10);
        isStreaming = false;
      }
      
      segments.push({
        type: 'thought',
        content: thoughtText,
        isStreaming
      });
    } else if (part.startsWith('<skill_result')) {
      const match = part.match(/<skill_result\s+name="([^"]*)"(?:\s+time="([^"]*)")?(?:\s+status="([^"]*)")?>([\s\S]*?)(?:<\/skill_result>|$)/);
      if (match) {
        const [, name, time, status, body] = match;
        segments.push({
          type: 'skill',
          skillName: name,
          skillTime: time || "",
          skillStatus: status || "success",
          content: body
        });
      } else {
        segments.push({
          type: 'text',
          content: part
        });
      }
    } else if (part.startsWith('<canvas_write')) {
      const match = part.match(/<canvas_write\s+filename="([^"]*)"(?:\s+language="([^"]*)")?>([\s\S]*?)(?:<\/canvas_write>|$)/);
      if (match) {
        const [, filename, language, body] = match;
        const isStreaming = !part.endsWith('</canvas_write>');
        segments.push({
          type: 'canvas_write',
          filename,
          language: language || "markdown",
          content: body,
          isStreaming
        });
      } else {
        segments.push({
          type: 'text',
          content: part
        });
      }
    } else {
      segments.push({
        type: 'text',
        content: part
      });
    }
  }
  
  return segments;
}

function ThoughtBlock({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="my-3 border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-xs font-medium text-muted-foreground transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Brain className={cn("w-3.5 h-3.5 shrink-0", isStreaming && "animate-pulse")} strokeWidth={1.5} />
          <span>{isStreaming ? "Thinking..." : "Thought process"}</span>
          {isStreaming && (
            <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
          )}
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} /> : <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />}
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border overflow-hidden"
          >
            <div className="px-3 py-2.5 text-xs text-muted-foreground font-[family-name:var(--font-geist-mono)] whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CanvasWriteBadge({ filename, language, isStreaming }: { filename: string; language: string; isStreaming: boolean }) {
  return (
    <div className="my-3 flex items-center justify-between border border-border rounded-lg bg-muted/30 px-3 py-2 text-xs select-none">
      <div className="flex items-center gap-2">
        <FileCode className={cn("w-4 h-4 text-primary shrink-0", isStreaming && "animate-pulse")} strokeWidth={1.5} />
        <span className="font-medium">
          {isStreaming ? `Streaming ${filename}...` : `Saved ${filename} to interactive canvas`}
        </span>
        {isStreaming && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" strokeWidth={1.5} />
        )}
      </div>
      {!isStreaming && (
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold border border-border px-1.5 py-0.5 rounded bg-background">
          {language}
        </span>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  provider: string;
  model: string;
  isStreaming: boolean;
  onEdit: (index: number, newContent: string) => void;
  onRegenerate: (index: number) => void;
  onReaction: (index: number, reaction: 'like' | 'dislike' | null) => void;
}

export function MessageBubble({
  message,
  index,
  provider,
  model,
  isStreaming,
  onEdit,
  onRegenerate,
  onReaction
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const isEmptyAndStreaming = !isUser && message.content === "" && isStreaming;

  const handleCopy = async () => {
    const cleanText = message.content.replace(/<thought>[\s\S]*?<\/thought>/g, "").trim();
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      toast.success("Copied");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy");
    }
  };

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== message.content) {
      onEdit(index, editText.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditText(message.content);
    setIsEditing(false);
  };

  const segments = parseMessageContent(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group max-w-2xl mx-auto w-full py-4",
        isUser ? "flex justify-end" : ""
      )}
    >
      {isEditing ? (
        <div className="w-full space-y-2">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full text-sm p-3 rounded-lg bg-muted border border-border focus:border-foreground/20 outline-none resize-none min-h-[80px]"
            rows={3}
          />
          <div className="flex justify-end gap-2 text-xs">
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1.5 rounded-md border border-border hover:bg-accent text-muted-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="px-3 py-1.5 rounded-md bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
            >
              Save & resend
            </button>
          </div>
        </div>
      ) : isUser ? (
        /* User message */
        <div className="inline-block bg-muted px-4 py-2.5 rounded-2xl rounded-br-md text-sm whitespace-pre-wrap text-left break-words max-w-[85%]">
          {message.content}
        </div>
      ) : (
        /* Assistant message */
        <div className="w-full">
          {isEmptyAndStreaming ? (
            <div className="flex items-center gap-2 text-sm text-neutral-400 select-none my-1">
              <Loader2 className="w-4 h-4 animate-spin text-neutral-500" strokeWidth={1.5} />
              <span>Connecting to model...</span>
            </div>
          ) : (
            <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed break-words">
              <div className="space-y-2">
                {segments.map((seg, idx) => {
                  if (seg.type === 'thought') {
                    return (
                      <ThoughtBlock 
                        key={idx} 
                        content={seg.content} 
                        isStreaming={seg.isStreaming && isStreaming} 
                      />
                    );
                  } else if (seg.type === 'skill') {
                    return (
                      <SkillResult
                        key={idx}
                        name={seg.skillName || ""}
                        time={seg.skillTime}
                        status={seg.skillStatus}
                        content={seg.content}
                      />
                    );
                  } else if (seg.type === 'canvas_write') {
                    return (
                      <CanvasWriteBadge
                        key={idx}
                        filename={seg.filename || ""}
                        language={seg.language || "text"}
                        isStreaming={!!seg.isStreaming && isStreaming}
                      />
                    );
                  } else {
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "overflow-x-auto break-words max-w-full", 
                          isStreaming && idx === segments.length - 1 && "streaming-cursor"
                        )}
                      >
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]} 
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            pre: ({ children }) => <CodeBlock>{children}</CodeBlock>
                          }}
                        >
                          {seg.content}
                        </ReactMarkdown>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {/* Action bar */}
          {!isStreaming && (
            <div className="flex items-center gap-0.5 mt-2 opacity-0 group-hover:opacity-100 transition-opacity select-none">
              <button
                onClick={handleCopy}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Copy"
              >
                {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
              </button>

              <button
                onClick={() => onRegenerate(index)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                title="Regenerate"
              >
                <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>

              <TTSPlayer text={message.content.replace(/<thought>[\s\S]*?<\/thought>/g, "").replace(/<skill_result[\s\S]*?<\/skill_result>/g, "").trim()} />

              <div className="h-3.5 w-px bg-border mx-0.5" />
              
              <button
                onClick={() => onReaction(index, message.reactions === "like" ? null : "like")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  message.reactions === "like" 
                    ? "text-foreground bg-accent" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title="Good response"
              >
                <ThumbsUp className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
              <button
                onClick={() => onReaction(index, message.reactions === "dislike" ? null : "dislike")}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  message.reactions === "dislike" 
                    ? "text-foreground bg-accent" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title="Bad response"
              >
                <ThumbsDown className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* User message actions */}
      {isUser && !isEditing && !isStreaming && (
        <div className="flex items-center gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity select-none justify-end">
          <button
            onClick={handleCopy}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Copy"
          >
            {copied ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
            title="Edit"
          >
            <Edit2 className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      )}
    </motion.div>
  );
}
