"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { X, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SettingsDialog({ open, onClose }: { open: boolean, onClose: () => void }) {
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
    setExaApiKey
  } = useAppStore();
  
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showTavilyKey, setShowTavilyKey] = useState(false);
  const [showExaKey, setShowExaKey] = useState(false);

  const activeKey = provider === 'google' ? googleApiKey : provider === 'openai' ? openaiApiKey : '';

  useEffect(() => {
    if (!open) return;

    if ((provider === 'google' || provider === 'openai') && !activeKey) {
      setAvailableModels([]);
      setError("Please configure your API key below to fetch available models.");
      setLoading(false);
      return;
    }

    const fetchModels = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/api/chat/models?provider=${provider}`, {
          headers: {
            'Authorization': `Bearer ${activeKey || 'not-needed'}`
          }
        });
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || "Failed to fetch models");
        }
        const data = await response.json();
        setAvailableModels(data.models || []);
        
        // If current model is not in available models, set first one as default
        if (data.models && data.models.length > 0 && !data.models.includes(model)) {
          setModel(data.models[0]);
        }
      } catch (err: any) {
        setError(err.message || "An error occurred");
        setAvailableModels([]);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, [provider, open, setModel, activeKey]);


  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="relative w-full max-w-lg bg-card border border-border shadow-lg rounded-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border/50">
              <h2 className="text-lg font-semibold">Settings</h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Provider</label>
                <div className="grid grid-cols-3 gap-2">
                  {['local', 'google', 'openai'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setProvider(p as any)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                        provider === p 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key Inputs (Conditional) */}
              {provider === 'google' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Google API Key</label>
                    <a 
                      href="https://aistudio.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:underline"
                    >
                      Get API Key
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showGoogleKey ? "text" : "password"}
                      value={googleApiKey}
                      onChange={(e) => setGoogleApiKey(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                      placeholder="AIzaSy..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowGoogleKey(!showGoogleKey)}
                      className="absolute right-3 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showGoogleKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required to fetch models and run Google models. Stored locally in your browser.
                  </p>
                </div>
              )}

              {provider === 'openai' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">OpenAI API Key</label>
                    <a 
                      href="https://platform.openai.com/api-keys" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:underline"
                    >
                      Get API Key
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showOpenaiKey ? "text" : "password"}
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                      placeholder="sk-proj-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                      className="absolute right-3 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showOpenaiKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Required to fetch models and run OpenAI models. Stored locally in your browser.
                  </p>
                </div>
              )}

              {/* Search Provider Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Search Provider</label>
                <div className="grid grid-cols-2 gap-2">
                  {['tavily', 'exa'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setSearchProvider(p as any)}
                      className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all border ${
                        searchProvider === p 
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm' 
                          : 'bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search API Key Inputs */}
              {searchProvider === 'tavily' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Tavily API Key</label>
                    <a 
                      href="https://tavily.com/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:underline"
                    >
                      Get API Key
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showTavilyKey ? "text" : "password"}
                      value={tavilyApiKey}
                      onChange={(e) => setTavilyApiKey(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                      placeholder="tvly-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowTavilyKey(!showTavilyKey)}
                      className="absolute right-3 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showTavilyKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              {searchProvider === 'exa' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-sm font-medium">Exa API Key</label>
                    <a 
                      href="https://exa.ai/" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-xs text-primary hover:underline"
                    >
                      Get API Key
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <input
                      type={showExaKey ? "text" : "password"}
                      value={exaApiKey}
                      onChange={(e) => setExaApiKey(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg pl-3 pr-10 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                      placeholder="exa-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowExaKey(!showExaKey)}
                      className="absolute right-3 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showExaKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Model Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Model</label>
                {loading ? (
                  <div className="text-xs text-muted-foreground animate-pulse py-2">
                    Loading available models...
                  </div>
                ) : error || availableModels.length === 0 ? (
                  <>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                      placeholder="e.g. Qwen 3.5 or gemma-4"
                    />
                    {error && (
                      <p className="text-xs text-red-500 bg-red-500/10 p-2 rounded border border-red-500/20 whitespace-pre-wrap">
                        {error} {!activeKey && (provider === 'google' || provider === 'openai') ? '' : 'You can manually type the model identifier above.'}
                      </p>
                    )}
                  </>
                ) : (
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-shadow"
                  >
                    {availableModels.map((m) => (
                      <option key={m} value={m} className="bg-background text-foreground">
                        {m}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-xs text-muted-foreground">
                  The exact model identifier as expected by the provider (e.g., 'gemini-1.5-pro' for Google, or 'stheno-v3' for Local).
                </p>
              </div>

            </div>

            <div className="p-4 border-t border-border/50 bg-muted/20 flex justify-end">
              <button onClick={onClose} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm">
                Save & Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
