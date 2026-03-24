import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GitCompare, Loader2, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import useSWR from "swr";
import { getDocuments, compareDocuments } from "../lib/api";

export default function ComparePage() {
  const { data: docs } = useSWR("/api/documents", getDocuments);
  const [docA, setDocA] = useState("");
  const [docB, setDocB] = useState("");
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCompare = async () => {
    if (!docA || !docB || docA === docB) return;
    setLoading(true);
    try {
      const result = await compareDocuments(docA, docB);
      setComparison(result);
    } catch (err) {
      console.error("Comparison failed:", err);
    }
    setLoading(false);
  };

  // Word frequency chart data
  const wordFreqChart = () => {
    if (!comparison?.wordFrequency) return [];
    const allWords = new Set([
      ...comparison.wordFrequency.docA.map((w) => w.word),
      ...comparison.wordFrequency.docB.map((w) => w.word),
    ]);
    return Array.from(allWords).slice(0, 15).map((word) => ({
      word,
      [comparison.docA?.title || "Doc A"]: comparison.wordFrequency.docA.find((w) => w.word === word)?.count || 0,
      [comparison.docB?.title || "Doc B"]: comparison.wordFrequency.docB.find((w) => w.word === word)?.count || 0,
    }));
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <GitCompare className="text-primary" size={24} />
          Document Comparison
        </h1>
        <p className="text-gray-400 text-sm mb-6">Compare two documents side-by-side with AI analysis</p>
      </motion.div>

      {/* Document selectors */}
      <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
        <select
          value={docA}
          onChange={(e) => setDocA(e.target.value)}
          className="flex-1 bg-card border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
        >
          <option value="">Select Document A</option>
          {docs?.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>

        <ArrowRight size={20} className="text-gray-500 hidden md:block" />

        <select
          value={docB}
          onChange={(e) => setDocB(e.target.value)}
          className="flex-1 bg-card border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
        >
          <option value="">Select Document B</option>
          {docs?.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>

        <button
          onClick={handleCompare}
          disabled={!docA || !docB || docA === docB || loading}
          className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <GitCompare size={16} />}
          Compare
        </button>
      </div>

      {/* Results */}
      {comparison && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Similarity Score */}
          <div className="bg-card border border-gray-700 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-400">Document Similarity</p>
            <p className="text-4xl font-bold text-primary mt-1">{comparison.similarity}%</p>
          </div>

          {/* Summary */}
          {comparison.comparison?.summary && (
            <div className="bg-card border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Summary</h3>
              <p className="text-gray-300 text-sm">{comparison.comparison.summary}</p>
            </div>
          )}

          {/* Key Differences */}
          {comparison.comparison?.keyDifferences?.length > 0 && (
            <div className="bg-card border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Key Differences</h3>
              <div className="space-y-3">
                {comparison.comparison.keyDifferences.map((diff, i) => (
                  <div key={i} className="grid grid-cols-3 gap-4 p-3 bg-surface rounded-lg text-xs">
                    <div className="text-center font-medium text-accent">{diff.topic}</div>
                    <div className="text-gray-300"><span className="text-primary font-medium">A: </span>{diff.docA}</div>
                    <div className="text-gray-300"><span className="text-accent font-medium">B: </span>{diff.docB}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shared Themes */}
          {comparison.comparison?.sharedThemes?.length > 0 && (
            <div className="bg-card border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Shared Themes</h3>
              <div className="flex flex-wrap gap-2">
                {comparison.comparison.sharedThemes.map((theme, i) => (
                  <span key={i} className="px-3 py-1.5 bg-green-500/10 text-green-400 rounded-full text-xs">{theme}</span>
                ))}
              </div>
            </div>
          )}

          {/* Contradictions */}
          {comparison.comparison?.contradictions?.length > 0 && (
            <div className="bg-card border border-red-500/30 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3 text-red-400">Contradictions</h3>
              <div className="space-y-3">
                {comparison.comparison.contradictions.map((c, i) => (
                  <div key={i} className="p-3 bg-red-500/5 rounded-lg text-xs">
                    <p className="font-medium text-red-400 mb-1">{c.topic}</p>
                    <p className="text-gray-300">Doc A says: {c.docA_says}</p>
                    <p className="text-gray-300">Doc B says: {c.docB_says}</p>
                    <p className="text-gray-400 mt-1">{c.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tone Comparison */}
          {comparison.comparison?.toneComparison && (
            <div className="bg-card border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-3">Tone Comparison</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-surface rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{comparison.docA?.title}</p>
                  <p className="text-primary font-medium capitalize">{comparison.comparison.toneComparison.docA}</p>
                </div>
                <div className="text-center p-4 bg-surface rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">{comparison.docB?.title}</p>
                  <p className="text-accent font-medium capitalize">{comparison.comparison.toneComparison.docB}</p>
                </div>
              </div>
            </div>
          )}

          {/* Word Frequency */}
          <div className="bg-card border border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Word Frequency Comparison</h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={wordFreqChart()} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#666" }} />
                <YAxis type="category" dataKey="word" tick={{ fontSize: 10, fill: "#666" }} width={100} />
                <Tooltip contentStyle={{ background: "#2A2A3E", border: "1px solid #444", borderRadius: 8 }} />
                <Legend />
                <Bar dataKey={comparison.docA?.title || "Doc A"} fill="#6366F1" radius={[0, 4, 4, 0]} />
                <Bar dataKey={comparison.docB?.title || "Doc B"} fill="#22D3EE" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Timelines */}
          {(comparison.timelineA?.length > 0 || comparison.timelineB?.length > 0) && (
            <div className="bg-card border border-gray-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold mb-4">Merged Timeline</h3>
              <div className="space-y-3">
                {[
                  ...(comparison.timelineA || []).map((e) => ({ ...e, source: comparison.docA?.title || "A" })),
                  ...(comparison.timelineB || []).map((e) => ({ ...e, source: comparison.docB?.title || "B" })),
                ]
                  .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                  .map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-2 h-2 mt-1.5 rounded-full ${event.source.includes("A") ? "bg-primary" : "bg-accent"}`} />
                      <div>
                        <p className="text-xs text-gray-500">{event.date} &middot; {event.source}</p>
                        <p className="text-sm text-gray-300">{event.event}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
