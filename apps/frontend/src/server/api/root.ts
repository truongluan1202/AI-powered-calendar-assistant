import { chatRouter } from "~/server/api/routers/chat";
import { aiRouter } from "~/server/api/routers/ai";
import { userRouter } from "~/server/api/routers/user";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * Main tRPC router combining all sub-routers
 */
export const appRouter = createTRPCRouter({
  chat: chatRouter,
  ai: aiRouter,
  user: userRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
