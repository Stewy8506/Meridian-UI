import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { toast } from "../ui/toast";
import { FileQuestion, BookOpen, Clock, Loader2 } from "lucide-react";

interface NotebookActionsProps {
  kbId: string;
  onActionComplete: () => void;
}

export function NotebookActions({ kbId, onActionComplete }: NotebookActionsProps) {
  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerate = async (actionType: string, label: string) => {
    setGenerating(actionType);
    toast.success(`Generating ${label}... This may take a moment.`);
    
    try {
      await apiRequest(`/api/knowledge/${kbId}/generate-action`, {
        method: "POST",
        body: JSON.stringify({ action_type: actionType })
      });
      toast.success(`${label} generated and saved to Notes!`);
      onActionComplete();
    } catch (err: any) {
      toast.error(`Failed to generate ${label}: ${err.message}`);
    } finally {
      setGenerating(null);
    }
  };

  const actions = [
    { id: "faq", label: "FAQ", icon: FileQuestion, description: "Generate Frequently Asked Questions" },
    { id: "study_guide", label: "Study Guide", icon: BookOpen, description: "Summarize key themes and facts" },
    { id: "timeline", label: "Timeline", icon: Clock, description: "Extract chronological events" }
  ];

  return (
    <div className="space-y-3">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-[0.1em]">Notebook Actions</span>
      <div className="grid grid-cols-1 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isGenerating = generating === action.id;
          
          return (
            <button
              key={action.id}
              onClick={() => handleGenerate(action.id, action.label)}
              disabled={generating !== null}
              className={`flex items-center gap-3 p-3 text-left rounded-lg border transition-colors ${
                generating !== null && !isGenerating
                  ? "opacity-50 cursor-not-allowed border-border bg-transparent"
                  : "border-border hover:border-foreground/30 hover:bg-accent/30 bg-card"
              }`}
            >
              <div className="p-2 bg-muted rounded-md text-foreground">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
