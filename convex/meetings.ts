
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    authError,
    requireCurrentUser,
    requireMeetingEditor,
    requireMeetingViewer,
    requireTripEditor,
    requireTripViewer,
    requireTroopEditor,
    requireTroopViewer,
} from "./lib/auth";

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        title: v.string(),
        description: v.optional(v.string()),
        tripId: v.optional(v.id("trips")),
        category: v.optional(v.string()), // "notebook" or "documentation"
    },
    handler: async (ctx, args) => {
        if (args.tripId) {
            const { trip } = await requireTripEditor(ctx, args.tripId);
            if (trip.troopId !== args.troopId) {
                authError("VALIDATION_ERROR", "Výprava nepatří do vybraného oddílu.");
            }
        } else {
            await requireTroopEditor(ctx, args.troopId);
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
        await requireTroopViewer(ctx, args.troopId);
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
        await requireTripViewer(ctx, args.tripId);
        return await ctx.db
            .query("meetings")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();
    }
});

export const get = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const { meeting } = await requireMeetingViewer(ctx, args.meetingId);
        return meeting;
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
        const { meeting } = await requireMeetingEditor(ctx, args.meetingId);
        if (args.tripId) {
            const { trip } = await requireTripEditor(ctx, args.tripId);
            if (trip.troopId !== meeting.troopId) {
                authError("VALIDATION_ERROR", "Výprava nepatří do stejného oddílu.");
            }
        }
        const { meetingId, ...updates } = args;
        await ctx.db.patch(meetingId, updates);
    }
});

export const updateStatus = mutation({
    args: {
        meetingId: v.id("meetings"),
        status: v.string(), // "prepared", "ongoing", "past"
    },
    handler: async (ctx, args) => {
        await requireMeetingEditor(ctx, args.meetingId);
        await ctx.db.patch(args.meetingId, { status: args.status });
    }
});

export const join = mutation({
    args: {
        meetingId: v.id("meetings"),
    },
    handler: async (ctx, args) => {
        await requireMeetingViewer(ctx, args.meetingId);
        const user = await requireCurrentUser(ctx);

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
        await requireMeetingViewer(ctx, args.meetingId);
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
        await requireMeetingEditor(ctx, args.meetingId);
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
