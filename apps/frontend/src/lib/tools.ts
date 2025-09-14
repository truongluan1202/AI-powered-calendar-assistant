import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { makeGoogleApiCall } from "./token-manager";
import { env } from "~/env";

export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  success: boolean;
  error?: string;
}

export class ToolExecutor {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  private convertTimeReference(timeRef: string): string {
    // Create a date in Australian timezone for consistency
    const now = new Date();
    // Always use Australian timezone for debugging
    const userTimezone = "Australia/Sydney";

    // Convert current time to Australian timezone
    // Use a more reliable method to get Australian time
    const ausTime = new Date(
      now.toLocaleString("en-US", { timeZone: "Australia/Sydney" }),
    );

    // Alternative method using Intl.DateTimeFormat for more reliable timezone conversion
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Australia/Sydney",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const ausTimeAlt = new Date(
      parseInt(parts.find((p) => p.type === "year")?.value || "0"),
      parseInt(parts.find((p) => p.type === "month")?.value || "1") - 1,
      parseInt(parts.find((p) => p.type === "day")?.value || "1"),
      parseInt(parts.find((p) => p.type === "hour")?.value || "0"),
      parseInt(parts.find((p) => p.type === "minute")?.value || "0"),
      parseInt(parts.find((p) => p.type === "second")?.value || "0"),
    );

    // Use the more reliable timezone conversion
    const finalAusTime = ausTimeAlt;

    // Additional debugging for today calculation
    if (timeRef.toLowerCase() === "today") {
      const todayStart = new Date(
        finalAusTime.getFullYear(),
        finalAusTime.getMonth(),
        finalAusTime.getDate(),
      );
    }

    // Handle complex time references like "tomorrow 2pm", "next week monday 3pm", etc.
    if (timeRef.includes("tomorrow")) {
      const tomorrow = new Date(finalAusTime);
      tomorrow.setDate(finalAusTime.getDate() + 1);

      // Extract time if present
      const timeMatch = /(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i.exec(timeRef);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]!);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === "pm" && hours !== 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;

        tomorrow.setHours(hours, minutes, 0, 0);
      } else {
        tomorrow.setHours(0, 0, 0, 0);
      }

      // Format as RFC3339 with local timezone
      return this.formatDateTimeForCalendar(tomorrow, userTimezone);
    }

    // Handle "today" with time
    if (timeRef.includes("today")) {
      const today = new Date(finalAusTime);

      const timeMatch = /(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i.exec(timeRef);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]!);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === "pm" && hours !== 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;

        today.setHours(hours, minutes, 0, 0);
      } else {
        today.setHours(0, 0, 0, 0);
      }

      // Format as RFC3339 with local timezone
      return this.formatDateTimeForCalendar(today, userTimezone);
    }

    // Handle "next week" references
    if (timeRef.includes("next week")) {
      const nextWeek = new Date(finalAusTime);
      nextWeek.setDate(finalAusTime.getDate() + 7);

      // Extract day of week if present
      const dayMatch =
        /(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.exec(
          timeRef,
        );
      if (dayMatch?.[1]) {
        const targetDay = dayMatch[1].toLowerCase();
        const dayMap: Record<string, number> = {
          sunday: 0,
          monday: 1,
          tuesday: 2,
          wednesday: 3,
          thursday: 4,
          friday: 5,
          saturday: 6,
        };
        const targetDayNum = dayMap[targetDay];
        if (targetDayNum !== undefined) {
          const currentDay = nextWeek.getDay();
          const daysToAdd = (targetDayNum - currentDay + 7) % 7;
          nextWeek.setDate(nextWeek.getDate() + daysToAdd);
        }
      }

      // Extract time if present
      const timeMatch = /(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i.exec(timeRef);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]!);
        const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === "pm" && hours !== 12) hours += 12;
        if (ampm === "am" && hours === 12) hours = 0;

        nextWeek.setHours(hours, minutes, 0, 0);
      } else {
        nextWeek.setHours(0, 0, 0, 0);
      }

      // Format as RFC3339 with local timezone
      return this.formatDateTimeForCalendar(nextWeek, userTimezone);
    }

    // Handle "X days ago" references
    if (timeRef.includes("days ago")) {
      const daysMatch = /(\d+)\s+days?\s+ago/i.exec(timeRef);
      if (daysMatch?.[1]) {
        const daysAgo = parseInt(daysMatch[1]);
        const pastDate = new Date(finalAusTime);
        pastDate.setDate(finalAusTime.getDate() - daysAgo);
        pastDate.setHours(0, 0, 0, 0);
        return this.formatDateTimeForCalendar(pastDate, userTimezone);
      }
    }

    // Handle "X days from now" references
    if (timeRef.includes("days from now")) {
      const daysMatch = /(\d+)\s+days?\s+from\s+now/i.exec(timeRef);
      if (daysMatch?.[1]) {
        const daysFromNow = parseInt(daysMatch[1]);
        const futureDate = new Date(finalAusTime);
        futureDate.setDate(finalAusTime.getDate() + daysFromNow);
        futureDate.setHours(23, 59, 59, 999);
        return this.formatDateTimeForCalendar(futureDate, userTimezone);
      }
    }

    switch (timeRef.toLowerCase()) {
      case "now":
        return this.formatDateTimeForCalendar(finalAusTime, userTimezone);
      case "today":
        const todayStart = new Date(
          finalAusTime.getFullYear(),
          finalAusTime.getMonth(),
          finalAusTime.getDate(),
        );
        return this.formatDateTimeForCalendar(todayStart, userTimezone);
      case "tomorrow":
        const tomorrowStart = new Date(
          finalAusTime.getFullYear(),
          finalAusTime.getMonth(),
          finalAusTime.getDate() + 1,
        );
        return this.formatDateTimeForCalendar(tomorrowStart, userTimezone);
      case "yesterday":
        const yesterdayStart = new Date(
          finalAusTime.getFullYear(),
          finalAusTime.getMonth(),
          finalAusTime.getDate() - 1,
        );
        return this.formatDateTimeForCalendar(yesterdayStart, userTimezone);
      default:
        // If it's already a valid ISO string or RFC3339, return as-is
        if (
          timeRef.includes("T") ||
          timeRef.includes("Z") ||
          timeRef.includes("+")
        ) {
          return timeRef;
        }
        // Otherwise, assume it's a relative reference and return current time
        return finalAusTime.toISOString();
    }
  }

  private formatDateTimeForCalendar(date: Date, timezone: string): string {
    // Format the date as RFC3339 with Australian timezone
    // This ensures Google Calendar interprets the time correctly in Australian timezone
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    // Use Australian timezone offset (AEST/AEDT)
    // Australia/Sydney is UTC+10 (AEST) or UTC+11 (AEDT)
    // For simplicity, we'll use UTC+10 (AEST) - you can make this dynamic if needed
    const offsetHours = 10;
    const offsetMinutes = 0;
    const offsetSign = "+";

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const { name, arguments: argsStr } = toolCall.function;
      const args = JSON.parse(argsStr);

      switch (name) {
        case "getEvents":
          return await this.getEvents(args);
        case "createEvent":
          return await this.createEvent(args);
        case "handleEventConfirmation":
          return await this.handleEventConfirmation(args);
        case "webSearch":
          // Web search is now handled by the backend directly
          return {
            tool_call_id: toolCall.id,
            content: "Web search handled by backend",
            success: true,
          };
        default:
          return {
            tool_call_id: toolCall.id,
            content: `Unknown tool: ${name}`,
            success: false,
            error: `Tool ${name} is not implemented`,
          };
      }
    } catch (error) {
      return {
        tool_call_id: toolCall.id,
        content: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  private async getEvents(args: any): Promise<ToolResult> {
    try {
      const params = new URLSearchParams();

      // Convert relative time references to proper RFC3339 timestamps
      if (args.timeMin) {
        const timeMin = this.convertTimeReference(args.timeMin);
        params.append("timeMin", timeMin);
      }
      if (args.timeMax) {
        const timeMax = this.convertTimeReference(args.timeMax);
        params.append("timeMax", timeMax);
      }
      if (args.query) params.append("q", args.query);
      if (args.maxResults)
        params.append("maxResults", args.maxResults.toString());

      const calendarId = args.calendarId || "primary";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

      const response = await makeGoogleApiCall(
        url,
        {
          headers: {},
        },
        this.userId,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const data = await response.json();
      const events = data.items || [];

      // Format events for display
      const formattedEvents = events.map((event: any) => ({
        id: event.id,
        summary: event.summary || "No title",
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        description: event.description,
        attendees: event.attendees?.map((a: any) => a.email).join(", ") || "",
      }));

      return {
        tool_call_id: "",
        content: JSON.stringify({
          events: formattedEvents,
          total: events.length,
        }),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: "",
        content: "",
        success: false,
        error: error instanceof Error ? error.message : "Failed to get events",
      };
    }
  }

  private async createEvent(args: any): Promise<ToolResult> {
    try {
      const calendarId = args.calendarId || "primary";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      // Handle start and end times - they should be objects with dateTime and timeZone
      let startTime, endTime;

      if (args.start?.dateTime) {
        // If it's already a proper datetime object, use it
        startTime = args.start.dateTime;
      } else if (typeof args.start === "string") {
        // If it's a string, convert it
        startTime = this.convertTimeReference(args.start);
      } else {
        throw new Error("Invalid start time format");
      }

      if (args.end?.dateTime) {
        // If it's already a proper datetime object, use it
        endTime = args.end.dateTime;
      } else if (typeof args.end === "string") {
        // If it's a string, convert it
        endTime = this.convertTimeReference(args.end);
      } else {
        throw new Error("Invalid end time format");
      }

      // Always use Australian timezone for debugging
      const userTimezone = "Australia/Sydney";

      const eventData = {
        summary: args.summary,
        description: args.description,
        start: {
          dateTime: startTime,
          timeZone: args.start?.timeZone || userTimezone,
        },
        end: {
          dateTime: endTime,
          timeZone: args.end?.timeZone || userTimezone,
        },
        location: args.location,
        attendees: args.attendees,
      };

      const response = await makeGoogleApiCall(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        },
        this.userId,
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(
          `Google Calendar API error: ${response.status} ${response.statusText} - ${errorText}`,
        );
      }

      const event = await response.json();

      return {
        tool_call_id: "",
        content: JSON.stringify({
          id: event.id,
          summary: event.summary,
          start: event.start?.dateTime || event.start?.date,
          end: event.end?.dateTime || event.end?.date,
          location: event.location,
          htmlLink: event.htmlLink,
        }),
        success: true,
      };
    } catch (error) {
      return {
        tool_call_id: "",
        content: "",
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create event",
      };
    }
  }

  private async handleEventConfirmation(args: any): Promise<ToolResult> {
    try {
      const { action, eventDetails, modifications } = args;

      switch (action) {
        case "confirm":
          if (!eventDetails) {
            return {
              tool_call_id: "",
              content: "Event details are required for confirmation",
              success: false,
              error: "Missing eventDetails for confirmation",
            };
          }
          // Create the event using the existing createEvent method
          return await this.createEvent(eventDetails);

        case "cancel":
          return {
            tool_call_id: "",
            content: "Event creation cancelled by user",
            success: true,
          };

        case "modify":
          return {
            tool_call_id: "",
            content: `User wants to modify: ${modifications || "No specific modifications mentioned"}. Please present updated event details for confirmation.`,
            success: true,
          };

        default:
          return {
            tool_call_id: "",
            content: `Unknown confirmation action: ${action}`,
            success: false,
            error: `Invalid action: ${action}`,
          };
      }
    } catch (error) {
      return {
        tool_call_id: "",
        content: "",
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to handle event confirmation",
      };
    }
  }
}

export async function executeToolCalls(
  toolCalls: ToolCall[],
): Promise<ToolResult[]> {
  // This would need to be called from a server component or API route
  // since it needs access to the session
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return toolCalls.map((toolCall) => ({
      tool_call_id: toolCall.id,
      content: "",
      success: false,
      error: "No user session available",
    }));
  }

  const executor = new ToolExecutor(session.user.id);
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executor.executeToolCall(toolCall);
    result.tool_call_id = toolCall.id;
    results.push(result);
  }

  return results;
}
