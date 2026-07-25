
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
    requireMeetingEditor,
    requireMeetingViewer,
    requirePageEditor,
    requirePageViewer,
    requireTripViewer,
} from "./lib/auth";

export const getByMeeting = query({
    args: {
        meetingId: v.id("meetings"),
    },
    handler: async (ctx, args) => {
        await requireMeetingViewer(ctx, args.meetingId);
        return await ctx.db
            .query("meeting_pages")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();
    },
});

export const getPagesByTrip = query({
    args: {
        tripId: v.id("trips"),
    },
    handler: async (ctx, args) => {
        await requireTripViewer(ctx, args.tripId);
        // 1. Get all meetings for this trip
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        // 2. Get all pages for these meetings
        const allPages = [];
        for (const meeting of meetings) {
            const pages = await ctx.db
                .query("meeting_pages")
                .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
                .collect();
            
            // Annotate pages with meeting info for grouping
            allPages.push(...pages.map(p => ({
                ...p,
                meetingTitle: meeting.title,
                meetingCategory: meeting.category
            })));
        }

        return allPages;
    }
});

export const create = mutation({
    args: {
        meetingId: v.id("meetings"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        await requireMeetingEditor(ctx, args.meetingId);
        // Determine order
        const existing = await ctx.db
            .query("meeting_pages")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .collect();

        const maxOrder = existing.reduce((max, p) => Math.max(max, p.order), -1);

        return await ctx.db.insert("meeting_pages", {
            meetingId: args.meetingId,
            title: args.title,
            order: maxOrder + 1,
        });
    },
});

export const remove = mutation({
    args: { pageId: v.id("meeting_pages") },
    handler: async (ctx, args) => {
        await requirePageEditor(ctx, args.pageId);
        await ctx.db.delete(args.pageId);
    }
});

// Update title, etc. (Content is synced via prosemirror-sync)
export const update = mutation({
    args: {
        pageId: v.id("meeting_pages"),
        title: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        await requirePageEditor(ctx, args.pageId);
        if (args.title !== undefined) {
            await ctx.db.patch(args.pageId, { title: args.title });
        }
    }
});

export const updateTitle = mutation({
    args: {
        pageId: v.id("meeting_pages"),
        title: v.string()
    },
    handler: async (ctx, args) => {
        await requirePageEditor(ctx, args.pageId);
        await ctx.db.patch(args.pageId, { title: args.title });
    }
});

export const get = query({
    args: {
        pageId: v.id("meeting_pages"),
    },
    handler: async (ctx, args) => {
        const { page } = await requirePageViewer(ctx, args.pageId);
        return page;
    },
});
