"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { 
  X, Eye, EyeOff, AlertCircle, Download, Upload, RefreshCw, Loader2,
  Sliders, Settings, Key, AudioLines, FileText, Cpu, Keyboard, Shield,
  Play, Volume2, Save, Plus, Trash2, Check, Sparkles, Terminal
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../ui/toast";
import { ProviderGrid } from "./provider-grid";
import { apiRequest } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type Tab = "general" | "inference" | "customCss" | "providers" | "audio" | "rag" | "sandbox" | "shortcuts" | "admin" | "about";

export function SettingsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useAppStore();
  const { user } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<Tab>("general");
  
  const [providers, setProviders] = useState<any[]>([]);
  const [models, setModels] = useState<string[]>([]);

  // Fetch available providers
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Fetch models whenever active provider changes
  useEffect(() => {
    if (!open || !store.provider) return;
    const fetchModels = async () => {
      try {
        const res = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${store.provider}`);
        setModels(res.models || []);
      } catch (err) {
        console.error(`Failed to fetch models for ${store.provider}:`, err);
        setModels([]);
      }
    };
    fetchModels();
  }, [open, store.provider]);
  
  // RAG settings states (fetched from admin if admin, or kept in local states)
  const [ragProvider, setRagProvider] = useState("local");
  const [ragChunkSize, setRagChunkSize] = useState(512);
  const [ragChunkOverlap, setRagChunkOverlap] = useState(64);
  const [ragTopK, setRagTopK] = useState(5);
  const [ragDistance, setRagDistance] = useState("cosine");
  const [savingRag, setSavingRag] = useState(false);

  // Sandbox settings states
  const [sandboxRuntime, setSandboxRuntime] = useState("subprocess");
  const [sandboxTimeout, setSandboxTimeout] = useState(30);
  const [sandboxMemory, setSandboxMemory] = useState(512);
  const [pipPackages, setPipPackages] = useState<string[]>([]);
  const [newPackage, setNewPackage] = useState("");
  const [installingPackage, setInstallingPackage] = useState(false);
  const [savingSandbox, setSavingSandbox] = useState(false);

  // Admin global setting states
  const [signupEnabled, setSignupEnabled] = useState(true);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminLogs, setAdminLogs] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Keyboard binding state
  const [bindingKey, setBindingKey] = useState<string | null>(null);

  // Search provider keys state
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [showExaKey, setShowExaKey] = useState(false);

  // Load backend configurations
  useEffect(() => {
    if (!open) return;
    
    // Fetch global system config (accessible to everyone)
    const fetchSystemConfig = async () => {
      try {
        const sys = await apiRequest<any>("/api/settings/system");
        if (sys) {
          setSignupEnabled(sys.signup_enabled ?? true);
          setAllowedDomains(sys.allowed_signup_domains ?? "");
          setSandboxRuntime(sys.sandbox_runtime ?? "subprocess");
          setRagProvider(sys.rag_embedding_provider ?? "local");
        }
      } catch (err) {
        console.error("Failed to load system settings:", err);
      }
    };
    
    fetchSystemConfig();

    // If admin, load all admin configs
    if (user?.is_admin) {
      const fetchAdminConfig = async () => {
        try {
          const cfg = await apiRequest<any>("/api/settings/admin");
          if (cfg) {
            setSignupEnabled(cfg.signup_enabled ?? true);
            setAllowedDomains(cfg.allowed_signup_domains ?? "");
            setRagProvider(cfg.rag_embedding_provider ?? "local");
            setRagChunkSize(cfg.rag_chunk_size ?? 512);
            setRagChunkOverlap(cfg.rag_chunk_overlap ?? 64);
            setRagTopK(cfg.rag_top_k ?? 5);
            setRagDistance(cfg.rag_distance_metric ?? "cosine");
            setSandboxRuntime(cfg.sandbox_runtime ?? "subprocess");
            setSandboxTimeout(cfg.sandbox_timeout ?? 30);
            setSandboxMemory(cfg.sandbox_memory_limit_mb ?? 512);
            setPipPackages(cfg.installed_pip_packages ?? []);
          }
        } catch (err) {
          console.error("Failed to load admin settings:", err);
        }
      };
      fetchAdminConfig();
    }
  }, [open, user]);

  // Handle RAG Settings Save
  const handleSaveRag = async () => {
    if (!user?.is_admin) {
      toast.error("Only administrators can update workspace RAG parameters.");
      return;
    }
    setSavingRag(true);
    try {
      await apiRequest("/api/settings/admin", {
        method: "POST",
        body: JSON.stringify({
          settings: {
            rag_embedding_provider: ragProvider,
            rag_chunk_size: ragChunkSize,
            rag_chunk_overlap: ragChunkOverlap,
            rag_top_k: ragTopK,
            rag_distance_metric: ragDistance
          }
        })
      });
      toast.success("RAG specifications saved");
    } catch (err: any) {
      toast.error(err.message || "Failed to update RAG settings");
    } finally {
      setSavingRag(false);
    }
  };

  // Handle Sandbox Settings Save
  const handleSaveSandbox = async () => {
    if (!user?.is_admin) {
      toast.error("Only administrators can update execution sandbox parameters.");
      return;
    }
    setSavingSandbox(true);
    try {
      await apiRequest("/api/settings/admin", {
        method: "POST",
        body: JSON.stringify({
          settings: {
            sandbox_runtime: sandboxRuntime,
            sandbox_timeout: sandboxTimeout,
            sandbox_memory_limit_mb: sandboxMemory
          }
        })
      });
      toast.success("Sandbox runtimes updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to save sandbox settings");
    } finally {
      setSavingSandbox(false);
    }
  };

  // Handle pip install package
  const handleInstallPackage = async () => {
    const pkg = newPackage.trim();
    if (!pkg) return;
    setInstallingPackage(true);
    try {
      await apiRequest("/api/execute/install", {
        method: "POST",
        body: JSON.stringify({ package: pkg })
      });
      const updatedPackages = [...pipPackages, pkg];
      setPipPackages(updatedPackages);
      
      // Update global config with package list
      await apiRequest("/api/settings/admin", {
        method: "POST",
        body: JSON.stringify({
          settings: { installed_pip_packages: updatedPackages }
        })
      });
      
      toast.success(`Successfully installed ${pkg}`);
      setNewPackage("");
    } catch (err: any) {
      toast.error(err.message || `Failed to install package ${pkg}`);
    } finally {
      setInstallingPackage(false);
    }
  };

  const handleRemovePackage = async (pkg: string) => {
    if (!confirm(`Are you sure you want to uninstall ${pkg}?`)) return;
    const updatedPackages = pipPackages.filter(p => p !== pkg);
    setPipPackages(updatedPackages);
    try {
      await apiRequest("/api/settings/admin", {
        method: "POST",
        body: JSON.stringify({
          settings: { installed_pip_packages: updatedPackages }
        })
      });
      toast.success(`Uninstalled ${pkg}`);
    } catch (err: any) {
      toast.error(err.message || `Failed to remove ${pkg}`);
    }
  };

  // Save admin variables (signup, allowed domains)
  const handleSaveAdminGlobal = async () => {
    setSavingAdmin(true);
    try {
      await apiRequest("/api/settings/admin", {
        method: "POST",
        body: JSON.stringify({
          settings: {
            signup_enabled: signupEnabled,
            allowed_signup_domains: allowedDomains
          }
        })
      });
      toast.success("Workspace parameters updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update admin controls");
    } finally {
      setSavingAdmin(false);
    }
  };

  // Fetch admin diagnostics logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const data = await apiRequest<{ status: string; logs: string[] }>("/api/settings/admin/logs");
      setAdminLogs(data.logs || []);
    } catch (err) {
      console.error("Failed to load admin logs", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === "admin" && user?.is_admin) {
      fetchLogs();
    }
  }, [activeTab, user]);

  // Voice engine synthesis tester
  const handleTestTts = () => {
    if (typeof window === "undefined" || !('speechSynthesis' in window)) {
      toast.error("Text-to-speech is unsupported on this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance("Welcome to your custom voice workspace. Speech parameters compiled successfully.");
    utterance.rate = store.ttsSpeed;
    utterance.pitch = store.ttsPitch;
    if (store.ttsVoiceId && store.ttsVoiceId !== "default") {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(v => v.name === store.ttsVoiceId);
      if (matched) utterance.voice = matched;
    }
    window.speechSynthesis.speak(utterance);
    toast.success("Playing preview");
  };

  // Keyboard shortcut binder listener
  useEffect(() => {
    if (!bindingKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const keys: string[] = [];
      if (e.ctrlKey) keys.push("ctrl");
      if (e.shiftKey) keys.push("shift");
      if (e.altKey) keys.push("alt");
      
      const mainKey = e.key.toLowerCase();
      if (!["control", "shift", "alt", "meta"].includes(mainKey)) {
        keys.push(mainKey);
      }
      
      if (keys.length > 0) {
        const combination = keys.join("+");
        const updatedShortcuts = {
          ...store.shortcuts,
          [bindingKey]: combination
        };
        store.updateUserSettings({ shortcuts: updatedShortcuts });
        toast.success(`Mapped shortcut to: ${combination}`);
      }
      setBindingKey(null);
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [bindingKey, store]);

  // Export chats
  const handleExportChats = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.chats, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `ai-workspace-export-${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast.success("Chats exported");
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
          useAppStore.setState({ chats: parsed });
          toast.success(`Imported ${parsed.length} conversations`);
        } else {
          toast.error("Invalid chats format");
        }
      } catch (err) {
        toast.error("Failed to parse file");
      }
    };
    reader.readAsText(file);
  };

  // Tabs layout
  const baseTabs = [
    { id: "general", label: "General & UI", icon: Settings },
    { id: "inference", label: "Inference Tuning", icon: Sliders },
    { id: "customCss", label: "Custom Styling", icon: Sparkles },
    { id: "providers", label: "API Providers", icon: Key },
    { id: "audio", label: "Speech & Audio", icon: AudioLines },
    { id: "rag", label: "RAG & Knowledge", icon: FileText },
    { id: "sandbox", label: "Code Sandbox", icon: Cpu },
    { id: "shortcuts", label: "Hotkeys Mapping", icon: Keyboard },
  ];

  const adminTab = user?.is_admin ? [{ id: "admin", label: "Workspace Admin", icon: Shield }] : [];
  const aboutTab = [{ id: "about", label: "About", icon: AlertCircle }];
  
  const tabs = [...baseTabs, ...adminTab, ...aboutTab] as { id: Tab; label: string; icon: any }[];

  // Browser Speech synthesis voices loader helper
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        setBrowserVoices(window.speechSynthesis.getVoices());
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18 }}
            className="relative w-full h-full md:max-w-4xl md:h-[82vh] bg-[#0c0c0c] border border-neutral-800 shadow-2xl rounded-none md:rounded-2xl overflow-hidden flex flex-col md:flex-row z-50 text-neutral-200"
          >
            {/* Sidebar tabs */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-neutral-800 bg-[#070707] p-4 shrink-0 flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible md:overflow-y-auto scrollbar-hide">
              <div className="hidden md:block px-2 py-3 mb-2 border-b border-neutral-900">
                <span className="font-semibold text-xs uppercase tracking-widest text-neutral-500">Settings Manager</span>
              </div>
              
              {tabs.map((item) => {
                const isActive = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={cn(
                      "relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all shrink-0 text-left cursor-pointer",
                      isActive
                        ? "text-white bg-neutral-900/80 border border-neutral-800"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-950"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              
              <button
                onClick={onClose}
                className="md:hidden ml-auto p-1.5 hover:bg-neutral-900 rounded-md text-neutral-400"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            {/* Config Content Panel */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-[#0a0a0a]">
              <div className="hidden md:flex items-center justify-between px-6 py-4 border-b border-neutral-800 shrink-0">
                <h3 className="font-semibold text-xs tracking-wider uppercase text-neutral-300">{tabs.find(t => t.id === activeTab)?.label}</h3>
                <button onClick={onClose} className="p-1.5 hover:bg-neutral-900 rounded-md transition-colors text-neutral-400 hover:text-neutral-200">
                  <X className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* GENERAL & UI */}
                {activeTab === "general" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Active AI Provider</label>
                        <select
                          value={store.provider}
                          onChange={(e) => store.setProvider(e.target.value)}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 cursor-pointer"
                        >
                          {providers.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Active AI Model</label>
                        <select
                          value={store.model}
                          onChange={(e) => store.setModel(e.target.value)}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 cursor-pointer"
                        >
                          {models.length === 0 ? (
                            <option value={store.model}>{store.model}</option>
                          ) : (
                            models.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-medium text-neutral-300">Base System Prompt</label>
                      </div>
                      <textarea
                        value={store.systemPrompt}
                        onChange={(e) => store.setSystemPrompt(e.target.value)}
                        className="w-full text-xs p-3 rounded-lg bg-[#0e0e0e] border border-neutral-800 focus:border-neutral-700 outline-none resize-none min-h-[90px] leading-relaxed font-[family-name:var(--font-geist-mono)] text-neutral-300"
                        placeholder="Define general AI system constraints..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Container Layout</label>
                        <select
                          value={store.chatLayout}
                          onChange={(e) => store.updateUserSettings({ chatLayout: e.target.value as any })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                        >
                          <option value="centered">Centered (Standard)</option>
                          <option value="wide">Full Width (Canvas Mode)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Message Bubble Style</label>
                        <select
                          value={store.bubbleStyle}
                          onChange={(e) => store.updateUserSettings({ bubbleStyle: e.target.value as any })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                        >
                          <option value="bubble">Rounded Bubble</option>
                          <option value="flat">Flat Minimalist</option>
                          <option value="classic">Terminal Lines (Markdown Only)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Enter Key Send Action</label>
                        <select
                          value={store.enterKeyBehavior}
                          onChange={(e) => store.updateUserSettings({ enterKeyBehavior: e.target.value as any })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                        >
                          <option value="send">Press Enter to Send</option>
                          <option value="newline">Ctrl/Shift + Enter to Send</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Active Theme</label>
                        <select
                          value={store.theme}
                          onChange={(e) => store.updateUserSettings({ theme: e.target.value as any })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                        >
                          <option value="dark">Pitch Black Dark</option>
                          <option value="light">Bright White Light</option>
                          <option value="system">System Default</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between text-xs font-medium text-neutral-300">
                        <span>Font Size Override</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-neutral-400">{store.fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min="12"
                        max="20"
                        step="1"
                        value={store.fontSize}
                        onChange={(e) => store.updateUserSettings({ fontSize: parseInt(e.target.value) })}
                        className="w-full accent-white h-1.5 rounded-lg cursor-pointer bg-neutral-800"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-xs font-medium text-neutral-300">
                        <span>Text Streaming speed modifier</span>
                        <span className="font-[family-name:var(--font-geist-mono)] text-xs text-neutral-400">{store.streamSpeed}x</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value={store.streamSpeed}
                        onChange={(e) => store.updateUserSettings({ streamSpeed: parseInt(e.target.value) })}
                        className="w-full accent-white h-1.5 rounded-lg cursor-pointer bg-neutral-800"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 bg-[#0e0e0e] border border-neutral-900 rounded-lg">
                      <div>
                        <span className="text-xs font-medium text-neutral-300 block">Collapse Long Code Blocks</span>
                        <span className="text-[10px] text-neutral-500">Auto-collapse coding snippets exceeding 30 lines</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={store.codeBlocksCollapsed}
                        onChange={(e) => store.updateUserSettings({ codeBlocksCollapsed: e.target.checked })}
                        className="w-4 h-4 accent-neutral-200 cursor-pointer"
                      />
                    </div>

                    <div className="pt-4 border-t border-neutral-900 space-y-3">
                      <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Client Chat Backup</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={handleExportChats}
                          className="flex items-center gap-1.5 px-3 py-2 border border-neutral-800 hover:bg-neutral-900 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Export Chats
                        </button>
                        
                        <label className="flex items-center gap-1.5 px-3 py-2 border border-neutral-800 hover:bg-neutral-900 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />
                          Import Backup
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

                {/* INFERENCE TUNING */}
                {activeTab === "inference" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Temperature</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={store.temperature}
                          onChange={(e) => store.setTemperature(parseFloat(e.target.value))}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Top-P sampling</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.topP}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={store.topP}
                          onChange={(e) => store.setTopP(parseFloat(e.target.value))}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Max Response Tokens</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.maxTokens}</span>
                        </div>
                        <input
                          type="range"
                          min="256"
                          max="16384"
                          step="256"
                          value={store.maxTokens}
                          onChange={(e) => store.setMaxTokens(parseInt(e.target.value))}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Context Window Tokens</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.contextLength}</span>
                        </div>
                        <input
                          type="range"
                          min="2048"
                          max="131072"
                          step="2048"
                          value={store.contextLength}
                          onChange={(e) => store.updateUserSettings({ contextLength: parseInt(e.target.value) })}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Frequency Penalty</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.frequencyPenalty}</span>
                        </div>
                        <input
                          type="range"
                          min="-2.0"
                          max="2.0"
                          step="0.1"
                          value={store.frequencyPenalty}
                          onChange={(e) => store.updateUserSettings({ frequencyPenalty: parseFloat(e.target.value) })}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Presence Penalty</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.presencePenalty}</span>
                        </div>
                        <input
                          type="range"
                          min="-2.0"
                          max="2.0"
                          step="0.1"
                          value={store.presencePenalty}
                          onChange={(e) => store.updateUserSettings({ presencePenalty: parseFloat(e.target.value) })}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Deterministic Seed</label>
                        <input
                          type="number"
                          value={store.seed}
                          onChange={(e) => store.updateUserSettings({ seed: parseInt(e.target.value) || 0 })}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Custom Stop Sequences</label>
                        <input
                          type="text"
                          placeholder="e.g. [DONE], \n, User:"
                          value={store.stopSequences.join(", ")}
                          onChange={(e) => store.updateUserSettings({ stopSequences: e.target.value.split(",").map(s => s.trim()) })}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* CUSTOM STYLING (CSS) */}
                {activeTab === "customCss" && (
                  <div className="space-y-4 animate-fade-in flex flex-col h-full">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Sparkles className="w-4 h-4 text-neutral-300" strokeWidth={1.5} />
                      <span>Input CSS rules to compile styles directly onto the runtime engine DOM.</span>
                    </div>
                    
                    <div className="flex-1 min-h-[200px] flex flex-col relative border border-neutral-800 rounded-xl overflow-hidden bg-[#0c0c0c]">
                      <div className="bg-[#080808] border-b border-neutral-800 px-4 py-2 flex items-center justify-between text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                        <span>style.css overrides</span>
                        <span className="font-[family-name:var(--font-geist-mono)] lowercase text-neutral-600">{store.customCss.length} bytes</span>
                      </div>
                      
                      <textarea
                        value={store.customCss}
                        onChange={(e) => store.updateUserSettings({ customCss: e.target.value })}
                        className="flex-1 w-full p-4 outline-none resize-none bg-[#090909] text-xs font-[family-name:var(--font-geist-mono)] leading-relaxed text-emerald-400 placeholder-neutral-600"
                        placeholder="/* Examples: */&#10;.chat-area { max-width: 900px !important; }&#10;.user-bubble { background: #1a1a1a !important; }"
                      />
                    </div>
                  </div>
                )}

                {/* PROVIDERS & KEYS */}
                {activeTab === "providers" && (
                  <div className="space-y-6 animate-fade-in">
                    <ProviderGrid />

                    <div className="p-4 rounded-lg border border-neutral-900 bg-[#0e0e0e] space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-xs font-semibold text-neutral-300 block">External Search Engines</span>
                          <span className="text-[10px] text-neutral-500">Inject Web Queries directly into LLM thinking contexts</span>
                        </div>
                        
                        <div className="flex gap-1">
                          {['tavily', 'exa'].map((engine) => (
                            <button
                              key={engine}
                              onClick={() => store.setSearchProvider(engine as any)}
                              className={`px-3 py-1.5 text-[10px] rounded-md font-medium border transition-colors capitalize ${
                                store.searchProvider === engine
                                  ? "bg-neutral-200 text-black border-neutral-200"
                                  : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700"
                              }`}
                            >
                              {engine}
                            </button>
                          ))}
                        </div>
                      </div>

                      {store.searchProvider === "tavily" ? (
                        <div className="relative flex items-center">
                          <input
                            type={showTavilyKey ? "text" : "password"}
                            value={store.tavilyApiKey}
                            onChange={(e) => store.setTavilyApiKey(e.target.value)}
                            placeholder="Tavily API Key (tvly-...)"
                            className="w-full text-xs bg-[#090909] border border-neutral-800 rounded-md pl-3 pr-8 py-2 focus:outline-none text-neutral-300 font-[family-name:var(--font-geist-mono)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowTavilyKey(!showTavilyKey)}
                            className="absolute right-2 text-neutral-400 hover:text-neutral-200"
                          >
                            {showTavilyKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="relative flex items-center">
                          <input
                            type={showExaKey ? "text" : "password"}
                            value={store.exaApiKey}
                            onChange={(e) => store.setExaApiKey(e.target.value)}
                            placeholder="Exa Search API Key (exa-...)"
                            className="w-full text-xs bg-[#090909] border border-neutral-800 rounded-md pl-3 pr-8 py-2 focus:outline-none text-neutral-300 font-[family-name:var(--font-geist-mono)]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowExaKey(!showExaKey)}
                            className="absolute right-2 text-neutral-400 hover:text-neutral-200"
                          >
                            {showExaKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SPEECH & AUDIO */}
                {activeTab === "audio" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">TTS Engine</label>
                        <select
                          value={store.ttsEngine}
                          onChange={(e) => store.updateUserSettings({ ttsEngine: e.target.value as any })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 font-medium"
                        >
                          <option value="browser">Browser Web Speech API (Free)</option>
                          <option value="openai">OpenAI Audio API (Cloud)</option>
                          <option value="elevenlabs">ElevenLabs Speech (Premium)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">TTS Voice / Actor Profile</label>
                        {store.ttsEngine === "browser" ? (
                          <select
                            value={store.ttsVoiceId}
                            onChange={(e) => store.updateUserSettings({ ttsVoiceId: e.target.value })}
                            className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                          >
                            <option value="default">Default Browser Voice</option>
                            {browserVoices.map((voice) => (
                              <option key={voice.name} value={voice.name}>
                                {voice.name} ({voice.lang})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            placeholder={store.ttsEngine === "openai" ? "alloy, echo, fable, onyx, nova, shimmer" : "elevenlabs-voice-uuid"}
                            value={store.ttsVoiceId}
                            onChange={(e) => store.updateUserSettings({ ttsVoiceId: e.target.value })}
                            className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Speech Speed rate</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.ttsSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={store.ttsSpeed}
                          onChange={(e) => store.updateUserSettings({ ttsSpeed: parseFloat(e.target.value) })}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Speech Pitch factor</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{store.ttsPitch}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2"
                          step="0.1"
                          value={store.ttsPitch}
                          onChange={(e) => store.updateUserSettings({ ttsPitch: parseFloat(e.target.value) })}
                          className="w-full accent-white h-1 bg-neutral-800"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="flex items-center justify-between p-3.5 bg-[#0e0e0e] border border-neutral-900 rounded-lg">
                        <div>
                          <span className="text-xs font-medium text-neutral-300 block">Auto-speak responses</span>
                          <span className="text-[10px] text-neutral-500">Automatically speak assistant generation</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={store.autoSpeak}
                          onChange={(e) => store.updateUserSettings({ autoSpeak: e.target.checked })}
                          className="w-4 h-4 accent-neutral-200 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">STT Input Language</label>
                        <select
                          value={store.sttLanguage}
                          onChange={(e) => store.updateUserSettings({ sttLanguage: e.target.value })}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300"
                        >
                          <option value="en-US">English (United States)</option>
                          <option value="es-ES">Spanish (Spain)</option>
                          <option value="fr-FR">French (France)</option>
                          <option value="de-DE">German (Germany)</option>
                          <option value="zh-CN">Chinese (Simplified)</option>
                        </select>
                      </div>
                    </div>

                    <button
                      onClick={handleTestTts}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-xs font-medium text-neutral-200 transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      Test Voice Engine
                    </button>
                  </div>
                )}

                {/* RAG & KNOWLEDGE */}
                {activeTab === "rag" && (
                  <div className="space-y-6 animate-fade-in">
                    {!user?.is_admin && (
                      <p className="text-[10px] text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-900 flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0 text-yellow-500" />
                        <span>Viewing only. Administrator authorization is required to modify global retrieval configurations.</span>
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Embedding Vector Model Provider</label>
                        <select
                          disabled={!user?.is_admin}
                          value={ragProvider}
                          onChange={(e) => setRagProvider(e.target.value)}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 disabled:opacity-50"
                        >
                          <option value="local">SentenceTransformers (MiniLM - Local)</option>
                          <option value="openai">text-embedding-3-small (OpenAI Cloud)</option>
                          <option value="google">text-embedding-004 (Google Cloud)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Distance Similarity Metric</label>
                        <select
                          disabled={!user?.is_admin}
                          value={ragDistance}
                          onChange={(e) => setRagDistance(e.target.value)}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 disabled:opacity-50"
                        >
                          <option value="cosine">Cosine Similarity</option>
                          <option value="l2">Euclidean Distance (L2)</option>
                          <option value="ip">Inner Product (Dot Product)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Document Chunk Size (Characters)</label>
                        <input
                          type="number"
                          disabled={!user?.is_admin}
                          value={ragChunkSize}
                          onChange={(e) => setRagChunkSize(parseInt(e.target.value) || 256)}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 disabled:opacity-50 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Document Chunk Overlap</label>
                        <input
                          type="number"
                          disabled={!user?.is_admin}
                          value={ragChunkOverlap}
                          onChange={(e) => setRagChunkOverlap(parseInt(e.target.value) || 32)}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 disabled:opacity-50 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs font-medium text-neutral-300">
                          <span>Max Context Document Chunks (K)</span>
                          <span className="font-[family-name:var(--font-geist-mono)] text-neutral-400">{ragTopK}</span>
                        </div>
                        <input
                          type="range"
                          disabled={!user?.is_admin}
                          min="1"
                          max="15"
                          step="1"
                          value={ragTopK}
                          onChange={(e) => setRagTopK(parseInt(e.target.value))}
                          className="w-full accent-white h-1 bg-neutral-800 disabled:opacity-50"
                        />
                      </div>
                    </div>

                    {user?.is_admin && (
                      <button
                        onClick={handleSaveRag}
                        disabled={savingRag}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-black hover:bg-neutral-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        {savingRag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save RAG Configuration
                      </button>
                    )}
                  </div>
                )}

                {/* CODE SANDBOX */}
                {activeTab === "sandbox" && (
                  <div className="space-y-6 animate-fade-in">
                    {!user?.is_admin && (
                      <p className="text-[10px] text-neutral-400 bg-neutral-950 p-3 rounded-lg border border-neutral-900 flex gap-2 items-center">
                        <AlertCircle className="w-4 h-4 shrink-0 text-yellow-500" />
                        <span>Viewing only. Administrator authorization is required to modify execution sandbox runtimes.</span>
                      </p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Execution Sandbox Isolation Runtime</label>
                        <select
                          disabled={!user?.is_admin}
                          value={sandboxRuntime}
                          onChange={(e) => setSandboxRuntime(e.target.value)}
                          className="w-full bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 text-xs focus:outline-none text-neutral-300 disabled:opacity-50"
                        >
                          <option value="subprocess">Subprocess local execution (Low Isolation)</option>
                          <option value="docker">Docker container sandbox (High Isolation)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Sandbox Timeout Limit (Seconds)</label>
                        <input
                          type="number"
                          disabled={!user?.is_admin}
                          value={sandboxTimeout}
                          onChange={(e) => setSandboxTimeout(parseInt(e.target.value) || 10)}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 disabled:opacity-50 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Max RAM memory limit (MB)</label>
                        <input
                          type="number"
                          disabled={!user?.is_admin}
                          value={sandboxMemory}
                          onChange={(e) => setSandboxMemory(parseInt(e.target.value) || 128)}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 disabled:opacity-50 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>
                    </div>

                    {user?.is_admin && (
                      <button
                        onClick={handleSaveSandbox}
                        disabled={savingSandbox}
                        className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-black hover:bg-neutral-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        {savingSandbox ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save Sandbox Runtime Config
                      </button>
                    )}

                    <div className="pt-4 border-t border-neutral-900 space-y-3">
                      <h4 className="text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">Pre-installed python libraries</h4>
                      
                      {user?.is_admin && (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Package name (e.g. pandas, numpy)"
                            value={newPackage}
                            onChange={(e) => setNewPackage(e.target.value)}
                            className="flex-1 text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-1.5 focus:outline-none text-neutral-300"
                          />
                          <button
                            onClick={handleInstallPackage}
                            disabled={installingPackage || !newPackage}
                            className="flex items-center gap-1 px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 text-neutral-200"
                          >
                            {installingPackage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Install
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {pipPackages.length === 0 ? (
                          <span className="text-xs text-neutral-500">No custom packages installed.</span>
                        ) : (
                          pipPackages.map(pkg => (
                            <span key={pkg} className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] bg-neutral-950 border border-neutral-900 rounded-md font-[family-name:var(--font-geist-mono)]">
                              <span>{pkg}</span>
                              {user?.is_admin && (
                                <button
                                  onClick={() => handleRemovePackage(pkg)}
                                  className="text-neutral-500 hover:text-red-400 p-0.5"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* HOTKEYS MAPPING */}
                {activeTab === "shortcuts" && (
                  <div className="space-y-4 animate-fade-in select-none">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <Keyboard className="w-4 h-4 text-neutral-300" />
                      <span>Configure dynamic key mappings. Press key combinations to bind automatically.</span>
                    </div>

                    <div className="divide-y divide-neutral-900 border border-neutral-900 bg-[#0e0e0e] rounded-xl overflow-hidden px-4">
                      {[
                        { id: "commandPalette", label: "Command Palette Overlay" },
                        { id: "newChat", label: "Initialize New Conversation" },
                        { id: "toggleSidebar", label: "Collapse / Expand Sidebar" },
                        { id: "focusInput", label: "Focus Message Prompt Box" },
                        { id: "switchChats", label: "Cycle Active Chats index" },
                        { id: "closeOverlays", label: "Cancel Dialog overlays" }
                      ].map((item) => {
                        const currentBind = (store.shortcuts as any)[item.id] || "unmapped";
                        const isBinding = bindingKey === item.id;
                        return (
                          <div key={item.id} className="flex justify-between items-center py-3.5 text-xs">
                            <span className="text-neutral-300 font-medium">{item.label}</span>
                            <button
                              onClick={() => setBindingKey(isBinding ? null : item.id)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg border text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer",
                                isBinding
                                  ? "bg-red-950 border-red-800 text-red-300 animate-pulse"
                                  : "bg-neutral-950 border-neutral-850 hover:bg-neutral-900 text-neutral-400 hover:text-white"
                              )}
                            >
                              {isBinding ? "Listening..." : currentBind}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* WORKSPACE ADMIN PANEL */}
                {activeTab === "admin" && user?.is_admin && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-3.5 bg-[#0e0e0e] border border-neutral-900 rounded-lg">
                        <div>
                          <span className="text-xs font-medium text-neutral-300 block">Allow New User Signups</span>
                          <span className="text-[10px] text-neutral-500">Toggle public signup endpoint registration</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={signupEnabled}
                          onChange={(e) => setSignupEnabled(e.target.checked)}
                          className="w-4 h-4 accent-neutral-200 cursor-pointer"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-neutral-300">Allowed Domains (CSV)</label>
                        <input
                          type="text"
                          placeholder="e.g. google.com, deepmind.com"
                          value={allowedDomains}
                          onChange={(e) => setAllowedDomains(e.target.value)}
                          className="w-full text-xs bg-[#0e0e0e] border border-neutral-800 rounded-md px-3 py-2 focus:outline-none text-neutral-300 font-[family-name:var(--font-geist-mono)]"
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleSaveAdminGlobal}
                      disabled={savingAdmin}
                      className="flex items-center gap-1.5 px-3 py-2 bg-neutral-100 text-black hover:bg-neutral-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      {savingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Global Settings
                    </button>

                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-neutral-500 uppercase tracking-widest">
                        <span>Workspace Activity Audit logs</span>
                        <button
                          onClick={fetchLogs}
                          disabled={loadingLogs}
                          className="flex items-center gap-1 text-[9px] hover:text-white lowercase border border-neutral-850 bg-neutral-950 px-2 py-0.5 rounded"
                        >
                          {loadingLogs ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <RefreshCw className="w-2.5 h-2.5" />}
                          Refresh
                        </button>
                      </div>
                      
                      <div className="w-full bg-[#070707] border border-neutral-900 rounded-xl p-4 min-h-[120px] max-h-[220px] overflow-y-auto space-y-1.5 font-[family-name:var(--font-geist-mono)] text-[10px] leading-relaxed text-neutral-400 select-text">
                        {adminLogs.map((log, index) => (
                          <div key={index} className="flex gap-2.5 items-start">
                            <span className="text-neutral-600 font-bold shrink-0">{`[${index}]`}</span>
                            <span className="text-neutral-400">{log}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ABOUT */}
                {activeTab === "about" && (
                  <div className="space-y-4 animate-fade-in text-center py-12 select-none">
                    <div className="w-16 h-16 mx-auto bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-neutral-200" strokeWidth={1.2} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-lg text-neutral-200">AI Operating Workspace</h4>
                      <p className="text-xs text-neutral-500">v2.0.0 (Customization Release)</p>
                    </div>
                    <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                      A premium, pitch-black AI compilation environment featuring dynamic vector integrations, sandboxed compilers, and multi-node execution chains.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 border-t border-neutral-800 bg-[#070707] flex justify-end shrink-0">
                <button onClick={onClose} className="px-4 py-2 bg-neutral-200 hover:bg-white text-black rounded-lg text-xs font-semibold transition-colors cursor-pointer">
                  Apply & Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
