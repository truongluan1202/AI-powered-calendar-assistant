"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "~/contexts/ThemeContext";
import { useEffect, useState } from "react";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="gradient-card shadow-refined border-b border-gray-200/60 backdrop-blur-sm">
      <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link
              href="/"
              className="group flex items-center space-x-2 sm:space-x-3"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 transition-all duration-200 group-hover:from-gray-600 group-hover:to-gray-700 sm:h-9 sm:w-9 dark:from-gray-300 dark:to-gray-400 dark:group-hover:from-gray-200 dark:group-hover:to-gray-300">
                <span className="text-xs font-bold text-white sm:text-sm dark:text-white">
                  Cal
                </span>
              </div>
              <span className="text-refined text-lg font-semibold transition-colors sm:text-xl">
                <span className="hidden bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent sm:inline dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
                  Calendara
                </span>
                <span className="text-gray-900 sm:hidden dark:text-gray-100">
                  Cal
                </span>
              </span>
            </Link>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Toggle - Only render after hydration */}
            {isMounted && (
              <button
                onClick={() => {
                  console.log(
                    "Theme toggle button clicked, current theme:",
                    theme,
                  );
                  toggleTheme();
                }}
                className="rounded-lg p-2 text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                title={`Current theme: ${theme}`}
              >
                {theme === "light" ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                )}
              </button>
            )}

            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                {/* User Info */}
                <Link
                  href="/profile"
                  className="group hidden items-center space-x-3 transition-all duration-200 hover:opacity-80 sm:flex"
                >
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-gray-200 transition-all duration-200 group-hover:ring-gray-300 dark:ring-gray-700 dark:group-hover:ring-gray-500"
                    />
                  )}
                  <div className="text-sm">
                    <p className="text-refined font-medium text-gray-900 transition-colors group-hover:text-gray-600 dark:text-gray-100 dark:group-hover:text-gray-300">
                      {session.user?.name}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {session.user?.email}
                    </p>
                  </div>
                </Link>

                {/* Mobile User Avatar */}
                <Link
                  href="/profile"
                  className="group transition-all duration-200 hover:opacity-80 sm:hidden"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-8 w-8 rounded-full ring-2 ring-gray-200 transition-all duration-200 group-hover:ring-gray-300 dark:ring-gray-700 dark:group-hover:ring-gray-500"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-gray-700 to-gray-800 transition-all duration-200 group-hover:from-gray-600 group-hover:to-gray-700 dark:from-gray-300 dark:to-gray-400 dark:group-hover:from-gray-200 dark:group-hover:to-gray-300">
                      <span className="text-sm font-medium text-white dark:text-white">
                        {session.user?.name?.charAt(0) ?? "U"}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut()}
                  className="rounded-lg px-2 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 sm:px-3 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                >
                  <span className="hidden sm:inline">Sign Out</span>
                  <span className="sm:hidden">Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="hover:shadow-elegant rounded-lg bg-gradient-to-r from-gray-800 to-gray-900 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:scale-[1.02] hover:from-gray-700 hover:to-gray-800 active:scale-[0.98] sm:px-4 dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
              >
                <span className="hidden sm:inline">Sign In</span>
                <span className="sm:hidden">In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
