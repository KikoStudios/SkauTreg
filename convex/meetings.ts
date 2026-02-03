
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        title: v.string(),
        description: v.optional(v.string()),
        tripId: v.optional(v.id("trips")),
        category: v.optional(v.string()), // "notebook" or "documentation"
    },
    handler: async (ctx, args) => {
        // Check if user has permission
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }

        const meetingId = await ctx.db.insert("meetings", {
            troopId: args.troopId,
            tripId: args.tripId,
            title: args.title,
            description: args.description,
            category: args.category || "notebook",
        });

        // Create a default first page
        await ctx.db.insert("meeting_pages", {
            meetingId: meetingId,
            title: "Home",
            order: 0,
        });

        return meetingId;
    },
});

export const list = query({
    args: {
        troopId: v.id("troops"),
    },
    handler: async (ctx, args) => {
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        return meetings;
    }
});

export const listByTrip = query({
    args: {
        tripId: v.id("trips"),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("meetings")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();
    }
});

export const get = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.meetingId);
    }
});



export const update = mutation({
    args: {
        meetingId: v.id("meetings"),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        tripId: v.optional(v.id("trips")),
        category: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { meetingId, ...updates } = args;
        // Filter out undefined values to be extra safe
        const patch: any = {};
        if (updates.title !== undefined) patch.title = updates.title;
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.tripId !== undefined) patch.tripId = updates.tripId;
        if (updates.category !== undefined) patch.category = updates.category;
        
        await ctx.db.patch(meetingId, patch);
    }
});

export const updateStatus = mutation({
    args: {
        meetingId: v.id("meetings"),
        status: v.string(), // "prepared", "ongoing", "past"
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.meetingId, { status: args.status });
    }
});

export const join = mutation({
    args: {
        meetingId: v.id("meetings"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            // throw new Error("Unauthenticated");
            // Allow anonymous join? Use session ID?
            return null; // or handle
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) return null;

        const existing = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        if (!existing) {
            await ctx.db.insert("meeting_participants", {
                meetingId: args.meetingId,
                userId: user._id,
                joinedAt: new Date().toISOString(),
                firstname: user.name?.split(" ")[0],
                lastname: user.name?.split(" ").slice(1).join(" "),
            });
        }
    }
});

export const getParticipants = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const participants = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();

        return Promise.all(participants.map(async (p) => {
            const user = await ctx.db.get(p.userId);
            return { ...p, user };
        }));
    }
});

export const deleteMeeting = mutation({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        // Delete all pages
        const pages = await ctx.db
            .query("meeting_pages")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();

        for (const page of pages) {
            await ctx.db.delete(page._id);
        }

        // Delete all files and their annotations
        const files = await ctx.db
            .query("meeting_files")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();

        for (const file of files) {
            // Delete file from storage
            await ctx.storage.delete(file.storageId);

            // Delete annotations for this file
            const annotations = await ctx.db
                .query("meeting_annotations")
                .withIndex("by_file", (q) => q.eq("fileId", file._id))
                .collect();

            for (const annotation of annotations) {
                await ctx.db.delete(annotation._id);
            }

            await ctx.db.delete(file._id);
        }

        // Delete all participants
        const participants = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();

        for (const participant of participants) {
            await ctx.db.delete(participant._id);
        }

        // Finally, delete the meeting
        await ctx.db.delete(args.meetingId);
    }
});
