"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { Loader2, Activity, Coins, Zap } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { getBaseUrl } from "@/lib/api-client";

interface AnalyticsData {
  summary: {
    total_tokens: number;
    total_cost: number;
    avg_latency_ms: number;
  };
  models: { name: string; count: number }[];
  providers: { name: string; value: number }[];
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem("auth-token");
        const res = await fetch(`${getBaseUrl()}/api/analytics/summary`, {
          headers: {
            "Authorization": `Bearer ${token || 'not-needed'}`
          }
        });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (err) {
        console.error("Failed to fetch analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
        <h1 className="text-3xl font-semibold tracking-tight mb-8">Analytics Dashboard</h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="text-muted-foreground text-center py-12 border border-border rounded-xl bg-card/50">
            Failed to load analytics data.
          </div>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-muted-foreground mb-4">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <h3 className="font-medium">Total Tokens</h3>
                </div>
                <p className="text-4xl font-semibold tracking-tight">
                  {data.summary.total_tokens.toLocaleString()}
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-muted-foreground mb-4">
                  <Coins className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-medium">Est. Cost</h3>
                </div>
                <p className="text-4xl font-semibold tracking-tight">
                  ${data.summary.total_cost.toFixed(4)}
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 text-muted-foreground mb-4">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <h3 className="font-medium">Avg Latency</h3>
                </div>
                <p className="text-4xl font-semibold tracking-tight">
                  {data.summary.avg_latency_ms.toFixed(0)} ms
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Models Chart */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-medium text-muted-foreground mb-6">Model Usage (Calls)</h3>
                <div className="h-64 w-full">
                  {data.models.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.models} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} />
                        <RechartsTooltip
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No model data yet.</div>
                  )}
                </div>
              </div>

              {/* Providers Chart */}
              <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                <h3 className="font-medium text-muted-foreground mb-6">Cost by Provider</h3>
                <div className="h-64 w-full">
                  {data.providers.length > 0 && data.summary.total_cost > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.providers}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {data.providers.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any) => `$${Number(value).toFixed(4)}`}
                          contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #333', borderRadius: '8px' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No cost data yet.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
