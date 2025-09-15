"use client";

import { signIn, getSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already signed in
    getSession()
      .then((session) => {
        if (session) {
          router.push("/chat");
        }
      })
      .catch((error) => {
        console.error("Error checking session:", error);
      });
  }, [router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/chat" });
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="relative z-10 w-full max-w-md px-4 sm:px-6 lg:px-8">
        {/* Logo and Brand */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="group mb-6 flex items-center justify-center space-x-3"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-r from-gray-700 to-gray-800 transition-all duration-200 group-hover:from-gray-600 group-hover:to-gray-700 dark:from-gray-300 dark:to-gray-400 dark:group-hover:from-gray-200 dark:group-hover:to-gray-300">
              <span className="text-2xl font-bold text-white dark:text-white">
                Cal
              </span>
            </div>
            <span className="text-3xl font-bold">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
                Calendara
              </span>
            </span>
          </Link>
        </div>

        {/* Sign In Card */}
        <div className="hero-transparent rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
              Welcome Back
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Sign in to access your AI-powered calendar assistant
            </p>
          </div>

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-4 font-medium text-gray-700 shadow-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
          >
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </button>

          {/* Features Preview */}
          <div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-700">
            <h3 className="mb-4 text-center text-sm font-semibold text-gray-900 dark:text-gray-100">
              What you'll get:
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-3 w-3 text-green-600 dark:text-green-400"
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
                  AI-powered calendar management
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-3 w-3 text-green-600 dark:text-green-400"
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
                  Smart meeting scheduling
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-3 w-3 text-green-600 dark:text-green-400"
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
                  Secure Google Calendar integration
                </span>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-6 text-center">
            <Link
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ← Back to home
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            By signing in, you agree to our terms of service and privacy policy
          </p>
        </div>
      </div>
    </div>
  );
}
