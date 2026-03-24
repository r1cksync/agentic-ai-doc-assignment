import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function MetricCard({ label, value, trend, icon: Icon, color = "primary" }) {
  const trendUp = trend > 0;
  const colorMap = {
    primary: "from-primary/20 to-primary/5 border-primary/30",
    accent: "from-accent/20 to-accent/5 border-accent/30",
    green: "from-green-500/20 to-green-500/5 border-green-500/30",
    yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/30",
    red: "from-red-500/20 to-red-500/5 border-red-500/30",
    purple: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-br ${colorMap[color] || colorMap.primary} border rounded-xl p-5`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">{label}</p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold mt-1 animate-count-up"
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </motion.p>
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/5">
            <Icon size={20} className="text-gray-400" />
          </div>
        )}
      </div>
      {trend !== undefined && trend !== null && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendUp ? "text-green-400" : "text-red-400"}`}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <span>{Math.abs(trend)}% vs previous</span>
        </div>
      )}
    </motion.div>
  );
}
