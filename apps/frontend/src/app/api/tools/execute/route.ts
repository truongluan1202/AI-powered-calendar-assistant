import { type NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { ToolExecutor, type ToolCall } from "~/lib/tools";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "No user session available" },
        { status: 401 },
      );
    }

    const { toolCalls }: { toolCalls: ToolCall[] } = await request.json();

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return NextResponse.json(
        { error: "Invalid tool calls format" },
        { status: 400 },
      );
    }

    const executor = new ToolExecutor(session.user.id);
    const results = [];

    for (const toolCall of toolCalls) {
      const result = await executor.executeToolCall(toolCall);
      result.tool_call_id = toolCall.id;
      results.push(result);
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Tool execution error:", error);
    return NextResponse.json(
      { error: "Failed to execute tools" },
      { status: 500 },
    );
  }
}
