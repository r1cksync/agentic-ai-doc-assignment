const express = require("express");
const { comparisonAgent, timelineAgent, entityExtractorAgent } = require("../agents/tools");
const { getDocument } = require("../data/store");
const { vectorStore } = require("../services/vectorStore");

const router = express.Router();

// POST /api/compare - Compare two documents
router.post("/compare", async (req, res) => {
  try {
    const { doc_id_a, doc_id_b } = req.body;
    if (!doc_id_a || !doc_id_b) return res.status(400).json({ error: "Two document IDs required" });

    const docA = getDocument(doc_id_a);
    const docB = getDocument(doc_id_b);
    if (!docA) return res.status(404).json({ error: `Document ${doc_id_a} not found` });
    if (!docB) return res.status(404).json({ error: `Document ${doc_id_b} not found` });

    // Run comparison agent
    const comparison = await comparisonAgent(docA, docB);

    // Calculate document similarity
    const similarity = vectorStore.documentSimilarity(doc_id_a, doc_id_b);

    // Extract timelines from both
    const [timelineA, timelineB] = await Promise.all([
      timelineAgent(docA.content),
      timelineAgent(docB.content),
    ]);

    // Word frequency comparison
    const wordFreqA = getTopWords(docA.content);
    const wordFreqB = getTopWords(docB.content);

    res.json({
      docA: { id: docA.id, title: docA.title },
      docB: { id: docB.id, title: docB.title },
      comparison,
      similarity,
      timelineA,
      timelineB,
      wordFrequency: { docA: wordFreqA, docB: wordFreqB },
    });
  } catch (err) {
    console.error("Comparison error:", err);
    res.status(500).json({ error: err.message });
  }
});

function getTopWords(text, topN = 20) {
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "this", "that", "these", "those", "it", "its", "not", "no", "all", "each", "every", "both", "few", "more", "most", "other", "some", "such", "than", "too", "very", "just", "about"]);
  const words = text.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter((w) => w.length > 3 && !stopWords.has(w));
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
}

module.exports = router;
