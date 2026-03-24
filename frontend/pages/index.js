import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, Search, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import useSWR from "swr";
import DocumentCard from "../components/DocumentCard";
import UploadStepper from "../components/UploadStepper";
import { getDocuments, uploadDocument, deleteDocument } from "../lib/api";
import useStore from "../lib/store";

const suggestedPrompts = [
  "Summarize this contract",
  "Find contradictions between two reports",
  "What are the key dates in this document?",
  "Generate a quiz from this paper",
  "Compare the research paper and the report",
];

export default function Home() {
  const [uploading, setUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const { documents, setDocuments } = useStore();

  const { data: docs, mutate } = useSWR("/api/documents", getDocuments, { refreshInterval: 5000 });

  useEffect(() => {
    if (docs) setDocuments(docs);
  }, [docs, setDocuments]);

  const handleUpload = useCallback(async (file) => {
    setUploading(true);
    setUploadStep(0);

    const stepInterval = setInterval(() => {
      setUploadStep((s) => Math.min(s + 1, 5));
    }, 800);

    try {
      await uploadDocument(file);
      mutate();
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      clearInterval(stepInterval);
      setUploadStep(5);
      setTimeout(() => {
        setUploading(false);
        setUploadStep(0);
      }, 1000);
    }
  }, [mutate]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleUpload(file);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDelete = async (id) => {
    try {
      await deleteDocument(id);
      mutate();
    } catch {}
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Document AI
          </span>{" "}
          Analytics Platform
        </h1>
        <p className="text-gray-400">
          Upload documents, chat with AI agents, and explore insights with advanced analytics.
        </p>
      </motion.div>

      {/* Upload area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`relative mb-8 border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
          dragActive ? "border-primary bg-primary/5" : "border-gray-700 hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="space-y-4">
            <Loader2 size={32} className="mx-auto text-primary animate-spin" />
            <p className="text-sm text-gray-400">Processing document...</p>
            <UploadStepper currentStep={uploadStep} />
          </div>
        ) : (
          <div>
            <Upload size={40} className="mx-auto mb-3 text-gray-500" />
            <p className="text-sm text-gray-300 mb-1">
              Drag & drop files here, or{" "}
              <label className="text-primary cursor-pointer hover:underline">
                browse
                <input type="file" className="hidden" accept=".pdf,.txt,.docx,.csv,.xlsx" onChange={handleFileInput} />
              </label>
            </p>
            <p className="text-xs text-gray-500">Supports PDF, TXT, DOCX, CSV, XLSX (up to 50MB)</p>
          </div>
        )}
      </motion.div>

      {/* Suggested prompts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Sparkles size={14} />
          Try asking
        </h3>
        <div className="flex flex-wrap gap-2">
          {suggestedPrompts.map((prompt, i) => (
            <motion.a
              key={prompt}
              href={`/chat/new?q=${encodeURIComponent(prompt)}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-gray-700 rounded-full text-sm text-gray-300 hover:text-white hover:border-primary/50 transition-all"
            >
              {prompt}
              <ArrowRight size={14} className="text-primary" />
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Documents grid */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <FileText size={20} className="text-primary" />
          Your Documents
          <span className="text-sm text-gray-500">({documents.length})</span>
        </h2>
      </div>

      <AnimatePresence>
        {documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-gray-500"
          >
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p>No documents yet. Upload a file to get started!</p>
            <p className="text-sm mt-1">Sample files are loaded automatically on server start.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
