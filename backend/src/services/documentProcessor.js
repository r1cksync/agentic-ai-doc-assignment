const fs = require("fs");
const path = require("path");

// Parse text file
function parseTxt(filePath) {
  return fs.readFileSync(filePath, "utf-8");
}

// Parse uploaded buffer
function parseBuffer(buffer, fileType) {
  if (fileType === "txt" || fileType === "text/plain") {
    return buffer.toString("utf-8");
  }
  // For PDF: pdf-parse
  if (fileType === "pdf" || fileType === "application/pdf") {
    try {
      const pdfParse = require("pdf-parse");
      return pdfParse(buffer).then((data) => data.text);
    } catch {
      return buffer.toString("utf-8");
    }
  }
  return buffer.toString("utf-8");
}

// Recursive character text splitter
function splitTextIntoChunks(text, chunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = start + chunkSize;

    // Try to break at a sentence or paragraph boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastNewline = slice.lastIndexOf("\n\n");
      const lastPeriod = slice.lastIndexOf(". ");
      const breakPoint = lastNewline > chunkSize * 0.5 ? lastNewline : lastPeriod > chunkSize * 0.5 ? lastPeriod + 1 : -1;
      if (breakPoint > 0) {
        end = start + breakPoint;
      }
    } else {
      end = text.length;
    }

    const chunkText = text.slice(start, end).trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        charStart: start,
        charEnd: end,
        chunkIndex: chunks.length,
      });
    }

    start = end - overlap;
    if (start >= text.length) break;
    if (end >= text.length) break;
  }

  return chunks;
}

// Detect approximate page number from character position (for TXT assume ~3000 chars/page)
function estimatePageNumber(charStart, charsPerPage = 3000) {
  return Math.floor(charStart / charsPerPage) + 1;
}

// Extract basic metadata from text
function extractMetadata(text) {
  const lines = text.split("\n").slice(0, 20);
  const metadata = { title: "", author: "", date: "" };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!metadata.title && trimmed.length > 5 && trimmed.length < 200 && !trimmed.startsWith("#")) {
      // Check for title-like patterns
      if (/^(title|subject):/i.test(trimmed)) {
        metadata.title = trimmed.replace(/^(title|subject):\s*/i, "");
      } else if (!metadata.title && trimmed.length > 10) {
        metadata.title = trimmed;
      }
    }
    if (/^(author|authors|by|prepared by|written by):/i.test(trimmed)) {
      metadata.author = trimmed.replace(/^(author|authors|by|prepared by|written by):\s*/i, "");
    }
    if (/^(date|report date|effective date):/i.test(trimmed)) {
      metadata.date = trimmed.replace(/^(date|report date|effective date):\s*/i, "");
    }
  }

  return metadata;
}

// Process a document file end-to-end
async function processDocument(filePath, fileName, fileType) {
  const startTime = Date.now();

  // Read and parse
  let text;
  if (typeof filePath === "string" && fs.existsSync(filePath)) {
    text = parseTxt(filePath);
  } else if (Buffer.isBuffer(filePath)) {
    text = await parseBuffer(filePath, fileType);
  } else {
    text = String(filePath);
  }

  // Extract metadata
  const metadata = extractMetadata(text);

  // Split into chunks
  const rawChunks = splitTextIntoChunks(text);
  const chunks = rawChunks.map((c) => ({
    ...c,
    pageNumber: estimatePageNumber(c.charStart),
  }));

  const processingTime = Date.now() - startTime;

  return {
    text,
    metadata,
    chunks,
    processingTime,
    fileSize: text.length,
  };
}

module.exports = {
  parseTxt,
  parseBuffer,
  splitTextIntoChunks,
  estimatePageNumber,
  extractMetadata,
  processDocument,
};
