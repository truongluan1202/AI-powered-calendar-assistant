"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="relative flex h-full items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          {/* Elegant gradient orbs */}
          <div className="animate-gentle-float absolute -top-40 -right-40 h-80 w-80 rounded-full bg-gradient-to-br from-blue-500/40 via-purple-500/25 to-transparent blur-3xl"></div>
          <div className="animate-gentle-float-reverse absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-gradient-to-tr from-indigo-500/35 via-pink-500/20 to-transparent blur-3xl"></div>
          <div className="animate-gentle-drift absolute top-1/2 right-1/4 h-64 w-64 rounded-full bg-gradient-to-bl from-cyan-500/30 via-blue-500/18 to-transparent blur-2xl"></div>
        </div>

        {/* Loading Content */}
        <div className="relative z-10 text-center">
          {/* Logo */}
          <div className="mb-6 flex justify-center">
            <div className="animate-pulse-glow animate-float animate-shimmer flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                Cal
              </span>
            </div>
          </div>

          {/* Loading Animation */}
          <div className="mb-6">
            <div className="relative mx-auto h-12 w-12">
              {/* Outer ring */}
              <div className="absolute inset-0 rounded-full border-3 border-gray-200 dark:border-gray-700"></div>
              {/* Spinning ring */}
              <div className="absolute inset-0 animate-spin rounded-full border-3 border-transparent border-t-blue-600 dark:border-t-blue-400"></div>
              {/* Inner pulsing dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"></div>
              </div>
            </div>
          </div>

          {/* Loading Text */}
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Loading Calendara
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Preparing your AI assistant...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Hero Section */}
      <div className="hero-transparent relative z-20 overflow-hidden">
        {/* Hero Section Enhanced Effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Gradient background overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/3 to-indigo-500/4"></div>
          <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/4 via-pink-500/2 to-transparent"></div>

          {/* Concentric rings around AI icon */}
          <div className="animate-elegant-pulse absolute top-1/2 left-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20"></div>
          <div
            className="animate-elegant-pulse absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-purple-400/15"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="animate-elegant-pulse absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-400/10"
            style={{ animationDelay: "2s" }}
          ></div>

          {/* Star-like sparkle effects */}
          <div className="animate-twinkle absolute top-1/4 left-1/4 h-1 w-1 rounded-full bg-white"></div>
          <div
            className="animate-twinkle absolute top-1/3 right-1/4 h-1.5 w-1.5 rounded-full bg-cyan-300"
            style={{ animationDelay: "0.5s" }}
          ></div>
          <div
            className="animate-twinkle absolute bottom-1/3 left-1/3 h-1 w-1 rounded-full bg-blue-300"
            style={{ animationDelay: "1.5s" }}
          ></div>
          <div
            className="animate-twinkle absolute right-1/3 bottom-1/4 h-1.5 w-1.5 rounded-full bg-purple-300"
            style={{ animationDelay: "2.5s" }}
          ></div>
          <div
            className="animate-twinkle absolute top-1/2 left-1/6 h-1 w-1 rounded-full bg-indigo-300"
            style={{ animationDelay: "3s" }}
          ></div>
          <div
            className="animate-twinkle absolute top-1/2 right-1/6 h-1.5 w-1.5 rounded-full bg-pink-300"
            style={{ animationDelay: "0.8s" }}
          ></div>

          {/* Floating gradient orbs */}
          <div className="animate-gentle-float absolute top-1/4 right-1/3 h-16 w-16 rounded-full bg-gradient-to-br from-blue-400/20 to-purple-400/15 blur-xl"></div>
          <div className="animate-gentle-float-reverse absolute bottom-1/4 left-1/4 h-20 w-20 rounded-full bg-gradient-to-tl from-cyan-400/15 to-indigo-400/10 blur-xl"></div>
          <div className="animate-gentle-drift absolute top-1/2 left-1/5 h-12 w-12 rounded-full bg-gradient-to-br from-pink-400/18 to-blue-400/12 blur-lg"></div>

          {/* Enhanced mesh gradient */}
          <div className="absolute inset-0 opacity-8">
            <div className="elegant-mesh"></div>
          </div>

          {/* Radial gradient spotlight effect */}
          <div className="bg-gradient-radial absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full from-transparent via-blue-500/3 to-transparent"></div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-slide-in-bottom">
              <div className="mb-6 flex justify-center">
                <div className="animate-pulse-glow animate-float animate-shimmer flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    Cal
                  </span>
                </div>
              </div>
            </div>
            <h1 className="animate-slide-in-bottom animate-delay-200 text-refined text-4xl font-bold sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
                Calendara
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {" "}
                - Our smartest AI model to help you manage your time
                effectively.
              </span>
            </h1>
            <p className="animate-slide-in-bottom animate-delay-400 text-refined mx-auto mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl dark:text-gray-400">
              Everything you need to manage your calendar intelligently
            </p>
            <div className="animate-slide-in-bottom animate-delay-600 mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
              {session ? (
                <Link
                  href="/chat"
                  className="hover:shadow-elegant animate-fade-in-scale flex w-full items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-3 text-base font-medium text-white hover:from-gray-700 hover:to-gray-800 md:px-10 md:py-3 md:text-lg dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
                >
                  Start Chatting
                </Link>
              ) : (
                <Link
                  href="/api/auth/signin"
                  className="hover:shadow-elegant animate-fade-in-scale flex w-full items-center justify-center rounded-md border border-transparent bg-gradient-to-r from-gray-800 to-gray-900 px-8 py-3 text-base font-medium text-white hover:from-gray-700 hover:to-gray-800 md:px-10 md:py-4 md:text-lg dark:from-gray-200 dark:to-gray-300 dark:text-gray-900 dark:hover:from-gray-100 dark:hover:to-gray-200"
                >
                  Get Started
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-20 overflow-hidden py-16">
        {/* Features Section Background Effects */}
        <div className="pointer-events-none absolute inset-0">
          {/* Subtle gradient orbs for features */}
          <div className="animate-gentle-float absolute top-10 left-10 h-32 w-32 rounded-full bg-gradient-to-br from-indigo-500/8 via-purple-500/4 to-transparent blur-2xl"></div>
          <div className="animate-gentle-float-reverse absolute right-10 bottom-10 h-40 w-40 rounded-full bg-gradient-to-tl from-blue-500/6 via-cyan-500/3 to-transparent blur-2xl"></div>
          <div className="animate-gentle-drift absolute top-1/2 left-1/4 h-24 w-24 rounded-full bg-gradient-to-br from-purple-500/5 via-pink-500/2 to-transparent blur-xl"></div>

          {/* Elegant geometric accents */}
          <div className="absolute top-20 right-20 h-16 w-16 opacity-10">
            <div className="elegant-pattern-2"></div>
          </div>
          <div className="absolute bottom-20 left-20 h-12 w-12 opacity-8">
            <div className="elegant-pattern-3"></div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-slide-in-bottom animate-delay-800 text-center">
            <h2 className="text-refined text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Features
            </h2>
            {/* <p className="text-refined mt-4 text-lg text-gray-600 dark:text-gray-400">
              Everything you need to manage your calendar intelligently
            </p> */}
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="animate-slide-in-bottom animate-delay-1000 hero-transparent shadow-refined rounded-lg p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
                <span className="text-xl text-white">💬</span>
              </div>
              <h3 className="text-refined mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                AI-Powered Chat
              </h3>
              <p className="text-refined text-gray-600 dark:text-gray-400">
                Chat with AI to schedule meetings, get calendar insights, and
                manage your time more effectively.
              </p>
            </div>

            <div className="animate-slide-in-bottom animate-delay-1200 hero-transparent shadow-refined rounded-lg p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
                <span className="text-xl text-white">📅</span>
              </div>
              <h3 className="text-refined mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                Google Calendar Integration
              </h3>
              <p className="text-refined text-gray-600 dark:text-gray-400">
                Seamlessly connect with your Google Calendar to view and manage
                your events.
              </p>
            </div>

            <div className="animate-slide-in-bottom animate-delay-1400 hero-transparent shadow-refined rounded-lg p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r from-gray-700 to-gray-800 dark:from-gray-300 dark:to-gray-400">
                <span className="text-xl text-white">🔒</span>
              </div>
              <h3 className="text-refined mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
                Secure Authentication
              </h3>
              <p className="text-refined text-gray-600 dark:text-gray-400">
                Sign in securely with Google OAuth and manage your account
                preferences.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Typing Section */}
      <div className="relative z-20 overflow-hidden py-20 pb-40">
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="animate-fade-in">
            <h2 className="text-refined text-2xl font-semibold text-gray-700 sm:text-3xl dark:text-gray-300">
              Try asking me:
            </h2>
            <div className="mt-6 flex justify-center">
              <div className="typing-animation text-lg text-gray-600 sm:text-xl dark:text-gray-400">
                "Schedule a meeting with John tomorrow at 2 PM"
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!session && (
        <div className="relative z-20 overflow-hidden bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300">
          {/* CTA Section Background Effects */}
          <div className="pointer-events-none absolute inset-0">
            {/* Elegant gradient orbs for CTA */}
            <div className="animate-gentle-float absolute top-0 right-0 h-48 w-48 rounded-full bg-gradient-to-bl from-blue-500/10 via-purple-500/5 to-transparent blur-3xl"></div>
            <div className="animate-gentle-float-reverse absolute bottom-0 left-0 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-500/8 via-cyan-500/4 to-transparent blur-3xl"></div>

            {/* Subtle geometric patterns */}
            <div className="absolute top-1/2 left-1/4 h-20 w-20 opacity-15">
              <div className="elegant-pattern-1"></div>
            </div>
            <div className="absolute right-1/3 bottom-1/4 h-16 w-16 opacity-10">
              <div className="elegant-pattern-2"></div>
            </div>

            {/* Elegant grid overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="elegant-grid"></div>
            </div>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-16">
            <div className="animate-slide-in-bottom animate-delay-1600">
              <h2 className="text-refined text-3xl font-extrabold tracking-tight text-white sm:text-4xl dark:text-gray-900">
                <span className="block">Ready to get started?</span>
                <span className="block text-white/80 dark:text-gray-900/80">
                  Sign in with Google to begin.
                </span>
              </h2>
            </div>
            <div className="animate-slide-in-bottom animate-delay-1800 mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/api/auth/signin"
                  className="text-refined animate-fade-in-scale inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-gray-800 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-20 border-t border-gray-200/60 bg-white/30 backdrop-blur-sm dark:border-gray-700/60 dark:bg-gray-800/30">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
                Calendara
              </span>
              . All rights reserved.
            </p>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
              AI-powered calendar assistant for smarter time management
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
