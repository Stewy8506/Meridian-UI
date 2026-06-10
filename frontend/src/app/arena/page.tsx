"use client";

import React, { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { apiRequest, getBaseUrl } from "@/lib/api-client";
import { toast } from "@/components/ui/toast";
import { 
  Loader2, Swords, Trophy, Eye, EyeOff, 
  ThumbsUp, Check, ChevronRight, HelpCircle 
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
}

interface LeaderboardItem {
  model_name: string;
  rating: number;
  matches_played: number;
}

export default function ArenaPage() {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);

  // Model A Selection
  const [providerA, setProviderA] = useState("");
  const [modelsA, setModelsA] = useState<string[]>([]);
  const [modelA, setModelA] = useState("");
  const [loadingModelsA, setLoadingModelsA] = useState(false);

  // Model B Selection
  const [providerB, setProviderB] = useState("");
  const [modelsB, setModelsB] = useState<string[]>([]);
  const [modelB, setModelB] = useState("");
  const [loadingModelsB, setLoadingModelsB] = useState(false);

  // Battle state
  const [prompt, setPrompt] = useState("");
  const [isBattleActive, setIsBattleActive] = useState(false);
  const [responseA, setResponseA] = useState("");
  const [responseB, setResponseB] = useState("");
  const [errorA, setErrorA] = useState("");
  const [errorB, setErrorB] = useState("");
  const [battleFinished, setBattleFinished] = useState(false);

  // Voting & Blind Mode settings
  const [blindMode, setBlindMode] = useState(true);
  const [voted, setVoted] = useState(false);
  const [voteWinner, setVoteWinner] = useState<string | null>(null);
  const [updatedElo, setUpdatedElo] = useState<Record<string, number> | null>(null);

  // Leaderboard data
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const data = await apiRequest<ProviderStatus[]>("/api/keys/providers");
        // Only keep providers that are local or configured with credentials
        const activeList = data.filter(p => p.id === "local" || p.id === "ollama" || p.configured);
        setProviders(activeList);
        if (activeList.length > 0) {
          setProviderA(activeList[0].id);
          setProviderB(activeList[0].id);
        }
      } catch (err) {
        console.error("Failed to load providers:", err);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();
    fetchLeaderboard();
  }, []);

  // Fetch models for Provider A
  useEffect(() => {
    if (!providerA) return;
    const fetchModelsA = async () => {
      setLoadingModelsA(true);
      try {
        const res = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${providerA}`);
        setModelsA(res.models || []);
        if (res.models && res.models.length > 0) {
          setModelA(res.models[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models for A:", err);
        setModelsA([]);
      } finally {
        setLoadingModelsA(false);
      }
    };
    fetchModelsA();
  }, [providerA]);

  // Fetch models for Provider B
  useEffect(() => {
    if (!providerB) return;
    const fetchModelsB = async () => {
      setLoadingModelsB(true);
      try {
        const res = await apiRequest<{ models: string[] }>(`/api/chat/models?provider=${providerB}`);
        setModelsB(res.models || []);
        if (res.models && res.models.length > 0) {
          setModelB(res.models[0]);
        }
      } catch (err) {
        console.error("Failed to fetch models for B:", err);
        setModelsB([]);
      } finally {
        setLoadingModelsB(false);
      }
    };
    fetchModelsB();
  }, [providerB]);

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await apiRequest<{ leaderboard: LeaderboardItem[] }>("/api/arena/leaderboard");
      setLeaderboard(res.leaderboard || []);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const handleStartBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !modelA || !modelB || isBattleActive) return;

    setResponseA("");
    setResponseB("");
    setErrorA("");
    setErrorB("");
    setVoted(false);
    setVoteWinner(null);
    setUpdatedElo(null);
    setBattleFinished(false);
    setIsBattleActive(true);

    try {
      const response = await fetch(`${getBaseUrl()}/api/arena/battle`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth-token") || "not-needed"}`
        },
        body: JSON.stringify({
          provider_a: providerA,
          model_a: modelA,
          provider_b: providerB,
          model_b: modelB,
          prompt: prompt.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Battle connection error");
      }

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
            if (line.trim().startsWith("data: ")) {
              const dataStr = line.trim().slice(6);
              if (dataStr === "[DONE]") {
                break;
              }
              try {
                const item = JSON.parse(dataStr);
                if (item.model === "model_a") {
                  if (item.content) setResponseA(prev => prev + item.content);
                  if (item.error) setErrorA(item.error);
                } else if (item.model === "model_b") {
                  if (item.content) setResponseB(prev => prev + item.content);
                  if (item.error) setErrorB(item.error);
                }
              } catch (e) {
                // Catch parsing errors of partial line splits
              }
            }
          }
        }
      }
      setBattleFinished(true);
    } catch (err: any) {
      toast.error(`Battle execution error: ${err.message}`);
    } finally {
      setIsBattleActive(false);
    }
  };

  const handleVote = async (choice: "model_a" | "model_b" | "tie") => {
    if (voted || !battleFinished) return;
    try {
      const res = await apiRequest<{ ratings: Record<string, number> }>("/api/arena/vote", {
        method: "POST",
        body: JSON.stringify({
          prompt: prompt,
          model_a: modelA,
          model_b: modelB,
          winner: choice
        })
      });
      setVoted(true);
      setVoteWinner(choice);
      setUpdatedElo(res.ratings);
      toast.success("Vote recorded successfully!");
      fetchLeaderboard();
    } catch (err: any) {
      toast.error(`Failed to submit vote: ${err.message}`);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 max-w-6xl mx-auto w-full select-none relative">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-200 flex items-center gap-2">
              <Swords className="w-7 h-7 text-neutral-400" strokeWidth={1.5} />
              Arena Mode
            </h1>
            <p className="text-xs text-neutral-500 mt-1">Battle models side-by-side, cast votes, and track public Elo ratings.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowLeaderboard(!showLeaderboard); fetchLeaderboard(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 rounded-lg text-neutral-300 font-medium transition-colors cursor-pointer"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              {showLeaderboard ? "Hide Leaderboard" : "Show Leaderboard"}
            </button>

            <button
              onClick={() => setBlindMode(!blindMode)}
              disabled={isBattleActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded-lg font-medium transition-colors cursor-pointer ${
                blindMode 
                  ? "bg-neutral-100 hover:bg-neutral-200 border-neutral-100 text-black" 
                  : "bg-neutral-950 border-neutral-850 hover:bg-neutral-900 text-neutral-400"
              }`}
            >
              {blindMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Blind Mode: {blindMode ? "ON" : "OFF"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Battle Panel */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Setup Controls */}
            {!isBattleActive && !battleFinished && (
              <div className="bg-[#090909] border border-neutral-900 rounded-xl p-5 space-y-4">
                <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Select Competitors</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Competitor A */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-neutral-400">Model A</label>
                    <div className="flex gap-2">
                      <select
                        value={providerA}
                        onChange={(e) => setProviderA(e.target.value)}
                        className="bg-neutral-950 border border-neutral-850 text-xs rounded-md px-2.5 py-1.5 text-neutral-300 focus:outline-none flex-1 max-w-[120px]"
                      >
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={modelA}
                        onChange={(e) => setModelA(e.target.value)}
                        disabled={loadingModelsA}
                        className="bg-neutral-950 border border-neutral-850 text-xs rounded-md px-2.5 py-1.5 text-neutral-300 focus:outline-none flex-1"
                      >
                        {loadingModelsA ? (
                          <option>Loading models...</option>
                        ) : modelsA.length > 0 ? (
                          modelsA.map(m => <option key={m} value={m}>{m}</option>)
                        ) : (
                          <option>No models available</option>
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Competitor B */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-medium text-neutral-400">Model B</label>
                    <div className="flex gap-2">
                      <select
                        value={providerB}
                        onChange={(e) => setProviderB(e.target.value)}
                        className="bg-neutral-950 border border-neutral-850 text-xs rounded-md px-2.5 py-1.5 text-neutral-300 focus:outline-none flex-1 max-w-[120px]"
                      >
                        {providers.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <select
                        value={modelB}
                        onChange={(e) => setModelB(e.target.value)}
                        disabled={loadingModelsB}
                        className="bg-neutral-950 border border-neutral-850 text-xs rounded-md px-2.5 py-1.5 text-neutral-300 focus:outline-none flex-1"
                      >
                        {loadingModelsB ? (
                          <option>Loading models...</option>
                        ) : modelsB.length > 0 ? (
                          modelsB.map(m => <option key={m} value={m}>{m}</option>)
                        ) : (
                          <option>No models available</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Prompt form */}
                <form onSubmit={handleStartBattle} className="space-y-3 pt-2">
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter a prompt to battle models..."
                    className="w-full text-xs min-h-[90px] bg-neutral-950 border border-neutral-850 rounded-xl p-3 focus:outline-none focus:border-neutral-700 text-neutral-200 placeholder:text-neutral-600 resize-none leading-relaxed"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!prompt.trim() || !modelA || !modelB}
                      className="flex items-center gap-1.5 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-40 text-black font-semibold text-xs rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      Battle models
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Battle Outputs */}
            {(isBattleActive || battleFinished) && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Panel A */}
                  <div className="bg-[#090909] border border-neutral-900 rounded-xl p-5 flex flex-col min-h-[400px] max-h-[600px]">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-4 select-none">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        {blindMode && !voted ? "Model A" : modelA}
                      </span>
                      {voted && (
                        <span className="text-[10px] bg-neutral-900 border border-neutral-850 px-2.5 py-0.5 rounded text-neutral-400 font-mono">
                          Elo: {updatedElo ? updatedElo[modelA]?.toFixed(1) : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-normal prose prose-invert select-text select-all">
                      {errorA ? (
                        <span className="text-red-500 italic">Error: {errorA}</span>
                      ) : responseA ? (
                        <ReactMarkdown>{responseA}</ReactMarkdown>
                      ) : (
                        <span className="text-neutral-600 italic">Awaiting stream...</span>
                      )}
                    </div>
                  </div>

                  {/* Panel B */}
                  <div className="bg-[#090909] border border-neutral-900 rounded-xl p-5 flex flex-col min-h-[400px] max-h-[600px]">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-900 mb-4 select-none">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                        {blindMode && !voted ? "Model B" : modelB}
                      </span>
                      {voted && (
                        <span className="text-[10px] bg-neutral-900 border border-neutral-850 px-2.5 py-0.5 rounded text-neutral-400 font-mono">
                          Elo: {updatedElo ? updatedElo[modelB]?.toFixed(1) : ""}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto text-xs text-neutral-300 leading-relaxed font-normal prose prose-invert select-text select-all">
                      {errorB ? (
                        <span className="text-red-500 italic">Error: {errorB}</span>
                      ) : responseB ? (
                        <ReactMarkdown>{responseB}</ReactMarkdown>
                      ) : (
                        <span className="text-neutral-600 italic">Awaiting stream...</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Vote Panel */}
                {battleFinished && (
                  <div className="bg-neutral-950 border border-neutral-900 rounded-xl p-5 flex flex-col items-center justify-center text-center space-y-4">
                    {!voted ? (
                      <>
                        <div>
                          <span className="text-xs font-bold text-neutral-300 uppercase tracking-widest block mb-1">Cast Your Vote</span>
                          <span className="text-[10px] text-neutral-500">Choose the response that is superior. Ratings update instantly.</span>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleVote("model_a")}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-950/40 border border-purple-800 text-purple-300 hover:bg-purple-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            👈 Model A is better
                          </button>
                          <button
                            onClick={() => handleVote("tie")}
                            className="flex items-center gap-1.5 px-4 py-2 bg-neutral-900 border border-neutral-850 text-neutral-300 hover:bg-neutral-850 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            🤝 Tie / Draw
                          </button>
                          <button
                            onClick={() => handleVote("model_b")}
                            className="flex items-center gap-1.5 px-4 py-2 bg-purple-950/40 border border-purple-800 text-purple-300 hover:bg-purple-900/40 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                          >
                            👉 Model B is better
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <ThumbsUp className="w-4 h-4" />
                          <span>Vote recorded: {voteWinner === "tie" ? "Tie" : voteWinner === "model_a" ? "Model A" : "Model B"} wins!</span>
                        </div>
                        
                        <button
                          onClick={() => {
                            setResponseA("");
                            setResponseB("");
                            setErrorA("");
                            setErrorB("");
                            setPrompt("");
                            setVoted(false);
                            setVoteWinner(null);
                            setBattleFinished(false);
                          }}
                          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-black text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                        >
                          Start New Battle
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading Stream overlay */}
                {isBattleActive && (
                  <div className="flex items-center justify-center gap-2 py-4 text-xs text-neutral-400 select-none">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                    <span>Models are streaming responses concurrently...</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Drawer: Leaderboard */}
          <div className={`lg:col-span-1 border border-neutral-900 bg-[#090909] rounded-xl p-5 ${showLeaderboard ? "block" : "hidden lg:block"}`}>
            <div className="flex items-center gap-1.5 pb-3 border-b border-neutral-900 mb-4 select-none">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-xs font-bold text-neutral-300 uppercase tracking-widest">Elo Leaderboard</h2>
            </div>

            {loadingLeaderboard ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="text-center py-12 text-[10px] text-neutral-600 font-medium">
                No battles logged. Cast a vote to populate ranks!
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {leaderboard.map((item, idx) => (
                  <div key={item.model_name} className="flex justify-between items-center bg-neutral-950 border border-neutral-900 rounded-lg p-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-neutral-600 font-bold shrink-0">{idx + 1}</span>
                        <span className="text-xs text-neutral-300 truncate font-semibold block">{item.model_name}</span>
                      </div>
                      <span className="text-[9px] text-neutral-500 mt-0.5 block">{item.matches_played} matches played</span>
                    </div>
                    <span className="text-xs text-purple-400 font-mono font-bold shrink-0">{Math.round(item.rating)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
