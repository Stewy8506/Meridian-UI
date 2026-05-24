"use client";

import { useState, useRef, useEffect } from "react";
import { useAppStore, Message } from "@/store/app-store";
import { LayoutPanelLeft, Send, Loader2, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css"; // Basic syntax highlighting style

export function ChatArea() {
  const { 
    sidebarOpen, 
    toggleSidebar, 
    provider, 
    model, 
    messages, 
    setMessages, 
    googleApiKey, 
    openaiApiKey 
  } = useAppStore();
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [mounted, setMounted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (mounted) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const userMessage = { role: "user" as const, content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    const currentMessages = [...messages, userMessage];
    
    // Add an empty assistant message to stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
          messages: currentMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      
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
              
              // Depending on your backend, dataStr could be raw text or JSON
              // Our python backend yields raw string chunks for now
              try {
                // If it's pure string text (as yielded by our SSE)
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: newMessages[lastIndex].content + dataStr
                  };
                  return newMessages;
                });
              } catch (e) {
                console.error("Error parsing stream chunk", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        newMessages[lastIndex] = {
          ...newMessages[lastIndex],
          content: newMessages[lastIndex].content + "\n\n**Error:** Failed to connect to the backend API."
        };
        return newMessages;
      });
    } finally {
      setIsStreaming(false);
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
    <div className="flex-1 flex flex-col h-full bg-background relative">
      {/* Header */}
      <header className="h-14 border-b border-border flex items-center px-4 justify-between bg-background/80 backdrop-blur-sm sticky top-0 z-10">
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
      </header>

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
            <div key={i} className={`flex gap-4 max-w-3xl mx-auto ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {msg.role === "user" ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`flex-1 prose prose-invert max-w-none text-sm md:text-base leading-relaxed ${msg.role === "user" ? "text-right" : "text-left"}`}>
                {msg.role === "user" ? (
                  <div className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-tr-sm whitespace-pre-wrap text-left">
                    {msg.content}
                  </div>
                ) : (
                  <div className="mt-1">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm]} 
                      rehypePlugins={[rehypeHighlight]}
                    >
                      {msg.content}
                    </ReactMarkdown>
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
              className="p-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 mb-0.5"
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
