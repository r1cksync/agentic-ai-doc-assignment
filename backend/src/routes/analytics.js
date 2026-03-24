const express = require("express");
const { computeAnalytics } = require("../services/analytics");
const { getAnalyticsEvents, getFeedback } = require("../data/store");

const router = express.Router();

// GET /api/analytics - Full analytics dashboard data
router.get("/analytics", (_req, res) => {
  const analytics = computeAnalytics();
  res.json(analytics);
});

// GET /api/analytics/:metric - Specific metric
router.get("/analytics/:metric", (req, res) => {
  const analytics = computeAnalytics();
  const { metric } = req.params;

  const metricMap = {
    overview: analytics.overview,
    retrieval: analytics.retrieval,
    "answer-quality": analytics.answerQuality,
    tokens: analytics.tokenEconomics,
    documents: analytics.documentAnalytics,
    tools: analytics.toolAnalytics,
  };

  if (metricMap[metric]) {
    res.json(metricMap[metric]);
  } else {
    res.status(404).json({ error: "Unknown metric" });
  }
});

// GET /api/analytics/events - Raw events feed
router.get("/analytics/events/feed", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const events = getAnalyticsEvents()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);
  res.json(events);
});

module.exports = router;
