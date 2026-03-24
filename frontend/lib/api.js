const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || "API request failed");
  }
  return res.json();
}

// Documents
export const getDocuments = () => fetchAPI("/api/documents");
export const getDocument = (id) => fetchAPI(`/api/documents/${id}`);
export const deleteDocument = (id) => fetchAPI(`/api/documents/${id}`, { method: "DELETE" });

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/api/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Upload failed");
  return res.json();
}

// Chat (SSE streaming)
export function streamChat(query, sessionId, docIds = [], documentScope = "all", onEvent) {
  return new Promise((resolve, reject) => {
    fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        query,
        doc_ids: docIds,
        document_scope: documentScope,
      }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Chat request failed");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));
                onEvent(data);
                if (data.type === "done") resolve(data);
              } catch {}
            }
          }
        }
        resolve(null);
      })
      .catch(reject);
  });
}

// Sessions
export const getSessions = () => fetchAPI("/api/sessions");
export const getSessionMessages = (id) => fetchAPI(`/api/sessions/${id}/messages`);

// Analytics
export const getAnalytics = () => fetchAPI("/api/analytics");
export const getAnalyticsMetric = (metric) => fetchAPI(`/api/analytics/${metric}`);

// Compare
export const compareDocuments = (docIdA, docIdB) =>
  fetchAPI("/api/compare", {
    method: "POST",
    body: JSON.stringify({ doc_id_a: docIdA, doc_id_b: docIdB }),
  });

// Knowledge Graph
export const getKnowledgeGraph = () => fetchAPI("/api/knowledge-graph");

// Quiz
export const generateQuiz = (docId, count = 5) =>
  fetchAPI("/api/quiz/generate", {
    method: "POST",
    body: JSON.stringify({ doc_id: docId, count }),
  });

export const submitQuiz = (data) =>
  fetchAPI("/api/quiz/submit", { method: "POST", body: JSON.stringify(data) });

// Feedback
export const submitFeedback = (messageId, vote) =>
  fetchAPI("/api/feedback", {
    method: "POST",
    body: JSON.stringify({ message_id: messageId, vote }),
  });
