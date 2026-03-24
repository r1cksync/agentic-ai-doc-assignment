require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");

const { processDocument } = require("./src/services/documentProcessor");
const { vectorStore } = require("./src/services/vectorStore");
const { entityExtractorAgent, summarizerAgent } = require("./src/agents/tools");
const {
  createDocument,
  createChunk,
  createEntity,
  createSession,
  createMessage,
  trackEvent,
} = require("./src/data/store");

// Import routes
const documentRoutes = require("./src/routes/documents");
const chatRoutes = require("./src/routes/chat");
const analyticsRoutes = require("./src/routes/analytics");
const quizRoutes = require("./src/routes/quiz");
const compareRoutes = require("./src/routes/compare");
const knowledgeGraphRoutes = require("./src/routes/knowledgeGraph");
const feedbackRoutes = require("./src/routes/feedback");

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json({ limit: "50mb" }));

// Routes
app.use("/api", documentRoutes);
app.use("/api", chatRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", quizRoutes);
app.use("/api", compareRoutes);
app.use("/api", knowledgeGraphRoutes);
app.use("/api", feedbackRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Load sample files on startup ────────────────────────────
async function loadSampleFiles() {
  const sampleDir = path.join(__dirname, "sample-files");
  if (!fs.existsSync(sampleDir)) return;

  const files = fs.readdirSync(sampleDir).filter((f) => f.endsWith(".txt") || f.endsWith(".pdf"));
  console.log(`\n📂 Loading ${files.length} sample files...`);

  for (const fileName of files) {
    const filePath = path.join(sampleDir, fileName);
    const docId = uuidv4();

    try {
      console.log(`  Processing: ${fileName}`);
      const result = await processDocument(filePath, fileName, "txt");

      // Create document
      const doc = createDocument({
        id: docId,
        title: result.metadata.title || fileName.replace(/\.[^.]+$/, "").replace(/-/g, " "),
        fileName,
        fileType: "txt",
        content: result.text,
        author: result.metadata.author || "Sample",
        date: result.metadata.date || new Date().toISOString(),
        status: "ready",
        processingTime: result.processingTime,
        fileSize: result.fileSize,
        sourceType: "sample",
      });

      // Create chunks
      const chunkRecords = [];
      for (const chunk of result.chunks) {
        const chunkRecord = createChunk({
          id: uuidv4(),
          docId,
          text: chunk.text,
          chunkIndex: chunk.chunkIndex,
          pageNumber: chunk.pageNumber,
          charStart: chunk.charStart,
          charEnd: chunk.charEnd,
        });
        chunkRecords.push(chunkRecord);
      }

      vectorStore.addChunks(chunkRecords);
      doc.chunkCount = chunkRecords.length;

      // Extract entities (only if Groq API key is configured)
      if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_api_key_here") {
        try {
          const entities = await entityExtractorAgent(result.text.slice(0, 5000));
          for (const entity of entities) {
            createEntity({ docId, name: entity.name, type: entity.type, mentions: 1, chunkIds: [] });
          }
          doc.entities = entities;
          console.log(`  ✓ Extracted ${entities.length} entities from ${fileName}`);
        } catch (e) {
          console.log(`  ⚠ Entity extraction skipped for ${fileName}: ${e.message}`);
          doc.entities = [];
        }

        // Generate summary
        try {
          const summary = await summarizerAgent(result.text, "paragraph");
          doc.summary = summary.text || "";
        } catch {
          doc.summary = "";
        }
      } else {
        // Generate basic entities without LLM
        doc.entities = extractBasicEntities(result.text, docId);
        doc.summary = result.text.split("\n").filter((l) => l.trim().length > 20).slice(0, 3).join(" ");
        for (const entity of doc.entities) {
          createEntity({ docId, name: entity.name, type: entity.type, mentions: entity.mentions || 1, chunkIds: [] });
        }
      }

      console.log(`  ✓ ${fileName}: ${chunkRecords.length} chunks, ${doc.entities.length} entities`);
    } catch (err) {
      console.error(`  ✗ Error loading ${fileName}:`, err.message);
    }
  }

  // Generate synthetic analytics data for demo
  generateSyntheticAnalytics();
  console.log("✅ Sample files loaded and analytics seeded\n");
}

// Basic entity extraction without LLM (fallback)
function extractBasicEntities(text, docId) {
  const entities = [];
  // Extract capitalized proper nouns (simple NER)
  const properNouns = text.match(/(?:Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)+/g) || [];
  const seen = new Set();
  for (const name of properNouns) {
    const clean = name.trim();
    if (clean.length > 4 && clean.length < 50 && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      entities.push({ name: clean, type: "person", mentions: 1 });
    }
  }

  // Extract dollar amounts
  const money = text.match(/\$[\d,.]+(?:\s*(?:million|billion|thousand|M|B|K))?/gi) || [];
  for (const m of money.slice(0, 10)) {
    entities.push({ name: m.trim(), type: "money", mentions: 1 });
  }

  // Extract dates
  const dates = text.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi) || [];
  for (const d of dates.slice(0, 10)) {
    entities.push({ name: d.trim(), type: "date", mentions: 1 });
  }

  // Extract organizations (words ending in Inc, Corp, Ltd, LLC)
  const orgs = text.match(/[A-Z][a-zA-Z\s]+(?:Inc|Corp|Ltd|LLC|Technologies|Solutions|University|Institute|Lab|Company|Corporation|Authority|Group)\b\.?/g) || [];
  const orgSeen = new Set();
  for (const org of orgs) {
    const clean = org.trim();
    if (clean.length > 5 && !orgSeen.has(clean.toLowerCase())) {
      orgSeen.add(clean.toLowerCase());
      entities.push({ name: clean, type: "organization", mentions: 1 });
    }
  }

  return entities.slice(0, 30);
}

// Generate synthetic analytics data for a populated demo
function generateSyntheticAnalytics() {
  const { getAllDocuments } = require("./src/data/store");
  const docs = getAllDocuments();
  if (docs.length === 0) return;

  const now = new Date();
  const queries = [
    "What are the key findings of the research paper?",
    "Summarize the contract terms",
    "What was Q4 revenue?",
    "Compare the research paper and the report",
    "Who are the main people mentioned?",
    "What are the payment terms in the contract?",
    "What is the total contract value?",
    "Tell me about transformer architectures",
    "What are the risk factors?",
    "Generate a timeline of events",
    "How many enterprise customers does TechVista have?",
    "What is LoRA in the context of AI?",
    "What are the intellectual property terms?",
    "Summarize Q4 performance in bullets",
    "What technology stack is required?",
  ];

  // Create a demo session
  const session = createSession({ title: "Demo Analytics Session", docIds: docs.map((d) => d.id) });

  for (let i = 0; i < queries.length; i++) {
    const daysAgo = Math.floor(Math.random() * 7);
    const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

    const doc = docs[i % docs.length];
    const confidence = Math.floor(Math.random() * 40) + 55;
    const tokensPrompt = Math.floor(Math.random() * 1000) + 500;
    const tokensCompletion = Math.floor(Math.random() * 500) + 200;

    createMessage({
      sessionId: session.id,
      role: "user",
      content: queries[i],
      createdAt: date.toISOString(),
    });

    createMessage({
      sessionId: session.id,
      role: "assistant",
      content: `Answer to: ${queries[i]}`,
      confidence,
      toolsCalled: ["document_retriever", "qa_agent", "citation_tracer", "confidence_scorer"],
      responseTime: Math.floor(Math.random() * 3000) + 1000,
    });

    trackEvent({
      eventType: "query",
      sessionId: session.id,
      docId: doc.id,
      queryText: queries[i],
      answerText: `Sample answer for analytics...`,
      confidence,
      tokensPrompt,
      tokensCompletion,
      tokensTotal: tokensPrompt + tokensCompletion,
      latency: Math.floor(Math.random() * 3000) + 1000,
      retrievalLatency: Math.floor(Math.random() * 200) + 50,
      llmLatency: Math.floor(Math.random() * 2500) + 800,
      toolsCalled: ["document_retriever", "qa_agent", "citation_tracer", "confidence_scorer"],
      retrievedChunkCount: Math.floor(Math.random() * 5) + 3,
      avgRetrievalScore: Math.round((Math.random() * 0.4 + 0.3) * 100) / 100,
      contextWindowPct: Math.floor(Math.random() * 40) + 40,
      createdAt: date.toISOString(),
    });
  }
}

// Start server
app.listen(PORT, async () => {
  console.log(`🚀 DocAI Backend running on http://localhost:${PORT}`);
  console.log(`   Frontend URL: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);

  // Auto-load sample files
  await loadSampleFiles();
});
