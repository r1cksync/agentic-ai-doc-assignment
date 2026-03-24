const { chatCompletion, jsonCompletion } = require("../services/groqClient");
const { vectorStore } = require("../services/vectorStore");
const { getDocument, getAllDocuments, getChunksByDocId, getChunkById } = require("../data/store");

// ─── Citation Agent ──────────────────────────────────────────
async function citationAgent(answer, chunks, documents) {
  const docMap = {};
  for (const doc of documents) docMap[doc.id] = doc.title;

  const chunkContext = chunks
    .map((c, i) => `[Chunk ${i + 1} | Doc: ${docMap[c.docId] || c.docId} | Page ${c.pageNumber}]\n${c.text.slice(0, 300)}`)
    .join("\n\n");

  const result = await jsonCompletion(
    `You are a citation agent. Given an answer and source chunks, identify which parts of the answer are supported by which chunks. Return a JSON array of citations.`,
    `Answer:\n${answer}\n\nSource Chunks:\n${chunkContext}\n\nReturn JSON array: [{"claim": "...", "chunkIndex": 1, "docTitle": "...", "pageNumber": 1, "quote": "relevant quote from chunk"}]`,
    { model: "llama-3.1-8b-instant" }
  );

  if (result.data && Array.isArray(result.data)) {
    return result.data.map((c) => ({
      claim: c.claim || "",
      docTitle: c.docTitle || "",
      pageNumber: c.pageNumber || 1,
      quote: c.quote || "",
      chunkId: chunks[c.chunkIndex - 1]?.id || null,
    }));
  }
  return [];
}

// ─── Summarizer Agent ────────────────────────────────────────
async function summarizerAgent(text, format = "paragraph") {
  const formatInstructions = {
    paragraph: "Write a 3-sentence paragraph summary.",
    bullets: "Write 5-7 bullet point summary. Return as JSON: {\"bullets\": [\"point1\", ...]}",
    abstract: "Write an academic abstract (150 words max).",
    executive: "Write an executive summary suitable for a board meeting (200 words max).",
  };

  if (format === "bullets") {
    const result = await jsonCompletion(
      "You are a summarizer agent. Produce bullet-point summaries.",
      `Summarize this text:\n\n${text.slice(0, 6000)}\n\n${formatInstructions[format]}`
    );
    return result.data || { bullets: ["Summary not available"] };
  }

  const result = await chatCompletion([
    { role: "system", content: "You are a summarizer agent. Produce concise, accurate summaries." },
    { role: "user", content: `Summarize this text in ${format} format:\n\n${text.slice(0, 6000)}\n\n${formatInstructions[format]}` },
  ]);

  return { text: result.content, tokensUsed: result.tokensUsed };
}

// ─── Entity Extractor Agent ──────────────────────────────────
async function entityExtractorAgent(text) {
  const result = await jsonCompletion(
    "You are an entity extraction agent. Extract all named entities from the text.",
    `Extract entities from this text. Return JSON: {"entities": [{"name": "...", "type": "person|organization|location|date|money|technology|legislation", "context": "brief context"}]}\n\nText:\n${text.slice(0, 5000)}`
  );

  if (result.data?.entities) return result.data.entities;
  return [];
}

// ─── QA Agent (main RAG agent) ───────────────────────────────
async function qaAgent(query, context, chatHistory = []) {
  const systemPrompt = `You are an intelligent document analysis assistant. Answer questions based on the provided context from uploaded documents. 

Rules:
- Only answer based on the provided context
- If the context doesn't contain enough info, say so clearly
- Be specific and cite which document/section your answer comes from
- Use clear, professional language
- If making comparisons, structure your answer with clear sections`;

  const contextStr = context
    .map((c, i) => `[Source ${i + 1} | Page ${c.pageNumber}]\n${c.text}`)
    .join("\n\n---\n\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...chatHistory.slice(-10),
    {
      role: "user",
      content: `Context from documents:\n\n${contextStr}\n\n---\n\nQuestion: ${query}`,
    },
  ];

  return chatCompletion(messages);
}

// ─── Quiz Generator Agent ────────────────────────────────────
async function quizGeneratorAgent(text, count = 5) {
  const result = await jsonCompletion(
    "You are a quiz generation agent. Create multiple choice questions from the given text.",
    `Create ${count} multiple choice questions from this text. Each question should have 4 options with exactly one correct answer.

Return JSON: {"questions": [{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctAnswer": 0, "explanation": "why this is correct"}]}

Text:\n${text.slice(0, 5000)}`
  );

  if (result.data?.questions) return { questions: result.data.questions, tokensUsed: result.tokensUsed };
  return { questions: [], tokensUsed: result.tokensUsed };
}

// ─── Comparison Agent ────────────────────────────────────────
async function comparisonAgent(docA, docB) {
  const result = await jsonCompletion(
    "You are a document comparison agent. Compare two documents thoroughly.",
    `Compare these two documents:

Document A: "${docA.title}"
${docA.content.slice(0, 3000)}

Document B: "${docB.title}"
${docB.content.slice(0, 3000)}

Return JSON:
{
  "keyDifferences": [{"topic": "...", "docA": "...", "docB": "..."}],
  "sharedThemes": ["theme1", "theme2"],
  "contradictions": [{"topic": "...", "docA_says": "...", "docB_says": "...", "explanation": "..."}],
  "toneComparison": {"docA": "formal/informal/technical", "docB": "formal/informal/technical"},
  "summary": "2-3 sentence comparison summary"
}`
  );

  return result.data || { keyDifferences: [], sharedThemes: [], contradictions: [], summary: "Comparison unavailable" };
}

// ─── Timeline Extractor Agent ────────────────────────────────
async function timelineAgent(text) {
  const result = await jsonCompletion(
    "You are a timeline extraction agent. Extract all dated events.",
    `Extract all dated events from this text and sort chronologically.
Return JSON: {"events": [{"date": "YYYY-MM-DD or description", "event": "what happened", "context": "brief context"}]}

Text:\n${text.slice(0, 5000)}`
  );

  return result.data?.events || [];
}

// ─── Confidence Scoring Agent ────────────────────────────────
async function confidenceAgent(answer, chunks, query) {
  // Calculate base confidence from retrieval scores
  const avgSimilarity = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + (c.similarityScore || 0), 0) / chunks.length
    : 0;

  // Coverage: how many chunks were very relevant (>0.3 similarity)
  const relevantChunks = chunks.filter((c) => (c.similarityScore || 0) > 0.15);
  const coverage = chunks.length > 0 ? relevantChunks.length / chunks.length : 0;

  // Base confidence from retrieval metrics
  const retrievalConf = Math.min(avgSimilarity * 200, 60); // 0-60
  const coverageConf = coverage * 30; // 0-30
  const lengthBonus = Math.min(answer.length / 500, 1) * 10; // 0-10

  let confidence = Math.round(retrievalConf + coverageConf + lengthBonus);
  confidence = Math.max(15, Math.min(98, confidence));

  const breakdown = {
    avgSimilarity: Math.round(avgSimilarity * 100) / 100,
    relevantChunks: relevantChunks.length,
    totalChunks: chunks.length,
    coverage: Math.round(coverage * 100),
    confidenceScore: confidence,
  };

  return { confidence, breakdown };
}

// ─── Follow-up Question Generator ────────────────────────────
async function followUpAgent(query, answer) {
  const result = await jsonCompletion(
    "Generate 3 follow-up questions based on the conversation.",
    `Based on this Q&A, suggest 3 brief follow-up questions the user might ask next.
Question: ${query}
Answer: ${answer.slice(0, 500)}
Return JSON: {"questions": ["q1", "q2", "q3"]}`,
    { model: "llama-3.1-8b-instant" }
  );

  return result.data?.questions || ["Tell me more about this topic", "Can you summarize the key points?", "What are the implications?"];
}

// ─── Fact Checker Agent ──────────────────────────────────────
async function factCheckerAgent(claim, chunks) {
  const context = chunks.map((c) => c.text).join("\n\n");

  const result = await jsonCompletion(
    "You are a fact-checking agent. Verify claims against source documents.",
    `Verify this claim against the source documents:

Claim: "${claim}"

Source Context:
${context.slice(0, 4000)}

Return JSON: {"verified": true/false, "confidence": 0-100, "evidence": "supporting or contradicting evidence", "explanation": "..."}`
  );

  return result.data || { verified: false, confidence: 0, explanation: "Unable to verify" };
}

module.exports = {
  citationAgent,
  summarizerAgent,
  entityExtractorAgent,
  qaAgent,
  quizGeneratorAgent,
  comparisonAgent,
  timelineAgent,
  confidenceAgent,
  followUpAgent,
  factCheckerAgent,
};
