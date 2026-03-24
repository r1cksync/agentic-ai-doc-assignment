import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import ConfidenceBadge from "./ConfidenceBadge";
import CitationChip from "./CitationChip";
import { ThumbsUp, ThumbsDown, Copy, RotateCcw } from "lucide-react";
import { submitFeedback } from "../lib/api";

export default function MessageBubble({ message, index, onCitationClick, onRegenerate }) {
  const isUser = message.role === "user";

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
  };

  const handleFeedback = async (vote) => {
    if (message.id) {
      try { await submitFeedback(message.id, vote); } catch {}
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div className={`max-w-[85%] ${isUser ? "order-1" : ""}`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-primary text-white rounded-br-md"
              : "bg-card border border-gray-700 rounded-bl-md"
          }`}
        >
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{message.content || ""}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Metadata for assistant messages */}
        {!isUser && message.confidence !== undefined && message.confidence !== null && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <ConfidenceBadge score={message.confidence} size="sm" />

            {message.citations?.map((cite, i) => (
              <CitationChip
                key={i}
                citation={cite}
                index={i}
                onClick={onCitationClick}
              />
            ))}
          </div>
        )}

        {/* Tools called */}
        {!isUser && message.toolsCalled?.length > 0 && (
          <div className="mt-1.5 flex gap-1 flex-wrap">
            {message.toolsCalled.map((tool, i) => (
              <span
                key={i}
                className="text-[10px] px-1.5 py-0.5 bg-accent/10 text-accent rounded"
              >
                {tool}
              </span>
            ))}
          </div>
        )}

        {/* Action buttons for assistant messages */}
        {!isUser && (
          <div className="mt-2 flex items-center gap-1">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded hover:bg-card-hover text-gray-500 hover:text-white transition-colors"
              title="Copy"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => handleFeedback(1)}
              className="p-1.5 rounded hover:bg-card-hover text-gray-500 hover:text-green-400 transition-colors"
              title="Thumbs up"
            >
              <ThumbsUp size={14} />
            </button>
            <button
              onClick={() => handleFeedback(-1)}
              className="p-1.5 rounded hover:bg-card-hover text-gray-500 hover:text-red-400 transition-colors"
              title="Thumbs down"
            >
              <ThumbsDown size={14} />
            </button>
            {onRegenerate && (
              <button
                onClick={() => onRegenerate(message)}
                className="p-1.5 rounded hover:bg-card-hover text-gray-500 hover:text-primary transition-colors"
                title="Regenerate"
              >
                <RotateCcw size={14} />
              </button>
            )}
            {message.responseTime && (
              <span className="text-[10px] text-gray-600 ml-2">{(message.responseTime / 1000).toFixed(1)}s</span>
            )}
          </div>
        )}

        {/* Suggested follow-ups */}
        {!isUser && message.suggestedFollowUps?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.suggestedFollowUps.map((q, i) => (
              <button
                key={i}
                onClick={() => onCitationClick?.({ type: "followup", query: q })}
                className="text-xs px-3 py-1.5 bg-surface border border-gray-700 rounded-full text-gray-300 hover:text-white hover:border-primary transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
