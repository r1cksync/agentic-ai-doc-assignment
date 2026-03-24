const express = require("express");
const { quizGeneratorAgent } = require("../agents/tools");
const { getDocument, saveQuizAttempt, getQuizAttempts } = require("../data/store");

const router = express.Router();

// POST /api/quiz/generate - Generate quiz from a document
router.post("/quiz/generate", async (req, res) => {
  try {
    const { doc_id, count = 5 } = req.body;
    const safeCount = Math.max(1, Math.min(parseInt(count) || 5, 15));

    let text = "";
    if (doc_id) {
      const doc = getDocument(doc_id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      text = doc.content;
    } else {
      return res.status(400).json({ error: "doc_id is required" });
    }

    const result = await quizGeneratorAgent(text, safeCount);
    res.json({ questions: result.questions, docId: doc_id });
  } catch (err) {
    console.error("Quiz generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quiz/submit - Submit quiz results
router.post("/quiz/submit", (req, res) => {
  const { docId, score, totalQuestions, answers } = req.body;
  const attempt = saveQuizAttempt({ docId, score, totalQuestions, answers });
  res.json(attempt);
});

// GET /api/quiz/attempts - Get quiz history
router.get("/quiz/attempts", (_req, res) => {
  res.json(getQuizAttempts());
});

module.exports = router;
