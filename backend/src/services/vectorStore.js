/**
 * TF-IDF Vector Store - lightweight in-memory vector search
 */

class VectorStore {
  constructor() {
    this.documents = []; // { id, docId, text, chunkIndex, pageNumber, charStart, charEnd, vector }
    this.vocabulary = new Map(); // word -> index
    this.idf = new Map(); // word -> idf score
    this.vocabSize = 0;
  }

  // Tokenize text into words
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // Compute term frequency for a document
  computeTF(tokens) {
    const tf = new Map();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }
    const max = Math.max(...tf.values(), 1);
    for (const [word, count] of tf) {
      tf.set(word, count / max);
    }
    return tf;
  }

  // Build IDF from all documents
  buildIDF() {
    const docCount = this.documents.length;
    const wordDocCount = new Map();

    for (const doc of this.documents) {
      const tokens = new Set(this.tokenize(doc.text));
      for (const token of tokens) {
        wordDocCount.set(token, (wordDocCount.get(token) || 0) + 1);
      }
    }

    this.vocabulary.clear();
    this.idf.clear();
    let idx = 0;
    for (const [word, count] of wordDocCount) {
      this.vocabulary.set(word, idx++);
      this.idf.set(word, Math.log((docCount + 1) / (count + 1)) + 1);
    }
    this.vocabSize = idx;
  }

  // Convert text to TF-IDF vector
  textToVector(text) {
    const tokens = this.tokenize(text);
    const tf = this.computeTF(tokens);
    const vector = new Float32Array(this.vocabSize);

    for (const [word, tfScore] of tf) {
      const idx = this.vocabulary.get(word);
      if (idx !== undefined) {
        vector[idx] = tfScore * (this.idf.get(word) || 0);
      }
    }

    return vector;
  }

  // Cosine similarity between two vectors
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom !== 0 ? dotProduct / denom : 0;
  }

  // Add chunks to the store
  addChunks(chunks) {
    for (const chunk of chunks) {
      this.documents.push({
        id: chunk.id,
        docId: chunk.docId,
        text: chunk.text,
        chunkIndex: chunk.chunkIndex,
        pageNumber: chunk.pageNumber || 1,
        charStart: chunk.charStart || 0,
        charEnd: chunk.charEnd || 0,
      });
    }
    this.buildIDF();
    // Pre-compute vectors
    for (const doc of this.documents) {
      doc.vector = this.textToVector(doc.text);
    }
  }

  // Remove all chunks for a document
  removeDocChunks(docId) {
    this.documents = this.documents.filter((d) => d.docId !== docId);
    if (this.documents.length > 0) {
      this.buildIDF();
      for (const doc of this.documents) {
        doc.vector = this.textToVector(doc.text);
      }
    }
  }

  // Search for similar chunks using MMR for diversity
  search(query, topK = 8, docFilter = null) {
    if (this.documents.length === 0) return [];

    const queryVector = this.textToVector(query);
    let candidates = this.documents;

    if (docFilter) {
      const filterIds = Array.isArray(docFilter) ? docFilter : [docFilter];
      candidates = candidates.filter((d) => filterIds.includes(d.docId));
    }

    // Score all candidates
    const scored = candidates.map((doc) => ({
      ...doc,
      similarityScore: this.cosineSimilarity(queryVector, doc.vector),
    }));

    // MMR selection for diversity
    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    const selected = [];
    const lambda = 0.7; // balance between relevance and diversity

    while (selected.length < topK && scored.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < Math.min(scored.length, topK * 3); i++) {
        const relevance = scored[i].similarityScore;
        let maxSim = 0;
        for (const sel of selected) {
          const sim = this.cosineSimilarity(scored[i].vector, sel.vector);
          maxSim = Math.max(maxSim, sim);
        }
        const mmrScore = lambda * relevance - (1 - lambda) * maxSim;
        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(scored[bestIdx]);
      scored.splice(bestIdx, 1);
    }

    return selected.map((s) => ({
      id: s.id,
      docId: s.docId,
      text: s.text,
      chunkIndex: s.chunkIndex,
      pageNumber: s.pageNumber,
      charStart: s.charStart,
      charEnd: s.charEnd,
      similarityScore: Math.round(s.similarityScore * 1000) / 1000,
    }));
  }

  // Get document similarity (average of all chunk pair similarities)
  documentSimilarity(docIdA, docIdB) {
    const chunksA = this.documents.filter((d) => d.docId === docIdA);
    const chunksB = this.documents.filter((d) => d.docId === docIdB);
    if (chunksA.length === 0 || chunksB.length === 0) return 0;

    let totalSim = 0;
    let count = 0;
    for (const a of chunksA) {
      for (const b of chunksB) {
        totalSim += this.cosineSimilarity(a.vector, b.vector);
        count++;
      }
    }
    return count > 0 ? Math.round((totalSim / count) * 100) : 0;
  }
}

// Singleton instance
const vectorStore = new VectorStore();

module.exports = { vectorStore, VectorStore };
