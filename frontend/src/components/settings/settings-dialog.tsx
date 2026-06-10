"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { 
  X, Eye, EyeOff, Settings, Sliders, Cpu, 
  Sparkles, Keyboard, Info, Check, AlertCircle, 
  Download, Upload, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../ui/toast";
import { ProviderGrid } from "./provider-grid";
import { apiRequest } from "@/lib/api-client";

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

  // Load providers list on dialog open or when provider settings tab is loaded
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

    // Check if the selected provider is configured
    const selectedProv = providers.find(p => p.id === provider);
    if (selectedProv && !selectedProv.configured) {
      setAvailableModels([]);
      setModelError(`Please configure your API key for ${selectedProv.name} under the 'Providers' tab first.`);
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
        setModelError(err.message || "An error occurred fetching models");
        setAvailableModels([]);
      } finally {
        setLoadingModels(false);
      }
    };

    fetchModels();
  }, [provider, open, activeTab, setModel, providers, model]);

  // Export chats
  const handleExportChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(chats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ai-workspace-export-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Chats exported successfully");
    } catch (e) {
      toast.error("Export failed");
    }
  };

  // Import chats
  const handleImportChats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Simplistic import - replace chats in store or merge
          useAppStore.setState({ chats: parsed });
          toast.success(`Successfully imported ${parsed.length} conversations`);
        } else {
          toast.error("Invalid export file format");
        }
      } catch (err) {
        toast.error("Failed to parse import file");
      }
    };
    reader.readAsText(file);
  };

  const menuItems = [
    { id: "general", label: "General Settings", icon: <Sliders className="w-4 h-4" /> },
    { id: "providers", label: "API Providers", icon: <Cpu className="w-4 h-4" /> },
    { id: "models", label: "Model Registry", icon: <Sparkles className="w-4 h-4" /> },
    { id: "appearance", label: "UI & Theme", icon: <Settings className="w-4 h-4" /> },
    { id: "shortcuts", label: "Keyboard Shortcuts", icon: <Keyboard className="w-4 h-4" /> },
    { id: "about", label: "About Workspace", icon: <Info className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 select-none">
          {/* Backdrop blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-md"
          />
          
          {/* Layout Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="relative w-full h-full md:max-w-4xl md:h-[80vh] bg-card border border-border shadow-2xl rounded-none md:rounded-2xl overflow-hidden flex flex-col md:flex-row z-50"
          >
            {/* Sidebar navigation */}
            <div className="w-full md:w-60 border-b md:border-b-0 md:border-r border-border/80 bg-muted/20 p-4 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
              <div className="hidden md:flex items-center gap-2 px-2 py-3 mb-2">
                <Settings className="w-5 h-5 text-primary" />
                <span className="font-bold text-sm">Control Console</span>
              </div>
              
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shrink-0 ${
                    activeTab === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              
              <button
                onClick={onClose}
                className="md:hidden ml-auto p-2 hover:bg-muted rounded-full text-muted-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main content pane */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-card">
              {/* Header */}
              <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
                <h3 className="font-bold text-base capitalize">{activeTab} Settings</h3>
                <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. GENERAL TAB */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-fade-in">
                    {/* System Prompt */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs md:text-sm font-semibold text-foreground">System Directive</label>
                        <span className="text-[10px] text-muted-foreground/80">{systemPrompt.length} chars</span>
                      </div>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="w-full text-xs md:text-sm p-3.5 rounded-xl bg-muted/40 border border-border focus:ring-1 focus:ring-ring outline-none resize-none min-h-[100px] leading-relaxed font-mono"
                        placeholder="Define AI behavior, tone, constraints..."
                      />
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Sets the behavior parameters injected before conversation context. Affects model response style.
                      </p>
                    </div>

                    {/* Parameters Sliders */}
                    <div className="space-y-4 pt-2">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Inference Parameters</h4>
                      
                      {/* Temperature */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-semibold">
                          <span>Temperature</span>
                          <span className="text-primary font-mono">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-primary bg-muted h-1 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>Deterministic (0.0)</span>
                          <span>Creative / Wild (2.0)</span>
                        </div>
                      </div>

                      {/* Top-P */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-semibold">
                          <span>Top-P (Nucleus Sampling)</span>
                          <span className="text-primary font-mono">{topP}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={topP}
                          onChange={(e) => setTopP(parseFloat(e.target.value))}
                          className="w-full accent-primary bg-muted h-1 rounded-lg cursor-pointer"
                        />
                      </div>

                      {/* Max Tokens */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs md:text-sm font-semibold">
                          <span>Max Generation Tokens</span>
                          <span className="text-primary font-mono">{maxTokens}</span>
                        </div>
                        <input
                          type="range"
                          min="256"
                          max="16384"
                          step="256"
                          value={maxTokens}
                          onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                          className="w-full accent-primary bg-muted h-1 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Backup & Import */}
                    <div className="pt-4 border-t border-border/50 space-y-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Data Synchronization</h4>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={handleExportChats}
                          className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-xl text-xs md:text-sm font-semibold text-foreground transition-all"
                        >
                          <Download className="w-4 h-4 text-primary" />
                          <span>Export Conversations</span>
                        </button>
                        
                        <label className="flex items-center gap-2 px-4 py-2 border border-border hover:bg-muted rounded-xl text-xs md:text-sm font-semibold text-foreground cursor-pointer transition-all">
                          <Upload className="w-4 h-4 text-primary" />
                          <span>Import JSON</span>
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

                {/* 2. PROVIDERS TAB */}
                {activeTab === "providers" && (
                  <div className="space-y-6 animate-fade-in">
                    <ProviderGrid />

                    {/* Search provider config */}
                    <div className="p-4 rounded-xl border border-border/80 bg-muted/10 space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs md:text-sm font-semibold block">Search Capability Integration</span>
                          <span className="text-[10px] text-muted-foreground">Select search engine API key to hook web search to chat</span>
                        </div>
                        
                        <div className="flex gap-2">
                          {['tavily', 'exa'].map((engine) => (
                            <button
                              key={engine}
                              onClick={() => setSearchProvider(engine as any)}
                              className={`px-2.5 py-1 text-xs rounded-lg font-bold border transition-colors ${
                                searchProvider === engine
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-background text-muted-foreground border-border hover:border-muted-foreground/40"
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
                            placeholder="Tavily key (tvly-...)"
                            className="w-full text-xs bg-background border border-border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTavilyKey(!showTavilyKey)}
                            className="absolute right-3 text-muted-foreground hover:text-foreground"
                          >
                            {showTavilyKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type={showExaKey ? "text" : "password"}
                            value={exaApiKey}
                            onChange={(e) => setExaApiKey(e.target.value)}
                            placeholder="Exa key (exa-...)"
                            className="w-full text-xs bg-background border border-border rounded-lg pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
                          />
                          <button
                            type="button"
                            onClick={() => setShowExaKey(!showExaKey)}
                            className="absolute right-3 text-muted-foreground hover:text-foreground"
                          >
                            {showExaKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. MODELS TAB */}
                {activeTab === "models" && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="space-y-2">
                      <label className="text-xs md:text-sm font-semibold">Active Model Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring font-semibold capitalize"
                      >
                        <option value="" disabled>Select a provider</option>
                        {providers.map((p) => (
                          <option key={p.id} value={p.id} className="bg-card text-foreground font-semibold">
                            {p.name} {p.configured ? "🟢" : "⚪"}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-xs md:text-sm font-semibold">Model Registry Identifier</label>
                      {loadingModels ? (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse p-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Contacting backend registry and fetching models...</span>
                        </div>
                      ) : modelError || availableModels.length === 0 ? (
                        <>
                          <input
                            type="text"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                            placeholder="e.g. Qwen-3.5-7B"
                          />
                          <p className="text-[10px] text-amber-500 bg-amber-500/10 p-2 rounded-xl border border-amber-500/20 flex gap-2 items-center leading-normal">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>
                              Registry fetch unavailable. You can manually enter the correct model string identifier (e.g. <code>gemini-1.5-pro</code> or <code>gpt-4o</code>) above.
                            </span>
                          </p>
                        </>
                      ) : (
                        <select
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs md:text-sm focus:outline-none focus:ring-1 focus:ring-ring font-semibold"
                        >
                          {availableModels.map((m) => (
                            <option key={m} value={m} className="bg-card text-foreground font-semibold">
                              {m}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. APPEARANCE TAB */}
                {activeTab === "appearance" && (
                  <div className="space-y-4 animate-fade-in">
                    <label className="text-xs md:text-sm font-semibold">Workspace Skin Theme</label>
                    <div className="grid grid-cols-3 gap-3">
                      {(["light", "dark", "system"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTheme(t)}
                          className={`py-3 px-4 rounded-xl border flex flex-col items-center gap-1.5 capitalize transition-all ${
                            theme === t
                              ? "border-primary bg-primary/10 text-foreground font-bold shadow-sm"
                              : "border-border bg-muted/10 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                          }`}
                        >
                          <span className="text-xs font-semibold">{t} Mode</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Select how AI Workspace looks. Setting Theme synchronizes layout classes, variables, code highlight blocks, and scrollbars.
                    </p>
                  </div>
                )}

                {/* 5. SHORTCUTS TAB */}
                {activeTab === "shortcuts" && (
                  <div className="space-y-4 animate-fade-in select-none">
                    <div className="divide-y divide-border/60">
                      {[
                        { keys: ["CTRL", "K"], desc: "Toggle Raycast Command Palette" },
                        { keys: ["CTRL", "N"], desc: "Open a New Chat Room" },
                        { keys: ["CTRL", "SHIFT", "S"], desc: "Toggle Sidebar Panel" },
                        { keys: ["CTRL", "/"], desc: "Focus Prompt Input Cursor" },
                        { keys: ["ALT", "1-9"], desc: "Transition chats by list order" },
                        { keys: ["ESC"], desc: "Close overlays and palettes" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2.5 text-xs md:text-sm">
                          <span className="text-muted-foreground/90 font-medium">{item.desc}</span>
                          <div className="flex gap-1">
                            {item.keys.map((k, i) => (
                              <kbd key={i} className="px-1.5 py-0.5 rounded border border-border bg-muted/60 text-[10px] font-mono shadow-sm font-bold">
                                {k}
                              </kbd>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. ABOUT TAB */}
                {activeTab === "about" && (
                  <div className="space-y-4 animate-fade-in text-center py-6 select-none">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 via-indigo-500 to-teal-500 flex items-center justify-center font-bold text-lg text-white mx-auto shadow-lg">
                      Ω
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-base md:text-lg">AI Workspace Console</h4>
                      <p className="text-xs text-muted-foreground">v1.2.0-Alpha • Premium Orchestrator</p>
                    </div>
                    <p className="text-xs text-muted-foreground/80 max-w-sm mx-auto leading-relaxed">
                      A premium AI operating environment designed for custom adapters, dynamic skill retrieval engines, and unified canvas side-by-side battle execution.
                    </p>
                    <div className="text-[10px] text-muted-foreground/60">
                      Developed under pair programming constraints. All rights reserved.
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-border/50 bg-muted/20 flex justify-end shrink-0 select-none">
                <button onClick={onClose} className="px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs md:text-sm font-semibold transition-colors shadow-sm">
                  Apply & Close console
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
