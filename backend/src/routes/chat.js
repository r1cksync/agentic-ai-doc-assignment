const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { orchestrator } = require("../agents/orchestrator");
const {
  createSession,
  getSession,
  getAllSessions,
  createMessage,
  getMessagesBySession,
  trackEvent,
} = require("../data/store");

const router = express.Router();

// POST /api/chat - Process a chat query (SSE streaming)
router.post("/chat", async (req, res) => {
  try {
    const { session_id, query, document_scope, doc_ids } = req.body;
    if (!query) return res.status(400).json({ error: "Query is required" });

    // Get or create session
    let sessionId = session_id;
    if (!sessionId) {
      const session = createSession({ title: query.slice(0, 50) + "...", docIds: doc_ids || [] });
      sessionId = session.id;
    }

    const session = getSession(sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    // Store user message
    createMessage({ sessionId, role: "user", content: query });

    // Get chat history
    const messages = getMessagesBySession(sessionId);
    const chatHistory = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Set up SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    // Send session ID first
    res.write(`data: ${JSON.stringify({ type: "session", sessionId })}\n\n`);

    // Process with orchestrator (streaming)
    const stream = orchestrator.processQueryStream(query, {
      sessionId,
      docIds: doc_ids || session.docIds,
      chatHistory,
      documentScope: document_scope || "all",
    });

    let fullAnswer = "";
    let metadata = {};

    for await (const event of stream) {
      if (event.type === "token") {
        fullAnswer += event.content;
        res.write(`data: ${JSON.stringify({ type: "token", content: event.content })}\n\n`);
      } else if (event.type === "metadata") {
        metadata = event;
        res.write(`data: ${JSON.stringify({ type: "metadata", ...event })}\n\n`);
      }
    }

    // Store assistant message
    const assistantMsg = createMessage({
      sessionId,
      role: "assistant",
      content: fullAnswer,
      confidence: metadata.confidence,
      citations: metadata.citations,
      toolsCalled: metadata.toolsCalled,
      retrievalScores: metadata.retrievalScores,
      retrievedChunkIds: metadata.retrievedChunks?.map((c) => c.id) || [],
      suggestedFollowUps: metadata.suggestedFollowUps,
      responseTime: metadata.responseTime,
    });

    // Track analytics event
    trackEvent({
      eventType: "query",
      sessionId,
      docId: (req.body.doc_ids || [])[0] || null,
      queryText: query,
      answerText: fullAnswer.slice(0, 500),
      confidence: metadata.confidence || 0,
      tokensPrompt: 0,
      tokensCompletion: 0,
      tokensTotal: 0,
      latency: metadata.responseTime || 0,
      retrievalLatency: metadata.retrievalLatency || 0,
      llmLatency: (metadata.responseTime || 0) - (metadata.retrievalLatency || 0),
      toolsCalled: metadata.toolsCalled || [],
      retrievedChunkCount: metadata.retrievedChunks?.length || 0,
      avgRetrievalScore:
        metadata.retrievalScores?.length > 0
          ? Math.round((metadata.retrievalScores.reduce((a, b) => a + b, 0) / metadata.retrievalScores.length) * 100) / 100
          : 0,
      contextWindowPct: Math.min(Math.round((fullAnswer.length / 4000) * 100), 100),
    });

    // Send done signal
    res.write(`data: ${JSON.stringify({ type: "done", messageId: assistantMsg.id })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`);
      res.end();
    }
  }
});

// GET /api/sessions - List all sessions
router.get("/sessions", (_req, res) => {
  const sessions = getAllSessions().sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  res.json(sessions);
});

// GET /api/sessions/:id/messages - Get messages for a session
router.get("/sessions/:id/messages", (req, res) => {
  const messages = getMessagesBySession(req.params.id);
  res.json(messages);
});

module.exports = router;
