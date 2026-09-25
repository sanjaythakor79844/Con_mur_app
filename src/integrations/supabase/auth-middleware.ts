import { createMiddleware } from "@tanstack/react-start";

export const requireSupabaseAuth = createMiddleware().server(async ({ next }) => {
  return next({
    context: {
      supabase: {} as any,
      userId: "dummy-user-id",
    },
  });
});
