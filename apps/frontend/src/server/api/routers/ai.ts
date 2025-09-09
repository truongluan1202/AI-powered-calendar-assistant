import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const aiRouter = createTRPCRouter({
  // Generate AI response for a chat message
  generateResponse: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        message: z.string(),
        modelProvider: z.enum(["openai", "anthropic", "gemini"]),
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

      console.log("DEBUG: Sending request to backend:", {
        threadId: input.threadId,
        modelProvider: input.modelProvider,
        modelName: input.modelName,
        messageCount: conversationHistory.length,
      });

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
          console.log("DEBUG: Executing tool calls:", aiResponse.tool_calls);

          // Execute tool calls
          const toolResults = await fetch("/api/tools/execute", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              toolCalls: aiResponse.tool_calls,
            }),
          });

          if (!toolResults.ok) {
            throw new Error("Failed to execute tool calls");
          }

          const { results } = await toolResults.json();
          console.log("DEBUG: Tool results:", results);

          // Send tool results back to LLM for final response
          const finalResponse = await fetch(
            `${backendUrl}/api/v1/chat/generate`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messages: [
                  ...conversationHistory,
                  {
                    role: "assistant",
                    content: aiResponse.content,
                    tool_calls: aiResponse.tool_calls,
                  },
                  {
                    role: "tool",
                    content: JSON.stringify(results),
                  },
                ],
                model_provider: input.modelProvider,
                model_name: input.modelName,
              }),
            },
          );

          if (!finalResponse.ok) {
            throw new Error(`Backend error: ${finalResponse.statusText}`);
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
        throw new Error("Failed to generate AI response");
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

      const providers = (await response.json()) as any;
      return providers;
    } catch (error) {
      console.error("Error fetching providers:", error);
      // Return fallback providers if backend is unavailable
      return {
        openai: {
          available: !!process.env.OPENAI_API_KEY,
          models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"],
        },
        anthropic: {
          available: !!process.env.ANTHROPIC_API_KEY,
          models: [
            "claude-3-sonnet-20240229",
            "claude-3-haiku-20240307",
            "claude-3-opus-20240229",
          ],
        },
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
