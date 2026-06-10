"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from "recharts";
import { Loader2, Activity, Coins, Zap, Settings, BarChart2 } from "lucide-react";
import { getBaseUrl } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface AnalyticsSummary {
  summary: {
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
  };
  models: { name: string; count: number }[];
  providers: { name: string; value: number }[];
}

interface HistoryItem {
  date: string;
  tokens: number;
  cost: number;
}

interface SkillItem {
  name: string;
  count: number;
  avg_latency_ms: number;
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [summaryData, setSummaryData] = useState<AnalyticsSummary | null>(null);
  const [historyData, setHistoryData] = useState<HistoryItem[]>([]);
  const [skillsData, setSkillsData] = useState<SkillItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [chartMetric, setChartMetric] = useState<"tokens" | "cost">("tokens");

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        const headers = {
          "Authorization": `Bearer ${token || 'not-needed'}`
        };

        const [summaryRes, historyRes, skillsRes] = await Promise.all([
          fetch(`${getBaseUrl()}/api/analytics/summary`, { headers }),
          fetch(`${getBaseUrl()}/api/analytics/history`, { headers }),
          fetch(`${getBaseUrl()}/api/analytics/skills`, { headers })
        ]);

        if (summaryRes.ok) {
          const summaryJson = await summaryRes.json();
          setSummaryData(summaryJson);
        }

        if (historyRes.ok) {
          const historyJson = await historyRes.json();
          setHistoryData(historyJson.history || []);
        }

        if (skillsRes.ok) {
          const skillsJson = await skillsRes.json();
          setSkillsData(skillsJson.skills || []);
        }
      } catch (err) {
        console.error("Failed to fetch analytics datasets:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full select-none">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-200">Analytics Dashboard</h1>
            <p className="text-xs text-neutral-500 mt-1">Real-time usage metrics, token costs, and skill execution logs.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-500" />
          </div>
        ) : !summaryData ? (
          <div className="text-neutral-500 text-center py-12 border border-neutral-900 rounded-xl bg-[#090909]">
            Failed to load analytics records.
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md hover:-translate-y-0.5 hover:shadow-black/20 hover:border-neutral-800 transition-all duration-300 relative overflow-hidden">
                <div className="flex items-center gap-3 text-neutral-400 mb-4">
                  <Activity className="w-5 h-5 text-purple-500 animate-pulse" />
                  <h3 className="font-medium text-xs uppercase tracking-wider">Total Tokens</h3>
                </div>
                <p className="text-3xl font-bold tracking-tight text-neutral-200">
                  {summaryData.summary.total_tokens.toLocaleString()}
                </p>
              </div>

              <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md hover:-translate-y-0.5 hover:shadow-black/20 hover:border-neutral-800 transition-all duration-300 relative overflow-hidden">
                <div className="flex items-center gap-3 text-neutral-400 mb-4">
                  <Coins className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-medium text-xs uppercase tracking-wider">Est. Spend (USD)</h3>
                </div>
                <p className="text-3xl font-bold tracking-tight text-neutral-200">
                  ${summaryData.summary.total_cost.toFixed(4)}
                </p>
              </div>

              <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md hover:-translate-y-0.5 hover:shadow-black/20 hover:border-neutral-800 transition-all duration-300 relative overflow-hidden">
                <div className="flex items-center gap-3 text-neutral-400 mb-4">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-medium text-xs uppercase tracking-wider">Avg Latency</h3>
                </div>
                <p className="text-3xl font-bold tracking-tight text-neutral-200">
                  {summaryData.summary.avg_latency_ms.toFixed(0)} <span className="text-lg font-medium text-neutral-500">ms</span>
                </p>
              </div>
            </div>

            {/* Time-series History Chart */}
            <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-medium text-neutral-300 text-sm">Usage Trends</h3>
                  <p className="text-[10px] text-neutral-500">Token allocation and spend patterns accumulated daily.</p>
                </div>
                <div className="flex bg-neutral-950 p-1 border border-neutral-850 rounded-lg">
                  <button
                    onClick={() => setChartMetric("tokens")}
                    className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                      chartMetric === "tokens" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Tokens
                  </button>
                  <button
                    onClick={() => setChartMetric("cost")}
                    className={`px-3 py-1 text-[10px] font-semibold rounded-md transition-colors cursor-pointer ${
                      chartMetric === "cost" ? "bg-neutral-800 text-white" : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    Spend
                  </button>
                </div>
              </div>

              <div className="h-72 w-full">
                {historyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartMetric === "tokens" ? "#8b5cf6" : "#10b981"} stopOpacity={0.2}/>
                          <stop offset="95%" stopColor={chartMetric === "tokens" ? "#8b5cf6" : "#10b981"} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#666', fontSize: 10 }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#666', fontSize: 10 }}
                        tickFormatter={(value) => chartMetric === "cost" ? `$${value.toFixed(2)}` : value.toLocaleString()}
                      />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'rgba(7, 7, 7, 0.75)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                        labelStyle={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}
                        itemStyle={{ fontSize: '12px', color: '#fff' }}
                        formatter={(value: any) => [
                          chartMetric === "cost" ? `$${Number(value).toFixed(4)}` : value.toLocaleString(),
                          chartMetric === "tokens" ? "Tokens" : "Spend"
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey={chartMetric}
                        stroke={chartMetric === "tokens" ? "#8b5cf6" : "#10b981"}
                        strokeWidth={1.5}
                        fillOpacity={1}
                        fill="url(#colorMetric)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
                    No timeline tracking data found. Generate some chat exchanges first.
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models Chart */}
              <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md">
                <h3 className="font-medium text-neutral-300 text-sm mb-6">Model Distribution (Requests)</h3>
                <div className="h-64 w-full">
                  {summaryData.models.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summaryData.models} layout="vertical" margin={{ top: 0, right: 10, left: 30, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#777', fontSize: 11 }} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                          contentStyle={{ backgroundColor: 'rgba(7, 7, 7, 0.75)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={16} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-xs">No model distribution records.</div>
                  )}
                </div>
              </div>

              {/* Providers Chart */}
              <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md">
                <h3 className="font-medium text-neutral-300 text-sm mb-6">Cost Breakdown by Provider</h3>
                <div className="h-64 w-full">
                  {summaryData.providers.length > 0 && summaryData.summary.total_cost > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={summaryData.providers}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={75}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {summaryData.providers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => `$${Number(value).toFixed(4)}`}
                          contentStyle={{ backgroundColor: 'rgba(7, 7, 7, 0.75)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', backdropFilter: 'blur(8px)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-500 text-xs">No provider cost charts available.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Skill / Tool Execution Telemetry */}
            <div className="bg-[#090909]/80 border border-neutral-900/60 rounded-xl p-6 shadow-md">
              <div className="mb-4">
                <h3 className="font-medium text-neutral-300 text-sm">Skill & Tool Execution logs</h3>
                <p className="text-[10px] text-neutral-500">Track dynamic skill routing, frequency, and average latency.</p>
              </div>

              <div className="border border-neutral-950 bg-neutral-950/20 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-900 text-neutral-400 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="px-6 py-3.5">Skill Name</th>
                        <th className="px-6 py-3.5 text-center">Invocations</th>
                        <th className="px-6 py-3.5 text-right">Avg Response Latency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-900 text-neutral-300 font-medium">
                      {skillsData.length > 0 ? (
                        skillsData.map((skill) => (
                          <tr key={skill.name} className="hover:bg-neutral-950/50 transition-colors">
                            <td className="px-6 py-3.5 font-mono text-purple-400 text-[11px]">
                              {skill.name}
                            </td>
                            <td className="px-6 py-3.5 text-center font-bold">
                              {skill.count}
                            </td>
                            <td className="px-6 py-3.5 text-right font-mono">
                              <span className={cn(
                                "inline-block px-2.5 py-0.5 rounded text-[10px] font-bold border",
                                skill.avg_latency_ms < 200
                                  ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-400"
                                  : skill.avg_latency_ms < 800
                                    ? "bg-amber-950/30 border-amber-900/40 text-amber-400"
                                    : "bg-red-950/30 border-red-900/40 text-red-400"
                              )}>
                                {skill.avg_latency_ms.toFixed(0)} ms
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-neutral-500 text-xs font-normal">
                            No skill telemetry logged. Try running code or triggering a search tool in conversation.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}
    </div>
  );
}
