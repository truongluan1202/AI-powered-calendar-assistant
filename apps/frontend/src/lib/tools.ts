import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { makeGoogleApiCall } from "./token-manager";

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
    const now = new Date();

    // Handle complex time references like "tomorrow 2pm", "next week monday 3pm", etc.
    if (timeRef.includes("tomorrow")) {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);

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

      return tomorrow.toISOString();
    }

    // Handle "today" with time
    if (timeRef.includes("today")) {
      const today = new Date(now);

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

      return today.toISOString();
    }

    // Handle "next week" references
    if (timeRef.includes("next week")) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);

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

      return nextWeek.toISOString();
    }

    switch (timeRef.toLowerCase()) {
      case "now":
        return now.toISOString();
      case "today":
        const todayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
        );
        return todayStart.toISOString();
      case "tomorrow":
        const tomorrowStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1,
        );
        return tomorrowStart.toISOString();
      case "yesterday":
        const yesterdayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1,
        );
        return yesterdayStart.toISOString();
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
        return now.toISOString();
    }
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    try {
      const { name, arguments: argsStr } = toolCall.function;
      const args = JSON.parse(argsStr);

      console.log(
        `DEBUG: Executing tool call: ${name} with arguments: ${args}`,
      );
      switch (name) {
        case "getEvents":
          return await this.getEvents(args);
        case "createEvent":
          return await this.createEvent(args);
        case "webSearch":
          return await this.webSearch(args);
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
        console.log(
          `DEBUG: Converting timeMin from '${args.timeMin}' to RFC3339`,
        );
        const timeMin = this.convertTimeReference(args.timeMin);
        console.log(`DEBUG: Converted timeMin to: ${timeMin}`);
        params.append("timeMin", timeMin);
      }
      if (args.timeMax) {
        console.log(
          `DEBUG: Converting timeMax from '${args.timeMax}' to RFC3339`,
        );
        const timeMax = this.convertTimeReference(args.timeMax);
        console.log(`DEBUG: Converted timeMax to: ${timeMax}`);
        params.append("timeMax", timeMax);
      }
      if (args.query) params.append("q", args.query);
      if (args.maxResults)
        params.append("maxResults", args.maxResults.toString());

      const calendarId = args.calendarId || "primary";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

      console.log(`DEBUG: Google Calendar API URL: ${url}`);
      console.log(`DEBUG: URL params: ${params.toString()}`);

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
      console.log("DEBUG: createEvent args:", JSON.stringify(args, null, 2));

      const calendarId = args.calendarId || "primary";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;

      // Handle start and end times - they should be objects with dateTime and timeZone
      let startTime, endTime;

      if (args.start?.dateTime) {
        // If it's already a proper datetime object, use it
        startTime = args.start.dateTime;
        console.log("DEBUG: Using provided start time:", startTime);
      } else if (typeof args.start === "string") {
        // If it's a string, convert it
        console.log("DEBUG: Converting start time string:", args.start);
        startTime = this.convertTimeReference(args.start);
        console.log("DEBUG: Converted start time:", startTime);
      } else {
        throw new Error("Invalid start time format");
      }

      if (args.end?.dateTime) {
        // If it's already a proper datetime object, use it
        endTime = args.end.dateTime;
        console.log("DEBUG: Using provided end time:", endTime);
      } else if (typeof args.end === "string") {
        // If it's a string, convert it
        console.log("DEBUG: Converting end time string:", args.end);
        endTime = this.convertTimeReference(args.end);
        console.log("DEBUG: Converted end time:", endTime);
      } else {
        throw new Error("Invalid end time format");
      }

      const eventData = {
        summary: args.summary,
        description: args.description,
        start: {
          dateTime: startTime,
          timeZone:
            args.start?.timeZone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        end: {
          dateTime: endTime,
          timeZone:
            args.end?.timeZone ||
            Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        location: args.location,
        attendees: args.attendees,
      };

      console.log(
        "DEBUG: Final event data:",
        JSON.stringify(eventData, null, 2),
      );
      console.log(
        "DEBUG: User timezone:",
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );

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

  private async webSearch(args: any): Promise<ToolResult> {
    // For now, return a placeholder. You can integrate with a search API later.
    return {
      tool_call_id: "",
      content: JSON.stringify({
        results: [
          {
            title: "Web search not implemented",
            snippet: "This feature will be available soon.",
            url: "#",
          },
        ],
      }),
      success: true,
    };
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
