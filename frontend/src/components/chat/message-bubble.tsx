"use client";

import { useState } from "react";
import { Message } from "@/store/app-store";
import { 
  Bot, User, Brain, Copy, Check, Edit2, RotateCcw, 
  ThumbsUp, ThumbsDown, ChevronDown, ChevronRight, Loader2, Sparkles 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { CodeBlock } from "./code-block";
import { toast } from "../ui/toast";
import { cn } from "@/lib/utils";
import { SkillResult } from "./skill-result";

interface ContentSegment {
  type: 'thought' | 'skill' | 'text';
  content: string;
  isStreaming?: boolean;
  skillName?: string;
  skillTime?: string;
  skillStatus?: string;
}

function parseMessageContent(content: string): ContentSegment[] {
  if (!content) return [];
  
  const segments: ContentSegment[] = [];
  const tokenRegex = /(<thought>[\s\S]*?(?:<\/thought>|$)|<skill_result[^>]*>[\s\S]*?(?:<\/skill_result>|$))/g;
  
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
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="my-3 border border-purple-500/10 bg-purple-500/5 dark:bg-purple-950/10 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/15 text-xs font-semibold text-purple-600 dark:text-purple-400 transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Brain className={cn("w-4 h-4 shrink-0", isStreaming && "animate-pulse")} />
          <span>{isStreaming ? "Thinking Process..." : "Thought Trace"}</span>
          {isStreaming && (
            <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] bg-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider scale-90">
            {isStreaming ? "Analysing" : "Done"}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-purple-500/10"
          >
            <div className="px-4 py-3 text-xs md:text-sm text-purple-950/80 dark:text-purple-300/80 font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto bg-purple-500/5 scrollbar-thin">
              {content}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

  const handleCopy = async () => {
    // Strip thought blocks for plain text copy
    const cleanText = message.content.replace(/<thought>[\s\S]*?<\/thought>/g, "").trim();
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopied(true);
      toast.success("Message copied to clipboard");
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

  // Provider branding styles
  const getProviderIcon = () => {
    if (isUser) return <User className="w-4 h-4" />;
    switch (provider.toLowerCase()) {
      case "google":
        return <Sparkles className="w-4 h-4 text-blue-500" />;
      case "openai":
        return <Bot className="w-4 h-4 text-emerald-500" />;
      default:
        return <Bot className="w-4 h-4 text-indigo-400" />;
    }
  };

  const segments = parseMessageContent(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "group flex gap-4 max-w-3xl mx-auto min-w-0 w-full relative p-4 rounded-2xl hover:bg-muted/10 transition-colors duration-200",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar */}
      <div 
        className={cn(
          "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm border select-none",
          isUser 
            ? "bg-primary text-primary-foreground border-primary/20" 
            : "bg-card text-card-foreground border-border/80"
        )}
      >
        {getProviderIcon()}
      </div>

      {/* Bubble Content */}
      <div className={cn("flex-1 min-w-0", isUser ? "text-right" : "text-left")}>
        {/* Timestamp & Model info */}
        <div className="flex items-center gap-2 mb-1.5 text-[10px] text-muted-foreground/80 select-none">
          {!isUser && (
            <span className="font-semibold text-foreground/70 bg-muted/40 border border-border/20 px-1.5 py-0.5 rounded capitalize">
              {provider} • {model}
            </span>
          )}
          <span>{message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
        </div>

        {/* Text Body */}
        {isEditing ? (
          <div className="flex flex-col gap-2 mt-1">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full text-sm p-3 rounded-xl bg-muted/50 border border-border focus:ring-1 focus:ring-ring outline-none resize-none min-h-[80px]"
              rows={3}
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={handleCancelEdit}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors font-semibold"
              >
                Save & Resend
              </button>
            </div>
          </div>
        ) : (
          <div className={cn("prose dark:prose-invert max-w-none text-sm md:text-base leading-relaxed break-words")}>
            {isUser ? (
              <div className="inline-block bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-tr-sm whitespace-pre-wrap text-left break-words max-w-full shadow-sm hover:brightness-95 transition-all">
                {message.content}
              </div>
            ) : (
              <div className="space-y-3">
                {segments.map((seg, idx) => {
                  if (seg.type === 'thought') {
                    return (
                      <ThoughtBlock 
                        key={idx} 
                        content={seg.content} 
                        isStreaming={seg.isStreaming} 
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
                  } else {
                    return (
                      <div 
                        key={idx} 
                        className={cn(
                          "overflow-x-auto break-words max-w-full scrollbar-thin", 
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
            )}
          </div>
        )}

        {/* Hover Action Toolbar */}
        {!isEditing && !isStreaming && (
          <div 
            className={cn(
              "flex items-center gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 select-none",
              isUser ? "justify-end" : "justify-start"
            )}
          >
            {/* Copy Action */}
            <button
              onClick={handleCopy}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
              title="Copy message"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            {/* Edit User Message */}
            {isUser && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                title="Edit message"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Regenerate Assistant Message */}
            {!isUser && (
              <>
                <button
                  onClick={() => onRegenerate(index)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Feedback Buttons */}
                <div className="h-4 w-[1px] bg-border/60 mx-1" />
                
                <button
                  onClick={() => onReaction(index, message.reactions === "like" ? null : "like")}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    message.reactions === "like" 
                      ? "text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Thumbs up"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onReaction(index, message.reactions === "dislike" ? null : "dislike")}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    message.reactions === "dislike" 
                      ? "text-rose-500 bg-rose-500/10 hover:bg-rose-500/20" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  title="Thumbs down"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
