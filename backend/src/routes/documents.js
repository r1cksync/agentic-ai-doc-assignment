const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const { processDocument } = require("../services/documentProcessor");
const { vectorStore } = require("../services/vectorStore");
const { entityExtractorAgent, summarizerAgent } = require("../agents/tools");
const {
  createDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  createChunk,
  getChunksByDocId,
  createEntity,
  getEntitiesByDocId,
  trackEvent,
} = require("../data/store");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".pdf", ".txt", ".docx", ".csv", ".xlsx", ".png", ".jpg", ".jpeg"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Unsupported file type"));
  },
});

// POST /api/upload - Upload and process a document
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const fileName = req.file.originalname;
    const fileType = path.extname(fileName).slice(1).toLowerCase();
    const docId = uuidv4();

    // Step 1: Create document record (processing)
    const doc = createDocument({
      id: docId,
      title: fileName.replace(/\.[^.]+$/, ""),
      fileName,
      fileType,
      status: "processing",
      fileSize: req.file.size,
    });

    // Step 2: Process document
    const result = await processDocument(req.file.buffer, fileName, fileType);

    // Step 3: Update document with content + metadata
    doc.content = result.text;
    doc.title = result.metadata.title || doc.title;
    doc.author = result.metadata.author || "Unknown";
    doc.date = result.metadata.date || new Date().toISOString();
    doc.processingTime = result.processingTime;

    // Step 4: Create chunks and add to vector store
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

    // Step 5: Extract entities
    try {
      const entities = await entityExtractorAgent(result.text.slice(0, 5000));
      for (const entity of entities) {
        createEntity({ docId, name: entity.name, type: entity.type, mentions: 1, chunkIds: [] });
      }
      doc.entities = entities;
    } catch {
      doc.entities = [];
    }

    // Step 6: Generate summary
    try {
      const summary = await summarizerAgent(result.text, "paragraph");
      doc.summary = summary.text || "";
    } catch {
      doc.summary = "";
    }

    // Mark ready
    doc.status = "ready";

    trackEvent({
      eventType: "document_upload",
      docId,
      latency: result.processingTime,
    });

    res.json({
      id: doc.id,
      title: doc.title,
      status: doc.status,
      chunkCount: doc.chunkCount,
      processingTime: doc.processingTime,
      entities: doc.entities?.length || 0,
    });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/documents - List all documents
router.get("/documents", (_req, res) => {
  const docs = getAllDocuments().map((d) => ({
    id: d.id,
    title: d.title,
    fileName: d.fileName,
    fileType: d.fileType,
    status: d.status,
    author: d.author,
    date: d.date,
    chunkCount: d.chunkCount,
    summary: d.summary?.slice(0, 200),
    entityCount: d.entities?.length || 0,
    processingTime: d.processingTime,
    fileSize: d.fileSize,
    createdAt: d.createdAt,
  }));
  res.json(docs);
});

// GET /api/documents/:id - Get single document with full details
router.get("/documents/:id", (req, res) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  const chunks = getChunksByDocId(doc.id);
  const entities = getEntitiesByDocId(doc.id);

  res.json({
    ...doc,
    content: doc.content?.slice(0, 10000),
    chunks: chunks.map((c) => ({
      id: c.id,
      chunkIndex: c.chunkIndex,
      text: c.text.slice(0, 200),
      pageNumber: c.pageNumber,
    })),
    entities,
  });
});

// DELETE /api/documents/:id
router.delete("/documents/:id", (req, res) => {
  const doc = getDocument(req.params.id);
  if (!doc) return res.status(404).json({ error: "Document not found" });

  vectorStore.removeDocChunks(doc.id);
  deleteDocument(doc.id);

  res.json({ success: true });
});

module.exports = router;
