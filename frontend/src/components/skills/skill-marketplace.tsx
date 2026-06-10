"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { 
  Search, Sliders, Play, Check, X, Shield, Clock, 
  Cpu, Wrench, AlertTriangle, Loader2, RefreshCw 
} from "lucide-react";
import { toast } from "../ui/toast";
import { cn } from "@/lib/utils";

interface SkillMetadata {
  name: string;
  display_name: string;
  description: string;
  category: string;
  tags: string[];
  version: string;
  requires_auth: boolean;
  required_config: string[];
  is_dangerous: boolean;
  enabled: boolean;
  schema: any;
}

export function SkillMarketplace() {
  const [skills, setSkills] = useState<SkillMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  
  // Test skill state
  const [testingSkill, setTestingSkill] = useState<SkillMetadata | null>(null);
  const [testArgs, setTestArgs] = useState<string>("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const categories = [
    { id: "all", label: "All Skills" },
    { id: "web", label: "Web" },
    { id: "code", label: "Code" },
    { id: "data", label: "Data" },
    { id: "file", label: "File" },
    { id: "knowledge", label: "Knowledge" },
    { id: "utility", label: "Utility" }
  ];

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const queryParams = [];
      if (selectedCategory !== "all") queryParams.push(`category=${selectedCategory}`);
      if (searchQuery) queryParams.push(`q=${encodeURIComponent(searchQuery)}`);
      
      const url = `/api/skills${queryParams.length > 0 ? "?" + queryParams.join("&") : ""}`;
      const data = await apiRequest<SkillMetadata[]>(url);
      setSkills(data);
    } catch (error: any) {
      toast.error("Failed to fetch skills: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, [selectedCategory, searchQuery]);

  const handleToggle = async (skill: SkillMetadata) => {
    const action = skill.enabled ? "disable" : "enable";
    try {
      await apiRequest(`/api/skills/${skill.name}/${action}`, { method: "PUT" });
      setSkills(prev => 
        prev.map(s => s.name === skill.name ? { ...s, enabled: !s.enabled } : s)
      );
      toast.success(`Skill '${skill.display_name}' ${skill.enabled ? 'disabled' : 'enabled'} successfully.`);
    } catch (error: any) {
      toast.error(`Failed to ${action} skill: ` + error.message);
    }
  };

  const handleTestRun = async () => {
    if (!testingSkill) return;
    setTesting(true);
    setTestResult(null);
    try {
      const parsedArgs = JSON.parse(testArgs);
      const res = await apiRequest(`/api/skills/${testingSkill.name}/test`, {
        method: "POST",
        body: JSON.stringify({ arguments: parsedArgs })
      });
      setTestResult(res);
      if (res.success) {
        toast.success("Skill executed successfully!");
      } else {
        toast.error("Skill execution completed with errors.");
      }
    } catch (error: any) {
      setTestResult({ success: false, error: "Invalid JSON arguments or request failed: " + error.message });
      toast.error("Test execution failed.");
    } finally {
      setTesting(false);
    }
  };

  const openTestPanel = (skill: SkillMetadata) => {
    setTestingSkill(skill);
    // Populate with default arguments from schema
    const defaults: any = {};
    if (skill.schema && skill.schema.properties) {
      Object.keys(skill.schema.properties).forEach(key => {
        const prop = skill.schema.properties[key];
        defaults[key] = prop.default !== undefined ? prop.default : "";
      });
    }
    setTestArgs(JSON.stringify(defaults, null, 2));
    setTestResult(null);
  };

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 font-sans p-6 overflow-hidden">
      {/* Title */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Wrench className="w-6 h-6 text-purple-500" />
            Skill Marketplace
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse, configure, and test capabilities dynamically loaded by the AI orchestrator.
          </p>
        </div>
        <button 
          onClick={fetchSkills}
          className="p-2.5 text-zinc-400 hover:text-white bg-zinc-900/60 border border-white/5 hover:bg-zinc-800/40 rounded-xl transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 select-none">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search skills (e.g., calculator, web search)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/40 border border-white/5 focus:border-purple-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 outline-none transition-colors duration-200 text-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all duration-200 whitespace-nowrap",
                selectedCategory === cat.id
                  ? "bg-purple-600 border-purple-500 text-white shadow-lg shadow-purple-600/15"
                  : "bg-zinc-900/40 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/40"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Skills Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin space-y-4">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 rounded-2xl bg-zinc-900/10">
              <Cpu className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No skills matching the criteria were found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {skills.map((skill) => (
                <div 
                  key={skill.name}
                  className={cn(
                    "p-5 rounded-2xl border bg-zinc-900/30 transition-all duration-200 flex flex-col justify-between group",
                    skill.enabled ? "border-white/5" : "border-white/5 opacity-60"
                  )}
                >
                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg text-xs font-mono font-bold">
                          {skill.category.toUpperCase()}
                        </span>
                        <h3 className="font-bold text-white text-base group-hover:text-purple-400 transition-colors">
                          {skill.display_name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggle(skill)}
                          className={cn(
                            "px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer border transition-colors duration-150",
                            skill.enabled
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700"
                          )}
                        >
                          {skill.enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>

                    {/* Desc */}
                    <p className="text-xs text-zinc-400 leading-relaxed mb-4 line-clamp-2">
                      {skill.description}
                    </p>
                  </div>

                  {/* Footer Meta */}
                  <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-2 text-[10px] text-zinc-500 select-none">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        v{skill.version}
                      </span>
                      {skill.is_dangerous && (
                        <span className="flex items-center gap-1 text-rose-400">
                          <Shield className="w-3 h-3" /> dangerous
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => openTestPanel(skill)}
                      className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5" /> Test Skill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Test Panel */}
        {testingSkill && (
          <div className="w-96 border border-white/5 bg-zinc-900/40 rounded-2xl flex flex-col overflow-hidden p-5 shrink-0">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 mb-4 select-none">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Play className="w-4 h-4 text-purple-500 animate-pulse" />
                Test: {testingSkill.display_name}
              </h3>
              <button 
                onClick={() => setTestingSkill(null)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Test inputs */}
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-1 scrollbar-thin">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  JSON Arguments
                </label>
                <textarea
                  value={testArgs}
                  onChange={(e) => setTestArgs(e.target.value)}
                  rows={6}
                  className="w-full bg-zinc-950/60 border border-white/5 focus:border-purple-500/50 rounded-xl p-3 text-xs text-zinc-300 font-mono outline-none resize-none"
                />
              </div>

              <button
                onClick={handleTestRun}
                disabled={testing}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/10 active:scale-[0.99] transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Execute Test Run
                  </>
                )}
              </button>

              {/* Execution Output */}
              {testResult && (
                <div className="flex-1 flex flex-col border border-white/5 rounded-xl bg-zinc-950/40 p-3 overflow-hidden">
                  <div className="flex justify-between items-center text-[9px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1.5 mb-2 select-none">
                    <span>Result Output</span>
                    {testResult.execution_time_ms && (
                      <span>{testResult.execution_time_ms.toFixed(1)}ms</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto text-xs font-mono scrollbar-thin whitespace-pre-wrap leading-relaxed">
                    {testResult.success ? (
                      <div className="text-emerald-400">
                        {typeof testResult.data === "string" 
                          ? testResult.data 
                          : JSON.stringify(testResult.data, null, 2)}
                      </div>
                    ) : (
                      <div className="text-rose-400">
                        Error: {testResult.error || "Execution failed."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
