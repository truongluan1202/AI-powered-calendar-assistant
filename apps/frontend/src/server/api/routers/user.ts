import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Update user profile
  updateProfile: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().min(1, "Name is required"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Update user in database
      const updatedUser = await ctx.db.user.update({
        where: { id: input.userId },
        data: {
          name: input.name,
        },
      });

      return updatedUser;
    }),

  // Delete user account
  deleteAccount: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Delete all user data
      await ctx.db.chatMessage.deleteMany({
        where: { userId: input.userId },
      });

      await ctx.db.chatThread.deleteMany({
        where: { userId: input.userId },
      });

      await ctx.db.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
    }),
});
