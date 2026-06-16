"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Plus, Upload, Trash2, 
  FileText, X, 
  RefreshCw, Loader2
} from "lucide-react";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { toast } from "../ui/toast";
import { motion, AnimatePresence } from "framer-motion";
import { NotebookActions } from "./notebook-actions";

interface KB {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  document_count: number;
}

interface KBDetail {
  id: string;
  name: string;
  description?: string;
  documents: {
    id: string;
    filename: string;
    file_size: number;
    chunk_count: number;
    created_at: string;
  }[];
  notes: {
    id: string;
    filename: string;
    content: string;
    updated_at: string;
  }[];
}

export function KnowledgePanel() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [kbDetail, setKbDetail] = useState<KBDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState<"sources" | "notes">("sources");
  
  const [createOpen, setCreateOpen] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [newKbDesc, setNewKbDesc] = useState("");
  const [creating, setCreating] = useState(false);
  
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchKBs = async () => {
    try {
      const data = await apiRequest<KB[]>("/api/knowledge");
      setKbs(data);
      if (data.length > 0 && !selectedKbId) {
        setSelectedKbId(data[0].id);
      }
    } catch (err: any) {
      toast.error(`Failed to load notebooks: ${err.message}`);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchKBDetail = async (id: string) => {
    setLoadingDetail(true);
    try {
      const data = await apiRequest<KBDetail>(`/api/knowledge/${id}`);
      setKbDetail(data);
    } catch (err: any) {
      toast.error(`Failed to load details: ${err.message}`);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    fetchKBs();
  }, []);

  useEffect(() => {
    if (selectedKbId) {
      fetchKBDetail(selectedKbId);
      setActiveTab("sources");
    } else {
      setKbDetail(null);
    }
  }, [selectedKbId]);

  const handleCreateKB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKbName.trim()) return;

    setCreating(true);
    try {
      const data = await apiRequest<KB>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify({
          name: newKbName.trim(),
          description: newKbDesc.trim() || undefined
        })
      });
      toast.success(`Created: ${data.name}`);
      setNewKbName("");
      setNewKbDesc("");
      setCreateOpen(false);
      await fetchKBs();
      setSelectedKbId(data.id);
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKB = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? All documents and indexes will be removed.`)) return;

    try {
      await apiRequest(`/api/knowledge/${id}`, { method: "DELETE" });
      toast.success(`Deleted: ${name}`);
      if (selectedKbId === id) setSelectedKbId(null);
      fetchKBs();
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !selectedKbId) return;

    const validFiles = files.filter(f => f.size <= 15 * 1024 * 1024);
    if (validFiles.length < files.length) {
      toast.error("Some files exceed 15MB limit and were skipped.");
    }
    
    if (validFiles.length === 0) return;

    setUploading(true);
    setUploadProgress(`Processing ${validFiles.length} file(s)...`);

    try {
      const token = localStorage.getItem("auth-token");
      
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("knowledge_base_id", selectedKbId);
        
        const response = await fetch(`${getBaseUrl()}/api/documents/upload`, {
          method: "POST",
          headers: {
            ...(token ? { "Authorization": `Bearer ${token}` } : {})
          },
          body: formData
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.detail || `Upload failed for ${file.name}`);
        }
        return response.json();
      });

      await Promise.all(uploadPromises);
      toast.success(`Successfully uploaded and indexed ${validFiles.length} file(s).`);
      
      fetchKBDetail(selectedKbId);
      fetchKBs();
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: string, filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      await apiRequest(`/api/documents/${docId}`, { method: "DELETE" });
      toast.success(`Deleted: ${filename}`);
      if (selectedKbId) {
        fetchKBDetail(selectedKbId);
        fetchKBs();
      }
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex h-screen bg-background text-foreground select-none">
      {/* Notebooks sidebar */}
      <div className="w-72 border-r border-border flex flex-col shrink-0">
        <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="font-semibold text-sm">Notebooks</h2>
          <button 
            onClick={() => setCreateOpen(true)}
            className="p-1 hover:bg-accent text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title="New notebook"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {loadingList ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : kbs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                No notebooks yet.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-foreground text-background hover:bg-foreground/90 rounded-md text-xs font-medium transition-colors"
              >
                Create notebook
              </button>
            </div>
          ) : (
            kbs.map((kb) => (
              <div
                key={kb.id}
                onClick={() => setSelectedKbId(kb.id)}
                className={`group flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                  selectedKbId === kb.id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <div className="min-w-0">
                  <span className="text-xs font-medium truncate block">{kb.name}</span>
                  <span className="text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">
                    {kb.document_count} files
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteKB(kb.id, kb.name);
                  }}
                  className="p-1 hover:bg-accent text-muted-foreground hover:text-destructive rounded transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 bg-background flex flex-col min-w-0">
        {selectedKbId && kbDetail ? (
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border shrink-0">
              <h1 className="font-semibold text-base text-foreground">{kbDetail.name}</h1>
              {kbDetail.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{kbDetail.description}</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 px-6 border-b border-border shrink-0">
              <button
                onClick={() => setActiveTab("sources")}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "sources" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                Sources
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "notes" ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                Notes
                <span className="bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full text-[10px] leading-none">
                  {kbDetail.notes?.length || 0}
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "sources" ? (
                <div className="p-6 flex flex-col lg:flex-row gap-6">
                  {/* Upload zone */}
                  <div className="w-full lg:w-80 shrink-0 space-y-4">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Upload</span>
                    
                    <div 
                      onClick={() => !uploading && fileInputRef.current?.click()}
                      className={`border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
                        uploading
                          ? "border-foreground/20 cursor-wait"
                          : "border-border hover:border-foreground/20"
                      }`}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
                        className="hidden"
                        disabled={uploading}
                        multiple
                      />
                      
                      {uploading ? (
                        <div className="space-y-2">
                          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mx-auto" />
                          <p className="text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)]">
                            {uploadProgress}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload className="w-5 h-5 text-muted-foreground mx-auto" />
                          <div>
                            <p className="text-xs font-medium text-foreground">Drop file(s) here</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              PDF, DOCX, TXT, MD, CSV, JSON · 15MB max per file
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-3 rounded-lg border border-border space-y-2">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Stats</span>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 bg-muted rounded-md">
                          <span className="text-[10px] text-muted-foreground block">Documents</span>
                          <span className="font-semibold text-sm text-foreground">{kbDetail.documents.length}</span>
                        </div>
                        <div className="p-2 bg-muted rounded-md">
                          <span className="text-[10px] text-muted-foreground block">Chunks</span>
                          <span className="font-semibold text-sm text-foreground">
                            {kbDetail.documents.reduce((acc, curr) => acc + curr.chunk_count, 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <NotebookActions kbId={kbDetail.id} onActionComplete={() => fetchKBDetail(kbDetail.id)} />
                  </div>

                  {/* Files list */}
                  <div className="flex-1 space-y-3 min-w-0">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Files</span>
                    
                    {loadingDetail ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : kbDetail.documents.length === 0 ? (
                      <div className="border border-dashed border-border rounded-lg p-8 text-center text-xs text-muted-foreground">
                        No files yet. Upload a document to begin.
                      </div>
                    ) : (
                      <div className="border border-border rounded-lg overflow-hidden">
                        <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                          {kbDetail.documents.map((doc) => (
                            <div key={doc.id} className="p-3 flex items-center justify-between gap-3 hover:bg-accent/30 transition-colors">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-xs font-medium truncate block text-foreground" title={doc.filename}>
                                    {doc.filename}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)] mt-0.5">
                                    <span>{formatBytes(doc.file_size)}</span>
                                    <span>·</span>
                                    <span>{doc.chunk_count} chunks</span>
                                    <span>·</span>
                                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                                className="p-1.5 hover:bg-accent text-muted-foreground hover:text-destructive rounded-md transition-colors shrink-0"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {/* Notes tab */}
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : kbDetail.notes && kbDetail.notes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {kbDetail.notes.map((note) => (
                        <div 
                          key={note.id} 
                          className="border border-border bg-card hover:border-foreground/30 p-4 rounded-xl cursor-pointer transition-colors shadow-sm flex flex-col h-40"
                        >
                          <h4 className="font-medium text-sm text-foreground truncate mb-2">{note.filename}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-4 flex-1 whitespace-pre-wrap font-[family-name:var(--font-geist-sans)]">
                            {note.content}
                          </p>
                          <div className="mt-3 text-[10px] text-muted-foreground font-[family-name:var(--font-geist-mono)] flex justify-between items-center shrink-0">
                            <span>{new Date(note.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-border rounded-lg p-12 text-center">
                      <p className="text-sm font-medium text-foreground">No notes yet</p>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                        Save chat messages or excerpts to notes, or generate insights like FAQs and Study Guides.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <h3 className="font-medium text-sm text-foreground">Select a notebook</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Create a knowledge notebook and upload documents for retrieval.
            </p>
          </div>
        )}
      </div>

      {/* Create KB dialog */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              className="relative w-full max-w-sm bg-card border border-border shadow-lg rounded-xl overflow-hidden z-50 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm text-foreground">New notebook</h3>
                <button 
                  onClick={() => setCreateOpen(false)}
                  className="p-1 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <form onSubmit={handleCreateKB} className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Research Papers"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    className="w-full bg-card border border-border focus:border-foreground/20 rounded-md px-3 py-2 text-sm outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <textarea
                    placeholder="Optional description..."
                    value={newKbDesc}
                    onChange={(e) => setNewKbDesc(e.target.value)}
                    className="w-full bg-card border border-border focus:border-foreground/20 rounded-md px-3 py-2 text-sm outline-none resize-none h-16 leading-relaxed transition-colors"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-3 py-1.5 border border-border hover:bg-accent rounded-md text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newKbName.trim()}
                    className="px-3 py-1.5 bg-foreground text-background hover:bg-foreground/90 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {creating && <Loader2 className="w-3 h-3 animate-spin" />}
                    Create
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
