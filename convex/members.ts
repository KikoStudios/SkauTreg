import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        nickname: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        parentName: v.string(),
        parentPhone: v.string(),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // In a real app, verify the user has access to this troop
        // const identity = await ctx.auth.getUserIdentity();
        // ... check if user is a leader of args.troopId

        const memberId = await ctx.db.insert("members", {
            troopId: args.troopId,
            name: args.name,
            nickname: args.nickname,
            birthDate: args.birthDate,
            parentName: args.parentName,
            parentPhone: args.parentPhone,
            email: args.email,
        });

        return memberId;
    },
});

export const list = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        // Again, verify access rights here

        const members = await ctx.db
            .query("members")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        return members;
    },
});

export const update = mutation({
    args: {
        id: v.id("members"),
        name: v.optional(v.string()),
        nickname: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        parentName: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...fields } = args;
        await ctx.db.patch(id, fields);
    },
});

export const remove = mutation({
    args: { id: v.id("members") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
