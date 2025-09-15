"use client";

export default function LoadingPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Elegant gradient orbs */}
        <div className="animate-gentle-float absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/25 to-transparent blur-3xl"></div>
        <div className="animate-gentle-float-reverse absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/35 via-pink-500/20 to-transparent blur-3xl"></div>
        <div className="animate-gentle-drift absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-gradient-to-bl from-cyan-500/30 via-blue-500/18 to-transparent blur-2xl"></div>

        {/* Subtle geometric patterns */}
        <div className="absolute top-20 left-20 h-32 w-32 opacity-50">
          <div className="elegant-pattern-1"></div>
        </div>
        <div className="absolute right-32 bottom-32 h-24 w-24 opacity-40">
          <div className="elegant-pattern-2"></div>
        </div>
        <div className="absolute top-1/3 left-1/2 h-16 w-16 opacity-35">
          <div className="elegant-pattern-3"></div>
        </div>

        {/* Sophisticated grid overlay */}
        <div className="absolute inset-0 opacity-15">
          <div className="elegant-grid"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <div className="animate-pulse-glow animate-float animate-shimmer flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              Cal
            </span>
          </div>
        </div>

        {/* App Name */}
        <h1 className="mb-8 text-4xl font-bold sm:text-5xl md:text-6xl">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
            Calendara
          </span>
        </h1>

        {/* Loading Animation */}
        <div className="mb-8">
          <div className="relative mx-auto h-16 w-16">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
            {/* Spinning ring */}
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600 dark:border-t-blue-400"></div>
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"></div>
            </div>
          </div>
        </div>

        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Loading your calendar assistant
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Setting up your AI-powered experience...
          </p>
        </div>

        {/* Loading Steps */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Initializing AI models
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <svg
                  className="h-4 w-4 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Connecting to Google Calendar
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent dark:border-blue-400"></div>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Preparing your workspace
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mx-auto mt-8 max-w-xs">
          <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-2 animate-pulse rounded-full bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400"
              style={{ width: "75%" }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
