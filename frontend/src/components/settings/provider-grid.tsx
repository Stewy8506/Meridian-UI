"use client";

import { useState, useEffect } from "react";
import { 
  Cpu, Sparkles, Globe, Search, Zap, Cloud, 
  Database, Network, Compass, Eye, EyeOff, 
  Smile, CloudLightning, Wind, Server, Trash2, 
  CheckCircle2, XCircle, AlertTriangle, RefreshCw,
  Lock, Save
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { toast } from "../ui/toast";
import { motion, AnimatePresence } from "framer-motion";

interface ProviderStatus {
  id: string;
  name: string;
  icon: string;
  adapter: string;
  configured: boolean;
  default_model: string;
}

// Map provider icon names to Lucide icons or custom logos
function ProviderIcon({ name, className }: { name: string; className?: string }) {
  const cn = className || "w-5 h-5";
  switch (name) {
    case "cpu": return <Cpu className={cn} />;
    case "sparkles": return <Sparkles className={cn} />;
    case "zap": return <Zap className={cn} />;
    case "network": return <Network className={cn} />;
    case "wind": return <Wind className={cn} />;
    case "compass": return <Compass className={cn} />;
    case "eye": return <Eye className={cn} />;
    case "globe": return <Globe className={cn} />;
    case "search": return <Search className={cn} />;
    case "server": return <Server className={cn} />;
    case "database": return <Database className={cn} />;
    case "smile": return <Smile className={cn} />;
    case "cloud-lightning": return <CloudLightning className={cn} />;
    case "cloud": return <Cloud className={cn} />;
    case "cloud-rain": return <Cloud className={cn} />;
    case "openai":
      return (
        <span className={`${cn} flex items-center justify-center font-bold text-xs bg-emerald-500/10 text-emerald-500 rounded-lg`}>
          OA
        </span>
      );
    case "anthropic":
      return (
        <span className={`${cn} flex items-center justify-center font-bold text-xs bg-amber-500/10 text-amber-500 rounded-lg`}>
          AN
        </span>
      );
    case "google":
      return (
        <span className={`${cn} flex items-center justify-center font-bold text-xs bg-blue-500/10 text-blue-500 rounded-lg`}>
          G
        </span>
      );
    default:
      return <Cpu className={cn} />;
  }
}

export function ProviderGrid() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "local" | "cloud" | "specialist">("all");
  
  // Track expanded configuration drawer per card
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit state for API keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
  // Activity states
  const [testingIds, setTestingIds] = useState<Record<string, boolean>>({});
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  const fetchProviders = async () => {
    try {
      const data = await apiRequest<ProviderStatus[]>("/api/keys/providers");
      setProviders(data);
    } catch (err: any) {
      toast.error(`Failed to fetch providers: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleSaveKey = async (providerId: string) => {
    const keyVal = apiKeys[providerId]?.trim();
    if (!keyVal) {
      toast.error("API key cannot be empty");
      return;
    }
    
    setSavingIds(prev => ({ ...prev, [providerId]: true }));
    try {
      await apiRequest("/api/keys", {
        method: "POST",
        body: JSON.stringify({ provider: providerId, key: keyVal })
      });
      toast.success(`${providers.find(p => p.id === providerId)?.name || providerId} key saved successfully`);
      
      // Clear key input after success to keep screen clean
      setApiKeys(prev => ({ ...prev, [providerId]: "" }));
      // Reload provider config status
      await fetchProviders();
    } catch (err: any) {
      toast.error(`Failed to save key: ${err.message}`);
    } finally {
      setSavingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleDeleteKey = async (providerId: string) => {
    if (!confirm(`Are you sure you want to remove the API key for ${providers.find(p => p.id === providerId)?.name}?`)) {
      return;
    }

    setDeletingIds(prev => ({ ...prev, [providerId]: true }));
    try {
      await apiRequest(`/api/keys/${providerId}`, {
        method: "DELETE"
      });
      toast.success(`Removed key for ${providers.find(p => p.id === providerId)?.name}`);
      await fetchProviders();
    } catch (err: any) {
      toast.error(`Failed to delete key: ${err.message}`);
    } finally {
      setDeletingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingIds(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await apiRequest<{ status: string; message: string }>(`/api/keys/${providerId}/test`);
      if (res.status === "success") {
        toast.success(`Success: ${res.message}`);
      } else {
        toast.error(`Failed: ${res.message}`);
      }
    } catch (err: any) {
      toast.error(`Connection test failed: ${err.message}`);
    } finally {
      setTestingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

  // Filter providers based on search query and category tab
  const filteredProviders = providers.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.default_model.toLowerCase().includes(searchQuery.toLowerCase());
                          
    if (!matchesSearch) return false;
    
    if (activeCategory === "all") return true;
    if (activeCategory === "local") return p.id === "local" || p.id === "ollama";
    if (activeCategory === "cloud") return ["openai", "google", "anthropic", "azure", "bedrock"].includes(p.id);
    if (activeCategory === "specialist") return !["local", "ollama", "openai", "google", "anthropic", "azure", "bedrock"].includes(p.id);
    return true;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <span className="text-sm font-semibold">Scanning connection matrix...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground/80" />
          <input
            type="text"
            placeholder="Search provider configs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-muted/40 border border-border/80 rounded-xl pl-9 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Categories */}
        <div className="flex bg-muted/30 border border-border/40 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
          {(["all", "local", "cloud", "specialist"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-background text-foreground shadow-sm font-bold border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "specialist" ? "Specialists (18+)" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((prov) => {
          const isExpanded = expandedId === prov.id;
          const isTesting = testingIds[prov.id];
          const isSaving = savingIds[prov.id];
          const isDeleting = deletingIds[prov.id];
          const showKey = showKeys[prov.id];
          
          return (
            <div
              key={prov.id}
              className={`group relative flex flex-col justify-between rounded-2xl border transition-all duration-300 ${
                prov.configured 
                  ? "bg-emerald-500/[0.02] border-emerald-500/20 hover:border-emerald-500/40" 
                  : "bg-muted/10 border-border/60 hover:border-muted-foreground/30"
              } ${isExpanded ? "border-primary/50 shadow-md ring-1 ring-primary/20 md:col-span-2 lg:col-span-3" : ""}`}
            >
              {/* Subtle top indicator bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${
                prov.configured ? "bg-emerald-500/60" : "bg-amber-500/20"
              }`} />

              {/* Card Header Info */}
              <div 
                className="p-4 flex items-start gap-3.5 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : prov.id)}
              >
                <div className={`p-2.5 rounded-xl border flex items-center justify-center shrink-0 ${
                  prov.configured ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-muted/60 border-border/80 text-muted-foreground"
                }`}>
                  <ProviderIcon name={prov.icon} className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs md:text-sm text-foreground block truncate leading-tight">
                      {prov.name}
                    </span>
                    
                    {/* Status tag */}
                    {prov.configured ? (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Connected
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-amber-500 bg-amber-500/5 border border-amber-500/15 px-1.5 py-0.5 rounded-full">
                        Offline
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono block mt-1.5 truncate">
                    {prov.default_model || "No default model"}
                  </span>
                </div>
              </div>

              {/* Drawer for configuration */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border/50 bg-muted/20"
                  >
                    <div className="p-4 space-y-4 text-xs">
                      {prov.id === "local" || prov.id === "ollama" ? (
                        <div className="p-3 bg-primary/5 border border-primary/10 rounded-xl space-y-1.5">
                          <p className="font-bold text-foreground">Local Server Endpoint</p>
                          <p className="text-muted-foreground leading-normal">
                            This provider runs locally on your workstation. Ensure your local engine (LM Studio or Ollama) is actively running and model downloads are configured. No cloud API keys are required.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="font-bold text-foreground flex items-center gap-1.5">
                              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                              Provider API Access Key
                            </label>
                            {prov.configured && (
                              <span className="text-[10px] text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                Decrypted Key Loaded
                              </span>
                            )}
                          </div>
                          
                          <div className="relative flex items-center">
                            <input
                              type={showKey ? "text" : "password"}
                              placeholder={prov.configured ? "••••••••••••••••••••••••" : "sk-..." }
                              value={apiKeys[prov.id] || ""}
                              onChange={(e) => setApiKeys(prev => ({ ...prev, [prov.id]: e.target.value }))}
                              className="w-full bg-background border border-border/80 rounded-xl pl-3 pr-10 py-2 focus:outline-none focus:ring-1 focus:ring-ring font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                              className="absolute right-3 text-muted-foreground hover:text-foreground"
                            >
                              {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          
                          <p className="text-[10px] text-muted-foreground leading-relaxed">
                            API keys are securely encrypted at rest using industry-standard fernet-keys.
                          </p>
                        </div>
                      )}

                      {/* Card actions */}
                      <div className="flex flex-wrap gap-2 pt-2 justify-end">
                        {prov.configured && prov.id !== "local" && prov.id !== "ollama" && (
                          <button
                            onClick={() => handleDeleteKey(prov.id)}
                            disabled={isDeleting}
                            className="mr-auto flex items-center gap-1.5 px-3 py-2 border border-destructive/20 text-destructive hover:bg-destructive/10 rounded-xl font-bold transition-all disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleTestConnection(prov.id)}
                          disabled={isTesting}
                          className="flex items-center gap-1.5 px-3.5 py-2 border border-border hover:bg-muted rounded-xl font-bold transition-all text-foreground disabled:opacity-50"
                        >
                          {isTesting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Globe className="w-3.5 h-3.5" />
                          )}
                          <span>Test connection</span>
                        </button>

                        {prov.id !== "local" && prov.id !== "ollama" && (
                          <button
                            onClick={() => handleSaveKey(prov.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1.5 px-4.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm"
                          >
                            {isSaving ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Save className="w-3.5 h-3.5" />
                            )}
                            <span>Save key</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
