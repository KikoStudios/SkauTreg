import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const startAttempt = internalMutation({
  args: {
    draftId: v.id("email_drafts"),
    tripId: v.id("trips"),
    requestedBy: v.id("users"),
    idempotencyKey: v.string(),
    recipientCount: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("email_send_attempts").withIndex("by_idempotency_key", (q) => q.eq("idempotencyKey", args.idempotencyKey)).unique();
    if (existing) return { created: false as const, attempt: existing };
    const id = await ctx.db.insert("email_send_attempts", {
      ...args,
      status: "sending",
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
    });
    return { created: true as const, attempt: await ctx.db.get(id) };
  },
});

export const completeAttempt = internalMutation({
  args: { attemptId: v.id("email_send_attempts"), sentCount: v.number(), failedCount: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.attemptId, {
      status: args.failedCount === 0 ? "sent" : args.sentCount > 0 ? "partial" : "failed",
      sentCount: args.sentCount,
      failedCount: args.failedCount,
      completedAt: new Date().toISOString(),
    });
  },
});
