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
  const fetchEvents = async () => {
    if (!session?.access_token) {
      console.error("No access token available for fetching events");
      setEventsError("No access token available");
      return;
    }

    setEventsLoading(true);
    setEventsError(null);
    setOptimisticEvents([]);

    try {
      const timeMin = "7 days ago";
      const timeMax = "30 days from now";

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
          showToast(
            `📅 Calendar refreshed! Found ${eventCount} event${eventCount !== 1 ? "s" : ""}`,
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
      setEventsError(
        `Failed to fetch events: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
      attendees: eventData.attendees,
      isOptimistic: true,
    };
    setOptimisticEvents((prev) => [...prev, optimisticEvent]);
    return tmpId;
  };

  return {
    fetchEvents,
    addOptimisticEvent,
  };
};
