"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500">
                <span className="text-sm font-bold text-white">AI</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Calendar Assistant
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden items-center space-x-8 md:flex">
            {session && (
              <>
                <Link
                  href="/chat"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/chat")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  Chat
                </Link>
                <Link
                  href="/calendar-demo"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/calendar-demo")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  Calendar Demo
                </Link>
                <Link
                  href="/test-token-refresh"
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive("/test-token-refresh")
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  Token Tests
                </Link>
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {status === "loading" ? (
              <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200"></div>
            ) : session ? (
              <div className="flex items-center space-x-3">
                {/* User Info */}
                <Link
                  href="/profile"
                  className="hidden items-center space-x-2 transition-opacity hover:opacity-80 sm:flex"
                >
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  )}
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {session.user?.name}
                    </p>
                    <p className="text-gray-500">{session.user?.email}</p>
                  </div>
                </Link>

                {/* Mobile User Avatar */}
                <Link
                  href="/profile"
                  className="transition-opacity hover:opacity-80 sm:hidden"
                >
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500">
                      <span className="text-sm font-medium text-white">
                        {session.user?.name?.charAt(0) ?? "U"}
                      </span>
                    </div>
                  )}
                </Link>

                {/* Sign Out Button */}
                <button
                  onClick={() => signOut()}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn("google")}
                className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {session && (
          <div className="border-t border-gray-200 py-2 md:hidden">
            <div className="flex space-x-4">
              <Link
                href="/chat"
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/chat")
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Chat
              </Link>
              <Link
                href="/calendar-demo"
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/calendar-demo")
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Calendar Demo
              </Link>
              <Link
                href="/test-token-refresh"
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive("/test-token-refresh")
                    ? "bg-blue-100 text-blue-700"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                Token Tests
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
