import { useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Loader2, BookOpen } from "lucide-react";
import { useRouter } from "next/router";
import useSWR from "swr";
import QuizMode from "../components/QuizMode";
import { getDocuments, generateQuiz, submitQuiz } from "../lib/api";

export default function QuizPage() {
  const router = useRouter();
  const { data: docs } = useSWR("/api/documents", getDocuments);
  const [selectedDoc, setSelectedDoc] = useState(router.query.doc || "");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!selectedDoc) return;
    setLoading(true);
    setQuestions(null);
    try {
      const result = await generateQuiz(selectedDoc, questionCount);
      setQuestions(result.questions);
    } catch (err) {
      console.error("Quiz generation failed:", err);
    }
    setLoading(false);
  };

  const handleComplete = async (result) => {
    try {
      await submitQuiz({
        docId: selectedDoc,
        score: result.score,
        totalQuestions: result.total,
        answers: result.answers,
      });
    } catch {}
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
          <HelpCircle className="text-primary" size={24} />
          Quiz Mode
        </h1>
        <p className="text-gray-400 text-sm mb-6">Test your knowledge with AI-generated questions from your documents</p>
      </motion.div>

      {!questions ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-gray-700 rounded-xl p-8"
        >
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Select Document</label>
              <select
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                className="w-full bg-surface border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="">Choose a document...</option>
                {docs?.map((d) => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Number of Questions</label>
              <div className="flex gap-3">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      questionCount === n
                        ? "bg-primary/20 border-primary text-primary"
                        : "bg-surface border-gray-700 text-gray-400 hover:border-gray-500"
                    }`}
                  >
                    {n} Questions
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedDoc || loading}
              className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <BookOpen size={18} />
                  Generate Quiz
                </>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-gray-700 rounded-xl p-8"
        >
          <QuizMode questions={questions} onComplete={handleComplete} />

          <div className="mt-6 text-center">
            <button
              onClick={() => setQuestions(null)}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to Quiz Setup
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
