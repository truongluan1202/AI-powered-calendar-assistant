"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

export default function CalendarDemoPage() {
  const { data: session, status } = useSession();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEvents = async () => {
    if (!session?.access_token) {
      setError("No access token available");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolCalls: [
            {
              id: "test-1",
              type: "function",
              function: {
                name: "getEvents",
                arguments: JSON.stringify({
                  timeMin: new Date().toISOString(),
                  maxResults: 10,
                }),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const { results } = await response.json();
      const result = results[0];

      if (result.success) {
        const data = JSON.parse(result.content);
        setEvents(data.events ?? []);
      } else {
        setError(result.error ?? "Failed to fetch events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900">
            Please sign in to test calendar functionality
          </h1>
          <p className="text-gray-600">
            You need to be authenticated to access Google Calendar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calendar Demo</h1>
          <p className="mt-2 text-gray-600">
            Test the Google Calendar integration and tool execution.
          </p>
        </div>

        <div className="space-y-6">
          {/* Test Section */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Test Calendar Integration
            </h2>
            <p className="mb-4 text-gray-600">
              Click the button below to fetch your upcoming calendar events.
            </p>
            <button
              onClick={fetchEvents}
              disabled={loading}
              className="rounded-md bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Fetching..." : "Fetch My Events"}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="rounded-lg bg-red-50 p-4">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          )}

          {/* Events Display */}
          {events.length > 0 && (
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="mb-4 text-xl font-semibold text-gray-900">
                Your Upcoming Events ({events.length})
              </h2>
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div
                    key={event.id ?? index}
                    className="border-l-4 border-blue-500 pl-4"
                  >
                    <h3 className="font-medium text-gray-900">
                      {event.summary}
                    </h3>
                    <p className="text-sm text-gray-600">
                      <strong>Start:</strong>{" "}
                      {new Date(event.start).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>End:</strong>{" "}
                      {new Date(event.end).toLocaleString()}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600">
                        <strong>Location:</strong> {event.location}
                      </p>
                    )}
                    {event.description && (
                      <p className="text-sm text-gray-600">
                        <strong>Description:</strong> {event.description}
                      </p>
                    )}
                    {event.attendees && (
                      <p className="text-sm text-gray-600">
                        <strong>Attendees:</strong> {event.attendees}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-lg bg-blue-50 p-6">
            <h2 className="mb-4 text-xl font-semibold text-blue-900">
              How to Use the Calendar Assistant
            </h2>
            <div className="space-y-3 text-blue-800">
              <p>
                <strong>Ask about your calendar:</strong>
                <br />
                "What's on my calendar tomorrow?"
                <br />
                "Do I have any meetings next week?"
                <br />
                "Show me my schedule for today"
              </p>
              <p>
                <strong>Create new events:</strong>
                <br />
                "Schedule a meeting with John at 2 PM tomorrow"
                <br />
                "Add 'Team standup' to my calendar for Friday at 9 AM"
                <br />
                "Create an event called 'Doctor appointment' for next Monday at
                3 PM"
              </p>
              <p>
                <strong>Search for specific events:</strong>
                <br />
                "Do I have a meeting with Alice?"
                <br />
                "When is my dentist appointment?"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
