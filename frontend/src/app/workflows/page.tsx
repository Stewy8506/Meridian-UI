"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { 
  Loader2, Workflow, Plus, Trash2, ArrowRight, Play, 
  Settings, Check, AlertTriangle, ChevronDown, ChevronRight, X
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ProviderStatus {
  id: string;
  name: string;
}

interface Step {
  id: string;
  prompt: string;
  provider: string;
  model: string;
}

interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  definition: Step[];
  created_at: string;
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);

  // Selected workflow to run/edit
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit form state
  const [wfName, setWfName] = useState("");
  const [wfDesc, setWfDesc] = useState("");
  const [wfSteps, setWfSteps] = useState<Step[]>([]);
  
  // Model lists cache per provider: { [providerId]: string[] }
  const [modelsCache, setModelsCache] = useState<Record<string, string[]>>({});
  const [loadingModelsMap, setLoadingModelsMap] = useState<Record<string, boolean>>({});

  // Runner state
  const [isRunning, setIsRunning] = useState(false);
  const [runInput, setRunInput] = useState("");
  const [activeRunStepIdx, setActiveRunStepIdx] = useState<number | null>(null);
  const [stepOutputs, setStepOutputs] = useState<Record<number, string>>({});
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [runStatus, setRunStatus] = useState<"idle" | "running" | "finished" | "error">("idle");

  // Fetch workflows and providers on mount
  useEffect(() => {
    fetchWorkflows();
    fetchProviders();
  }, []);

  const fetchWorkflows = async () => {
    setLoadingList(true);
    try {
      const res = await apiRequest<{ workflows: WorkflowItem[] }>("/api/workflows");
      setWorkflows(res.workflows || []);
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const data = await apiRequest<{ id: string; name: string; configured: boolean }[]>("/api/keys/providers");
      const activeList = data.filter(p => p.id === "local" || p.id === "ollama" || p.configured);
      setProviders(activeList);
    } catch (err) {
      console.error("Failed to fetch active providers:", err);
    }
  };

  // Helper to fetch models for a specific provider and store in cache
  const fetchModelsForProvider = async (providerId: string) => {
    if (modelsCache[providerId] || loadingModelsMap[providerId]) return;
    setLoadingModelsMap(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${providerId}`);
      setModelsCache(prev => ({ ...prev, [providerId]: res.models || [] }));
    } catch (err) {
      console.error(`Failed to load models for ${providerId}:`, err);
    } finally {
      setLoadingModelsMap(prev => ({ ...prev, [providerId]: false }));
    }
  };

  const handleCreateNew = () => {
    setWfName("");
    setWfDesc("");
    setWfSteps([
      { id: "step_1", prompt: "Summarize this topic: {{input}}", provider: "local", model: "" }
    ]);
    setIsCreating(true);
    setIsEditing(false);
    setActiveWorkflow(null);
  };

  const handleEdit = (w: WorkflowItem) => {
    setActiveWorkflow(w);
    setWfName(w.name);
    setWfDesc(w.description || "");
    setWfSteps(w.definition || []);
    
    // Fetch models for any providers used in steps
    w.definition.forEach(s => {
      fetchModelsForProvider(s.provider);
    });

    setIsEditing(true);
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this prompt chain?")) return;
    try {
      await apiRequest(`/api/workflows/${id}`, { method: "DELETE" });
      toast.error("Workflow deleted");
      fetchWorkflows();
      if (activeWorkflow?.id === id) {
        setActiveWorkflow(null);
        setIsEditing(false);
      }
    } catch (err: any) {
      toast.error(`Delete failed: ${err.message}`);
    }
  };

  const handleAddStep = () => {
    const nextIdx = wfSteps.length + 1;
    const providerId = providers.length > 0 ? providers[0].id : "local";
    fetchModelsForProvider(providerId);

    setWfSteps(prev => [
      ...prev,
      {
        id: `step_${nextIdx}`,
        prompt: `Review the results from previous step: {{step_${nextIdx-1}_output}}`,
        provider: providerId,
        model: ""
      }
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    if (wfSteps.length <= 1) {
      toast.error("A workflow must have at least 1 step");
      return;
    }
    setWfSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStepChange = (idx: number, fields: Partial<Step>) => {
    setWfSteps(prev => prev.map((step, i) => {
      if (i !== idx) return step;
      const updated = { ...step, ...fields };
      if (fields.provider) {
        // Fetch models dynamically for new provider selection
        fetchModelsForProvider(fields.provider);
        updated.model = ""; // Reset model select
      }
      return updated;
    }));
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfName.trim() || wfSteps.length === 0) {
      toast.error("Workflow name and at least one step are required");
      return;
    }

    // Verify all steps have model selected
    const missingModel = wfSteps.some(s => !s.model);
    if (missingModel) {
      toast.error("Please select a model for all steps");
      return;
    }

    try {
      if (isCreating) {
        await apiRequest("/api/workflows", {
          method: "POST",
          body: JSON.stringify({ name: wfName.trim(), description: wfDesc.trim(), definition: wfSteps })
        });
        toast.success("Workflow created successfully");
      } else if (activeWorkflow) {
        await apiRequest(`/api/workflows/${activeWorkflow.id}`, {
          method: "PUT",
          body: JSON.stringify({ name: wfName.trim(), description: wfDesc.trim(), definition: wfSteps })
        });
        toast.success("Workflow updated successfully");
      }
      setIsEditing(false);
      setIsCreating(false);
      fetchWorkflows();
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    }
  };

  const handleRunWorkflow = async () => {
    if (!activeWorkflow || !runInput.trim() || isRunning) return;

    setStepOutputs({});
    setStepErrors({});
    setIsRunning(true);
    setRunStatus("running");
    setActiveRunStepIdx(0);

    try {
      const response = await fetch(`${getBaseUrl()}/api/workflows/${activeWorkflow.id}/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth-token") || "not-needed"}`
        },
        body: JSON.stringify({ input: runInput.trim() })
      });

      if (!response.ok) throw new Error("Workflow run failed to start");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith("event: ")) {
              // Extract event name if we wanted to route by event
            } else if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6);
              try {
                const data = JSON.parse(dataStr);
                
                // Route stream to active state
                if (data.step_index !== undefined) {
                  const idx = data.step_index;
                  setActiveRunStepIdx(idx);
                  
                  if (data.content) {
                    setStepOutputs(prev => ({
                      ...prev,
                      [idx]: (prev[idx] || "") + data.content
                    }));
                  }
                  if (data.error) {
                    setStepErrors(prev => ({ ...prev, [idx]: data.error }));
                    setRunStatus("error");
                  }
                }
              } catch (e) {
                // Ignore incomplete line parse failures
              }
            }
          }
        }
      }
      setRunStatus("finished");
    } catch (err: any) {
      toast.error(`Run error: ${err.message}`);
      setRunStatus("error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full select-none relative">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-200 flex items-center gap-2">
              <Workflow className="w-7 h-7 text-neutral-400" strokeWidth={1.5} />
              Prompt Chains
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Design pipelines that route prompt variables sequentially across models.</p>
          </div>

          {!isEditing && !isCreating && (
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Chain
            </button>
          )}
        </div>

        {/* WORKFLOWS LIST VIEW */}
        {!isEditing && !isCreating && !activeWorkflow && (
          <div className="space-y-4">
            {loadingList ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-neutral-500" />
              </div>
            ) : workflows.length === 0 ? (
              <div className="text-neutral-500 text-center py-16 border border-neutral-900 rounded-2xl bg-[#090909]">
                <Workflow className="w-12 h-12 mx-auto text-neutral-700 mb-3" strokeWidth={1} />
                <h3 className="font-semibold text-sm text-neutral-300">No Prompt Chains configured</h3>
                <p className="text-xs text-neutral-600 mt-1 max-w-xs mx-auto">Create a sequence of instructions where each step uses output results from previous steps.</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-4 px-3 py-1.5 bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-300 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Create first chain
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {workflows.map((w) => (
                  <div
                    key={w.id}
                    className="bg-[#090909] border border-neutral-900 rounded-xl p-5 hover:border-neutral-800 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-sm text-neutral-200 truncate">{w.name}</h3>
                      <p className="text-[11px] text-neutral-500 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                        {w.description || "No description provided."}
                      </p>
                      <div className="mt-3 flex items-center gap-1.5">
                        <span className="text-[9px] bg-neutral-950 border border-neutral-850 px-2 py-0.5 rounded text-neutral-400 font-semibold uppercase tracking-wider">
                          {w.definition.length} {w.definition.length === 1 ? "step" : "steps"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 pt-3 border-t border-neutral-900 flex justify-end gap-2 shrink-0">
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="mr-auto p-1.5 hover:bg-red-950/25 border border-transparent hover:border-red-900 text-red-500 rounded-lg transition-colors cursor-pointer"
                        title="Delete Chain"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleEdit(w)}
                        className="px-3 py-1.5 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Edit / Configure
                      </button>
                      
                      <button
                        onClick={() => setActiveWorkflow(w)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-neutral-100 text-black hover:bg-neutral-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Run
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WORKFLOW EDIT/CREATE FORM */}
        {(isEditing || isCreating) && (
          <form onSubmit={handleSaveWorkflow} className="bg-[#090909] border border-neutral-900 rounded-2xl p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 shrink-0">
              <div>
                <h3 className="font-semibold text-neutral-200 text-sm">{isCreating ? "Create Prompt Chain" : "Configure Pipeline Steps"}</h3>
                <p className="text-[10px] text-neutral-500">Chains stream outputs step-by-step. Access output from Step N using `{"{{step_N_output}}"}`.</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsEditing(false); setIsCreating(false); setActiveWorkflow(null); }}
                className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5 md:col-span-1">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Name</label>
                <input
                  type="text"
                  required
                  value={wfName}
                  onChange={(e) => setWfName(e.target.value)}
                  placeholder="e.g. Translation & Review Pipeline"
                  className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={wfDesc}
                  onChange={(e) => setWfDesc(e.target.value)}
                  placeholder="Provide brief details on what this chain processes..."
                  className="w-full text-xs bg-neutral-950 border border-neutral-850 rounded-lg px-3 py-2 text-neutral-300 focus:outline-none"
                />
              </div>
            </div>

            {/* Steps Section */}
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center select-none border-b border-neutral-950 pb-2">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Execution Steps</span>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="flex items-center gap-1 px-2.5 py-1 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-300 rounded-md text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  Add Step
                </button>
              </div>

              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                {wfSteps.map((step, idx) => {
                  const stepModels = modelsCache[step.provider] || [];
                  const isLoadingModels = !!loadingModelsMap[step.provider];

                  return (
                    <div
                      key={idx}
                      className="bg-neutral-950 border border-neutral-900 rounded-xl p-4 space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-neutral-400 flex items-center gap-1.5 select-none">
                          <span className="w-5 h-5 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 text-[10px] text-purple-400 font-mono font-bold">
                            {idx + 1}
                          </span>
                          Step Reference ID: <span className="font-mono text-purple-400 font-semibold">{step.id}</span>
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 hover:bg-red-950/35 border border-transparent hover:border-red-900 text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Remove Step"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {/* Selector for Step API */}
                        <div className="space-y-1 md:col-span-1">
                          <label className="text-[10px] text-neutral-500 font-medium select-none">Model Engine</label>
                          <div className="flex gap-2">
                            <select
                              value={step.provider}
                              onChange={(e) => handleStepChange(idx, { provider: e.target.value })}
                              className="bg-neutral-900 border border-neutral-850 text-[11px] rounded px-2 py-1 text-neutral-300 focus:outline-none flex-1 max-w-[100px]"
                            >
                              {providers.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                            </select>
                            
                            <select
                              value={step.model}
                              onChange={(e) => handleStepChange(idx, { model: e.target.value })}
                              disabled={isLoadingModels}
                              className="bg-neutral-900 border border-neutral-850 text-[11px] rounded px-2 py-1 text-neutral-300 focus:outline-none flex-1"
                            >
                              <option value="">Select model...</option>
                              {stepModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Prompt textarea */}
                        <div className="space-y-1 md:col-span-2">
                          <label className="text-[10px] text-neutral-500 font-medium select-none">Prompt</label>
                          <textarea
                            value={step.prompt}
                            onChange={(e) => handleStepChange(idx, { prompt: e.target.value })}
                            placeholder="e.g. Translate the text output: {{step_1_output}}"
                            className="w-full text-xs min-h-[60px] max-h-[120px] bg-neutral-900 border border-neutral-850 rounded p-2 focus:outline-none focus:border-neutral-750 text-neutral-200 placeholder:text-neutral-700 resize-y font-sans leading-relaxed"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-neutral-900 shrink-0 select-none">
              <button
                type="button"
                onClick={() => { setIsEditing(false); setIsCreating(false); setActiveWorkflow(null); }}
                className="px-4 py-2 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                {isCreating ? "Create Pipeline" : "Save Definition"}
              </button>
            </div>
          </form>
        )}

        {/* WORKFLOW RUNNER / MONITORS VIEW */}
        {activeWorkflow && !isEditing && !isCreating && (
          <div className="bg-[#090909] border border-neutral-900 rounded-2xl p-6 space-y-6">
            
            {/* Header / Meta */}
            <div className="flex justify-between items-start border-b border-neutral-900 pb-4 shrink-0">
              <div>
                <span className="text-[10px] border border-neutral-850 bg-neutral-950 px-2 py-0.5 rounded text-neutral-400 font-mono tracking-widest font-bold select-none">Run Chain</span>
                <h3 className="font-semibold text-neutral-200 text-sm mt-2">{activeWorkflow.name}</h3>
                <p className="text-[10px] text-neutral-500">{activeWorkflow.description || "No description provided."}</p>
              </div>
              <button
                type="button"
                onClick={() => { setActiveWorkflow(null); setRunStatus("idle"); }}
                className="p-1 text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Run Setup Form */}
            {runStatus === "idle" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-neutral-400">Pipeline Input (`{"{{input}}"}`)</label>
                  <textarea
                    value={runInput}
                    onChange={(e) => setRunInput(e.target.value)}
                    placeholder="Enter the initial parameter text to run through the chain..."
                    className="w-full text-xs min-h-[120px] bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-neutral-750 text-neutral-200 placeholder:text-neutral-750 resize-none leading-relaxed"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setActiveWorkflow(null)}
                    className="px-4 py-2 bg-neutral-950 border border-neutral-850 hover:bg-neutral-900 text-neutral-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    Back to lists
                  </button>
                  <button
                    onClick={handleRunWorkflow}
                    disabled={!runInput.trim() || isRunning}
                    className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Execute Chain
                  </button>
                </div>
              </div>
            )}

            {/* Run Progress Status Monitor */}
            {runStatus !== "idle" && (
              <div className="space-y-6 animate-fade-in">
                
                {/* Active Monitor Status Alert */}
                <div className="flex items-center gap-3 p-3.5 rounded-xl border select-none bg-neutral-950/40 border-neutral-900">
                  {runStatus === "running" ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-purple-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">Workflow is executing...</span>
                        <span className="text-[10px] text-neutral-500">Streaming step {activeRunStepIdx !== null ? activeRunStepIdx + 1 : ""} of {activeWorkflow.definition.length}</span>
                      </div>
                    </>
                  ) : runStatus === "finished" ? (
                    <>
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">Execution Completed!</span>
                        <span className="text-[10px] text-neutral-500">All steps executed successfully.</span>
                      </div>
                      <button
                        onClick={() => setRunStatus("idle")}
                        className="ml-auto px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-black text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                      >
                        Run Again
                      </button>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-neutral-200 block">Execution Terminated</span>
                        <span className="text-[10px] text-neutral-500">One of the steps failed to compile or stream.</span>
                      </div>
                      <button
                        onClick={() => setRunStatus("idle")}
                        className="ml-auto px-3 py-1 bg-neutral-100 hover:bg-neutral-200 text-black text-[10px] font-semibold rounded-md transition-colors cursor-pointer"
                      >
                        Reset Runner
                      </button>
                    </>
                  )}
                </div>

                {/* Steps Visual Pipeline Output list */}
                <div className="space-y-4">
                  {activeWorkflow.definition.map((step, idx) => {
                    const stepOut = stepOutputs[idx] || "";
                    const stepErr = stepErrors[idx] || "";
                    const isActive = activeRunStepIdx === idx;
                    const isPending = activeRunStepIdx !== null && activeRunStepIdx < idx;
                    const isDone = activeRunStepIdx !== null && activeRunStepIdx > idx;

                    return (
                      <div
                        key={idx}
                        className={`border rounded-xl transition-all ${
                          isActive 
                            ? "bg-neutral-950/20 border-purple-900/60 shadow-[0_0_15px_rgba(139,92,246,0.05)]" 
                            : isPending 
                              ? "bg-neutral-950/10 border-neutral-950 opacity-40" 
                              : "bg-[#070707] border-neutral-900"
                        }`}
                      >
                        {/* Step Header */}
                        <div className="p-4 flex items-center justify-between border-b border-neutral-950 select-none">
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold border ${
                              isActive
                                ? "bg-purple-950 border-purple-800 text-purple-300 animate-pulse"
                                : isDone
                                  ? "bg-neutral-900 border-neutral-800 text-emerald-400"
                                  : "bg-neutral-900 border-neutral-800 text-neutral-600"
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-neutral-300 font-mono">{step.id}</span>
                            <span className="text-[10px] text-neutral-500 font-medium">({step.model})</span>
                          </div>

                          <div className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider font-semibold">
                            {isActive ? "Streaming" : isDone ? "Completed" : isPending ? "Pending" : ""}
                          </div>
                        </div>

                        {/* Step Output container */}
                        <div className="p-4 space-y-3">
                          {isActive && (
                            <div className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-900">
                              <span className="text-[10px] text-neutral-500 block mb-1 uppercase font-bold tracking-wider">Active Prompt</span>
                              <span className="text-xs text-neutral-300 font-medium leading-relaxed block italic">{step.prompt}</span>
                            </div>
                          )}

                          <div className="text-xs font-normal text-neutral-300 leading-relaxed max-h-[300px] overflow-y-auto prose prose-invert select-text select-all">
                            {stepErr ? (
                              <span className="text-red-500 italic flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                {stepErr}
                              </span>
                            ) : stepOut ? (
                              <ReactMarkdown>{stepOut}</ReactMarkdown>
                            ) : isActive ? (
                              <div className="flex items-center gap-1.5 text-neutral-500 italic select-none">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Generating response...</span>
                              </div>
                            ) : (
                              <span className="text-neutral-700 italic select-none">Awaiting pipeline thread...</span>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
