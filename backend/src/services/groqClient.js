const Groq = require("groq-sdk");

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// Standard chat completion
async function chatCompletion(messages, options = {}) {
  const groq = getGroqClient();
  const startTime = Date.now();

  const response = await groq.chat.completions.create({
    model: options.model || "llama-3.3-70b-versatile",
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens || 2048,
    top_p: options.topP ?? 1,
    stream: false,
  });

  const latency = Date.now() - startTime;
  const choice = response.choices[0];

  return {
    content: choice.message.content,
    tokensUsed: {
      prompt: response.usage?.prompt_tokens || 0,
      completion: response.usage?.completion_tokens || 0,
      total: response.usage?.total_tokens || 0,
    },
    latency,
    model: response.model,
  };
}

// Streaming chat completion
async function* streamChatCompletion(messages, options = {}) {
  const groq = getGroqClient();

  const stream = await groq.chat.completions.create({
    model: options.model || "llama-3.3-70b-versatile",
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens || 2048,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) yield content;
  }
}

// Helper: structured JSON response from Groq
async function jsonCompletion(systemPrompt, userPrompt, options = {}) {
  const result = await chatCompletion(
    [
      { role: "system", content: systemPrompt + "\n\nYou MUST respond with valid JSON only. No markdown, no extra text." },
      { role: "user", content: userPrompt },
    ],
    { ...options, temperature: 0.2 }
  );

  try {
    // Extract JSON from response (handle markdown code blocks)
    let content = result.content.trim();
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();
    // Also try to find JSON object/array directly
    const firstBrace = content.indexOf("{");
    const firstBracket = content.indexOf("[");
    const start = Math.min(firstBrace >= 0 ? firstBrace : Infinity, firstBracket >= 0 ? firstBracket : Infinity);
    if (start !== Infinity) content = content.slice(start);

    return { data: JSON.parse(content), tokensUsed: result.tokensUsed, latency: result.latency };
  } catch {
    return { data: null, raw: result.content, tokensUsed: result.tokensUsed, latency: result.latency };
  }
}

module.exports = { getGroqClient, chatCompletion, streamChatCompletion, jsonCompletion };
