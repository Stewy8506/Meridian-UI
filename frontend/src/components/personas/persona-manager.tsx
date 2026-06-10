"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { toast } from "@/components/ui/toast";
import { 
  X, Plus, Code, BookOpen, PenTool, 
  UserCheck, HelpCircle, BarChart2, User, 
  Brain, Sparkles, Trash2, Edit2, Loader2, Play
} from "lucide-react";

interface Persona {
  id: string;
  name: string;
  avatar: string;
  system_prompt: string;
  default_model?: string;
  temperature: number;
  greeting?: string;
  is_system_preset: boolean;
}

interface PersonaManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectPersona?: (persona: Persona) => void;
}

const AVATAR_ICONS: Record<string, React.ComponentType<any>> = {
  "code": Code,
  "book-open": BookOpen,
  "pen-tool": PenTool,
  "user-check": UserCheck,
  "help-circle": HelpCircle,
  "bar-chart-2": BarChart2,
  "user": User,
  "brain": Brain,
  "sparkles": Sparkles
};

export function PersonaManager({ open, onClose, onSelectPersona }: PersonaManagerProps) {
  const { setSystemPrompt, setTemperature, setMessages } = useAppStore();
  const [personas, setProviders] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("user");
  const [systemPrompt, setPromptVal] = useState("");
  const [temperature, setTempVal] = useState(0.7);
  const [greeting, setGreeting] = useState("");

  const fetchPersonas = async () => {
    try {
      const data = await apiRequest<{ personas: Persona[] }>("/api/personas");
      setProviders(data.personas || []);
    } catch (err) {
      console.error("Failed to fetch personas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPersonas();
      setIsEditing(false);
      setEditingId(null);
    }
  }, [open]);

  const handleSelect = (p: Persona) => {
    setSystemPrompt(p.system_prompt);
    setTemperature(p.temperature);
    if (p.greeting) {
      // If conversation is empty, populate it with a greeting message
      const currentMsgs = useAppStore.getState().messages;
      if (currentMsgs.length === 0) {
        setMessages([{
          role: "assistant",
          content: p.greeting,
          timestamp: Date.now()
        }]);
      }
    }
    toast.success(`Active persona set: ${p.name}`);
    if (onSelectPersona) {
      onSelectPersona(p);
    }
    onClose();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !systemPrompt.trim()) {
      toast.error("Name and System Prompt are required");
      return;
    }

    try {
      if (editingId) {
        // Edit mode
        await apiRequest(`/api/personas/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ name, avatar, system_prompt: systemPrompt, temperature, greeting })
        });
        toast.success("Persona updated");
      } else {
        // Create mode
        await apiRequest("/api/personas", {
          method: "POST",
          body: JSON.stringify({ name, avatar, system_prompt: systemPrompt, temperature, greeting })
        });
        toast.success("Persona created");
      }
      setIsEditing(false);
      setEditingId(null);
      setName("");
      setAvatar("user");
      setPromptVal("");
      setTempVal(0.7);
      setGreeting("");
      fetchPersonas();
    } catch (err: any) {
      toast.error(`Error saving: ${err.message}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this custom persona?")) return;

    try {
      await apiRequest(`/api/personas/${id}`, {
        method: "DELETE"
      });
      toast.error("Persona deleted");
      fetchPersonas();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const startEdit = (p: Persona, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setName(p.name);
    setAvatar(p.avatar);
    setPromptVal(p.system_prompt);
    setTempVal(p.temperature);
    setGreeting(p.greeting || "");
    setIsEditing(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setName("");
    setAvatar("user");
    setPromptVal("");
    setTempVal(0.7);
    setGreeting("");
    setIsEditing(true);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
      <div className="w-full max-w-2xl bg-card border border-neutral-900 rounded-2xl flex flex-col max-h-[85vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-900 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-semibold text-neutral-200 text-sm">AI Personas Gallery</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Customize default instructions, temperatures, and welcome messages.</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. JavaScript Mentor"
                    className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Temperature ({temperature.toFixed(2)})</label>
                  <input
                    type="range"
                    min="0"
                    max="1.2"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTempVal(parseFloat(e.target.value))}
                    className="w-full h-1 bg-neutral-950 rounded-lg appearance-none cursor-pointer mt-3 accent-neutral-300"
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">Avatar Icon</label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-neutral-950 rounded-xl border border-neutral-900">
                  {Object.keys(AVATAR_ICONS).map((iconKey) => {
                    const IconComp = AVATAR_ICONS[iconKey];
                    const isSelected = avatar === iconKey;
                    return (
                      <button
                        type="button"
                        key={iconKey}
                        onClick={() => setAvatar(iconKey)}
                        className={`p-2 rounded-lg transition-all cursor-pointer ${
                          isSelected 
                            ? "bg-neutral-800 text-white border border-neutral-700" 
                            : "text-neutral-500 hover:text-neutral-300"
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">System Prompt (Instructions)</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setPromptVal(e.target.value)}
                  placeholder="Tell the AI who they are, how to act, and what styling standards to use..."
                  className="w-full text-xs min-h-[90px] bg-neutral-950 border border-neutral-850 rounded-lg p-3 text-neutral-300 focus:outline-none focus:border-neutral-750 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Greeting (Welcome Message)</label>
                <input
                  type="text"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  placeholder="e.g. Hello, ready to review some code?"
                  className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  {editingId ? "Save Changes" : "Create Persona"}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Available Profiles</span>
                <button
                  onClick={startCreate}
                  className="flex items-center gap-1 px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create custom
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-1">
                  {personas.map((p) => {
                    const AvatarIcon = AVATAR_ICONS[p.avatar] || User;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        className="group flex flex-col bg-neutral-950 border border-neutral-900 rounded-xl p-4 text-left transition-all hover:border-neutral-800 hover:bg-neutral-950/75 cursor-pointer relative"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-850 flex items-center justify-center shrink-0">
                            <AvatarIcon className="w-4 h-4 text-neutral-300" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-semibold text-xs text-neutral-200 block truncate pr-14">{p.name}</span>
                            <span className="text-[9px] text-neutral-500 font-medium">Temp: {p.temperature.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="text-[10px] text-neutral-400 mt-2.5 line-clamp-2 leading-relaxed">
                          {p.system_prompt}
                        </p>

                        {/* Hover controls */}
                        <div className="absolute right-3 top-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!p.is_system_preset ? (
                            <>
                              <button
                                onClick={(e) => startEdit(p, e)}
                                className="p-1 bg-neutral-900 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded border border-neutral-850 transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => handleDelete(e, p.id)}
                                className="p-1 bg-neutral-900 hover:bg-neutral-850 text-red-400 hover:text-red-300 rounded border border-neutral-850 transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[8px] border border-neutral-850 bg-neutral-900 px-1.5 py-0.5 rounded text-neutral-500 select-none uppercase tracking-widest font-bold">Preset</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
