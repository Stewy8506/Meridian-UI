"use client";

import { useState, useEffect } from "react";
import { 
  Search, Eye, EyeOff, 
  Trash2, RefreshCw, Loader2,
  Save
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

export function ProviderGrid() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "local" | "cloud" | "specialist">("all");
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  
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
      toast.success(`${providers.find(p => p.id === providerId)?.name || providerId} key saved`);
      setApiKeys(prev => ({ ...prev, [providerId]: "" }));
      await fetchProviders();
    } catch (err: any) {
      toast.error(`Failed to save: ${err.message}`);
    } finally {
      setSavingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleDeleteKey = async (providerId: string) => {
    if (!confirm(`Remove API key for ${providers.find(p => p.id === providerId)?.name}?`)) return;

    setDeletingIds(prev => ({ ...prev, [providerId]: true }));
    try {
      await apiRequest(`/api/keys/${providerId}`, { method: "DELETE" });
      toast.success(`Removed key for ${providers.find(p => p.id === providerId)?.name}`);
      await fetchProviders();
    } catch (err: any) {
      toast.error(`Failed to delete: ${err.message}`);
    } finally {
      setDeletingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleTestConnection = async (providerId: string) => {
    setTestingIds(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await apiRequest<{ status: string; message: string }>(`/api/keys/${providerId}/test`);
      if (res.status === "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(`Test failed: ${err.message}`);
    } finally {
      setTestingIds(prev => ({ ...prev, [providerId]: false }));
    }
  };

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
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-xs">Loading providers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs bg-card border border-border rounded-md pl-8 pr-3 py-1.5 focus:outline-none focus:border-foreground/20"
          />
        </div>

        <div className="flex gap-1">
          {(["all", "local", "cloud", "specialist"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-md capitalize transition-colors ${
                activeCategory === cat
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filteredProviders.map((prov) => {
          const isExpanded = expandedId === prov.id;
          const isTesting = testingIds[prov.id];
          const isSaving = savingIds[prov.id];
          const isDeleting = deletingIds[prov.id];
          const showKey = showKeys[prov.id];
          
          return (
            <div
              key={prov.id}
              className={`flex flex-col rounded-lg border transition-colors ${
                isExpanded ? "border-foreground/15 md:col-span-2" : "border-border hover:border-foreground/10"
              }`}
            >
              {/* Card Header */}
              <div 
                className="p-3 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : prov.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center shrink-0 text-[10px] font-semibold text-muted-foreground uppercase">
                    {prov.name.slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-medium text-xs text-foreground block truncate">{prov.name}</span>
                    <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)] block truncate">{prov.default_model}</span>
                  </div>
                </div>
                
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${prov.configured ? "bg-foreground/60" : "bg-border"}`} />
              </div>

              {/* Expand drawer */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-border"
                  >
                    <div className="p-3 space-y-3 text-xs">
                      {prov.id === "local" || prov.id === "ollama" ? (
                        <div className="p-2.5 bg-muted rounded-md">
                          <p className="text-muted-foreground leading-relaxed">
                            Local provider — ensure your engine is running. No API key needed.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="font-medium text-foreground">API key</label>
                            {prov.configured && (
                              <span className="text-[10px] text-muted-foreground">Configured</span>
                            )}
                          </div>
                          
                          <div className="relative flex items-center">
                            <input
                              type={showKey ? "text" : "password"}
                              placeholder={prov.configured ? "••••••••••••" : "sk-..." }
                              value={apiKeys[prov.id] || ""}
                              onChange={(e) => setApiKeys(prev => ({ ...prev, [prov.id]: e.target.value }))}
                              className="w-full bg-card border border-border rounded-md pl-3 pr-8 py-1.5 focus:outline-none focus:border-foreground/20 font-[family-name:var(--font-geist-mono)] text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => setShowKeys(prev => ({ ...prev, [prov.id]: !prev[prov.id] }))}
                              className="absolute right-2 text-muted-foreground hover:text-foreground"
                            >
                              {showKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1 justify-end">
                        {prov.configured && prov.id !== "local" && prov.id !== "ollama" && (
                          <button
                            onClick={() => handleDeleteKey(prov.id)}
                            disabled={isDeleting}
                            className="mr-auto flex items-center gap-1 px-2 py-1 text-destructive hover:bg-destructive/10 rounded-md font-medium transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}

                        <button
                          onClick={() => handleTestConnection(prov.id)}
                          disabled={isTesting}
                          className="flex items-center gap-1 px-2.5 py-1 border border-border hover:bg-accent rounded-md font-medium transition-colors disabled:opacity-50"
                        >
                          {isTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                          Test
                        </button>

                        {prov.id !== "local" && prov.id !== "ollama" && (
                          <button
                            onClick={() => handleSaveKey(prov.id)}
                            disabled={isSaving}
                            className="flex items-center gap-1 px-2.5 py-1 bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium transition-colors disabled:opacity-50"
                          >
                            {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save
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
