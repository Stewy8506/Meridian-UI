"use client";

import { motion } from "framer-motion";

interface CuratedPrompt {
  title: string;
  description: string;
  prompt: string;
}

const SUGGESTED_PROMPTS: CuratedPrompt[] = [
  {
    title: "Refactor JavaScript code",
    description: "Convert nested callbacks to async/await and improve readability.",
    prompt: "I have some older JavaScript code with nested callbacks. Can you help me refactor it to use modern async/await syntax and explain the changes?",
  },
  {
    title: "Brainstorm app features",
    description: "Generate unique ideas for a local-first travel planning app.",
    prompt: "Let's brainstorm some unique, local-first features for a travel planning app that differentiates it from major platforms like TripAdvisor or Airbnb. Focus on privacy and offline capability.",
  },
  {
    title: "Explain a complex topic",
    description: "Break down quantum entanglement with an intuitive analogy.",
    prompt: "Can you explain the concept of quantum entanglement using a simple, intuitive analogy, like books in a library, suitable for someone without a physics background?",
  },
  {
    title: "Analyze dataset ideas",
    description: "Suggest ways to visualize user retention data from a CSV.",
    prompt: "I have a CSV dataset containing weekly user retention metrics for a SaaS application. What are the best ways to visualize and analyze this data to find drop-off causes?",
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
            onClick={() => onSelectPrompt(item.prompt)}
            className="text-left p-3 rounded-lg border border-border hover:border-foreground/15 hover:bg-accent/50 cursor-pointer select-none transition-colors group"
          >
            <h3 className="text-xs font-medium text-foreground group-hover:text-foreground transition-colors">
              {item.title}
            </h3>
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed mt-0.5 line-clamp-2">
              {item.description}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
