"use client"
import { useTheme } from "@/context/ThemeContext"
import { Sun, Moon } from "lucide-react"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={`
        relative flex items-center w-14 h-7 rounded-full p-1 transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500
        ${isDark
          ? "bg-slate-700 border border-slate-600"
          : "bg-amber-100 border border-amber-300"
        }
      `}
    >
      {/* Track icons */}
      <Moon className={`absolute left-1.5 h-3.5 w-3.5 transition-opacity duration-300 ${isDark ? "opacity-100 text-slate-300" : "opacity-0"}`} />
      <Sun className={`absolute right-1.5 h-3.5 w-3.5 transition-opacity duration-300 ${isDark ? "opacity-0" : "opacity-100 text-amber-500"}`} />

      {/* Sliding knob */}
      <span
        className={`
          relative z-10 flex items-center justify-center h-5 w-5 rounded-full shadow-md transition-all duration-300 transform
          ${isDark
            ? "translate-x-0 bg-slate-900"
            : "translate-x-7 bg-white"
          }
        `}
      >
        {isDark
          ? <Moon className="h-3 w-3 text-blue-400" />
          : <Sun className="h-3 w-3 text-amber-500" />
        }
      </span>
    </button>
  )
}
