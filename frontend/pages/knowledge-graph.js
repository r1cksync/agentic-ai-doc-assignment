import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Share2, Loader2 } from "lucide-react";
import useSWR from "swr";
import KnowledgeGraphViz from "../components/KnowledgeGraphViz";
import { getKnowledgeGraph } from "../lib/api";

export default function KnowledgeGraphPage() {
  const { data, isLoading } = useSWR("/api/knowledge-graph", getKnowledgeGraph);

  return (
    <div className="p-6 h-screen flex flex-col">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Share2 className="text-primary" size={24} />
          Knowledge Graph
        </h1>
        <p className="text-gray-400 text-sm">
          Entity relationships across all documents — drag nodes, scroll to zoom
        </p>
        {data && (
          <p className="text-xs text-gray-500 mt-1">
            {data.nodes?.length} nodes &middot; {data.edges?.length} connections
          </p>
        )}
      </motion.div>

      <div className="flex-1 bg-card border border-gray-700 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={32} className="text-primary animate-spin" />
          </div>
        ) : (
          <KnowledgeGraphViz data={data} />
        )}
      </div>
    </div>
  );
}
