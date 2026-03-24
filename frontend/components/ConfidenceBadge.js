import { motion } from "framer-motion";

export default function ConfidenceBadge({ score, size = "md" }) {
  const getColor = () => {
    if (score >= 80) return { stroke: "#22c55e", bg: "bg-green-500/10", text: "text-green-400", label: "High" };
    if (score >= 60) return { stroke: "#eab308", bg: "bg-yellow-500/10", text: "text-yellow-400", label: "Medium" };
    return { stroke: "#ef4444", bg: "bg-red-500/10", text: "text-red-400", label: "Low" };
  };

  const { stroke, bg, text, label } = getColor();
  const dims = size === "lg" ? 64 : size === "md" ? 48 : 32;
  const strokeWidth = size === "lg" ? 4 : 3;
  const radius = (dims - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className={`flex items-center gap-2 ${bg} rounded-lg px-2 py-1`}>
      <svg width={dims} height={dims} className="-rotate-90">
        <circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={dims / 2}
          cy={dims / 2}
          r={radius}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="confidence-ring"
        />
      </svg>
      <div className="flex flex-col">
        <span className={`text-xs font-bold ${text}`}>{score}%</span>
        <span className="text-[10px] text-gray-500">{label}</span>
      </div>
    </div>
  );
}
