"use client";

import React, { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { 
  X, Plus, Search, Tag, Play, 
  Trash2, Edit2, Loader2, ClipboardCheck
} from "lucide-react";

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  variables: string[];
  tags: string[];
}

interface PromptLibraryProps {
  open: boolean;
  onClose: () => void;
  onInsertPrompt: (compiledPrompt: string) => void;
}

export function PromptLibrary({ open, onClose, onInsertPrompt }: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Editor states
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  // Variable compiler states
  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  const fetchPrompts = async () => {
    try {
      const data = await apiRequest<{ prompts: PromptTemplate[] }>("/api/prompts");
      setPrompts(data.prompts || []);
    } catch (err) {
      console.error("Failed to fetch prompts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchPrompts();
      setIsEditing(false);
      setEditingId(null);
      setSelectedPrompt(null);
      setVariableValues({});
    }
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Title and Content are required");
      return;
    }

    try {
      if (editingId) {
        await apiRequest(`/api/prompts/${editingId}`, {
          method: "PUT",
          body: JSON.stringify({ title, content, tags })
        });
        toast.success("Template updated");
      } else {
        await apiRequest("/api/prompts", {
          method: "POST",
          body: JSON.stringify({ title, content, tags })
        });
        toast.success("Template added");
      }
      setIsEditing(false);
      setEditingId(null);
      setTitle("");
      setContent("");
      setTags("");
      fetchPrompts();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this prompt template?")) return;

    try {
      await apiRequest(`/api/prompts/${id}`, { method: "DELETE" });
      toast.error("Template removed");
      fetchPrompts();
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleSelectToUse = (p: PromptTemplate) => {
    if (p.variables.length === 0) {
      onInsertPrompt(p.content);
      onClose();
    } else {
      setSelectedPrompt(p);
      const initialVals: Record<string, string> = {};
      p.variables.forEach(v => {
        initialVals[v] = "";
      });
      setVariableValues(initialVals);
    }
  };

  const handleCompileAndInsert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrompt) return;

    let compiled = selectedPrompt.content;
    for (const [varName, varVal] of Object.entries(variableValues)) {
      if (!varVal.trim()) {
        toast.error(`Please provide a value for {{${varName}}}`);
        return;
      }
      compiled = compiled.replace(new RegExp(`\\{\\{\\s*${varName}\\s*\\}\\}`, 'g'), varVal.trim());
    }

    onInsertPrompt(compiled);
    onClose();
  };

  const startEdit = (p: PromptTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setTitle(p.title);
    setContent(p.content);
    setTags(p.tags.join(", "));
    setIsEditing(true);
  };

  const startCreate = () => {
    setEditingId(null);
    setTitle("");
    setContent("");
    setTags("");
    setIsEditing(true);
  };

  const filteredPrompts = prompts.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm select-none p-4">
      <div className="w-full max-w-lg bg-card border border-neutral-900 rounded-2xl flex flex-col max-h-[80vh] shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-neutral-900 flex justify-between items-center shrink-0">
          <div>
            <h3 className="font-semibold text-neutral-200 text-sm">Prompt Library</h3>
            <p className="text-[10px] text-neutral-500 mt-0.5">Reuse custom layouts and prompt structures with placeholder values.</p>
          </div>
          <button onClick={onClose} className="p-1 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          
          {/* VIEW: COMPILING PLACEHOLDERS */}
          {selectedPrompt && (
            <form onSubmit={handleCompileAndInsert} className="space-y-4 animate-fade-in text-left">
              <div>
                <span className="text-[10px] text-neutral-500 block mb-1 uppercase font-bold tracking-wider">Compiling Template</span>
                <span className="font-semibold text-xs text-neutral-200 block">{selectedPrompt.title}</span>
                <p className="text-[11px] text-neutral-400 mt-2 bg-neutral-950 p-3 rounded-lg border border-neutral-900 leading-relaxed italic select-text select-all">
                  {selectedPrompt.content}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <span className="text-[10px] text-neutral-500 block mb-1 uppercase font-bold tracking-wider">Provide Variable Values</span>
                {selectedPrompt.variables.map((v) => (
                  <div key={v} className="space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                      {v.replace(/_/g, " ")}
                    </label>
                    <input
                      type="text"
                      required
                      value={variableValues[v] || ""}
                      onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                      placeholder={`Enter value for {{${v}}}`}
                      className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-900">
                <button
                  type="button"
                  onClick={() => setSelectedPrompt(null)}
                  className="px-4 py-2 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-4 py-2 bg-neutral-100 text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  Insert Compiled Prompt
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CREATE/EDIT TEMPLATE */}
          {isEditing && !selectedPrompt && (
            <form onSubmit={handleSave} className="space-y-4 animate-fade-in text-left">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2">
                  <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Code Optimizer"
                    className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Prompt Content</label>
                <textarea
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Draft your prompt structure. Add variables inside double brackets, e.g., 'Translate this text: {{text}} into {{language}}'."
                  className="w-full text-xs min-h-[110px] bg-neutral-950 border border-neutral-850 rounded-lg p-3 text-neutral-300 focus:outline-none focus:border-neutral-750 resize-none font-sans leading-relaxed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. code, translation"
                  className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-900">
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
                  {editingId ? "Save Changes" : "Save Template"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: MAIN LISTS BROWSER */}
          {!isEditing && !selectedPrompt && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-neutral-500/50" strokeWidth={1.5} />
                  <input
                    type="text"
                    placeholder="Search templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg pl-8 pr-3 py-1.5 focus:outline-none"
                  />
                </div>
                <button
                  onClick={startCreate}
                  className="px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
                >
                  Add Custom
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                </div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-12 text-[11px] text-neutral-500 font-medium">
                  No templates match your search.
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[45vh] overflow-y-auto pr-1">
                  {filteredPrompts.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectToUse(p)}
                      className="group bg-neutral-950 border border-neutral-900 rounded-xl p-3.5 hover:border-neutral-850 transition-colors flex flex-col justify-between relative cursor-pointer"
                    >
                      <div className="min-w-0 pr-12">
                        <span className="font-semibold text-xs text-neutral-200 block truncate">{p.title}</span>
                        <p className="text-[10px] text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                          {p.content}
                        </p>
                      </div>

                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {p.tags.map(t => (
                            <span key={t} className="flex items-center gap-0.5 text-[8px] bg-neutral-900 border border-neutral-850 text-neutral-500 px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">
                              <Tag className="w-2 h-2" />
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hover action drawer */}
                      <div className="absolute right-3.5 top-3.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => startEdit(p, e)}
                          className="p-1 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white rounded transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, p.id)}
                          className="p-1 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-red-500 hover:text-red-400 rounded transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
