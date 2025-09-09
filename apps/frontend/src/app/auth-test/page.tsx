"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthTestPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="mx-auto max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">
          Authentication Test
        </h1>

        {session ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-green-50 p-4">
              <h2 className="text-lg font-semibold text-green-800">
                ✅ Authenticated
              </h2>
              <div className="mt-2 text-sm text-green-700">
                <p>
                  <strong>Name:</strong> {session.user?.name}
                </p>
                <p>
                  <strong>Email:</strong> {session.user?.email}
                </p>
                <p>
                  <strong>User ID:</strong> {session.user?.id}
                </p>
                {session.user?.image && (
                  <div className="mt-2">
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-12 w-12 rounded-full"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href="/chat"
                className="block w-full rounded bg-blue-500 px-4 py-2 text-center text-white hover:bg-blue-600"
              >
                Go to Chat
              </Link>

              <button
                onClick={() => signOut()}
                className="w-full rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-yellow-50 p-4">
              <h2 className="text-lg font-semibold text-yellow-800">
                ⚠️ Not Authenticated
              </h2>
              <p className="mt-2 text-sm text-yellow-700">
                Please sign in to test the authentication flow.
              </p>
            </div>

            <button
              onClick={() => signIn("google")}
              className="w-full rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Sign in with Google
            </button>
          </div>
        )}

        <div className="mt-6 border-t pt-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Environment Check:
          </h3>
          <div className="mt-2 text-xs text-gray-600">
            <p>Status: {status}</p>
            <p>Session: {session ? "Present" : "None"}</p>
            <p>NextAuth URL: {process.env.NEXTAUTH_URL || "Not set"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
