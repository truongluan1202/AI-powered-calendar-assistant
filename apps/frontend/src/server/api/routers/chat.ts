import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const chatRouter = createTRPCRouter({
  // Get all chat threads for the current user
  getThreads: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.chatThread.findMany({
      where: {
        userId: ctx.session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Create a new chat thread
  createThread: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        modelProvider: z.enum(["gemini"]),
        modelName: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chatThread.create({
        data: {
          title: input.title,
          modelProvider: input.modelProvider,
          modelName: input.modelName,
          userId: ctx.session.user.id,
        },
      });
    }),

  // Get messages for a specific thread
  getMessages: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the thread belongs to the user
      const thread = await ctx.db.chatThread.findFirst({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id,
        },
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      return ctx.db.chatMessage.findMany({
        where: {
          threadId: input.threadId,
        },
        orderBy: {
          createdAt: "asc",
        },
      });
    }),

  // Add a message to a thread
  addMessage: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        role: z.enum(["user", "assistant", "system"]),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify the thread belongs to the user
      const thread = await ctx.db.chatThread.findFirst({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id,
        },
      });

      if (!thread) {
        throw new Error("Thread not found");
      }

      return ctx.db.chatMessage.create({
        data: {
          threadId: input.threadId,
          userId: ctx.session.user.id,
          role: input.role,
          content: input.content,
        },
      });
    }),

  // Update thread title
  updateThread: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        title: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chatThread.update({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id, // Ensure user owns the thread
        },
        data: {
          title: input.title,
        },
      });
    }),

  // Update thread model
  updateThreadModel: protectedProcedure
    .input(
      z.object({
        threadId: z.string(),
        modelName: z.enum([
          "gemini-2.5-flash-lite",
          "gemini-2.0-flash-lite",
          "gemini-2.5-flash",
          "gemini-2.0-flash",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.chatThread.update({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id, // Ensure user owns the thread
        },
        data: {
          modelName: input.modelName,
        },
      });
    }),

  // Delete a thread
  deleteThread: protectedProcedure
    .input(z.object({ threadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Delete all messages first (due to foreign key constraints)
      await ctx.db.chatMessage.deleteMany({
        where: {
          threadId: input.threadId,
        },
      });

      // Then delete the thread
      return ctx.db.chatThread.delete({
        where: {
          id: input.threadId,
          userId: ctx.session.user.id, // Ensure user owns the thread
        },
      });
    }),
});
