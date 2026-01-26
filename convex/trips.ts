import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        description: v.string(),
        location: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),

        formType: v.optional(v.string()), // "registration" or "apology"
        customFields: v.optional(v.array(v.object({
            label: v.string(),
            type: v.string(),
            required: v.boolean(),
            info: v.optional(v.string()),
            placeholder: v.optional(v.string()),
            options: v.optional(v.array(v.string()))
        }))),
    },
    handler: async (ctx, args) => {
        // 1. Create the Trip
        const tripId = await ctx.db.insert("trips", {
            troopId: args.troopId,
            name: args.name,
            description: args.description,
            location: args.location,
            startDate: args.startDate,
            endDate: args.endDate,
            formType: args.formType,
            customFields: args.customFields,
        });

        // 2. Automatically create Participation records for ALL current members of the troop
        const members = await ctx.db
            .query("members")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        for (const member of members) {
            const accessKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await ctx.db.insert("participations", {
                tripId,
                memberId: member._id,
                status: "pending",
                accessKey: accessKey,
                responses: {},
            });
        }

        return tripId;
    },
});

export const update = mutation({
    args: {
        id: v.id("trips"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        location: v.optional(v.string()),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        formType: v.optional(v.string()),
        customFields: v.optional(v.array(v.object({
            label: v.string(),
            type: v.string(),
            required: v.boolean(),
            info: v.optional(v.string()),
            placeholder: v.optional(v.string()),
            options: v.optional(v.array(v.string()))
        }))),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("trips") },
    handler: async (ctx, args) => {
        // Delete participations first
        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.id))
            .collect();

        for (const p of participations) {
            await ctx.db.delete(p._id);
        }

        await ctx.db.delete(args.id);
    },
});

export const getDashboard = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) return null;

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const participantsWithDetails = await Promise.all(
            participations.map(async (p) => {
                const member = await ctx.db.get(p.memberId);
                return {
                    ...p,
                    member,
                };
            })
        );

        return {
            trip,
            participants: participantsWithDetails,
        };
    },
});

export const list = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();
        return trips;
    },
});

export const getAllUserTrips = query({
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

        // 1. Get all troops I am part of
        // A. Owned
        const ownedTroops = await ctx.db
            .query("troops")
            .filter((q) => q.eq(q.field("ownerId"), user._id))
            .collect();

        // B. Leader of
        const leaderships = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", user._id))
            .collect();

        const leadingTroops = await Promise.all(
            leaderships.map(l => ctx.db.get(l.troopId))
        );

        // Deduplicate troops
        const allTroops = [...ownedTroops, ...leadingTroops]
            .filter((t): t is NonNullable<typeof t> => t !== null);

        const uniqueTroops = Array.from(new Map(allTroops.map(t => [t._id, t])).values());
        const troopIds = uniqueTroops.map(t => t._id);

        // 2. Get trips for these troops
        // Convex doesn't have "IN" query easily, so we might have to parallel fetch
        const trips = await Promise.all(
            troopIds.map(async (troopId) => {
                const troopTrips = await ctx.db
                    .query("trips")
                    .withIndex("by_troop", (q) => q.eq("troopId", troopId))
                    .collect();

                // Add troop info for color coding
                const troop = uniqueTroops.find(t => t._id === troopId);
                return troopTrips.map(trip => ({
                    ...trip,
                    troopName: troop?.name,
                    troopColor: troop?.accentColor || "#ccc"
                }));
            })
        );

        return trips.flat();
    }
});
