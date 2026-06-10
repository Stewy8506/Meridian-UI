"use client";

import { useState, useEffect, useRef } from "react";
import { 
  FolderOpen, FolderPlus, Upload, Trash2, 
  FileText, Plus, Database, Sparkles, X, 
  ChevronRight, RefreshCw, Layers, HardDrive, CheckCircle2
} from "lucide-react";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { toast } from "../ui/toast";
import { motion, AnimatePresence } from "framer-motion";

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
}

export function KnowledgePanel() {
  const [kbs, setKbs] = useState<KB[]>([]);
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null);
  const [kbDetail, setKbDetail] = useState<KBDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Create KB dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newKbName, setNewKbName] = useState("");
  const [newKbDesc, setNewKbDesc] = useState("");
  const [creating, setCreating] = useState(false);
  
  // File upload state
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
      toast.error(`Failed to load collections: ${err.message}`);
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
      toast.error(`Failed to load collection details: ${err.message}`);
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
      toast.success(`Created knowledge base: ${data.name}`);
      setNewKbName("");
      setNewKbDesc("");
      setCreateOpen(false);
      
      // Update list and select the new one
      await fetchKBs();
      setSelectedKbId(data.id);
    } catch (err: any) {
      toast.error(`Failed to create collection: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteKB = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete knowledge base "${name}"?\nThis will permanently delete all associated documents and vector indexes.`)) {
      return;
    }

    try {
      await apiRequest(`/api/knowledge/${id}`, { method: "DELETE" });
      toast.success(`Deleted knowledge base: ${name}`);
      
      if (selectedKbId === id) {
        setSelectedKbId(null);
      }
      fetchKBs();
    } catch (err: any) {
      toast.error(`Failed to delete collection: ${err.message}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedKbId) return;

    // Validate size (e.g. max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size exceeds 15MB limit.");
      return;
    }

    setUploading(true);
    setUploadProgress("Reading file content...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("knowledge_base_id", selectedKbId);

    try {
      setUploadProgress("Parsing and generating embedding vectors...");
      const token = localStorage.getItem("auth-token");
      
      const response = await fetch(`${getBaseUrl()}/api/documents/upload`, {
        method: "POST",
        headers: {
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || "Upload failed");
      }

      const res = await response.json();
      toast.success(res.message || "File uploaded and indexed successfully!");
      
      // Reload kb details to show new file
      fetchKBDetail(selectedKbId);
      fetchKBs(); // Reload list counts
    } catch (err: any) {
      toast.error(`Ingestion error: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteDoc = async (docId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    try {
      await apiRequest(`/api/documents/${docId}`, { method: "DELETE" });
      toast.success(`Deleted file: ${filename}`);
      
      if (selectedKbId) {
        fetchKBDetail(selectedKbId);
        fetchKBs();
      }
    } catch (err: any) {
      toast.error(`Failed to delete file: ${err.message}`);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="flex h-screen bg-card text-foreground select-none">
      {/* 1. Left Sidebar - Collections List */}
      <div className="w-80 border-r border-border/60 bg-muted/10 flex flex-col shrink-0">
        <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="font-extrabold text-sm tracking-wide">Knowledge Hub</h2>
          </div>
          <button 
            onClick={() => setCreateOpen(true)}
            className="p-1.5 hover:bg-muted text-primary hover:text-primary/90 rounded-lg transition-colors border border-border/40 bg-background/50 shadow-sm"
            title="Create Knowledge Base"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* KB List Section */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loadingList ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading indexes...</span>
            </div>
          ) : kbs.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                <FolderOpen className="w-5 h-5" />
              </div>
              <p className="text-xs text-muted-foreground leading-normal">
                No custom knowledge bases found. Create one to enable document retrieval.
              </p>
              <button
                onClick={() => setCreateOpen(true)}
                className="w-full flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl text-xs font-semibold transition-all shadow-sm"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Create Collection</span>
              </button>
            </div>
          ) : (
            kbs.map((kb) => (
              <div
                key={kb.id}
                onClick={() => setSelectedKbId(kb.id)}
                className={`group flex items-center justify-between p-3 rounded-xl border cursor-pointer select-none transition-all ${
                  selectedKbId === kb.id
                    ? "bg-primary/10 border-primary text-foreground font-semibold"
                    : "bg-background/40 border-border/50 text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Database className={`w-4 h-4 shrink-0 ${selectedKbId === kb.id ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <span className="text-xs md:text-sm font-semibold truncate block leading-tight">{kb.name}</span>
                    <span className="text-[10px] text-muted-foreground/80 leading-none mt-1 block font-mono">
                      {kb.document_count} files indexed
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteKB(kb.id, kb.name);
                    }}
                    className="p-1 hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 rounded transition-colors"
                    title="Delete knowledge base"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 2. Right Pane - KB Details and Files Ingestion */}
      <div className="flex-1 bg-card flex flex-col min-w-0">
        {selectedKbId && kbDetail ? (
          <div className="flex-1 flex flex-col h-full min-w-0">
            {/* Header */}
            <div className="p-6 border-b border-border/50 shrink-0 flex items-center justify-between select-none">
              <div className="space-y-1">
                <h1 className="font-extrabold text-lg md:text-xl text-foreground flex items-center gap-2">
                  {kbDetail.name}
                  <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                </h1>
                {kbDetail.description && (
                  <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed">
                    {kbDetail.description}
                  </p>
                )}
              </div>
            </div>

            {/* Content body split: Left = Upload files, Right = Document Registry */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
              
              {/* File Upload Zone */}
              <div className="w-full lg:w-96 shrink-0 space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ingest Document</h3>
                
                <div 
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    uploading
                      ? "border-primary bg-primary/5 cursor-wait"
                      : "border-border hover:border-primary hover:bg-primary/[0.02]"
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.txt,.md,.csv,.json"
                    className="hidden"
                    disabled={uploading}
                  />
                  
                  {uploading ? (
                    <div className="space-y-3">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">Analyzing file structure...</p>
                        <p className="text-[10px] text-muted-foreground max-w-[200px] leading-normal font-mono">
                          {uploadProgress}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center mx-auto border border-border/80">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-foreground">Click to upload file</p>
                        <p className="text-[10px] text-muted-foreground/80 max-w-[200px] leading-relaxed">
                          Supported formats: PDF, DOCX, TXT, MD, CSV, JSON (max 15MB)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Storage Health Stats */}
                <div className="p-4 rounded-xl border border-border/60 bg-muted/15 space-y-3.5">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-primary" />
                    Collection Vector Metrics
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Total Documents</span>
                      <span className="font-extrabold text-sm text-foreground">{kbDetail.documents.length}</span>
                    </div>
                    <div className="p-3 bg-card border border-border/60 rounded-xl space-y-1">
                      <span className="text-[10px] text-muted-foreground block font-semibold">Total Text Chunks</span>
                      <span className="font-extrabold text-sm text-foreground">
                        {kbDetail.documents.reduce((acc, curr) => acc + curr.chunk_count, 0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Indexed Files Table */}
              <div className="flex-1 space-y-4 min-w-0">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Index Registry</h3>
                
                {loadingDetail ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs">Loading indexes...</span>
                  </div>
                ) : kbDetail.documents.length === 0 ? (
                  <div className="border border-border/50 bg-muted/5 rounded-2xl p-12 text-center text-muted-foreground text-xs leading-normal italic">
                    No files indexed in this collection yet. Ingest documents on the left.
                  </div>
                ) : (
                  <div className="border border-border/50 rounded-2xl overflow-hidden bg-background/50 backdrop-blur-md">
                    <div className="divide-y divide-border/60 max-h-[500px] overflow-y-auto">
                      {kbDetail.documents.map((doc) => (
                        <div key={doc.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/20 transition-all select-none">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0">
                              <FileText className="w-4.5 h-4.5" />
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs md:text-sm font-semibold truncate block leading-tight text-foreground pr-4" title={doc.filename}>
                                {doc.filename}
                              </span>
                              <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-muted-foreground mt-1 font-mono">
                                <span>{formatBytes(doc.file_size)}</span>
                                <span>•</span>
                                <span>{doc.chunk_count} vector shards</span>
                                <span>•</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteDoc(doc.id, doc.filename)}
                            className="p-2 hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 rounded-xl transition-all border border-border/40 bg-background/40 shrink-0 shadow-sm"
                            title="Delete file vectors"
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
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none text-muted-foreground">
            <Database className="w-12 h-12 text-muted-foreground/30 animate-pulse mb-3" />
            <h3 className="font-bold text-sm text-foreground/80">Select or Create a Collection</h3>
            <p className="text-xs text-muted-foreground/60 max-w-xs leading-normal mt-1">
              Provide context to prompts by creating knowledge collections and dropping documents.
            </p>
          </div>
        )}
      </div>

      {/* 3. Create KB Dialog Backdrop & Modal */}
      <AnimatePresence>
        {createOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCreateOpen(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              className="relative w-full max-w-md bg-card border border-border/80 shadow-2xl rounded-2xl overflow-hidden z-50 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-extrabold text-sm md:text-base text-foreground">Create Knowledge Collection</h3>
                <button 
                  onClick={() => setCreateOpen(false)}
                  className="p-1 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateKB} className="space-y-4 text-xs md:text-sm">
                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Collection Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sales Reports 2025"
                    value={newKbName}
                    onChange={(e) => setNewKbName(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-foreground">Description (Optional)</label>
                  <textarea
                    placeholder="Provide a context description..."
                    value={newKbDesc}
                    onChange={(e) => setNewKbDesc(e.target.value)}
                    className="w-full bg-background border border-border/80 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-ring resize-none h-20 leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setCreateOpen(false)}
                    className="px-4 py-2.5 border border-border hover:bg-muted rounded-xl font-bold transition-all text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newKbName.trim()}
                    className="px-4.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/95 rounded-xl font-bold transition-all disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                  >
                    {creating ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Build Matrix</span>
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
