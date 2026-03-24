import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  FileText, MessageSquare, BarChart3, GitCompare,
  Share2, HelpCircle, Menu, X, Sun, Moon
} from "lucide-react";
import useStore from "../lib/store";

const navItems = [
  { href: "/", label: "Documents", icon: FileText },
  { href: "/chat/new", label: "Chat", icon: MessageSquare },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompare },
  { href: "/knowledge-graph", label: "Knowledge Graph", icon: Share2 },
  { href: "/quiz", label: "Quiz", icon: HelpCircle },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { sidebarOpen, toggleSidebar, darkMode, toggleDarkMode } = useStore();

  return (
    <div className={`flex h-screen ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        className="bg-card border-r border-gray-700 flex flex-col shrink-0"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          {sidebarOpen && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
            >
              DocAI
            </motion.h1>
          )}
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = router.pathname === item.href || router.asPath.startsWith(item.href.replace("/new", ""));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-gray-400 hover:text-white hover:bg-surface"
                  }`}
                >
                  <Icon size={20} />
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-sm font-medium"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-gray-700">
          <button
            onClick={toggleDarkMode}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-surface transition-all w-full"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            {sidebarOpen && <span className="text-sm">{darkMode ? "Light Mode" : "Dark Mode"}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-surface">
        {children}
      </main>
    </div>
  );
}
