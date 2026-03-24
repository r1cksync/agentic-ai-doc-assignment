const express = require("express");
const { createFeedback } = require("../data/store");

const router = express.Router();

// POST /api/feedback - Submit feedback for a message
router.post("/feedback", (req, res) => {
  const { message_id, vote } = req.body;
  if (!message_id || (vote !== 1 && vote !== -1)) {
    return res.status(400).json({ error: "message_id and vote (1 or -1) required" });
  }
  const fb = createFeedback({ messageId: message_id, vote });
  res.json(fb);
});

module.exports = router;
