import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Send, Loader2, Sparkles, FileText, ChevronDown } from "lucide-react";
import MessageBubble from "../../components/MessageBubble";
import {
  streamChat,
  getDocuments,
  getSessionMessages,
  getSessions,
} from "../../lib/api";
import useStore from "../../lib/store";

const starterQuestions = [
  "What are the key findings of this document?",
  "Summarize the main points",
  "Extract all the important dates and events",
  "Who are the key people or organizations mentioned?",
  "What are the financial figures discussed?",
];

export default function ChatPage() {
  const router = useRouter();
  const { sessionId: routeSessionId } = router.query;
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [docs, setDocs] = useState([]);
  const messagesEndRef = useRef(null);
  const {
    messages,
    setMessages,
    addMessage,
    updateLastMessage,
    isStreaming,
    setIsStreaming,
  } = useStore();

  // Load documents and session
  useEffect(() => {
    getDocuments().then(setDocs).catch(() => {});

    if (routeSessionId && routeSessionId !== "new") {
      setSessionId(routeSessionId);
      getSessionMessages(routeSessionId).then(setMessages).catch(() => {});
    } else {
      setMessages([]);
      setSessionId(null);
    }

    // Check for query param
    if (router.query.q) {
      setInput(router.query.q);
    }
    if (router.query.doc) {
      setSelectedDocId(router.query.doc);
    }
  }, [routeSessionId, router.query.q, router.query.doc, setMessages]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text) => {
    const query = text || input.trim();
    if (!query || isStreaming) return;

    setInput("");
    setIsStreaming(true);

    // Add user message
    addMessage({ role: "user", content: query });

    // Add placeholder assistant message
    addMessage({ role: "assistant", content: "", streaming: true });

    let fullContent = "";
    let currentSessionId = sessionId;

    try {
      await streamChat(
        query,
        currentSessionId,
        selectedDocId ? [selectedDocId] : [],
        selectedDocId ? "current" : "all",
        (event) => {
          if (event.type === "session") {
            currentSessionId = event.sessionId;
            setSessionId(event.sessionId);
            // Update URL without reload
            if (routeSessionId === "new") {
              window.history.replaceState(null, "", `/chat/${event.sessionId}`);
            }
          } else if (event.type === "token") {
            fullContent += event.content;
            updateLastMessage({ content: fullContent });
          } else if (event.type === "error") {
            const msg = event.error || "Something went wrong";
            const friendly = msg.includes("rate_limit") || msg.includes("429")
              ? "⚠️ Groq API rate limit reached. Please wait a few minutes and try again, or upgrade your Groq plan."
              : `Error: ${msg}`;
            updateLastMessage({ content: friendly, streaming: false });
          } else if (event.type === "metadata") {
            updateLastMessage({
              confidence: event.confidence,
              citations: event.citations,
              toolsCalled: event.toolsCalled,
              suggestedFollowUps: event.suggestedFollowUps,
              responseTime: event.responseTime,
              extras: event.extras,
              streaming: false,
            });
          } else if (event.type === "done") {
            updateLastMessage({ id: event.messageId, streaming: false });
          }
        }
      );
    } catch (err) {
      updateLastMessage({
        content: `Error: ${err.message}. Make sure the backend is running and GROQ_API_KEY is configured.`,
        streaming: false,
      });
    }

    setIsStreaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCitationClick = (citation) => {
    if (citation?.type === "followup") {
      handleSend(citation.query);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700 bg-card/50 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">AI Chat</h2>
          {sessionId && (
            <span className="text-xs text-gray-500 bg-surface px-2 py-0.5 rounded">
              Session: {sessionId.slice(0, 8)}...
            </span>
          )}
        </div>

        {/* Document selector */}
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-gray-400" />
          <select
            value={selectedDocId || ""}
            onChange={(e) => setSelectedDocId(e.target.value || null)}
            className="bg-surface border border-gray-700 rounded-lg text-xs px-3 py-1.5 text-gray-300 focus:outline-none focus:border-primary"
          >
            <option value="">All Documents</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-lg"
            >
              <Sparkles size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-xl font-bold mb-2">Start a conversation</h2>
              <p className="text-gray-400 text-sm mb-6">
                Ask questions about your documents. The AI will analyze them using
                multiple specialized agents.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {starterQuestions.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={() => handleSend(q)}
                    className="px-4 py-2 bg-card border border-gray-700 rounded-full text-sm text-gray-300 hover:text-white hover:border-primary/50 transition-all"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <MessageBubble
                key={i}
                message={msg}
                index={i}
                onCitationClick={handleCitationClick}
                onRegenerate={
                  msg.role === "assistant"
                    ? () => {
                        const prevUser = messages
                          .slice(0, i)
                          .reverse()
                          .find((m) => m.role === "user");
                        if (prevUser) handleSend(prevUser.content);
                      }
                    : null
                }
              />
            ))}
            {isStreaming && messages[messages.length - 1]?.streaming && (
              <div className="flex justify-start mb-4">
                <div className="flex items-center gap-2 text-gray-400 text-xs">
                  <Loader2 size={14} className="animate-spin" />
                  Agents working...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-700 bg-card/50 backdrop-blur px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents..."
              rows={1}
              className="w-full bg-surface border border-gray-700 rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary resize-none"
              style={{ minHeight: "48px", maxHeight: "160px" }}
            />
          </div>
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isStreaming}
            className="p-3 bg-primary rounded-xl text-white hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isStreaming ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-600 mt-2">
          Powered by Groq LLM with multi-agent RAG pipeline
        </p>
      </div>
    </div>
  );
}
