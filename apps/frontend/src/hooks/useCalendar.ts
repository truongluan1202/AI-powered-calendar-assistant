import { useSession } from "next-auth/react";
import { showToast } from "~/utils/chat";
import type { Event } from "~/types/chat";

interface UseCalendarProps {
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setOptimisticEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setEventsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setEventsError: React.Dispatch<React.SetStateAction<string | null>>;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useCalendar = ({
  setEvents,
  setOptimisticEvents,
  setEventsLoading,
  setEventsError,
  setToastMessage,
}: UseCalendarProps) => {
  const { data: session } = useSession();

  // Fetch events from Google Calendar
  const fetchEvents = async (timeWindow?: {
    timeMin: string;
    timeMax: string;
  }) => {
    if (!session?.access_token) {
      console.error("No access token available for fetching events");
      setEventsError("No access token available");
      return;
    }

    setEventsLoading(true);
    setEventsError(null);
    setOptimisticEvents([]);

    try {
      // Use provided time window or default to "This Week"
      let timeMin = timeWindow?.timeMin || "7 days ago";
      let timeMax = timeWindow?.timeMax || "30 days from now";

      // If we have RFC3339 timestamps, use them directly
      if (timeWindow?.timeMin?.includes("T")) {
        timeMin = timeWindow.timeMin;
        timeMax = timeWindow.timeMax;
        console.log("Using custom time range:", { timeMin, timeMax });
      } else {
        console.log("Using default time range:", { timeMin, timeMax });
      }

      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolCalls: [
            {
              id: "fetch-events",
              type: "function",
              function: {
                name: "getEvents",
                arguments: JSON.stringify({
                  timeMin,
                  timeMax,
                  maxResults: 250,
                }),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to fetch events:", response.status, errorText);
        setEventsError(
          `Failed to fetch events: ${response.status} ${errorText}`,
        );
        return;
      }

      const { results } = await response.json();
      if (results && results.length > 0) {
        const result = results[0];

        if (result.success) {
          const data = JSON.parse(result.content);
          setEvents(data.events ?? []);
          setEventsError(null);

          const eventCount = data.events?.length || 0;
          const timeWindowLabel = timeWindow ? "selected range" : "This Week";
          showToast(
            `📅 Calendar refreshed! Found ${eventCount} event${eventCount !== 1 ? "s" : ""} for ${timeWindowLabel}`,
            setToastMessage,
          );
        } else {
          console.error("Tool execution failed:", result.error);
          setEventsError(`Tool execution failed: ${result.error}`);
        }
      } else {
        console.error("No results returned from tool execution");
        setEventsError("No results returned from tool execution");
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);

      // Convert technical errors to user-friendly messages
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let userFriendlyMessage =
        "Unable to load your calendar events. Please try again.";

      if (errorMessage.includes("401") || errorMessage.includes("403")) {
        userFriendlyMessage =
          "Please sign in to Google Calendar to view your events.";
      } else if (
        errorMessage.includes("network") ||
        errorMessage.includes("fetch")
      ) {
        userFriendlyMessage =
          "Network connection failed. Please check your internet and try again.";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyMessage = "Request timed out. Please try again.";
      } else if (errorMessage.includes("calendar")) {
        userFriendlyMessage =
          "Unable to access your calendar. Please check your permissions and try again.";
      }

      setEventsError(userFriendlyMessage);
      showToast(`❌ ${userFriendlyMessage}`, setToastMessage);
    } finally {
      setEventsLoading(false);
    }
  };

  // Add optimistic event
  const addOptimisticEvent = (eventData: any) => {
    const tmpId = `tmp-${Date.now()}`;
    const optimisticEvent = {
      id: `optimistic-${Date.now()}`,
      tmpId,
      summary: eventData.summary,
      start: eventData.start?.dateTime || eventData.start,
      end: eventData.end?.dateTime || eventData.end,
      location: eventData.location,
      description: eventData.description,
      isOptimistic: true,
    };
    setOptimisticEvents((prev) => [...prev, optimisticEvent]);
    return tmpId;
  };

  // Update event
  const updateEvent = async (eventId: string, eventData: any) => {
    if (!session?.access_token) {
      console.error("No access token available for updating event");
      setEventsError("No access token available");
      return;
    }

    setEventsLoading(true);
    setEventsError(null);

    try {
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolCalls: [
            {
              id: "update-event",
              type: "function",
              function: {
                name: "updateEvent",
                arguments: JSON.stringify({
                  eventId,
                  ...eventData,
                }),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to update event:", response.status, errorText);
        setEventsError(
          `Failed to update event: ${response.status} ${errorText}`,
        );
        return;
      }

      const { results } = await response.json();
      if (results && results.length > 0) {
        const result = results[0];

        if (result.success) {
          // Refresh events to show updated data
          await fetchEvents();

          // Show success message - no need to add user message for direct edits
          showToast("✅ Event updated successfully!", setToastMessage);
        } else {
          console.error("Tool execution failed:", result.error);
          const errorMessage = result.error || "Unknown error";
          let userFriendlyMessage =
            "Unable to update the event. Please try again.";

          if (errorMessage.includes("401") || errorMessage.includes("403")) {
            userFriendlyMessage =
              "Please sign in to Google Calendar to update events.";
          } else if (
            errorMessage.includes("not found") ||
            errorMessage.includes("404")
          ) {
            userFriendlyMessage =
              "Event not found. It may have been deleted or moved.";
          } else if (
            errorMessage.includes("permission") ||
            errorMessage.includes("forbidden")
          ) {
            userFriendlyMessage =
              "You don't have permission to update this event.";
          }

          setEventsError(userFriendlyMessage);
          showToast(`❌ ${userFriendlyMessage}`, setToastMessage);
        }
      } else {
        console.error("No results returned from tool execution");
        setEventsError("No results returned from tool execution");
        showToast(
          "❌ Unable to update event. Please try again.",
          setToastMessage,
        );
      }
    } catch (error) {
      console.error("Failed to update event:", error);

      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      let userFriendlyMessage = "Unable to update the event. Please try again.";

      if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
        userFriendlyMessage =
          "Network connection failed. Please check your internet and try again.";
      } else if (errorMessage.includes("timeout")) {
        userFriendlyMessage = "Request timed out. Please try again.";
      }

      setEventsError(userFriendlyMessage);
      showToast(`❌ ${userFriendlyMessage}`, setToastMessage);
    } finally {
      setEventsLoading(false);
    }
  };

  // Delete event
  const deleteEvent = async (eventId: string) => {
    if (!session?.access_token) {
      console.error("No access token available for deleting event");
      setEventsError("No access token available");
      return;
    }

    setEventsLoading(true);
    setEventsError(null);

    try {
      const response = await fetch("/api/tools/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolCalls: [
            {
              id: "delete-event",
              type: "function",
              function: {
                name: "deleteEvent",
                arguments: JSON.stringify({
                  eventId,
                }),
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to delete event:", response.status, errorText);
        setEventsError(
          `Failed to delete event: ${response.status} ${errorText}`,
        );
        return;
      }

      const { results } = await response.json();
      if (results && results.length > 0) {
        const result = results[0];

        if (result.success) {
          // Remove the event from the current events list
          setEvents((prev) => prev.filter((event) => event.id !== eventId));
          setOptimisticEvents((prev) =>
            prev.filter((event) => event.id !== eventId),
          );
          showToast("🗑️ Event deleted successfully!", setToastMessage);
        } else {
          console.error("Tool execution failed:", result.error);
          setEventsError(`Tool execution failed: ${result.error}`);
        }
      } else {
        console.error("No results returned from tool execution");
        setEventsError("No results returned from tool execution");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      setEventsError(
        `Failed to delete event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setEventsLoading(false);
    }
  };

  return {
    fetchEvents,
    addOptimisticEvent,
    updateEvent,
    deleteEvent,
  };
};
