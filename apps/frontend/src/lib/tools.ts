import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";

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
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
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

      if (args.timeMin) params.append("timeMin", args.timeMin);
      if (args.timeMax) params.append("timeMax", args.timeMax);
      if (args.query) params.append("q", args.query);
      if (args.maxResults)
        params.append("maxResults", args.maxResults.toString());

      const calendarId = args.calendarId || "primary";
      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Google Calendar API error: ${response.status} ${response.statusText}`,
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

      const eventData = {
        summary: args.summary,
        description: args.description,
        start: args.start,
        end: args.end,
        location: args.location,
        attendees: args.attendees,
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error(
          `Google Calendar API error: ${response.status} ${response.statusText}`,
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

  if (!session?.access_token) {
    return toolCalls.map((toolCall) => ({
      tool_call_id: toolCall.id,
      content: "",
      success: false,
      error: "No access token available",
    }));
  }

  const executor = new ToolExecutor(session.access_token as string);
  const results: ToolResult[] = [];

  for (const toolCall of toolCalls) {
    const result = await executor.executeToolCall(toolCall);
    result.tool_call_id = toolCall.id;
    results.push(result);
  }

  return results;
}
