import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, RotateCcw, Trophy } from "lucide-react";

export default function QuizMode({ questions, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [finished, setFinished] = useState(false);

  if (!questions?.length) return null;

  const current = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  const handleSelect = (optionIdx) => {
    if (showExplanation) return;
    setSelectedAnswer(optionIdx);
    setShowExplanation(true);

    const isCorrect = optionIdx === current.correctAnswer;
    if (isCorrect) setScore((s) => s + 1);
    setAnswers((a) => [...a, { questionIndex: currentIndex, selected: optionIdx, correct: current.correctAnswer, isCorrect }]);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setFinished(true);
      onComplete?.({ score: score, total: questions.length, answers });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setAnswers([]);
    setFinished(false);
  };

  if (finished) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <Trophy size={64} className={`mx-auto mb-4 ${pct >= 70 ? "text-yellow-400" : "text-gray-400"}`} />
        <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
        <p className="text-4xl font-bold mb-2">
          <span className={pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}>
            {score}/{questions.length}
          </span>
        </p>
        <p className="text-gray-400 mb-6">{pct}% correct</p>
        <button
          onClick={handleRestart}
          className="flex items-center gap-2 mx-auto px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
        >
          <RotateCcw size={16} />
          Retry Quiz
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <span>Score: {score}/{currentIndex + (showExplanation ? 1 : 0)}</span>
        </div>
        <div className="h-2 bg-card rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <h3 className="text-lg font-semibold mb-6">{current.question}</h3>

          <div className="space-y-3">
            {current.options?.map((option, i) => {
              const isSelected = selectedAnswer === i;
              const isCorrect = i === current.correctAnswer;
              let style = "border-gray-700 hover:border-primary/50";
              if (showExplanation) {
                if (isCorrect) style = "border-green-500 bg-green-500/10";
                else if (isSelected && !isCorrect) style = "border-red-500 bg-red-500/10";
              } else if (isSelected) {
                style = "border-primary bg-primary/10";
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={showExplanation}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border ${style} transition-all text-left`}
                >
                  <span className="text-sm">{option}</span>
                  {showExplanation && isCorrect && <Check size={18} className="ml-auto text-green-400" />}
                  {showExplanation && isSelected && !isCorrect && <X size={18} className="ml-auto text-red-400" />}
                </button>
              );
            })}
          </div>

          {showExplanation && current.explanation && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-card rounded-xl border border-gray-700"
            >
              <p className="text-xs font-medium text-accent mb-1">Explanation</p>
              <p className="text-sm text-gray-300">{current.explanation}</p>
            </motion.div>
          )}

          {showExplanation && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={handleNext}
              className="mt-6 w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/80 transition-colors"
            >
              {currentIndex < questions.length - 1 ? "Next Question" : "See Results"}
            </motion.button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
