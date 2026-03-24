#!/usr/bin/env node
/**
 * Standalone Groq API key tester
 * Usage: node test-api-key.js
 */

require("dotenv").config();
const Groq = require("groq-sdk");

const key = process.env.GROQ_API_KEY;

if (!key) {
  console.error("❌ GROQ_API_KEY is not set in .env");
  process.exit(1);
}

console.log(`🔑 Testing key: ${key.slice(0, 10)}...${key.slice(-4)}`);

const groq = new Groq({ apiKey: key });

groq.chat.completions
  .create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: "Reply with the single word: OK" }],
    max_tokens: 5,
  })
  .then((res) => {
    const reply = res.choices[0]?.message?.content?.trim();
    console.log(`✅ API key is VALID — model replied: "${reply}"`);
    console.log(`   Model: ${res.model}`);
    console.log(`   Tokens used: ${res.usage?.total_tokens}`);
    // Allow Node to exit naturally so SDK connections close cleanly
    setTimeout(() => process.exit(0), 100);
  })
  .catch((err) => {
    console.error(`❌ API key is INVALID or request failed`);
    console.error(`   Status: ${err.status}`);
    console.error(`   Message: ${err.message}`);
    setTimeout(() => process.exit(1), 100);
  });
