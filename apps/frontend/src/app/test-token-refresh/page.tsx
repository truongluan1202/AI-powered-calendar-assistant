"use client";

import { useState } from "react";

export default function TestTokenRefreshPage() {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async (testType: string) => {
    setIsLoading(true);
    setTestResults(null);

    try {
      let response;
      switch (testType) {
        case "basic":
          response = await fetch("/api/test/token-refresh");
          break;
        case "full":
          response = await fetch("/api/test/token-refresh", { method: "POST" });
          break;
        case "force":
          response = await fetch("/api/test/token-refresh", { method: "PUT" });
          break;
        case "calendar":
          response = await fetch("/api/google/calendars");
          break;
        default:
          throw new Error("Invalid test type");
      }

      const result = await response.json();
      setTestResults({
        ...result,
        testType,
        status: response.status,
        ok: response.ok,
      });
    } catch (error) {
      setTestResults({
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        testType,
        status: 0,
        ok: false,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-6 text-3xl font-bold">Token Refresh Test Suite</h1>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => runTest("basic")}
          disabled={isLoading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Basic Token Test"}
        </button>

        <button
          onClick={() => runTest("full")}
          disabled={isLoading}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Full Test Suite"}
        </button>

        <button
          onClick={() => runTest("force")}
          disabled={isLoading}
          className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Force Expiration"}
        </button>

        <button
          onClick={() => runTest("calendar")}
          disabled={isLoading}
          className="rounded bg-purple-500 px-4 py-2 text-white hover:bg-purple-600 disabled:opacity-50"
        >
          {isLoading ? "Testing..." : "Calendar API Test"}
        </button>
      </div>

      {testResults && (
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-xl font-semibold">Test Results</h2>

          <div className="mb-4">
            <span
              className={`inline-block rounded px-2 py-1 text-sm font-medium ${
                testResults.success || testResults.ok
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {testResults.success || testResults.ok
                ? "✅ PASSED"
                : "❌ FAILED"}
            </span>
            <span className="ml-2 text-sm text-gray-600">
              {testResults.test || `${testResults.testType} Test`}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              Status: {testResults.status}
            </span>
          </div>

          <div className="mb-4">
            <h3 className="font-medium">Message:</h3>
            <p className="text-gray-700">{testResults.message}</p>
          </div>

          {testResults.details && (
            <div className="mb-4">
              <h3 className="font-medium">Details:</h3>
              <pre className="mt-2 overflow-auto rounded bg-gray-100 p-3 text-sm">
                {JSON.stringify(testResults.details, null, 2)}
              </pre>
            </div>
          )}

          {testResults.results && (
            <div className="mb-4">
              <h3 className="font-medium">Test Suite Results:</h3>
              <div className="mt-2 space-y-2">
                {testResults.results.map((result: any, index: number) => (
                  <div key={index} className="rounded border p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{result.test}</span>
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          result.success
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.success ? "PASS" : "FAIL"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">
                      {result.message}
                    </p>
                    {result.details && (
                      <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-xs">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {testResults.error && (
            <div className="rounded bg-red-50 p-3">
              <h3 className="font-medium text-red-800">Error:</h3>
              <p className="text-red-700">{testResults.error}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-8 rounded-lg bg-gray-100 p-4">
        <h3 className="mb-2 font-semibold">Test Descriptions:</h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Basic Token Test:</strong> Checks if your current token is
            valid and refreshes it if needed.
          </li>
          <li>
            <strong>Full Test Suite:</strong> Runs comprehensive tests including
            basic refresh, forced expiration, and API calls.
          </li>
          <li>
            <strong>Force Expiration:</strong> Manually expires your token to
            test the refresh mechanism.
          </li>
          <li>
            <strong>Calendar API Test:</strong> Tests the actual Google Calendar
            API with automatic token refresh.
          </li>
        </ul>
      </div>
    </div>
  );
}
