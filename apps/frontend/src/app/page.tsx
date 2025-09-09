"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
              AI Calendar Assistant
            </h1>
            <p className="mx-auto mt-3 max-w-md text-base text-gray-500 sm:text-lg md:mt-5 md:max-w-3xl md:text-xl">
              Intelligent calendar management powered by AI. Schedule meetings,
              manage events, and get smart suggestions for your time.
            </p>
            <div className="mx-auto mt-5 max-w-md sm:flex sm:justify-center md:mt-8">
              {session ? (
                <div className="space-y-3 sm:flex sm:space-y-0 sm:space-x-3">
                  <Link
                    href="/chat"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 md:px-10 md:py-4 md:text-lg"
                  >
                    Start Chatting
                  </Link>
                  <Link
                    href="/profile"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-100 px-8 py-3 text-base font-medium text-blue-700 hover:bg-blue-200 md:px-10 md:py-4 md:text-lg"
                  >
                    View Profile
                  </Link>
                </div>
              ) : (
                <div className="space-y-3 sm:flex sm:space-y-0 sm:space-x-3">
                  <Link
                    href="/api/auth/signin"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-600 px-8 py-3 text-base font-medium text-white hover:bg-blue-700 md:px-10 md:py-4 md:text-lg"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/auth-test"
                    className="flex w-full items-center justify-center rounded-md border border-transparent bg-blue-100 px-8 py-3 text-base font-medium text-blue-700 hover:bg-blue-200 md:px-10 md:py-4 md:text-lg"
                  >
                    Test Auth
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Features</h2>
            <p className="mt-4 text-lg text-gray-600">
              Everything you need to manage your calendar intelligently
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500">
                <span className="text-xl text-white">💬</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                AI-Powered Chat
              </h3>
              <p className="text-gray-600">
                Chat with AI to schedule meetings, get calendar insights, and
                manage your time more effectively.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500">
                <span className="text-xl text-white">📅</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                Google Calendar Integration
              </h3>
              <p className="text-gray-600">
                Seamlessly connect with your Google Calendar to view and manage
                your events.
              </p>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-md">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500">
                <span className="text-xl text-white">🔒</span>
              </div>
              <h3 className="mb-2 text-lg font-medium text-gray-900">
                Secure Authentication
              </h3>
              <p className="text-gray-600">
                Sign in securely with Google OAuth and manage your account
                preferences.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      {!session && (
        <div className="bg-blue-600">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:flex lg:items-center lg:justify-between lg:px-8 lg:py-16">
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              <span className="block">Ready to get started?</span>
              <span className="block text-blue-200">
                Sign in with Google to begin.
              </span>
            </h2>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <Link
                  href="/api/auth/signin"
                  className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-5 py-3 text-base font-medium text-blue-600 hover:bg-blue-50"
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
