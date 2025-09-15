"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") {
      setMounted(true);
      return;
    }

    // Get the current theme from the document element (set by the inline script)
    const currentTheme = document.documentElement.classList.contains("dark")
      ? "dark"
      : "light";
    setTheme(currentTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Apply theme to document
      if (theme === "dark") {
        document.documentElement.classList.remove("light");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }

      // Update debug element
      const debugElement = document.getElementById("theme-debug");
      if (debugElement) {
        debugElement.textContent = theme;
      }

      // Save to localStorage only when mounted
      if (mounted) {
        localStorage.setItem("theme", theme);
      }
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    setTheme((prev) => {
      const newTheme = prev === "light" ? "dark" : "light";
      return newTheme;
    });
  };

  // Always render the provider, but with a fallback theme until mounted
  return (
    <ThemeContext.Provider
      value={{ theme: mounted ? theme : "dark", toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a fallback instead of throwing an error
    console.warn("useTheme must be used within a ThemeProvider");
    return {
      theme: "dark" as Theme,
      toggleTheme: () => {
        console.warn("ThemeProvider not found - toggleTheme disabled");
      },
    };
  }
  return context;
}
