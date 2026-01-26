import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Public query: No auth required, identified by unique accessKey
export const getByAccessKey = query({
    args: { accessKey: v.string() },
    handler: async (ctx, args) => {
        // 1. Find participation record by accessKey
        const participation = await ctx.db
            .query("participations")
            .withIndex("by_access_key", (q) => q.eq("accessKey", args.accessKey))
            .unique();

        if (!participation) {
            return null; // Invalid link
        }

        // 2. Fetch Trip details
        const trip = await ctx.db.get(participation.tripId);
        if (!trip) {
            return null; // Should not happen if referential integrity is maintained
        }

        // 3. Fetch Member details (to show "Hello [Name]" on the page)
        const member = await ctx.db.get(participation.memberId);
        if (!member) {
            return null;
        }

        // Return only public-safe info
        return {
            tripName: trip.name,
            tripDescription: trip.description,
            tripLocation: trip.location,
            tripStartDate: trip.startDate,
            tripEndDate: trip.endDate,
            customFields: trip.customFields,
            memberName: member.name, // Personalization
            memberNickname: member.nickname,
            currentStatus: participation.status,
            currentResponses: participation.responses,
        };
    },
});

// Public mutation: Submit RSVP
export const submit = mutation({
    args: {
        accessKey: v.string(),
        status: v.string(), // "attending" | "not_attending"
        responses: v.optional(v.any()), // Form data matching customFields
    },
    handler: async (ctx, args) => {
        // 1. Verify availability
        const participation = await ctx.db
            .query("participations")
            .withIndex("by_access_key", (q) => q.eq("accessKey", args.accessKey))
            .unique();

        if (!participation) {
            throw new Error("Invalid access key");
        }

        // 2. Update status and responses
        await ctx.db.patch(participation._id, {
            status: args.status,
            responses: args.responses,
        });

        return { success: true };
    },
});
