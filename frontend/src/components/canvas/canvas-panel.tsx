"use client";

import React, { useState, useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { apiRequest } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { 
  X, Save, FileCode, History, Eye, Edit2, 
  Loader2, GitPullRequest, ArrowLeftRight, Check
} from "lucide-react";
import { cn } from "@/lib/utils";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";

interface CanvasDocListItem {
  id: string;
  filename: string;
  language: string;
  version: number;
}

interface CanvasDocDetail {
  id: string;
  filename: string;
  content: string;
  language: string;
  version: number;
}

interface CanvasVersionItem {
  id: string;
  version_num: number;
  created_at: string;
}

export function CanvasPanel() {
  const { canvasOpen, setCanvasOpen, activeCanvasFileId, setActiveCanvasFileId } = useAppStore();

  const [files, setFiles] = useState<CanvasDocListItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const [activeDoc, setActiveDoc] = useState<CanvasDocDetail | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);
  
  // Editor content modifications
  const [editorContent, setEditorContent] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  // Tabs: 'edit' | 'preview' | 'history'
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "history">("preview");

  // Version History state
  const [versions, setVersions] = useState<CanvasVersionItem[]>([]);
  const [selectedHistoricalVersion, setSelectedHistoricalVersion] = useState<number | null>(null);
  const [historicalContent, setHistoricalContent] = useState("");
  const [loadingHistoryContent, setLoadingHistoryContent] = useState(false);
  const [showDiff, setShowDiff] = useState(false);

  // Width of panel for resizability
  const [width, setWidth] = useState(550);
  const [isResizing, setIsResizing] = useState(false);

  // Fetch files list on mount/open
  const fetchFiles = async (selectLatest = false) => {
    setLoadingFiles(true);
    try {
      const res = await apiRequest<{ documents: CanvasDocListItem[] }>("/api/canvas");
      setFiles(res.documents || []);
      
      if (selectLatest && res.documents && res.documents.length > 0) {
        setActiveCanvasFileId(res.documents[0].id);
      }
    } catch (err) {
      console.error("Failed to load canvas files:", err);
    } finally {
      setLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (canvasOpen) {
      fetchFiles(activeCanvasFileId ? false : true);
    }
  }, [canvasOpen]);

  // Load active document when ID changes
  useEffect(() => {
    if (!activeCanvasFileId || !canvasOpen) return;
    
    const loadDocument = async () => {
      setLoadingDoc(true);
      setSelectedHistoricalVersion(null);
      setHistoricalContent("");
      setShowDiff(false);
      try {
        const res = await apiRequest<{ document: CanvasDocDetail; versions: CanvasVersionItem[] }>(`/api/canvas/${activeCanvasFileId}`);
        setActiveDoc(res.document);
        setEditorContent(res.document.content);
        setVersions(res.versions || []);
      } catch (err) {
        console.error("Failed to load document content:", err);
        toast.error("Error loading document");
      } finally {
        setLoadingDoc(false);
      }
    };
    
    loadDocument();
  }, [activeCanvasFileId, canvasOpen]);

  // Load historical content when selected version changes
  useEffect(() => {
    if (!activeDoc || selectedHistoricalVersion === null) return;

    const loadHistoryContent = async () => {
      setLoadingHistoryContent(true);
      try {
        const res = await apiRequest<{ content: string }>(`/api/canvas/${activeDoc.id}/versions/${selectedHistoricalVersion}`);
        setHistoricalContent(res.content);
      } catch (err) {
        console.error("Failed to load version snapshot:", err);
        toast.error("Error loading version snapshot");
      } finally {
        setLoadingHistoryContent(false);
      }
    };

    loadHistoryContent();
  }, [selectedHistoricalVersion]);

  // Handle manual resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      if (newWidth > 320 && newWidth < window.innerWidth * 0.7) {
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  const handleSave = async () => {
    if (!activeDoc || savingDoc) return;
    setSavingDoc(true);
    try {
      const res = await apiRequest<{ document: CanvasDocDetail }>("/api/canvas", {
        method: "POST",
        body: JSON.stringify({
          filename: activeDoc.filename,
          content: editorContent,
          language: activeDoc.language
        })
      });
      toast.success("Changes saved successfully!");
      
      // Reload versions and update version badge
      const details = await apiRequest<{ document: CanvasDocDetail; versions: CanvasVersionItem[] }>(`/api/canvas/${activeCanvasFileId}`);
      setActiveDoc(details.document);
      setVersions(details.versions || []);
      fetchFiles();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setSavingDoc(false);
    }
  };

  const handleRestoreVersion = async (versionNum: number) => {
    if (!activeDoc || !historicalContent) return;
    if (!confirm(`Restore document to version ${versionNum}?`)) return;

    setSavingDoc(true);
    try {
      const res = await apiRequest<{ document: CanvasDocDetail }>("/api/canvas", {
        method: "POST",
        body: JSON.stringify({
          filename: activeDoc.filename,
          content: historicalContent,
          language: activeDoc.language
        })
      });
      toast.success(`Restored to version ${versionNum}!`);
      
      // Reload Document
      const details = await apiRequest<{ document: CanvasDocDetail; versions: CanvasVersionItem[] }>(`/api/canvas/${activeCanvasFileId}`);
      setActiveDoc(details.document);
      setEditorContent(details.document.content);
      setVersions(details.versions || []);
      setSelectedHistoricalVersion(null);
      setHistoricalContent("");
      setShowDiff(false);
      setActiveTab("preview");
      fetchFiles();
    } catch (err: any) {
      toast.error(`Restore failed: ${err.message}`);
    } finally {
      setSavingDoc(false);
    }
  };

  if (!canvasOpen) return null;

  return (
    <div 
      style={{ width }} 
      className="h-full bg-card/60 backdrop-blur-xl border-l border-border/40 flex flex-row shrink-0 relative select-none shadow-[-4px_0_24px_rgba(0,0,0,0.15)]"
    >
      {/* Resizer bar */}
      <div
        onMouseDown={() => setIsResizing(true)}
        className="w-1.5 h-full cursor-col-resize hover:bg-neutral-800 transition-colors shrink-0 absolute left-0 top-0 z-40"
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Panel Header */}
        <div className="px-5 py-3.5 border-b border-neutral-900 flex justify-between items-center bg-[#070707] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <FileCode className="w-4 h-4 text-purple-400 shrink-0" />
            
            {/* File Switcher Selector */}
            {files.length > 1 ? (
              <select
                value={activeCanvasFileId || ""}
                onChange={(e) => setActiveCanvasFileId(e.target.value)}
                className="bg-neutral-950 border border-neutral-850 focus:border-purple-500/40 text-xs font-semibold rounded-lg px-2.5 py-1 text-neutral-300 focus:outline-none max-w-[180px] cursor-pointer transition-colors"
              >
                {files.map(f => (
                  <option key={f.id} value={f.id}>{f.filename}</option>
                ))}
              </select>
            ) : activeDoc ? (
              <span className="font-semibold text-xs text-neutral-200 truncate">{activeDoc.filename}</span>
            ) : (
              <span className="font-semibold text-xs text-neutral-400">Canvas</span>
            )}

            {activeDoc && (
              <span className="text-[9px] bg-neutral-900 border border-neutral-850 px-2 py-0.5 rounded text-neutral-400 font-mono">
                v{activeDoc.version}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Navigation Tabs */}
            <div className="flex bg-neutral-950 p-0.5 border border-neutral-850 rounded-lg text-[10px]">
              <button
                onClick={() => { setActiveTab("preview"); setShowDiff(false); }}
                className={`flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  activeTab === "preview" 
                    ? "bg-gradient-to-r from-accent/80 to-accent/95 border border-white/5 text-white shadow-sm shadow-black/10" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
              <button
                onClick={() => { setActiveTab("edit"); setShowDiff(false); }}
                className={`flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  activeTab === "edit" 
                    ? "bg-gradient-to-r from-accent/80 to-accent/95 border border-white/5 text-white shadow-sm shadow-black/10" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Edit2 className="w-3 h-3" />
                Edit
              </button>
              <button
                onClick={() => setActiveTab("history")}
                className={`flex items-center gap-1 px-2.5 py-1 font-semibold rounded-md transition-all duration-200 cursor-pointer ${
                  activeTab === "history" 
                    ? "bg-gradient-to-r from-accent/80 to-accent/95 border border-white/5 text-white shadow-sm shadow-black/10" 
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <History className="w-3 h-3" />
                History
              </button>
            </div>

            {/* Save Action */}
            {activeTab === "edit" && activeDoc && (
              <button
                onClick={handleSave}
                disabled={savingDoc || editorContent === activeDoc.content}
                className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-black hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[10px] rounded-lg transition-colors cursor-pointer"
              >
                {savingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save
              </button>
            )}

            {/* Close Panel */}
            <button 
              onClick={() => setCanvasOpen(false)} 
              className="p-1 text-neutral-500 hover:text-neutral-200 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-h-0 bg-[#060606] relative">
          {loadingDoc ? (
            <div className="absolute inset-0 flex items-center justify-center bg-card/50">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
            </div>
          ) : !activeDoc ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-neutral-500 text-center select-none">
              <FileCode className="w-12 h-12 text-neutral-850 mb-3" strokeWidth={1} />
              <h3 className="font-semibold text-xs text-neutral-300">Canvas workspace is empty</h3>
              <p className="text-[10px] text-neutral-600 mt-1 max-w-xs leading-relaxed">
                Trigger canvas edits by prompting the AI to draft code files, Markdown reports, or Mermaid models.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              
              {/* TAB CONTENT: PREVIEW */}
              {activeTab === "preview" && (
                <div className="flex-1 overflow-y-auto p-6 select-text">
                  {activeDoc.language === "html" ? (
                    <iframe
                      srcDoc={activeDoc.content}
                      title="HTML Canvas Preview"
                      className="w-full h-full bg-white border border-neutral-900 rounded-xl"
                    />
                  ) : activeDoc.language === "markdown" ? (
                    <div className="prose prose-invert max-w-none text-neutral-300 text-xs leading-relaxed">
                      <ReactMarkdown>{activeDoc.content}</ReactMarkdown>
                    </div>
                  ) : activeDoc.language === "mermaid" ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl text-[10px] text-neutral-400 select-none uppercase tracking-widest font-semibold flex items-center gap-1.5">
                        <GitPullRequest className="w-3.5 h-3.5 text-purple-400" />
                        <span>Mermaid Flow Model</span>
                      </div>
                      <pre className="p-4 bg-neutral-950 border border-neutral-900 rounded-xl overflow-x-auto text-[11px] font-mono text-purple-300">
                        {activeDoc.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-xl text-[10px] text-neutral-400 select-none uppercase tracking-widest font-semibold">
                        <span>Code Draft: {activeDoc.filename}</span>
                      </div>
                      <pre className="p-4 bg-neutral-950 border border-neutral-900 rounded-xl overflow-x-auto text-[11px] font-mono text-neutral-300">
                        {activeDoc.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT: EDIT */}
              {activeTab === "edit" && (
                <div className="flex-1 min-h-0">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    language={activeDoc.language === "markdown" ? "markdown" : activeDoc.language === "html" ? "html" : activeDoc.language === "python" ? "python" : "javascript"}
                    value={editorContent}
                    onChange={(val) => setEditorContent(val || "")}
                    options={{
                      fontSize: 12,
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      padding: { top: 12 }
                    }}
                  />
                </div>
              )}

              {/* TAB CONTENT: HISTORY */}
              {activeTab === "history" && (
                <div className="flex-1 flex flex-col min-h-0">
                  
                  {/* Diff side-by-side or split layout */}
                  {selectedHistoricalVersion !== null && (
                    <div className="h-1/2 border-b border-neutral-900 flex flex-col min-h-0 bg-[#040404]">
                      <div className="px-5 py-2.5 border-b border-neutral-900 bg-[#070707] flex justify-between items-center shrink-0 select-none">
                        <span className="text-[10px] font-semibold text-neutral-400 flex items-center gap-1.5">
                          <ArrowLeftRight className="w-3.5 h-3.5 text-purple-400" />
                          Comparing: Version {selectedHistoricalVersion} (Snapshot)
                        </span>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowDiff(!showDiff)}
                            className="px-2 py-1 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                          >
                            {showDiff ? "Hide side-by-side" : "Show side-by-side"}
                          </button>
                          
                          <button
                            onClick={() => handleRestoreVersion(selectedHistoricalVersion)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-neutral-100 text-black hover:bg-neutral-200 text-[10px] font-bold rounded-md transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Restore
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex min-h-0">
                        {loadingHistoryContent ? (
                          <div className="w-full flex items-center justify-center">
                            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
                          </div>
                        ) : showDiff ? (
                          <div className="w-full flex divide-x divide-neutral-900 overflow-hidden">
                            {/* Current Version */}
                            <div className="w-1/2 flex flex-col min-h-0">
                              <div className="bg-neutral-950 px-4 py-1 text-[9px] text-neutral-500 font-bold border-b border-neutral-900 select-none uppercase tracking-wider">Current</div>
                              <pre className="flex-1 p-4 overflow-y-auto text-[10px] font-mono text-neutral-400 select-text">
                                {activeDoc.content}
                              </pre>
                            </div>
                            {/* History Version */}
                            <div className="w-1/2 flex flex-col min-h-0">
                              <div className="bg-neutral-950 px-4 py-1 text-[9px] text-neutral-500 font-bold border-b border-neutral-900 select-none uppercase tracking-wider">Version {selectedHistoricalVersion}</div>
                              <pre className="flex-1 p-4 overflow-y-auto text-[10px] font-mono text-neutral-400 select-text">
                                {historicalContent}
                              </pre>
                            </div>
                          </div>
                        ) : (
                          <pre className="flex-1 p-4 overflow-y-auto text-[10px] font-mono text-neutral-400 select-text leading-relaxed">
                            {historicalContent}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Versions Logs List */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-2 select-none">
                    <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block mb-2">Change Logs</span>
                    {versions.map((v) => {
                      const isSelected = selectedHistoricalVersion === v.version_num;
                      return (
                        <div
                          key={v.id}
                          onClick={() => setSelectedHistoricalVersion(isSelected ? null : v.version_num)}
                          className={`flex justify-between items-center p-3 rounded-xl border cursor-pointer transition-colors ${
                            isSelected 
                              ? "bg-purple-950/25 border-purple-900 text-purple-300" 
                              : "bg-neutral-950 border-neutral-900 hover:border-neutral-850 text-neutral-400 hover:text-neutral-200"
                          }`}
                        >
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-semibold">Version {v.version_num}</span>
                            <span className="text-[9px] text-neutral-500 font-medium mt-0.5">
                              {new Date(v.created_at).toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider">
                            {v.version_num === activeDoc.version ? "Active" : "View"}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
