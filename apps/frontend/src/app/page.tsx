"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="gradient-bg flex h-full items-center justify-center">
        <div className="text-refined text-lg text-gray-900 dark:text-gray-200">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg h-full overflow-y-auto">
      {/* Hero Section */}
      <div className="gradient-card">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-slide-in-bottom">
              <div className="mb-6 flex justify-center">
                <div className="animate-pulse-glow animate-float animate-shimmer flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-r from-gray-900 to-gray-950 dark:from-gray-400 dark:to-gray-500">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    AI
                  </span>
                </div>
              </div>
            </div>
            <h1 className="animate-slide-in-bottom animate-delay-200 text-refined text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl dark:text-gray-100">
              AI Calendar Assistant
            </h1>
            <p className="animate-slide-in-bottom animate-delay-400 text-refined mx-auto mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl dark:text-gray-400">
              Our smartest AI model to help you manage your time effectively.
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
      <div className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="animate-slide-in-bottom animate-delay-800 text-center">
            <h2 className="text-refined text-3xl font-extrabold text-gray-900 dark:text-gray-100">
              Features
            </h2>
            <p className="text-refined mt-4 text-lg text-gray-600 dark:text-gray-400">
              Everything you need to manage your calendar intelligently
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="animate-slide-in-bottom animate-delay-1000 gradient-card shadow-refined rounded-lg p-6">
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

            <div className="animate-slide-in-bottom animate-delay-1200 gradient-card shadow-refined rounded-lg p-6">
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

            <div className="animate-slide-in-bottom animate-delay-1400 gradient-card shadow-refined rounded-lg p-6">
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

      {/* CTA Section */}
      {!session && (
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 dark:from-gray-200 dark:to-gray-300">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-16">
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
    </div>
  );
}
