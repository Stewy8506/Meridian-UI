"use client";

import { Sparkles, Code, Brain, PenTool, Search } from "lucide-react";
import { motion } from "framer-motion";

interface CuratedPrompt {
  title: string;
  description: string;
  prompt: string;
  icon: React.ReactNode;
  color: string;
  bgGradient: string;
}

const SUGGESTED_PROMPTS: CuratedPrompt[] = [
  {
    title: "Refactor JavaScript Code",
    description: "Convert nested callbacks to async/await syntax and improve readability.",
    prompt: "I have some older JavaScript code with nested callbacks. Can you help me refactor it to use modern async/await syntax and explain the changes?",
    icon: <Code className="w-4.5 h-4.5 text-blue-500" />,
    color: "from-blue-500/10 to-indigo-500/10 hover:border-blue-500/30",
    bgGradient: "bg-blue-500/5"
  },
  {
    title: "Brainstorm App Features",
    description: "Generate unique feature ideas for a local-first travel planning app.",
    prompt: "Let's brainstorm some unique, local-first features for a travel planning app that differentiates it from major platforms like TripAdvisor or Airbnb. Focus on privacy and offline capability.",
    icon: <Sparkles className="w-4.5 h-4.5 text-purple-500" />,
    color: "from-purple-500/10 to-pink-500/10 hover:border-purple-500/30",
    bgGradient: "bg-purple-500/5"
  },
  {
    title: "Explain Complex Topic",
    description: "Break down quantum entanglement using a simple library analogy.",
    prompt: "Can you explain the concept of quantum entanglement using a simple, intuitive analogy, like books in a library, suitable for someone without a physics background?",
    icon: <Brain className="w-4.5 h-4.5 text-emerald-500" />,
    color: "from-emerald-500/10 to-teal-500/10 hover:border-emerald-500/30",
    bgGradient: "bg-emerald-500/5"
  },
  {
    title: "Analyze Dataset Ideas",
    description: "Suggest ways to visualize user retention data from a CSV file.",
    prompt: "I have a CSV dataset containing weekly user retention metrics for a SaaS application. What are the best ways to visualize and analyze this data to find drop-off causes?",
    icon: <Search className="w-4.5 h-4.5 text-amber-500" />,
    color: "from-amber-500/10 to-orange-500/10 hover:border-amber-500/30",
    bgGradient: "bg-amber-500/5"
  },
  {
    title: "Creative Story Draft",
    description: "Write a short sci-fi scene about a city governed by a benevolent AI.",
    prompt: "Write a short, atmospheric scene set in a futuristic city governed by a benevolent, silent AI. Focus on the sensory details of the streets and a conversation between two citizens.",
    icon: <PenTool className="w-4.5 h-4.5 text-rose-500" />,
    color: "from-rose-500/10 to-pink-500/10 hover:border-rose-500/30",
    bgGradient: "bg-rose-500/5"
  }
];

export function SuggestedPrompts({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 my-6">
      <div className="text-center">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 select-none">
          Suggested Starters
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTED_PROMPTS.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            onClick={() => onSelectPrompt(item.prompt)}
            className={`group flex items-start gap-3.5 p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/10 cursor-pointer select-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.color}`}
          >
            <div className={`p-2 rounded-lg shrink-0 ${item.bgGradient} group-hover:scale-110 transition-transform duration-200`}>
              {item.icon}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs md:text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                {item.title}
              </h3>
              <p className="text-[10px] md:text-xs text-muted-foreground/80 leading-relaxed mt-1 line-clamp-2">
                {item.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
