"use client";

import { motion } from "framer-motion";
import { Code2, Lightbulb, HelpCircle, BarChart3, LucideIcon } from "lucide-react";

interface CuratedPrompt {
  title: string;
  description: string;
  prompt: string;
  icon: LucideIcon;
}

const SUGGESTED_PROMPTS: CuratedPrompt[] = [
  {
    title: "Refactor JavaScript code",
    description: "Convert nested callbacks to async/await and improve readability.",
    prompt: "I have some older JavaScript code with nested callbacks. Can you help me refactor it to use modern async/await syntax and explain the changes?",
    icon: Code2
  },
  {
    title: "Brainstorm app features",
    description: "Generate unique ideas for a local-first travel planning app.",
    prompt: "Let's brainstorm some unique, local-first features for a travel planning app that differentiates it from major platforms like TripAdvisor or Airbnb. Focus on privacy and offline capability.",
    icon: Lightbulb
  },
  {
    title: "Explain a complex topic",
    description: "Break down quantum entanglement with an intuitive analogy.",
    prompt: "Can you explain the concept of quantum entanglement using a simple, intuitive analogy, like books in a library, suitable for someone without a physics background?",
    icon: HelpCircle
  },
  {
    title: "Analyze dataset ideas",
    description: "Suggest ways to visualize user retention data from a CSV.",
    prompt: "I have a CSV dataset containing weekly user retention metrics for a SaaS application. What are the best ways to visualize and analyze this data to find drop-off causes?",
    icon: BarChart3
  },
];

export function SuggestedPrompts({ onSelectPrompt }: { onSelectPrompt: (prompt: string) => void }) {
  return (
    <div className="w-full max-w-xl mx-auto space-y-3 my-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUGGESTED_PROMPTS.map((item, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.04 }}
            whileHover={{ scale: 1.01, y: -1 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => onSelectPrompt(item.prompt)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              e.currentTarget.style.setProperty("--mouse-x", `${x}px`);
              e.currentTarget.style.setProperty("--mouse-y", `${y}px`);
            }}
            className="spotlight-border text-left p-3 rounded-lg border border-border hover:border-foreground/15 hover:bg-accent/40 cursor-pointer select-none transition-colors group flex gap-3 items-start"
          >
            <div className="p-2 rounded-md bg-muted/40 border border-border text-muted-foreground/75 group-hover:text-foreground group-hover:bg-muted/70 group-hover:border-foreground/10 transition-colors shrink-0">
              <item.icon className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-semibold text-foreground group-hover:text-foreground transition-colors">
                {item.title}
              </h3>
              <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-0.5 line-clamp-2">
                {item.description}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
