"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, Message } from "@/store/app-store";
import { 
  PanelLeft, Send, Loader2, 
  ArrowDown, Square, User, FileCode, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "../ui/toast";
import { MessageBubble } from "./message-bubble";
import { SuggestedPrompts } from "./suggested-prompts";
import { FileUpload, FileAttachmentList, AttachedFile } from "./file-upload";
import { VoiceInput } from "./voice-input";
import { CommandPalette } from "../ui/command-palette";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { motion, AnimatePresence } from "framer-motion";
import { SkillIndicator } from "../skills/skill-indicator";
import { RagToggle } from "../knowledge/rag-toggle";
import { getBaseUrl, apiRequest } from "@/lib/api-client";
import { PersonaManager } from "../personas/persona-manager";
import { CanvasPanel } from "../canvas/canvas-panel";
import { PromptLibrary } from "../prompts/prompt-library";

export function ChatArea() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    provider, 
    setProvider,
    model, 
    setModel,
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
    activeKbIds,
    canvasOpen,
    setCanvasOpen,
    drafts,
    setDraft,
    isStreaming,
    setIsStreaming
  } = useAppStore();
  
  const input = (activeChatId && drafts[activeChatId]) || "";
  const setInput = (textOrFn: string | ((prev: string) => string)) => {
    if (activeChatId) {
      const currentVal = drafts[activeChatId] || "";
      const newVal = typeof textOrFn === "function" ? textOrFn(currentVal) : textOrFn;
      setDraft(activeChatId, newVal);
    }
  };
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [mounted, setMounted] = useState(false);

  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);

  // Fetch available providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await apiRequest<any[]>("/api/keys/providers");
        const active = data.filter(p => p.configured || p.id === "local" || p.id === "ollama");
        setProviders(active);
      } catch (err) {
        console.error("Failed to load providers:", err);
      }
    };
    fetchProviders();
  }, []);

  // Fetch models whenever provider changes
  useEffect(() => {
    if (!provider) return;
    const fetchModels = async () => {
      setLoadingModels(true);
      try {
        const res = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${provider}`);
        const list = res.models || [];
        setModels(list);
        
        // If current model is empty or not in the list, choose the first model in list
        if (list.length > 0 && (!model || !list.includes(model))) {
          setModel(list[0]);
        }
      } catch (err) {
        console.error(`Failed to fetch models for ${provider}:`, err);
        setModels([]);
      } finally {
        setLoadingModels(false);
      }
    };
    fetchModels();
  }, [provider]);
  
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [showScrollFAB, setShowScrollFAB] = useState(false);
  const [personaManagerOpen, setPersonaManagerOpen] = useState(false);
  const [activePersona, setActivePersona] = useState<any>(null);
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMounted(true);
    hydrateChats();
  }, [hydrateChats]);

  // Auto-resize textarea height as input content changes
  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`; // 192px = max-h-48
    }
  }, [input]);

  // Autofocus the input textarea when the chat goes from empty to active or on load
  useEffect(() => {
    if (mounted) {
      // Small timeout to allow render completion
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [mounted, messages.length]);

  const handleFilesSelected = async (files: File[]) => {
    const newAttachments: AttachedFile[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      isUploading: true
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    
    for (const attachment of newAttachments) {
      try {
        const formData = new FormData();
        formData.append("file", attachment.file);
        
        const response = await fetch(`${getBaseUrl()}/api/files/upload`, {
          method: "POST",
          body: formData,
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("auth-token") || 'not-needed'}`
          }
        });
        
        if (!response.ok) throw new Error("Upload failed");
        const data = await response.json();
        
        setAttachments(prev => prev.map(a => 
          a.id === attachment.id 
            ? { ...a, isUploading: false, previewUrl: data.file.url }
            : a
        ));
      } catch (err) {
        setAttachments(prev => prev.map(a => 
          a.id === attachment.id 
            ? { ...a, isUploading: false, error: "Upload failed" }
            : a
        ));
      }
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      setShowScrollFAB(scrollHeight - scrollTop - clientHeight > 300);
    }
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (mounted) {
      scrollToBottom();
    }
  }, [messages, mounted]);

  useKeyboardShortcuts({
    onOpenCommandPalette: () => setIsCommandPaletteOpen(prev => !prev),
    onFocusInput: () => inputRef.current?.focus(),
    onOpenShortcutOverlay: () => {
      toast.info(
        "Shortcuts:\n• Ctrl+K: Command palette\n• Ctrl+N: New chat\n• Ctrl+Shift+S: Toggle sidebar\n• Ctrl+/: Focus input\n• Alt+1-9: Switch chats",
        6000
      );
    }
  });

  const generateChatTitle = async (chatId: string, userMsg: string, assistantMsg: string) => {
    const stripXmlTags = (text: string) => {
      if (!text) return "";
      let clean = text
        .replace(/<thought>[\s\S]*?(?:<\/thought>|$)/gi, "")
        .replace(/<skill_result[\s\S]*?(?:<\/skill_result>|$)/gi, "")
        .replace(/<canvas_write[\s\S]*?(?:<\/canvas_write>|$)/gi, "");
      clean = clean.replace(/<\/?[a-zA-Z_]+[^>]*>/gi, "");
      return clean.trim();
    };

    try {
      const cleanUser = stripXmlTags(userMsg);
      const cleanAssistant = stripXmlTags(assistantMsg);

      // Guard against completely empty inputs after stripping tags
      if (!cleanUser && !cleanAssistant) return;

      const token = typeof window !== "undefined" ? localStorage.getItem("auth-token") : null;
      const response = await fetch(`${getBaseUrl()}/api/chat/completions`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token || 'not-needed'}`
        },
        body: JSON.stringify({
          provider: "google",
          model: "gemini-2.5-flash",
          messages: [
            { role: "user", content: `Review this short conversation turn:\nUser: "${cleanUser}"\nAssistant: "${cleanAssistant}"\n\nCreate a highly concise, 3-5 word title summarizing the topic of this conversation. Do not use quotes, punctuation, preamble, or markdown. Output only the title.` }
          ],
          tools: []
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

      let cleanTitle = stripXmlTags(fullTitle.trim());
      // Clean up common AI prefixes/quotes/formatting
      cleanTitle = cleanTitle.replace(/^(title|topic|summary):\s*/i, "");
      cleanTitle = cleanTitle.replace(/^["']|["']$/g, "");
      cleanTitle = cleanTitle.trim();

      if (cleanTitle) {
        if (cleanTitle.length > 50) {
          cleanTitle = cleanTitle.slice(0, 50) + "...";
        }
        updateChatTitle(chatId, cleanTitle);
      }
    } catch (error) {
      console.error("Auto title generation failed:", error);
    }
  };

  const triggerStream = async (messageList: Message[]) => {
    setIsStreaming(true);
    setIsRetrying(false);
    setRetryCount(0);

    setMessages((prev) => [...prev, { role: "assistant", content: "", timestamp: Date.now() }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let success = false;
    let attempt = 0;
    let assistantText = "";
    const currentActiveChatId = useAppStore.getState().activeChatId;

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

          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { role: "assistant", content: "", timestamp: Date.now() };
            return next;
          });
          
          let currentEvent = "";
          let buffer = "";
          let dataLines: string[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            let lines = buffer.split(/\r?\n/);
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed === "") {
                if (dataLines.length > 0) {
                  const messageData = dataLines.join("\n");
                  dataLines = [];
                  
                  if (messageData === "[DONE]") {
                    break;
                  }
                  
                  if (currentEvent === "error") {
                    throw new Error(messageData);
                  }
                  
                  assistantText += messageData;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastIndex = newMessages.length - 1;
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + messageData
                    };
                    return newMessages;
                  });
                }
              } else if (trimmed.startsWith("event: ")) {
                currentEvent = trimmed.slice(7).trim();
              } else if (line.startsWith("data: ")) {
                dataLines.push(line.slice(6));
              } else if (trimmed === "data:") {
                dataLines.push("");
              }
            }
          }

          if (dataLines.length > 0) {
            const messageData = dataLines.join("\n");
            if (messageData !== "[DONE]") {
              if (currentEvent === "error") {
                throw new Error(messageData);
              }
              assistantText += messageData;
              setMessages((prev) => {
                const newMessages = [...prev];
                const lastIndex = newMessages.length - 1;
                newMessages[lastIndex] = {
                  ...newMessages[lastIndex],
                  content: newMessages[lastIndex].content + messageData
                };
                return newMessages;
              });
            }
          }
          
          success = true;
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          success = true;
          toast.info("Stopped");
          break;
        }

        console.error(`Attempt ${attempt} failed:`, error);
        
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          newMessages[lastIndex] = {
            role: "assistant",
            content: `Connection lost. Retrying... (attempt ${attempt})`,
            timestamp: Date.now()
          };
          return newMessages;
        });
      }
    }

    setIsStreaming(false);
    setIsRetrying(false);

    if (currentActiveChatId && success && assistantText) {
      const activeChat = useAppStore.getState().chats.find(c => c.id === currentActiveChatId);
      if (activeChat && (activeChat.title === "New Chat" || activeChat.title === "Imported Chat" || !activeChat.title)) {
        const firstUserMsg = activeChat.messages.find(m => m.role === "user")?.content;
        const firstAssistantMsg = activeChat.messages.find(m => m.role === "assistant" && m.content)?.content;
        if (firstUserMsg && firstAssistantMsg) {
          generateChatTitle(currentActiveChatId, firstUserMsg, firstAssistantMsg);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLFormElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
    e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userPrompt = input.trim();
    const userMessage = { role: "user" as const, content: userPrompt, timestamp: Date.now() };
    const nextMessages = [...messages, userMessage];
    
    setMessages(nextMessages);
    setInput("");
    setAttachments([]);
    
    await triggerStream(nextMessages);
  };

  const handleStopGeneration = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    setIsRetrying(false);
  };

  const handleEditMessage = async (idx: number, newContent: string) => {
    const truncatedHistory = messages.slice(0, idx).concat({ 
      role: "user", 
      content: newContent, 
      timestamp: Date.now() 
    });
    setMessages(truncatedHistory);
    await triggerStream(truncatedHistory);
  };

  const handleRegenerateResponse = async (idx: number) => {
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

  const renderInputForm = () => {
    return (
      <div className="max-w-2xl mx-auto w-full relative border border-border rounded-xl bg-card focus-within:border-foreground/20 transition-colors spotlight-border">
        <FileAttachmentList files={attachments} onRemove={removeAttachment} />
        <form 
          onSubmit={handleSubmit}
          onMouseMove={handleMouseMove}
          className="relative flex items-end gap-2 p-2"
        >
          <div className="pl-0.5 pb-0.5 shrink-0 flex items-center gap-0.5">
            <RagToggle />
            <FileUpload onFilesSelected={handleFilesSelected} disabled={isStreaming} />
            <button
              type="button"
              onClick={() => setPromptLibraryOpen(true)}
              disabled={isStreaming}
              className="inline-flex items-center justify-center rounded-full transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 disabled:opacity-50 cursor-pointer"
              title="Prompt Library"
            >
              <BookOpen className="h-5 w-5 text-neutral-500" strokeWidth={1.5} />
            </button>
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
            placeholder="Message..."
            className="w-full max-h-48 min-h-[40px] bg-transparent border-none focus:ring-0 resize-none px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none scrollbar-hide leading-relaxed animate-none"
            rows={1}
          />
          
          {isStreaming ? (
            <button
              type="button"
              onClick={handleStopGeneration}
              className="p-2.5 bg-foreground text-background hover:bg-foreground/90 rounded-lg transition-colors shrink-0 cursor-pointer"
              title="Stop"
            >
              <Square className="w-3.5 h-3.5 fill-current" strokeWidth={1.5} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <VoiceInput onTranscript={(text) => setInput(prev => prev + (prev ? " " : "") + text)} disabled={isStreaming} />
              <button
                type="submit"
                disabled={!input.trim() && attachments.length === 0}
                className="p-2.5 bg-foreground text-background disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-foreground/90 transition-colors shrink-0 cursor-pointer"
                title="Send"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
        </form>
        <div className="text-center pb-2 select-none">
          <span className="text-[10px] text-muted-foreground/35 flex items-center justify-center gap-1">
            Press <kbd className="kbd-premium">Enter ↵</kbd> to send · <kbd className="kbd-premium">Shift</kbd> + <kbd className="kbd-premium">Enter</kbd> for new line
          </span>
        </div>
      </div>
    );
  };

  if (!mounted) {
    return (
      <div className="flex-1 flex flex-col h-full bg-background items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full bg-background relative min-w-0">
      <div className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-background sticky top-0 z-10 select-none">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button 
                onClick={toggleSidebar} 
                className="p-1 hover:bg-accent rounded-md transition-colors"
              >
                <PanelLeft className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
              </button>
            )}
            
            <div className="flex items-center gap-1 bg-muted/30 border border-border/80 px-2 py-0.5 rounded-lg">
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="bg-transparent border-none text-muted-foreground hover:text-foreground text-xs font-semibold focus:ring-0 outline-none cursor-pointer pr-6 py-0.5 select-none"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id} className="bg-popover text-foreground">
                    {p.name}
                  </option>
                ))}
              </select>
              
              <span className="text-border/80 text-xs select-none">|</span>
              
              {loadingModels ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" strokeWidth={1.5} />
              ) : (
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-transparent border-none text-muted-foreground hover:text-foreground text-xs font-semibold focus:ring-0 outline-none cursor-pointer pr-6 py-0.5 select-none max-w-[160px] truncate"
                >
                  {models.length === 0 ? (
                    <option value={model} className="bg-popover text-foreground">
                      {model}
                    </option>
                  ) : (
                    models.map((m) => (
                      <option key={m} value={m} className="bg-popover text-foreground">
                        {m}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPersonaManagerOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 rounded-md text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer font-medium"
              title="Change AI Persona"
            >
              <User className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
              <span>{activePersona ? activePersona.name : "Select Persona"}</span>
            </button>

            <button
              onClick={() => setCanvasOpen(!canvasOpen)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 border rounded-md text-xs transition-colors cursor-pointer font-medium",
                canvasOpen
                  ? "bg-neutral-100 border-neutral-100 text-black font-semibold"
                  : "bg-neutral-950 border-neutral-850 hover:bg-neutral-900 text-neutral-400 hover:text-white"
              )}
              title="Toggle Interactive Canvas"
            >
              <FileCode className="w-3.5 h-3.5 text-neutral-500" strokeWidth={1.5} />
              <span>Canvas</span>
            </button>

            <SkillIndicator />
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors cursor-pointer"
            >
              <kbd className="kbd-premium">⌘K</kbd>
            </button>
          </div>
        </header>

        {/* Retry banner */}
        {isRetrying && (
          <div className="bg-muted border-b border-border text-muted-foreground text-xs px-4 py-2 flex items-center gap-2 shrink-0 select-none">
            <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
            <span>Retrying (attempt {retryCount})...</span>
          </div>
        )}

        {/* Messages */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-1 relative"
        >
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-xl text-center space-y-6 select-none"
              >
                <div className="space-y-3">
                  <motion.h1 
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="text-3xl md:text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground via-foreground/90 to-foreground/75"
                  >
                    What can I help with?
                  </motion.h1>
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-950 border border-border text-neutral-300 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active Model: <span className="font-semibold text-foreground">{model}</span> ({provider})
                    </span>
                  </div>
                </div>

                {/* Centered Input Form on Empty State */}
                <div className="w-full text-left py-2">
                  {renderInputForm()}
                </div>

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

        {/* Scroll FAB */}
        <AnimatePresence>
          {showScrollFAB && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={scrollToBottom}
              className="absolute bottom-[88px] right-6 z-10 p-2 rounded-full bg-accent hover:bg-accent/80 text-foreground border border-border shadow-sm transition-colors cursor-pointer"
              title="Scroll to bottom"
            >
              <ArrowDown className="w-3.5 h-3.5" strokeWidth={1.5} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Bottom Input - only when messages exist */}
        {messages.length > 0 && (
          <div className="p-4 pt-2 shrink-0">
            {renderInputForm()}
          </div>
        )}
      </div>

      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} />
      <PersonaManager open={personaManagerOpen} onClose={() => setPersonaManagerOpen(false)} onSelectPersona={(p) => setActivePersona(p)} />
      <PromptLibrary open={promptLibraryOpen} onClose={() => setPromptLibraryOpen(false)} onInsertPrompt={(text) => setInput(prev => prev + (prev ? " " : "") + text)} />
      <CanvasPanel />
    </div>
  );
}
