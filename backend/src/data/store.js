const { v4: uuidv4 } = require("uuid");

// In-memory data store
const store = {
  documents: new Map(),
  chunks: new Map(),
  sessions: new Map(),
  messages: new Map(),
  entities: new Map(),
  entityCooccurrences: [],
  analyticsEvents: [],
  feedback: [],
  quizAttempts: [],
};

// Document CRUD
function createDocument(doc) {
  const id = doc.id || uuidv4();
  const document = {
    id,
    title: doc.title || "Untitled",
    fileName: doc.fileName,
    fileType: doc.fileType || "txt",
    content: doc.content || "",
    summary: doc.summary || "",
    summaryBullets: doc.summaryBullets || "",
    summaryAbstract: doc.summaryAbstract || "",
    author: doc.author || "Unknown",
    date: doc.date || new Date().toISOString(),
    status: doc.status || "processing",
    chunkCount: doc.chunkCount || 0,
    entities: doc.entities || [],
    processingTime: doc.processingTime || 0,
    createdAt: new Date().toISOString(),
    fileSize: doc.fileSize || 0,
    sourceType: doc.sourceType || "upload",
  };
  store.documents.set(id, document);
  return document;
}

function getDocument(id) {
  return store.documents.get(id) || null;
}

function getAllDocuments() {
  return Array.from(store.documents.values());
}

function deleteDocument(id) {
  store.documents.delete(id);
  // Delete associated chunks
  for (const [chunkId, chunk] of store.chunks) {
    if (chunk.docId === id) store.chunks.delete(chunkId);
  }
}

// Chunk CRUD
function createChunk(chunk) {
  const id = chunk.id || uuidv4();
  const newChunk = {
    id,
    docId: chunk.docId,
    text: chunk.text,
    chunkIndex: chunk.chunkIndex,
    pageNumber: chunk.pageNumber || 1,
    charStart: chunk.charStart || 0,
    charEnd: chunk.charEnd || 0,
    tfidfVector: chunk.tfidfVector || null,
    metadata: chunk.metadata || {},
  };
  store.chunks.set(id, newChunk);
  return newChunk;
}

function getChunksByDocId(docId) {
  return Array.from(store.chunks.values()).filter((c) => c.docId === docId);
}

function getAllChunks() {
  return Array.from(store.chunks.values());
}

function getChunkById(id) {
  return store.chunks.get(id) || null;
}

// Session CRUD
function createSession(session) {
  const id = session.id || uuidv4();
  const newSession = {
    id,
    title: session.title || "New Chat",
    docIds: session.docIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 0,
  };
  store.sessions.set(id, newSession);
  return newSession;
}

function getSession(id) {
  return store.sessions.get(id) || null;
}

function getAllSessions() {
  return Array.from(store.sessions.values());
}

// Message CRUD
function createMessage(msg) {
  const id = msg.id || uuidv4();
  const message = {
    id,
    sessionId: msg.sessionId,
    role: msg.role,
    content: msg.content,
    confidence: msg.confidence || null,
    citations: msg.citations || [],
    toolsCalled: msg.toolsCalled || [],
    tokensUsed: msg.tokensUsed || {},
    responseTime: msg.responseTime || 0,
    retrievalScores: msg.retrievalScores || [],
    retrievedChunkIds: msg.retrievedChunkIds || [],
    suggestedFollowUps: msg.suggestedFollowUps || [],
    createdAt: new Date().toISOString(),
  };
  store.messages.set(id, message);
  // Update session
  const session = store.sessions.get(msg.sessionId);
  if (session) {
    session.messageCount += 1;
    session.updatedAt = new Date().toISOString();
  }
  return message;
}

function getMessagesBySession(sessionId) {
  return Array.from(store.messages.values())
    .filter((m) => m.sessionId === sessionId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

// Entity CRUD
function createEntity(entity) {
  const id = entity.id || uuidv4();
  const newEntity = {
    id,
    docId: entity.docId,
    name: entity.name,
    type: entity.type,
    mentions: entity.mentions || 1,
    chunkIds: entity.chunkIds || [],
  };
  store.entities.set(id, newEntity);
  return newEntity;
}

function getEntitiesByDocId(docId) {
  return Array.from(store.entities.values()).filter((e) => e.docId === docId);
}

function getAllEntities() {
  return Array.from(store.entities.values());
}

// Analytics
function trackEvent(event) {
  const entry = {
    id: uuidv4(),
    ...event,
    createdAt: new Date().toISOString(),
  };
  store.analyticsEvents.push(entry);
  return entry;
}

function getAnalyticsEvents(filter = {}) {
  let events = store.analyticsEvents;
  if (filter.eventType) events = events.filter((e) => e.eventType === filter.eventType);
  if (filter.docId) events = events.filter((e) => e.docId === filter.docId);
  if (filter.sessionId) events = events.filter((e) => e.sessionId === filter.sessionId);
  if (filter.since) events = events.filter((e) => new Date(e.createdAt) >= new Date(filter.since));
  return events;
}

// Feedback
function createFeedback(fb) {
  const entry = { id: uuidv4(), messageId: fb.messageId, vote: fb.vote, createdAt: new Date().toISOString() };
  store.feedback.push(entry);
  return entry;
}

function getFeedback() {
  return store.feedback;
}

// Quiz
function saveQuizAttempt(attempt) {
  const entry = { id: uuidv4(), ...attempt, createdAt: new Date().toISOString() };
  store.quizAttempts.push(entry);
  return entry;
}

function getQuizAttempts() {
  return store.quizAttempts;
}

module.exports = {
  store,
  createDocument,
  getDocument,
  getAllDocuments,
  deleteDocument,
  createChunk,
  getChunksByDocId,
  getAllChunks,
  getChunkById,
  createSession,
  getSession,
  getAllSessions,
  createMessage,
  getMessagesBySession,
  createEntity,
  getEntitiesByDocId,
  getAllEntities,
  trackEvent,
  getAnalyticsEvents,
  createFeedback,
  getFeedback,
  saveQuizAttempt,
  getQuizAttempts,
};
