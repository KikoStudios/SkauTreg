import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByTroop = query({
  args: { troopId: v.id("troops") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("leader_presets")
      .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
      .collect();
  },
});

export const create = mutation({
  args: {
    troopId: v.id("troops"),
    name: v.string(),
    role: v.string(),
    age: v.optional(v.number()),
    benefit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    return await ctx.db.insert("leader_presets", {
      troopId: args.troopId,
      name: args.name.trim(),
      role: args.role,
      age: args.age,
      benefit: args.benefit,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = mutation({
  args: { presetId: v.id("leader_presets") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.presetId);
  },
});
