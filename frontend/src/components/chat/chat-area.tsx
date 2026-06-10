"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, Message } from "@/store/app-store";
import { 
  LayoutPanelLeft, Send, Loader2, Bot, 
  ArrowDown, Square, Sparkles, MessageSquare, Terminal 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "../ui/toast";
import { MessageBubble } from "./message-bubble";
import { SuggestedPrompts } from "./suggested-prompts";
import { CommandPalette } from "../ui/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { motion, AnimatePresence } from "framer-motion";
import { SkillIndicator } from "../skills/skill-indicator";
import { RagToggle } from "../knowledge/rag-toggle";
import { getBaseUrl } from "@/lib/api-client";

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
    exaApiKey,
    systemPrompt,
    temperature,
    topP,
    maxTokens,
    activeKbIds
  } = useAppStore();
  
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showScrollFAB, setShowScrollFAB] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    hydrateChats();
  }, [hydrateChats]);

  // Handle scroll events to toggle scroll-to-bottom FAB
  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollFAB(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [messages, mounted]);

  // Global Keyboard Shortcuts Hook
  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(prev => !prev),
    onFocusInput: () => inputRef.current?.focus(),
    onOpenShortcutOverlay: () => {
      toast.info(
        "Workspace Shortcuts:\n• Ctrl+K: Command Palette\n• Ctrl+N: New Chat\n• Ctrl+Shift+S: Toggle Sidebar\n• Ctrl+/: Focus Prompt Input\n• Alt+1-9: Switch Chats\n• Ctrl+?: Cheat Sheet",
        6000
      );
    }
  });

  // Auto-title generation background request
  const generateChatTitle = async (chatId: string, userMsg: string, assistantMsg: string) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
      const response = await fetch(`${getBaseUrl()}/api/chat/completions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || 'not-needed'}`
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

  // Execution engine core stream loader
  const triggerStream = async (messageList: Message[]) => {
    setIsStreaming(true);
    setIsRetrying(false);
    setRetryCount(0);

    // Add assistant bubble with initial empty message
    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: Date.now() }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let success = false;
    let attempt = 0;
    let assistantText = "";
    const currentActiveChatId = useAppStore.getState().activeChatId;

    // Package messages including the workspace settings system prompt
    const finalMessages = [
      { role: "system" as const, content: systemPrompt },
      ...messageList.map(m => ({ role: m.role, content: m.content }))
    ];

    while (!success) {
      try {
        attempt++;
        if (attempt > 1) {
          setIsRetrying(true);
          setRetryCount(attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
        const response = await fetch(`${getBaseUrl()}/api/chat/completions`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token || 'not-needed'}`
          },
          body: JSON.stringify({
            provider,
            model,
            messages: finalMessages,
            search_provider: searchProvider,
            tavily_api_key: tavilyApiKey || null,
            exa_api_key: exaApiKey || null,
            temperature,
            top_p: topP,
            max_tokens: maxTokens,
            knowledge_base_ids: activeChatId ? activeKbIds[activeChatId] || [] : []
          }),
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch response: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        
        if (reader) {
          setIsRetrying(false);
          setRetryCount(0);

          // Reset the content to start streaming clean
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: "", timestamp: Date.now() };
            return next;
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
      } catch (error: any) {
        if (error.name === 'AbortError') {
          success = true; // Complete execution on cancel signal
          toast.info("Streaming stopped by user");
          break;
        }

        console.error(`Attempt ${attempt} failed:`, error);
        
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            role: "assistant",
            content: `⚠️ **Connection lost.** Retrying... (Attempt ${attempt})`,
            timestamp: Date.now()
          };
          return newMessages;
        });
      }
    }

    setIsStreaming(false);
    setIsRetrying(false);

    // Auto Title Check
    if (currentActiveChatId && messageList.length === 1 && success && assistantText) {
      const userPrompt = messageList[0].content;
      const activeChat = useAppStore.getState().chats.find(c => c.id === currentActiveChatId);
      if (activeChat && (activeChat.title === "New Chat" || activeChat.title === "Imported Chat")) {
        generateChatTitle(currentActiveChatId, userPrompt, assistantText);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userPrompt = input.trim();
    const userMessage = { role: "user" as const, content: userPrompt, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    
    setMessages(nextMessages);
    setInput("");
    
    await triggerStream(nextMessages);
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsRetrying(false);
  };

  const handleEditMessage = async (idx: number, newContent: string) => {
    // Slice off all subsequent responses starting from edit index
    const truncatedHistory = messages.slice(0, idx).concat({ 
      role: "user", 
      content: newContent, 
      timestamp: Date.now() 
    });
    setMessages(truncatedHistory);
    await triggerStream(truncatedHistory);
  };

  const handleRegenerateResponse = async (idx: number) => {
    // Slice history right before the assistant message to be regenerated
    const truncatedHistory = messages.slice(0, idx);
    setMessages(truncatedHistory);
    await triggerStream(truncatedHistory);
  };

  const handleReactionChange = (idx: number, reaction: 'like' | 'dislike' | null) => {
    setMessages((prev) => {
      const next = [...prev];
      if (next[idx]) {
        next[idx] = { ...next[idx], reactions: reaction };
      }
      return next;
    });
    toast.success("Feedback recorded");
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Get current active chat's meta provider details
  const getProviderBadgeColor = () => {
    switch (provider.toLowerCase()) {
      case "google": return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "openai": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      default: return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative min-w-0">
      
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background/60 backdrop-blur-md sticky top-0 z-10 select-none">
        <div className="flex items-center gap-3">
          {!sidebarOpen && (
            <button 
              onClick={toggleSidebar} 
              className="p-1.5 hover:bg-muted rounded-xl transition-all"
            >
              <LayoutPanelLeft className="w-5 h-5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border capitalize tracking-wider", getProviderBadgeColor())}>
              {provider}
            </span>
            <span className="text-xs font-semibold text-muted-foreground truncate max-w-40 md:max-w-none">{model}</span>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <SkillIndicator />
          {/* Command Palette trigger */}
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-border/80 hover:border-border rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-all cursor-pointer"
          >
            <span className="text-[10px]">Command Menu</span>
            <kbd className="px-1 bg-muted border border-border rounded text-[9px] font-mono">⌘K</kbd>
          </button>
        </div>
      </header>

      {/* Connection retry banner */}
      {isRetrying && (
        <div className="bg-amber-500/15 border-b border-amber-500/20 text-amber-500 text-xs px-4 py-2 flex items-center gap-2 animate-pulse shrink-0 select-none font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Connection severed. Retrying query (Attempt {retryCount})...</span>
        </div>
      )}

      {/* Messages area */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 relative"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45 }}
              className="w-full max-w-2xl text-center space-y-6 select-none"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-teal-500 flex items-center justify-center shadow-lg mx-auto animate-float">
                <span className="text-white text-lg font-black">Ω</span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gradient-primary">
                  Orchestrate your workflow
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                  Start a private, localized session with {model}. Setup API keys and directives in control console.
                </p>
              </div>

              {/* Suggested Starters Grid */}
              <SuggestedPrompts onSelectPrompt={(prompt) => {
                setInput(prompt);
                setTimeout(() => {
                  const submitEvent = new Event('submit', { cancelable: true }) as any;
                  const form = document.querySelector('form');
                  if (form) {
                    form.dispatchEvent(submitEvent);
                  }
                }, 100);
              }} />
            </motion.div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <MessageBubble
              key={i}
              message={msg}
              index={i}
              provider={provider}
              model={model}
              isStreaming={isStreaming && i === messages.length - 1}
              onEdit={handleEditMessage}
              onRegenerate={handleRegenerateResponse}
              onReaction={handleReactionChange}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Scroll-to-bottom FAB */}
      <AnimatePresence>
        {showScrollFAB && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={scrollToBottom}
            className="absolute bottom-[90px] right-8 z-10 p-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-transform active:scale-95 cursor-pointer"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Input area */}
      <div className="p-4 bg-gradient-to-t from-background via-background to-transparent pt-10 shrink-0">
        <div className="max-w-3xl mx-auto relative">
          <form 
            onSubmit={handleSubmit} 
            className="relative flex items-end gap-2 bg-card/40 border border-border/80 rounded-2xl p-2 shadow-md focus-within:ring-1 focus-within:ring-ring transition-shadow backdrop-blur-sm"
          >
            <div className="pl-1 pb-1 shrink-0">
              <RagToggle />
            </div>
            
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder="Query AI Workspace (Press Enter)..."
              className="w-full max-h-48 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none px-3 py-3 text-xs md:text-sm text-foreground placeholder:text-muted-foreground/60 outline-none scrollbar-hide font-medium leading-relaxed"
              rows={1}
            />
            
            {/* Context/Streaming stop buttons */}
            {isStreaming ? (
              <button
                type="button"
                onClick={handleStopGeneration}
                className="p-3 bg-rose-600 text-white hover:bg-rose-500 rounded-xl transition-all shrink-0 mb-0.5 shadow-sm cursor-pointer"
                title="Stop generation"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="p-3 bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed rounded-xl hover:bg-primary/95 transition-all shrink-0 mb-0.5 shadow-sm cursor-pointer"
                title="Send query"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>
          <div className="text-center mt-2.5 select-none">
            <span className="text-[10px] text-muted-foreground/80">
              Shortcut: press <kbd className="px-1 bg-muted rounded border text-[9px]">Ctrl+/</kbd> to focus prompt box. Private and localized inference workspace.
            </span>
          </div>
        </div>
      </div>

      {/* Command Palette Overlay */}
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
    </div>
  );
}
