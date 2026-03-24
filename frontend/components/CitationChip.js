import { motion } from "framer-motion";
import { FileText, BookOpen } from "lucide-react";

export default function CitationChip({ citation, index, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick?.(citation)}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/30 rounded-full text-xs text-primary hover:bg-primary/20 transition-colors"
    >
      <BookOpen size={12} />
      <span className="max-w-[150px] truncate">
        {citation.docTitle || "Source"}, p.{citation.pageNumber || "?"}
      </span>
    </motion.button>
  );
}
