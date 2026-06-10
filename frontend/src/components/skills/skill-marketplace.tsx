"use client";

import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { 
  Search, Play, X, Loader2, RefreshCw 
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
  
  const [testingSkill, setTestingSkill] = useState<SkillMetadata | null>(null);
  const [testArgs, setTestArgs] = useState<string>("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  const categories = [
    { id: "all", label: "All" },
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
      toast.error("Failed to fetch skills");
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
      toast.success(`${skill.display_name} ${skill.enabled ? 'disabled' : 'enabled'}`);
    } catch (error: any) {
      toast.error(`Failed to ${action}`);
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
        toast.success("Executed");
      } else {
        toast.error("Execution error");
      }
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
      toast.error("Test failed");
    } finally {
      setTesting(false);
    }
  };

  const openTestPanel = (skill: SkillMetadata) => {
    setTestingSkill(skill);
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
    <div className="flex-1 flex flex-col bg-background p-6 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">Skills</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure capabilities available to the AI.
          </p>
        </div>
        <button 
          onClick={fetchSkills}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-3 mb-5 select-none">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border focus:border-foreground/20 rounded-lg py-2 pl-9 pr-4 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-2.5 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors whitespace-nowrap",
                selectedCategory === cat.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex gap-5 overflow-hidden">
        {/* Skills grid */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {loading ? (
            <div className="h-32 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
            </div>
          ) : skills.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-lg">
              <p className="text-xs text-muted-foreground">No skills found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
              {skills.map((skill) => (
                <div 
                  key={skill.name}
                  className={cn(
                    "p-4 rounded-lg border border-border transition-colors flex flex-col justify-between group",
                    !skill.enabled && "opacity-50"
                  )}
                >
                  <div>
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-medium text-muted-foreground font-[family-name:var(--font-geist-mono)] uppercase tracking-wider">
                          {skill.category}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggle(skill)}
                        className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-medium cursor-pointer border transition-colors",
                          skill.enabled
                            ? "bg-accent border-border text-foreground"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {skill.enabled ? "On" : "Off"}
                      </button>
                    </div>
                    <h3 className="font-medium text-sm text-foreground mb-1">{skill.display_name}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {skill.description}
                    </p>
                  </div>

                  <div className="flex justify-between items-center border-t border-border pt-2.5 mt-3 text-[10px] text-muted-foreground select-none">
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-geist-mono)]">v{skill.version}</span>
                      {skill.is_dangerous && (
                        <span className="text-destructive">risky</span>
                      )}
                    </div>
                    <button
                      onClick={() => openTestPanel(skill)}
                      className="text-[10px] text-muted-foreground hover:text-foreground font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-2.5 h-2.5" /> Test
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test panel */}
        {testingSkill && (
          <div className="w-80 border border-border rounded-lg flex flex-col overflow-hidden p-4 shrink-0 bg-card">
            <div className="flex justify-between items-center border-b border-border pb-2.5 mb-3 select-none">
              <h3 className="font-medium text-sm text-foreground">
                Test: {testingSkill.display_name}
              </h3>
              <button 
                onClick={() => setTestingSkill(null)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">
                  Arguments (JSON)
                </label>
                <textarea
                  value={testArgs}
                  onChange={(e) => setTestArgs(e.target.value)}
                  rows={5}
                  className="w-full bg-card border border-border focus:border-foreground/20 rounded-md p-2.5 text-xs font-[family-name:var(--font-geist-mono)] text-foreground outline-none resize-none"
                />
              </div>

              <button
                onClick={handleTestRun}
                disabled={testing}
                className="w-full py-2 bg-foreground text-background hover:bg-foreground/90 font-medium text-xs rounded-md flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-3 h-3" /> Run
                  </>
                )}
              </button>

              {testResult && (
                <div className="flex-1 flex flex-col border border-border rounded-md p-2.5 overflow-hidden">
                  <div className="flex justify-between items-center text-[9px] font-medium text-muted-foreground uppercase tracking-[0.1em] border-b border-border pb-1.5 mb-2 select-none">
                    <span>Output</span>
                    {testResult.execution_time_ms && (
                      <span className="font-[family-name:var(--font-geist-mono)]">{testResult.execution_time_ms.toFixed(1)}ms</span>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto text-xs font-[family-name:var(--font-geist-mono)] whitespace-pre-wrap leading-relaxed">
                    {testResult.success ? (
                      <div className="text-foreground">
                        {typeof testResult.data === "string" 
                          ? testResult.data 
                          : JSON.stringify(testResult.data, null, 2)}
                      </div>
                    ) : (
                      <div className="text-destructive">
                        {testResult.error || "Failed."}
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
