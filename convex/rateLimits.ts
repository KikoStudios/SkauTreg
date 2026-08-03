import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authError, requireCurrentUser } from "./lib/auth";

export const consume = mutation({
  args: {
    operation: v.union(v.literal("ticket_parse"), v.literal("email_send"), v.literal("integration_test")),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const limits = {
      ticket_parse: { count: 10, windowMs: 60_000 },
      email_send: { count: 3, windowMs: 60_000 },
      integration_test: { count: 5, windowMs: 60_000 },
    } as const;
    const limit = limits[args.operation];
    const key = `${args.operation}:${user._id}`;
    const now = Date.now();
    const existing = await ctx.db
      .query("rate_limits")
      .withIndex("by_key", (index) => index.eq("key", key))
      .unique();
    if (!existing || now - existing.windowStartedAt >= limit.windowMs) {
      if (existing) {
        await ctx.db.patch(existing._id, { windowStartedAt: now, count: 1 });
      } else {
        await ctx.db.insert("rate_limits", { key, windowStartedAt: now, count: 1 });
      }
      return { remaining: limit.count - 1 };
    }
    if (existing.count >= limit.count) {
      authError("RATE_LIMITED", "Příliš mnoho požadavků. Zkuste to znovu za chvíli.");
    }
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
    return { remaining: limit.count - existing.count - 1 };
  },
});
