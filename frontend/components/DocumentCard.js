import { motion } from "framer-motion";
import { FileText, Clock, Hash, User, Trash2, MessageSquare, HelpCircle } from "lucide-react";
import { useRouter } from "next/router";

export default function DocumentCard({ doc, onDelete }) {
  const router = useRouter();

  const typeColors = {
    txt: "text-blue-400 bg-blue-500/10",
    pdf: "text-red-400 bg-red-500/10",
    docx: "text-green-400 bg-green-500/10",
    csv: "text-yellow-400 bg-yellow-500/10",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-card border border-gray-700 rounded-xl p-5 hover:border-primary/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${typeColors[doc.fileType] || "text-gray-400 bg-gray-700"}`}>
            <FileText size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white truncate max-w-[200px]">{doc.title}</h3>
            <p className="text-[11px] text-gray-500 uppercase">{doc.fileType} &middot; {(doc.fileSize / 1024).toFixed(1)} KB</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          doc.status === "ready" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"
        }`}>
          {doc.status}
        </span>
      </div>

      {doc.summary && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{doc.summary}</p>
      )}

      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1"><Hash size={12} />{doc.chunkCount} chunks</span>
        <span className="flex items-center gap-1"><User size={12} />{doc.author || "Unknown"}</span>
        <span className="flex items-center gap-1"><Clock size={12} />{doc.processingTime}ms</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => router.push(`/chat/new?doc=${doc.id}`)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors"
        >
          <MessageSquare size={14} />
          Chat
        </button>
        <button
          onClick={() => router.push(`/quiz?doc=${doc.id}`)}
          className="flex items-center justify-center gap-1.5 py-2 px-3 bg-accent/10 text-accent rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
        >
          <HelpCircle size={14} />
          Quiz
        </button>
        {onDelete && (
          <button
            onClick={() => onDelete(doc.id)}
            className="p-2 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </motion.div>
  );
}
