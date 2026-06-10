"use client";

import { useAppStore } from "@/store/app-store";
import { ChatArea } from "@/components/chat/chat-area";
import { SkillMarketplace } from "@/components/skills/skill-marketplace";

export default function Home() {
  const currentView = useAppStore((state) => state.currentView);
  
  if (currentView === "marketplace") {
    return <SkillMarketplace />;
  }
  return <ChatArea />;
}
