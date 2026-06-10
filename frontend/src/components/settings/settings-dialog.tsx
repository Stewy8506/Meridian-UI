"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { 
  X, Eye, EyeOff, 
  AlertCircle, 
  Download, Upload, RefreshCw, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../ui/toast";
import { ProviderGrid } from "./provider-grid";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Tab = "general" | "providers" | "models" | "appearance" | "shortcuts" | "about";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { 
    provider, 
    setProvider, 
    model, 
    setModel, 
    googleApiKey, 
    openaiApiKey, 
    setGoogleApiKey, 
    setOpenaiApiKey,
    searchProvider,
    setSearchProvider,
    tavilyApiKey,
    setTavilyApiKey,
    exaApiKey,
    setExaApiKey,
    systemPrompt,
    setSystemPrompt,
    temperature,
    setTemperature,
    topP,
    setTopP,
    maxTokens,
    setMaxTokens,
    theme,
    setTheme,
    chats,
    reorderChats
  } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [showExaKey, setShowExaKey] = useState(false);

  const [providers, setProviders] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    const fetchProviderList = async () => {
      try {
        const data = await apiRequest<any[]>("/api/keys/providers");
        setProviders(data);
      } catch (err) {
        console.error("Failed to load providers list:", err);
      }
    };
    fetchProviderList();
  }, [open, activeTab]);

  useEffect(() => {
    if (!open || activeTab !== "models" || !provider) return;

    const selectedProv = providers.find(p => p.id === provider);
    if (selectedProv && !selectedProv.configured) {
      setAvailableModels([]);
      setModelError(`Configure your API key for ${selectedProv.name} under Providers first.`);
      return;
    }

    const fetchModels = async () => {
      setLoadingModels(true);
      setModelError(null);
      try {
        const data = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${provider}`);
        setAvailableModels(data.models || []);
        
        if (data.models && data.models.length > 0 && !data.models.includes(model)) {
          setModel(data.models[0]);
        }
      } catch (err: any) {
        setModelError(err.message || "Failed to fetch models");
        setAvailableModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [provider, open, activeTab, setModel, providers, model]);

  const handleExportChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ai-workspace-export-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Exported");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  const handleImportChats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          useAppStore.setState({ chats: parsed });
          toast.success(`Imported ${parsed.length} conversations`);
        } else {
          toast.error("Invalid file format");
        }
      } catch (err) {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "providers", label: "Providers" },
    { id: "models", label: "Models" },
    { id: "appearance", label: "Appearance" },
    { id: "shortcuts", label: "Shortcuts" },
    { id: "about", label: "About" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.2 }}
            className="relative w-full h-full md:max-w-3xl md:h-[75vh] bg-card border border-border shadow-xl rounded-none md:rounded-xl overflow-hidden flex flex-col md:flex-row z-50"
          >
            {/* Sidebar */}
            <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border bg-card p-3 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
              <div className="hidden md:block px-2 py-3 mb-1">
                <span className="font-semibold text-sm">Settings</span>
              </div>
              
              {tabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "relative px-3 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 text-left select-none cursor-pointer",
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="activeSettingsTab"
                        className="absolute inset-0 bg-accent rounded-md z-0"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                    <span className="relative z-10">{item.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={onClose}
                className="md:hidden ml-auto p-1.5 hover:bg-accent rounded-md text-muted-foreground"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col h-full min-w-0">
              <div className="hidden md:flex items-center justify-between px-6 py-3 border-b border-border shrink-0">
                <h3 className="font-medium text-sm capitalize">{activeTab}</h3>
                <button onClick={onClose} className="p-1 hover:bg-accent rounded-md transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* GENERAL */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-foreground">System prompt</label>
                        <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">{systemPrompt.length}</span>
                      </div>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full text-sm p-3 rounded-lg bg-card border border-border focus:border-foreground/20 outline-none resize-none min-h-[100px] leading-relaxed font-[family-name:var(--font-geist-mono)] text-xs"
                        placeholder="Define AI behavior, tone, constraints..."
                      />
                    </div>

                    <div className="space-y-4 pt-2">
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Parameters</h4>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Temperature</span>
                          <span className="text-muted-foreground font-[family-name:var(--font-geist-mono)]">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-foreground h-1 rounded-lg cursor-pointer bg-muted"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground/60">
                          <span>Precise</span>
                          <span>Creative</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Top-P</span>
                          <span className="text-muted-foreground font-[family-name:var(--font-geist-mono)]">{topP}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full accent-foreground h-1 rounded-lg cursor-pointer bg-muted"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium">
                          <span>Max tokens</span>
                          <span className="text-muted-foreground font-[family-name:var(--font-geist-mono)]">{maxTokens}</span>
                        </div>
                        <input
                          type="range"
                          min="256"
                          max="16384"
                          step="256"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                          className="w-full accent-foreground h-1 rounded-lg cursor-pointer bg-muted"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border space-y-3">
                      <h4 className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Data</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleExportChats}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium text-foreground transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                          Export
                        </button>
                        
                        <label className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium text-foreground cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                          Import
                          <input
                            type="file"
                            accept=".json"
                            onChange={handleImportChats}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* PROVIDERS */}
                {activeTab === "providers" && (
                  <div className="space-y-6 animate-fade-in">
                    <ProviderGrid />

                    <div className="p-4 rounded-lg border border-border space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-medium block">Search integration</span>
                          <span className="text-[10px] text-muted-foreground">Connect a search API for web queries</span>
                        </div>
                        
                        <div className="flex gap-1">
                          {['tavily', 'exa'].map((engine) => (
                            <button
                              key={engine}
                              onClick={() => setSearchProvider(engine as any)}
                              className={`px-2 py-1 text-[10px] rounded-md font-medium border transition-colors capitalize ${
                                searchProvider === engine
                                  ? "bg-foreground text-background border-foreground"
                                  : "bg-card text-muted-foreground border-border hover:border-foreground/20"
                              }`}
                            >
                              {engine}
                            </button>
                          ))}
                        </div>
                      </div>

                      {searchProvider === "tavily" ? (
                        <div className="relative flex items-center">
                          <input
                            type={showTavilyKey ? "text" : "password"}
                            value={tavilyApiKey}
                            onChange={(e) => setTavilyApiKey(e.target.value)}
                            placeholder="tvly-..."
                            className="w-full text-xs bg-card border border-border rounded-md pl-3 pr-8 py-2 focus:outline-none focus:border-foreground/20 font-[family-name:var(--font-geist-mono)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTavilyKey(!showTavilyKey)}
                            className="absolute right-2 text-muted-foreground hover:text-foreground"
                          >
                            {showTavilyKey ? <EyeOff className="w-3 h-3" strokeWidth={1.5} /> : <Eye className="w-3 h-3" strokeWidth={1.5} />}
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type={showExaKey ? "text" : "password"}
                            value={exaApiKey}
                            onChange={(e) => setExaApiKey(e.target.value)}
                            placeholder="exa-..."
                            className="w-full text-xs bg-card border border-border rounded-md pl-3 pr-8 py-2 focus:outline-none focus:border-foreground/20 font-[family-name:var(--font-geist-mono)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowExaKey(!showExaKey)}
                            className="absolute right-2 text-muted-foreground hover:text-foreground"
                          >
                            {showExaKey ? <EyeOff className="w-3 h-3" strokeWidth={1.5} /> : <Eye className="w-3 h-3" strokeWidth={1.5} />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* MODELS */}
                {activeTab === "models" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-foreground/20 font-medium capitalize"
                      >
                        <option value="" disabled>Select provider</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id} className="bg-card text-foreground">
                            {p.name} {p.configured ? "●" : "○"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">Model</label>
                      {loadingModels ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground p-2">
                          <Loader2 className="w-3 h-3 animate-spin" strokeWidth={1.5} />
                          <span>Loading models...</span>
                        </div>
                      ) : modelError || availableModels.length === 0 ? (
                        <>
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-foreground/20 font-[family-name:var(--font-geist-mono)]"
                            placeholder="e.g. gemini-2.5-pro"
                          />
                          <p className="text-[10px] text-muted-foreground bg-muted p-2 rounded-md flex gap-2 items-start leading-normal mt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                            <span>
                              Auto-detection unavailable. Enter the model ID manually.
                            </span>
                          </p>
                        </>
                      ) : (
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-card border border-border rounded-md px-3 py-2 text-xs focus:outline-none focus:border-foreground/20 font-medium"
                        >
                          {availableModels.map((m) => (
                            <option key={m} value={m} className="bg-card text-foreground">
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* APPEARANCE */}
                {activeTab === "appearance" && (
                  <div className="space-y-4 animate-fade-in">
                    <label className="text-xs font-medium">Theme</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["light", "dark", "system"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`py-2.5 px-3 rounded-md border flex flex-col items-center gap-1 capitalize transition-colors text-xs font-medium ${
                            theme === t
                              ? "border-foreground/20 bg-accent text-foreground"
                              : "border-border text-muted-foreground hover:border-foreground/10 hover:text-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* SHORTCUTS */}
                {activeTab === "shortcuts" && (
                  <div className="space-y-0 animate-fade-in select-none">
                    <div className="divide-y divide-border">
                      {[
                        { keys: ["Ctrl", "K"], desc: "Command palette" },
                        { keys: ["Ctrl", "N"], desc: "New conversation" },
                        { keys: ["Ctrl", "Shift", "S"], desc: "Toggle sidebar" },
                        { keys: ["Ctrl", "/"], desc: "Focus input" },
                        { keys: ["Alt", "1–9"], desc: "Switch chats" },
                        { keys: ["Esc"], desc: "Close overlays" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2.5 text-xs">
                          <span className="text-muted-foreground">{item.desc}</span>
                          <div className="flex gap-1">
                            {item.keys.map((k, i) => (
                              <kbd key={i} className="kbd-premium">
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ABOUT */}
                {activeTab === "about" && (
                  <div className="space-y-4 animate-fade-in text-center py-8 select-none">
                    <div className="space-y-1">
                      <h4 className="font-semibold text-base">AI Workspace</h4>
                      <p className="text-xs text-muted-foreground">v1.2.0</p>
                    </div>
                    <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto leading-relaxed">
                      A premium AI operating environment with multi-provider routing, RAG, and a dynamic skill engine.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-3 border-t border-border flex justify-end shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 rounded-md text-xs font-medium transition-colors">
                  Done
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
