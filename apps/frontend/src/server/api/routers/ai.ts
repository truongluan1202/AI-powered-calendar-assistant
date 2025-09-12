import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { ToolExecutor, type ToolCall } from "~/lib/tools";

export const aiRouter = createTRPCRouter({
  // Generate AI response for a chat message
  generateResponse: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        message: z.string(),
        modelProvider: z.enum(["gemini"]),
        modelName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get the thread to verify ownership
      const thread = await ctx.db.chatThread.findFirst({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id,
        },
        include: {
          messages: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      // Prepare conversation history for LLM (including the new user message)
      const conversationHistory = thread.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add the new user message to conversation history
      conversationHistory.push({
        role: "user",
        content: input.message,
      });

      // Call the FastAPI backend for LLM processing
      const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

      try {
        const response = await fetch(`${backendUrl}/api/v1/chat/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: conversationHistory,
            model_provider: input.modelProvider,
            model_name: input.modelName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Backend error: ${response.statusText}`);
        }

        const aiResponse = (await response.json()) as {
          content: string;
          tool_calls?: Array<{
            id: string;
            type: string;
            function: {
              name: string;
              arguments: string;
            };
          }>;
        };

        // If there are tool calls, execute them
        if (aiResponse.tool_calls && aiResponse.tool_calls.length > 0) {
          // Execute tool calls directly
          const executor = new ToolExecutor(ctx.session.user.id);
          const results = [];

          for (const toolCall of aiResponse.tool_calls) {
            const result = await executor.executeToolCall(toolCall as ToolCall);
            result.tool_call_id = toolCall.id;
            results.push(result);
          }

          // Send tool results back to LLM for final response
          const finalMessages = [
            ...conversationHistory.map((msg) => ({
              role: msg.role,
              content: msg.content,
            })),
            {
              role: "assistant",
              content: aiResponse.content,
              tool_calls: aiResponse.tool_calls,
            },
            {
              role: "tool",
              content: JSON.stringify(
                results.map((r) => ({
                  tool_call_id: r.tool_call_id,
                  content: r.content,
                  success: r.success,
                  error: r.error,
                })),
              ),
            },
          ];

          const finalResponse = await fetch(
            `${backendUrl}/api/v1/chat/generate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: finalMessages,
                model_provider: input.modelProvider,
                model_name: input.modelName,
              }),
            },
          );

          if (!finalResponse.ok) {
            const errorText = await finalResponse.text();
            console.error("Backend error response:", errorText);
            throw new Error(
              `Backend error: ${finalResponse.statusText} - ${errorText}`,
            );
          }

          const finalAiResponse = (await finalResponse.json()) as {
            content: string;
          };

          // Save the final AI response to database
          const savedMessage = await ctx.db.chatMessage.create({
            data: {
              threadId: input.threadId,
              userId: ctx.session.user.id,
              role: "assistant",
              content: finalAiResponse.content,
            },
          });

          return {
            message: savedMessage,
            content: finalAiResponse.content,
            toolCalls: aiResponse.tool_calls,
            toolResults: results,
          };
        } else {
          // No tool calls, save the regular response
          const savedMessage = await ctx.db.chatMessage.create({
            data: {
              threadId: input.threadId,
              userId: ctx.session.user.id,
              role: "assistant",
              content: aiResponse.content,
            },
          });

          return {
            message: savedMessage,
            content: aiResponse.content,
          };
        }
      } catch (error) {
        console.error("AI generation error:", error);

        // Provide more specific error messages based on the error type
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error(
            "Unable to connect to AI service. Please check if the backend is running.",
          );
        } else if (error instanceof Error) {
          if (error.message.includes("Backend error")) {
            throw new Error(`AI service error: ${error.message}`);
          } else if (
            error.message.includes("ECONNREFUSED") ||
            error.message.includes("ENOTFOUND")
          ) {
            throw new Error(
              "AI service is unavailable. Please try again later.",
            );
          } else {
            throw new Error(`AI generation failed: ${error.message}`);
          }
        } else {
          throw new Error(
            "An unexpected error occurred while generating the AI response.",
          );
        }
      }
    }),

  // Get available LLM providers and models
  getAvailableProviders: publicProcedure.query(async () => {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

    try {
      const response = await fetch(`${backendUrl}/api/v1/chat/providers`);

      if (!response.ok) {
        throw new Error(`Backend error: ${response.statusText}`);
      }

      const providers = await response.json();
      return providers;
    } catch (error) {
      console.error("Error fetching providers:", error);
      // Return fallback providers if backend is unavailable
      return {
        gemini: {
          available: !!process.env.GEMINI_API_KEY,
          models: [
            "gemini-2.5-flash-lite",
            "gemini-2.0-flash-lite",
            "gemini-2.5-flash",
            "gemini-2.0-flash",
          ],
        },
      };
    }
  }),
});
