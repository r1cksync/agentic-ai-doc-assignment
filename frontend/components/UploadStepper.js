import { motion } from "framer-motion";
import { Check, Loader2, Upload, FileSearch, Scissors, Database, Search, CheckCircle2 } from "lucide-react";

const steps = [
  { label: "Upload", icon: Upload },
  { label: "Parse", icon: FileSearch },
  { label: "Chunk", icon: Scissors },
  { label: "Embed", icon: Database },
  { label: "Index", icon: Search },
  { label: "Ready", icon: CheckCircle2 },
];

export default function UploadStepper({ currentStep = 0 }) {
  return (
    <div className="flex items-center gap-2">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;

        return (
          <div key={step.label} className="flex items-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                isComplete
                  ? "bg-green-500/20 text-green-400"
                  : isCurrent
                  ? "bg-primary/20 text-primary pulse-glow"
                  : "bg-card text-gray-500"
              }`}
            >
              {isComplete ? (
                <Check size={14} />
              ) : isCurrent ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Icon size={14} />
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </motion.div>
            {i < steps.length - 1 && (
              <div
                className={`w-4 h-0.5 mx-1 ${
                  isComplete ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
