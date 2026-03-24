const { vectorStore } = require("../services/vectorStore");
const { getDocument, getAllDocuments, getChunksByDocId } = require("../data/store");
const { chatCompletion, streamChatCompletion } = require("../services/groqClient");
const {
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
} = require("./tools");

class AgentOrchestrator {
  constructor() {
    this.agents = {
      qa: { name: "QA Agent", description: "Answers questions using document context" },
      citation: { name: "Citation Agent", description: "Traces claims to source documents" },
      summarizer: { name: "Summarizer Agent", description: "Generates document summaries" },
      entity_extractor: { name: "Entity Extractor", description: "Extracts named entities" },
      quiz_generator: { name: "Quiz Generator", description: "Creates quizzes from documents" },
      comparison: { name: "Comparison Agent", description: "Compares multiple documents" },
      timeline: { name: "Timeline Agent", description: "Extracts chronological events" },
      confidence: { name: "Confidence Scorer", description: "Scores answer confidence" },
      fact_checker: { name: "Fact Checker", description: "Verifies claims against sources" },
      follow_up: { name: "Follow-up Generator", description: "Suggests follow-up questions" },
    };
  }

  // Classify the query intent to determine which agents to invoke
  classifyIntent(query) {
    const q = query.toLowerCase();
    const intents = [];

    if (/summar|overview|brief|recap|tldr/i.test(q)) intents.push("summarize");
    if (/compar|differ|versus|vs\.?|between.*and/i.test(q)) intents.push("compare");
    if (/quiz|test|question|flashcard/i.test(q)) intents.push("quiz");
    if (/timeline|chronolog|when|dates|sequence of events/i.test(q)) intents.push("timeline");
    if (/entit|people|person|organization|location|who|company/i.test(q)) intents.push("entities");
    if (/translat|in spanish|in french|in german/i.test(q)) intents.push("translate");
    if (/verify|fact.?check|is it true|accurate/i.test(q)) intents.push("fact_check");

    if (intents.length === 0) intents.push("qa");

    return intents;
  }

  // Main orchestration: process a query end-to-end
  async processQuery(query, options = {}) {
    const startTime = Date.now();
    const { sessionId, docIds, chatHistory = [], documentScope = "all" } = options;
    const toolsCalled = [];

    // Step 1: Classify intent
    const intents = this.classifyIntent(query);

    // Step 2: Retrieve relevant chunks
    const retrievalStart = Date.now();
    const docFilter = documentScope === "current" && docIds?.length ? docIds : null;
    const retrievedChunks = vectorStore.search(query, 8, docFilter);
    const retrievalLatency = Date.now() - retrievalStart;
    toolsCalled.push("document_retriever");

    // Enrich chunks with document titles
    for (const chunk of retrievedChunks) {
      const doc = getDocument(chunk.docId);
      chunk.docTitle = doc ? doc.title : "Unknown";
    }

    let answer = "";
    let citations = [];
    let extras = {};

    // Step 3: Route to appropriate agent(s) based on intent
    try {
      if (intents.includes("summarize")) {
        toolsCalled.push("summarizer");
        const docId = docIds?.[0];
        const doc = docId ? getDocument(docId) : null;
        const textToSummarize = doc ? doc.content : retrievedChunks.map((c) => c.text).join("\n\n");
        const summary = await summarizerAgent(textToSummarize, "paragraph");
        answer = summary.text || JSON.stringify(summary);
      } else if (intents.includes("compare") && docIds?.length >= 2) {
        toolsCalled.push("comparison");
        const docA = getDocument(docIds[0]);
        const docB = getDocument(docIds[1]);
        if (docA && docB) {
          const comparison = await comparisonAgent(docA, docB);
          extras.comparison = comparison;
          answer = comparison.summary || "Comparison complete. See the structured comparison below.";
          if (comparison.keyDifferences?.length) {
            answer += "\n\n**Key Differences:**\n" + comparison.keyDifferences.map((d) => `- **${d.topic}**: Doc A says "${d.docA}" vs Doc B says "${d.docB}"`).join("\n");
          }
        } else {
          answer = "Could not find both documents for comparison.";
        }
      } else if (intents.includes("quiz")) {
        toolsCalled.push("quiz_generator");
        const docId = docIds?.[0];
        const doc = docId ? getDocument(docId) : null;
        const text = doc ? doc.content : retrievedChunks.map((c) => c.text).join("\n\n");
        const quiz = await quizGeneratorAgent(text);
        extras.quiz = quiz.questions;
        answer = `Generated ${quiz.questions.length} quiz questions. See the quiz panel!`;
      } else if (intents.includes("timeline")) {
        toolsCalled.push("timeline_extractor");
        const text = retrievedChunks.map((c) => c.text).join("\n\n");
        const events = await timelineAgent(text);
        extras.timeline = events;
        answer = events.length > 0
          ? "**Timeline of Events:**\n" + events.map((e) => `- **${e.date}**: ${e.event}`).join("\n")
          : "No dated events found in the relevant documents.";
      } else if (intents.includes("entities")) {
        toolsCalled.push("entity_extractor");
        const text = retrievedChunks.map((c) => c.text).join("\n\n");
        const entities = await entityExtractorAgent(text);
        extras.entities = entities;
        answer = "**Extracted Entities:**\n" + entities.map((e) => `- **${e.name}** (${e.type}): ${e.context || ""}`).join("\n");
      } else if (intents.includes("fact_check")) {
        toolsCalled.push("fact_checker");
        const result = await factCheckerAgent(query, retrievedChunks);
        extras.factCheck = result;
        answer = `**Fact Check Result:** ${result.verified ? "✓ Verified" : "✗ Not verified"} (Confidence: ${result.confidence}%)\n\n${result.explanation}`;
      } else {
        // Default QA
        toolsCalled.push("qa_agent");
        const result = await qaAgent(query, retrievedChunks, chatHistory);
        answer = result.content;
      }
    } catch (agentErr) {
      const errMsg = agentErr.message || String(agentErr);
      if (errMsg.includes("rate_limit") || errMsg.includes("429")) {
        throw new Error("Groq API rate limit reached. Please wait a few minutes and try again.");
      }
      console.error("Agent error:", errMsg);
      // Fallback: return context snippets directly
      answer = "I encountered an issue calling the AI model. Here are the most relevant excerpts from your documents:\n\n" +
        retrievedChunks.slice(0, 3).map((c, i) => `**[${c.docTitle} — Page ${c.pageNumber}]**\n${c.text.slice(0, 400)}`).join("\n\n---\n\n");
    }

    // Step 4: Run citation agent (non-critical — skip on failure)
    toolsCalled.push("citation_tracer");
    try {
      citations = await citationAgent(answer, retrievedChunks, getAllDocuments());
    } catch (e) {
      console.warn("Citation agent failed:", e.message);
    }

    // Step 5: Score confidence (local calc — won't fail)
    toolsCalled.push("confidence_scorer");
    const { confidence, breakdown } = await confidenceAgent(answer, retrievedChunks, query);

    // Step 6: Generate follow-up questions (non-critical — skip on failure)
    toolsCalled.push("follow_up_generator");
    let followUps;
    try {
      followUps = await followUpAgent(query, answer);
    } catch (e) {
      console.warn("Follow-up agent failed:", e.message);
      followUps = ["Tell me more about this topic", "Can you summarize the key points?", "What are the implications?"];
    }

    // Step 7: Hallucination guard
    let warning = null;
    if (confidence < 20) {
      warning = "Very low confidence — the agent could not find strong support for this answer. Please rephrase your question or upload more relevant documents.";
    } else if (confidence < 40) {
      warning = "Low confidence — some parts of this answer may not be fully supported by your documents.";
    }

    const totalLatency = Date.now() - startTime;

    return {
      answer: warning ? `⚠️ ${warning}\n\n${answer}` : answer,
      confidence,
      confidenceBreakdown: breakdown,
      citations,
      retrievedChunks: retrievedChunks.map((c) => ({
        id: c.id,
        docId: c.docId,
        docTitle: c.docTitle,
        text: c.text.slice(0, 200),
        pageNumber: c.pageNumber,
        similarityScore: c.similarityScore,
      })),
      retrievalScores: retrievedChunks.map((c) => c.similarityScore),
      toolsCalled,
      intents,
      extras,
      suggestedFollowUps: followUps,
      responseTime: totalLatency,
      retrievalLatency,
      tokensUsed: { prompt: 0, completion: 0, total: 0 }, // updated by route
    };
  }

  // Streaming version for SSE
  async *processQueryStream(query, options = {}) {
    const result = await this.processQuery(query, options);
    // Yield the answer in chunks for streaming feel
    const words = result.answer.split(" ");
    let accumulated = "";
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? " " : "") + words[i];
      yield {
        type: "token",
        content: words[i] + (i < words.length - 1 ? " " : ""),
      };
    }

    // Yield metadata at the end
    yield {
      type: "metadata",
      confidence: result.confidence,
      confidenceBreakdown: result.confidenceBreakdown,
      citations: result.citations,
      retrievedChunks: result.retrievedChunks,
      retrievalScores: result.retrievalScores,
      toolsCalled: result.toolsCalled,
      intents: result.intents,
      extras: result.extras,
      suggestedFollowUps: result.suggestedFollowUps,
      responseTime: result.responseTime,
    };
  }
}

const orchestrator = new AgentOrchestrator();

module.exports = { orchestrator, AgentOrchestrator };
