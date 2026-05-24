"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, Message } from "@/store/app-store";
import { LayoutPanelLeft, Send, Loader2, Bot, User, Brain, ChevronDown, ChevronRight } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import "highlight.js/styles/github-dark.css"; // Basic syntax highlighting style

interface ContentSegment {
  type: 'thought' | 'text';
  content: string;
  isStreaming?: boolean;
}

function parseMessageContent(content: string): ContentSegment[] {
  if (!content) return [];
  
  const segments: ContentSegment[] = [];
  const regex = /(<thought>[\s\S]*?(?:<\/thought>|$))/g;
  const parts = content.split(regex);
  
  for (const part of parts) {
    if (!part) continue;
    
    if (part.startsWith('<thought>')) {
      let thoughtText = part.slice(9); // Strip '<thought>'
      let isStreaming = true;
      
      if (thoughtText.endsWith('</thought>')) {
        thoughtText = thoughtText.slice(0, -10); // Strip '</thought>'
        isStreaming = false;
      }
      
      segments.push({
        type: 'thought',
        content: thoughtText,
        isStreaming
      });
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
    <div className="my-3 border border-border/60 bg-muted/40 rounded-xl overflow-hidden shadow-sm transition-all duration-300">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/70 hover:bg-muted/95 text-xs md:text-sm font-medium text-muted-foreground transition-colors select-none"
      >
        <div className="flex items-center gap-2">
          <Brain className={cn("w-4 h-4 text-purple-400 shrink-0", isStreaming && "animate-pulse")} />
          <span>{isStreaming ? "Thinking..." : "Thought Process"}</span>
          {isStreaming && (
            <Loader2 className="w-3 h-3 animate-spin text-purple-400/80" />
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] bg-muted-foreground/10 px-2 py-0.5 rounded-full uppercase tracking-wider scale-90">
            {isStreaming ? "Analyzing" : "Reasoned"}
          </span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
      </button>
      
      {isOpen && (
        <div className="px-4 py-3 border-t border-border/40 text-xs md:text-sm text-muted-foreground/80 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto bg-muted/20 scrollbar-thin">
          {content}
        </div>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  const segments = parseMessageContent(content);
  
  if (segments.length === 0) return null;
  
  return (
    <div className="space-y-4">
      {segments.map((seg, idx) => {
        if (seg.type === 'thought') {
          return (
            <ThoughtBlock 
              key={idx} 
              content={seg.content} 
              isStreaming={seg.isStreaming} 
            />
          );
        } else {
          return (
            <div key={idx} className="overflow-x-auto break-words max-w-full scrollbar-thin">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeHighlight]}
              >
                {seg.content}
              </ReactMarkdown>
            </div>
          );
        }
      })}
    </div>
  );
}

export function ChatArea() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    provider, 
    model, 
    messages, 
    setMessages, 
    googleApiKey, 
    openaiApiKey,
    hydrateChats,
    activeChatId,
    updateChatTitle,
    searchProvider,
    tavilyApiKey,
    exaApiKey
  } = useAppStore();
  
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    hydrateChats();
  }, [hydrateChats]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (mounted) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  // Auto-title generation background request
  const generateChatTitle = async (chatId: string, userMsg: string, assistantMsg: string) => {
    try {
      const activeKey = provider === 'google' ? googleApiKey : provider === 'openai' ? openaiApiKey : '';
      const response = await fetch("http://localhost:8000/api/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey || 'not-needed'}`
        },
        body: JSON.stringify({
          provider,
          model,
          messages: [
            { role: "user", content: `Review this short conversation turn:
User: "${userMsg}"
Assistant: "${assistantMsg}"

Create a highly concise, 3-5 word title summarizing the topic of this conversation. Do not use quotes, punctuation, preamble, or markdown. Output only the title.` }
          ],
        }),
      });

      if (!response.ok) return;

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullTitle = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") break;
              fullTitle += dataStr;
            }
          }
        }
      }

      const cleanTitle = fullTitle.trim().replace(/^["']|["']$/g, '');
      if (cleanTitle && cleanTitle.length < 50) {
        updateChatTitle(chatId, cleanTitle);
      }
    } catch (error) {
      console.error("Auto title generation failed:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userPrompt = input.trim();
    const userMessage = { role: "user" as const, content: userPrompt };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);
    setIsRetrying(false);
    setRetryCount(0);

    const currentMessages = [...messages, userMessage];
    
    // Add an empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let success = false;
    let attempt = 0;
    let assistantText = "";
    const currentActiveChatId = useAppStore.getState().activeChatId;

    while (!success) {
      try {
        attempt++;
        if (attempt > 1) {
          setIsRetrying(true);
          setRetryCount(attempt - 1);
          // Wait 2 seconds before retrying
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const activeKey = provider === 'google' ? googleApiKey : provider === 'openai' ? openaiApiKey : '';
        const response = await fetch("http://localhost:8000/api/chat/completions", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeKey || 'not-needed'}`
          },
          body: JSON.stringify({
            provider,
            model,
            messages: currentMessages,
            search_provider: searchProvider,
            tavily_api_key: tavilyApiKey || null,
            exa_api_key: exaApiKey || null,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch response: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        
        if (reader) {
          // Connected successfully! Reset retry state
          setIsRetrying(false);
          setRetryCount(0);

          // Clear any previous "Retrying..." message in the bubble
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastIndex = newMessages.length - 1;
            newMessages[lastIndex] = { role: "assistant", content: "" };
            return newMessages;
          });
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const dataStr = line.slice(6);
                if (dataStr === "[DONE]") break;
                
                assistantText += dataStr;
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + dataStr
                  };
                  return newMessages;
                });
              }
            }
          }
          
          success = true;
        }
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        
        // Show retry indicator inside the message bubble
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            role: "assistant",
            content: `⚠️ **Connection lost.** Retrying... (Attempt ${attempt})`
          };
          return newMessages;
        });
      }
    }

    setIsStreaming(false);

    // Trigger auto-title generation if this is the first assistant response
    if (currentActiveChatId) {
      const activeChat = useAppStore.getState().chats.find(c => c.id === currentActiveChatId);
      if (activeChat && (activeChat.title === "New Chat" || activeChat.title === "Imported Chat") && activeChat.messages.length === 2) {
        generateChatTitle(currentActiveChatId, userPrompt, assistantText);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative min-w-0">
      {/* Header */}
      <header className="h-14 border-b border-border flex flex-col justify-center px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button onClick={toggleSidebar} className="p-1.5 hover:bg-muted rounded-md transition-colors">
                <LayoutPanelLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground/80 bg-muted px-2 py-1 rounded-md capitalize">
                {provider}
              </span>
              <span className="text-sm text-muted-foreground">{model}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Retry Banner */}
      {isRetrying && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 text-xs px-4 py-2 flex items-center gap-2 animate-pulse shrink-0">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Connection lost. Retrying to connect (Attempt {retryCount})...</span>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <Bot className="w-16 h-16 mb-4" />
            <h1 className="text-2xl font-bold tracking-tight">How can I help you today?</h1>
            <p className="text-muted-foreground mt-2 max-w-md">
              Start a conversation with {model} using the {provider} provider.
            </p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-4 max-w-3xl mx-auto min-w-0 w-full", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 select-none", msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={cn("flex-1 prose prose-invert max-w-none text-sm md:text-base leading-relaxed min-w-0", msg.role === "user" ? "text-right" : "text-left")}>
                {msg.role === "user" ? (
                  <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-tr-sm whitespace-pre-wrap text-left break-words max-w-full overflow-hidden shadow-sm">
                    {msg.content}
                  </div>
                ) : (
                  <div className="mt-1">
                    <MessageContent content={msg.content} />
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-gradient-to-t from-background via-background to-transparent pt-10">
        <div className="max-w-3xl mx-auto relative">
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2 bg-card border border-border rounded-2xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring transition-shadow">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Message AI Workspace..."
              className="w-full max-h-48 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none px-3 py-3 text-base text-foreground placeholder:text-muted-foreground outline-none scrollbar-hide"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5 shadow-sm"
            >
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
          <div className="text-center mt-2">
            <span className="text-xs text-muted-foreground">AI can make mistakes. Verify important information.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
