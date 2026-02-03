
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByMeeting = query({
    args: {
        meetingId: v.id("meetings"),
    },
    handler: async (ctx, args) => {
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
        const update: any = {};
        if (args.title) update.title = args.title;
        await ctx.db.patch(args.pageId, update);
    }
});

export const updateTitle = mutation({
    args: {
        pageId: v.id("meeting_pages"),
        title: v.string()
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.pageId, { title: args.title });
    }
});

export const updateContent = mutation({
    args: {
        pageId: v.id("meeting_pages"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        // For now, just log (schema doesn't have content field yet)
        // You can add content field to schema if you want to persist it
        console.log(`Saving content for page ${args.pageId}: ${args.content.substring(0, 50)}...`);
        // TODO: Add content field to meeting_pages schema
        // await ctx.db.patch(args.pageId, { content: args.content });
    },
});

export const get = query({
    args: {
        pageId: v.id("meeting_pages"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.pageId);
    },
});
