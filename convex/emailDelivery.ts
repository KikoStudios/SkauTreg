import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";
import { authError, requireTripLeader, requireTroopManager } from "./lib/auth";

export const startAttempt = internalMutation({
  args: {
    draftId: v.id("email_drafts"),
    tripId: v.id("trips"),
    requestedBy: v.id("users"),
    idempotencyKey: v.string(),
    recipientCount: v.number(),
    retryOfAttemptId: v.optional(v.id("email_send_attempts")),
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

export const initializeDeliveries = internalMutation({
  args: {
    attemptId: v.id("email_send_attempts"),
    targets: v.array(v.object({
      memberId: v.id("members"),
      contactKind: v.union(v.literal("member"), v.literal("guardian"), v.literal("guardian2")),
    })),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) authError("NOT_FOUND", "Pokus o odeslání nebyl nalezen.");
    const existing = await ctx.db.query("email_deliveries").withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId)).collect();
    if (existing.length > 0) return { created: 0 };
    for (const target of args.targets) {
      await ctx.db.insert("email_deliveries", {
        attemptId: args.attemptId,
        memberId: target.memberId,
        contactKind: target.contactKind,
        status: "pending",
      });
    }
    return { created: args.targets.length };
  },
});

export const recordDelivery = internalMutation({
  args: {
    attemptId: v.id("email_send_attempts"),
    memberId: v.id("members"),
    contactKind: v.union(v.literal("member"), v.literal("guardian"), v.literal("guardian2")),
    status: v.union(v.literal("sent"), v.literal("failed"), v.literal("skipped")),
    providerMessageId: v.optional(v.string()),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const delivery = await ctx.db.query("email_deliveries")
      .withIndex("by_attempt_member_contact", (q) => q.eq("attemptId", args.attemptId).eq("memberId", args.memberId).eq("contactKind", args.contactKind))
      .unique();
    if (!delivery) authError("NOT_FOUND", "Záznam doručení nebyl nalezen.");
    await ctx.db.patch(delivery._id, {
      status: args.status,
      providerMessageId: args.providerMessageId,
      errorCode: args.errorCode,
      sentAt: args.status === "sent" ? new Date().toISOString() : undefined,
    });
  },
});

export const getRetryTargets = internalQuery({
  args: { attemptId: v.id("email_send_attempts"), draftId: v.id("email_drafts") },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.draftId !== args.draftId) authError("NOT_FOUND", "Předchozí pokus nebyl nalezen.");
    const draft = await ctx.db.get(args.draftId);
    if (!draft) authError("NOT_FOUND", "Koncept nebyl nalezen.");
    const { troop } = await requireTripLeader(ctx, draft.tripId);
    await requireTroopManager(ctx, troop._id);
    const deliveries = await ctx.db.query("email_deliveries").withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId)).collect();
    return deliveries
      .filter((delivery) => delivery.status === "failed")
      .map((delivery) => ({ memberId: delivery.memberId, contactKind: delivery.contactKind }));
  },
});

export const listByDraft = query({
  args: { draftId: v.id("email_drafts") },
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);
    if (!draft) authError("NOT_FOUND", "Koncept nebyl nalezen.");
    const { troop } = await requireTripLeader(ctx, draft.tripId);
    await requireTroopManager(ctx, troop._id);
    const attempts = await ctx.db.query("email_send_attempts").withIndex("by_draft", (q) => q.eq("draftId", args.draftId)).collect();
    return attempts.map((attempt) => ({
      _id: attempt._id,
      retryOfAttemptId: attempt.retryOfAttemptId,
      status: attempt.status,
      recipientCount: attempt.recipientCount,
      sentCount: attempt.sentCount,
      failedCount: attempt.failedCount,
      createdAt: attempt.createdAt,
      completedAt: attempt.completedAt,
    })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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
