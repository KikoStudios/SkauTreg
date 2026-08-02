import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { authError, requireCurrentUser, requireTroopManager } from "./lib/auth";

export const create = mutation({
  args: { nonceHash: v.string(), troopId: v.id("troops"), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const { user } = await requireTroopManager(ctx, args.troopId);
    if (!/^[a-f0-9]{64}$/.test(args.nonceHash) || args.expiresAt <= Date.now() || args.expiresAt > Date.now() + 15 * 60_000) {
      authError("VALIDATION_ERROR", "Neplatný OAuth požadavek.");
    }
    await ctx.db.insert("gmail_oauth_states", { ...args, userId: user._id, createdAt: new Date().toISOString() });
    return { ok: true };
  },
});

export const consume = mutation({
  args: { nonceHash: v.string(), troopId: v.id("troops") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    await requireTroopManager(ctx, args.troopId);
    const state = await ctx.db.query("gmail_oauth_states").withIndex("by_nonce_hash", (q) => q.eq("nonceHash", args.nonceHash)).unique();
    if (!state || state.troopId !== args.troopId || state.userId !== user._id || state.consumedAt || state.expiresAt < Date.now()) {
      authError("FORBIDDEN", "OAuth požadavek již není platný.");
    }
    await ctx.db.patch(state._id, { consumedAt: new Date().toISOString() });
    return { ok: true };
  },
});
