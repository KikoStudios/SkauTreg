import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        nickname: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        guardianName: v.optional(v.string()),
        guardianPhone: v.optional(v.string()),
        guardianEmail: v.optional(v.string()),
        guardian2Name: v.optional(v.string()),
        guardian2Phone: v.optional(v.string()),
        guardian2Email: v.optional(v.string()),
        address: v.optional(v.string()),
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
            guardianName: args.guardianName,
            guardianPhone: args.guardianPhone,
            guardianEmail: args.guardianEmail,
            guardian2Name: args.guardian2Name,
            guardian2Phone: args.guardian2Phone,
            guardian2Email: args.guardian2Email,
            address: args.address,
        });

        // Automatically create participation entries for all existing trips in this troop
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        for (const trip of trips) {
            const accessKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await ctx.db.insert("participations", {
                tripId: trip._id,
                memberId: memberId,
                status: "pending",
                accessKey: accessKey,
                responses: {},
            });
        }

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
        guardianName: v.optional(v.string()),
        guardianPhone: v.optional(v.string()),
        guardianEmail: v.optional(v.string()),
        guardian2Name: v.optional(v.string()),
        guardian2Phone: v.optional(v.string()),
        guardian2Email: v.optional(v.string()),
        address: v.optional(v.string()),
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

export const getAllUserMembers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) return [];

        // Get all troops I am part of
        const ownedTroops = await ctx.db
            .query("troops")
            .filter((q) => q.eq(q.field("ownerId"), user._id))
            .collect();

        const leaderships = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", user._id))
            .collect();

        const leadingTroops = await Promise.all(
            leaderships.map(l => ctx.db.get(l.troopId))
        );

        const allTroops = [...ownedTroops, ...leadingTroops]
            .filter((t): t is NonNullable<typeof t> => t !== null);

        const uniqueTroops = Array.from(new Map(allTroops.map(t => [t._id, t])).values());
        const troopIds = uniqueTroops.map(t => t._id);

        // Get members for these troops
        const members = await Promise.all(
            troopIds.map(async (troopId) => {
                const troopMembers = await ctx.db
                    .query("members")
                    .withIndex("by_troop", (q) => q.eq("troopId", troopId))
                    .collect();

                const troop = uniqueTroops.find(t => t._id === troopId);
                return troopMembers.map(member => ({
                    ...member,
                    troopName: troop?.name || "Neznámý oddíl"
                }));
            })
        );

        return members.flat();
    }
});
