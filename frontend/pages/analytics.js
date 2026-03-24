import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import useSWR from "swr";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  AreaChart, Area, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  FileText, MessageSquare, Coins, Target, Users, Clock,
  Zap, Activity, Database, Brain, AlertTriangle, TrendingUp,
} from "lucide-react";
import MetricCard from "../components/MetricCard";
import { getAnalytics } from "../lib/api";
import useStore from "../lib/store";

const COLORS = ["#6366F1", "#22D3EE", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#F97316"];

export default function AnalyticsPage() {
  const { analytics, setAnalytics } = useStore();
  const { data } = useSWR("/api/analytics", getAnalytics, { refreshInterval: 30000 });

  useEffect(() => {
    if (data) setAnalytics(data);
  }, [data, setAnalytics]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity size={48} className="mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { overview, retrieval, answerQuality, tokenEconomics, documentAnalytics, toolAnalytics } = analytics;

  // Prepare chart data
  const docTypeData = Object.entries(documentAnalytics.docsByType || {}).map(([name, value]) => ({ name, value }));
  const queriesPerDocData = Object.entries(documentAnalytics.queriesPerDoc || {}).map(([name, value]) => ({ name: name.slice(0, 20), value }));
  const toolFreqData = Object.entries(toolAnalytics.toolFrequency || {}).map(([name, value]) => ({ name: name.replace(/_/g, " "), value }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Analytics Dashboard</h1>
        <p className="text-gray-400 text-sm mb-6">Real-time metrics from your document AI pipeline</p>
      </motion.div>

      {/* Section A: Usage Overview */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={16} /> Usage Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard label="Documents" value={overview.totalDocuments} icon={FileText} color="primary" trend={12} />
          <MetricCard label="Queries" value={overview.totalQueries} icon={MessageSquare} color="accent" trend={24} />
          <MetricCard label="Tokens Used" value={overview.totalTokens} icon={Coins} color="yellow" trend={18} />
          <MetricCard label="Avg Confidence" value={`${overview.avgConfidence}%`} icon={Target} color="green" trend={5} />
          <MetricCard label="Sessions" value={overview.totalSessions} icon={Users} color="purple" trend={8} />
          <MetricCard label="Avg Turns" value={overview.avgSessionLength} icon={Clock} color="red" trend={-3} />
        </div>
      </section>

      {/* Section B: Retrieval Quality */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Database size={16} /> Context & Retrieval Quality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Context Window Utilization */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Context Window Utilization (%)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={retrieval.contextWindowUtilization || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(5, 10)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Avg Chunk Similarity */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Avg Chunk Similarity Score</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={retrieval.avgChunkSimilarity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(5, 10)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="#22D3EE" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Retrieval Latency */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Retrieval Latency (ms)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={retrieval.retrievalLatency || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(5, 10)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Line type="monotone" dataKey="ms" stroke="#F59E0B" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chunks per query histogram */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Chunks Retrieved per Query</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={retrieval.chunksPerQuery || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(5, 10)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section C: Answer Quality */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={16} /> Answer Quality
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Confidence Distribution */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Confidence Score Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={answerQuality.confidenceDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="bracket" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(answerQuality.confidenceDistribution || []).map((_, index) => (
                    <Cell key={index} fill={index >= 8 ? "#22c55e" : index >= 6 ? "#eab308" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Confidence Trend */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Confidence Trend Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={answerQuality.confidenceTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Low Confidence Queries Table */}
          <div className="bg-card border border-gray-700 rounded-xl p-5 md:col-span-2">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-400" />
              Low Confidence Queries (below 50%)
            </h3>
            {(answerQuality.lowConfidenceQueries || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-2 px-3">Query</th>
                      <th className="text-left py-2 px-3">Confidence</th>
                      <th className="text-left py-2 px-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {answerQuality.lowConfidenceQueries.slice(0, 10).map((q, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-300">{q.query?.slice(0, 60)}...</td>
                        <td className="py-2 px-3">
                          <span className="text-red-400 font-medium">{q.confidence}%</span>
                        </td>
                        <td className="py-2 px-3 text-gray-500">{q.date?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No low-confidence queries yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section D: Token Economics */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Coins size={16} /> Token Economics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Usage Over Time */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Token Usage Over Time</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={tokenEconomics.tokensByDay || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Area type="monotone" dataKey="prompt" stackId="1" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} />
                <Area type="monotone" dataKey="completion" stackId="1" stroke="#22D3EE" fill="#22D3EE" fillOpacity={0.3} />
                <Legend />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Tokens Per Query Scatter */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Tokens vs Query Length</h3>
            <ResponsiveContainer width="100%" height={250}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="queryLength" name="Query Length" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis dataKey="tokens" name="Tokens" tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} cursor={{ strokeDasharray: "3 3" }} />
                <Scatter data={tokenEconomics.tokensPerQuery || []} fill="#6366F1" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Top Sessions by Tokens */}
          <div className="bg-card border border-gray-700 rounded-xl p-5 md:col-span-2">
            <h3 className="text-sm font-medium mb-4">Most Expensive Sessions</h3>
            {(tokenEconomics.topSessionsByTokens || []).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-gray-700">
                      <th className="text-left py-2 px-3">Session</th>
                      <th className="text-left py-2 px-3">Title</th>
                      <th className="text-left py-2 px-3">Turns</th>
                      <th className="text-left py-2 px-3">Total Tokens</th>
                      <th className="text-left py-2 px-3">Est. Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokenEconomics.topSessionsByTokens.slice(0, 10).map((s, i) => (
                      <tr key={i} className="border-b border-gray-800">
                        <td className="py-2 px-3 text-gray-400 font-mono">{s.sessionId?.slice(0, 8)}...</td>
                        <td className="py-2 px-3 text-gray-300">{s.title}</td>
                        <td className="py-2 px-3 text-gray-300">{s.turns}</td>
                        <td className="py-2 px-3 text-primary font-medium">{s.totalTokens?.toLocaleString()}</td>
                        <td className="py-2 px-3 text-yellow-400">${((s.totalTokens || 0) * 0.00002).toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No session data yet.</p>
            )}
          </div>
        </div>
      </section>

      {/* Section E: Document Analytics */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <FileText size={16} /> Document Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Documents by Type */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Documents by Type</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={docTypeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(entry) => entry.name}>
                  {docTypeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Queries Per Document */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Queries per Document</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={queriesPerDocData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#666" }} width={120} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="value" fill="#22D3EE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Processing Times */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Document Processing Time (ms)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={documentAnalytics.docProcessingTimes || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(0, 15)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="time" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Entity Density */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Entity Density per Document</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-700">
                    <th className="text-left py-2 px-2">Document</th>
                    <th className="py-2 px-2">Person</th>
                    <th className="py-2 px-2">Org</th>
                    <th className="py-2 px-2">Location</th>
                    <th className="py-2 px-2">Date</th>
                    <th className="py-2 px-2">Money</th>
                  </tr>
                </thead>
                <tbody>
                  {(documentAnalytics.entityDensity || []).map((doc, i) => (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-2 px-2 text-gray-300">{doc.name?.slice(0, 20)}</td>
                      <td className="py-2 px-2 text-center"><EntityCell count={doc.person} /></td>
                      <td className="py-2 px-2 text-center"><EntityCell count={doc.organization} /></td>
                      <td className="py-2 px-2 text-center"><EntityCell count={doc.location} /></td>
                      <td className="py-2 px-2 text-center"><EntityCell count={doc.date} /></td>
                      <td className="py-2 px-2 text-center"><EntityCell count={doc.money} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section F: Tool Analytics */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Brain size={16} /> Agent & Tool Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tool Call Frequency */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Tool Call Frequency</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={toolFreqData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#666" }} width={140} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {toolFreqData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Response Time Breakdown */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-medium mb-4">Response Time Breakdown (ms)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(toolAnalytics.responseTimeBreakdown || []).slice(0, 15)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#666" }} tickFormatter={(v) => v?.slice(11, 16)} />
                <YAxis tick={{ fontSize: 10, fill: "#666" }} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Bar dataKey="retrieval" stackId="a" fill="#6366F1" name="Retrieval" />
                <Bar dataKey="llm" stackId="a" fill="#22D3EE" name="LLM" />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}

function EntityCell({ count }) {
  if (!count) return <span className="text-gray-700">-</span>;
  const intensity = Math.min(count / 5, 1);
  const bg = `rgba(99, 102, 241, ${0.1 + intensity * 0.4})`;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-xs font-medium" style={{ background: bg, color: "#C7D2FE" }}>
      {count}
    </span>
  );
}
