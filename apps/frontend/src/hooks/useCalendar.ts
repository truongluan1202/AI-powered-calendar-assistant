import { useSession } from "next-auth/react";
import { showToast } from "~/utils/chat";
import type { Event } from "~/types/chat";

interface UseCalendarProps {
  setEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setOptimisticEvents: React.Dispatch<React.SetStateAction<Event[]>>;
  setEventsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  setEventsError: React.Dispatch<React.SetStateAction<string | null>>;
  setToastMessage: React.Dispatch<React.SetStateAction<string | null>>;
  addMessageMutation?: {
    mutate: (params: {
      threadId: string;
      role: "user" | "assistant" | "system";
      content: string;
    }) => void;
  };
  currentThreadId?: string | null;
}

export const useCalendar = ({
  setEvents,
  setOptimisticEvents,
  setEventsLoading,
  setEventsError,
  setToastMessage,
  addMessageMutation,
  currentThreadId,
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

          // Add a message to trigger LLM confirmation if we have chat context
          if (addMessageMutation && currentThreadId) {
            // Format the updated event details for display
            const formatEventDetails = (data: any) => {
              const details = [];
              if (data.summary) details.push(`**Title:** ${data.summary}`);
              if (data.start) {
                const startTime = new Date(data.start).toLocaleString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                });
                const endTime = data.end
                  ? new Date(data.end).toLocaleString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "TBD";
                details.push(`**Date & Time:** ${startTime} - ${endTime}`);
              }
              if (data.location) details.push(`**Location:** ${data.location}`);
              if (data.description)
                details.push(`**Description:** ${data.description}`);
              if (data.attendees && data.attendees.length > 0) {
                const attendeeEmails = data.attendees
                  .map((a: any) => a.email || a)
                  .join(", ");
                details.push(`**Attendees:** ${attendeeEmails}`);
              }
              return details.join("\n");
            };

            const confirmationForm = formatEventDetails(eventData);
            const editMessage = `I just updated an event with ID ${eventId}. Here are the updated details:\n\n${confirmationForm}`;

            addMessageMutation.mutate({
              threadId: currentThreadId,
              role: "user",
              content: editMessage,
            });
          } else {
            // Fallback to generic message if no chat context
            showToast("✅ Event updated successfully!", setToastMessage);
          }
        } else {
          console.error("Tool execution failed:", result.error);
          setEventsError(`Tool execution failed: ${result.error}`);
        }
      } else {
        console.error("No results returned from tool execution");
        setEventsError("No results returned from tool execution");
      }
    } catch (error) {
      console.error("Failed to update event:", error);
      setEventsError(
        `Failed to update event: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
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
