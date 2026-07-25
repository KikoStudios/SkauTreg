import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCurrentUser, requireMeetingViewer } from "./lib/auth";

// Heartbeat to mark user as active in a meeting
export const heartbeat = mutation({
    args: {
        meetingId: v.id("meetings"),
    },
    handler: async (ctx, args) => {
        await requireMeetingViewer(ctx, args.meetingId);
        const user = await requireCurrentUser(ctx);

        // Find existing presence record
        const existing = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        const now = new Date().toISOString();

        if (existing) {
            // Update lastSeen
            await ctx.db.patch(existing._id, {
                leftAt: undefined, // Mark as active again
            });
        } else {
            // Create new presence
            await ctx.db.insert("meeting_participants", {
                meetingId: args.meetingId,
                userId: user._id,
                firstname: user.name?.split(" ")[0],
                lastname: user.name?.split(" ").slice(1).join(" "),
                joinedAt: now,
            });
        }

        return user._id;
    },
});

// Get live participants (active in last 30 seconds)
export const getActiveParticipants = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        await requireMeetingViewer(ctx, args.meetingId);
        const participants = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .filter((q) => q.eq(q.field("leftAt"), undefined))
            .collect();

        // Enrich with user data
        return Promise.all(
            participants.map(async (p) => {
                const user = await ctx.db.get(p.userId);
                return { ...p, user };
            })
        );
    },
});

// Mark user as left (called on unmount)
export const leave = mutation({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        await requireMeetingViewer(ctx, args.meetingId);
        const user = await requireCurrentUser(ctx);

        const existing = await ctx.db
            .query("meeting_participants")
            .withIndex("by_meeting", (q) => q.eq("meetingId", args.meetingId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        if (existing && !existing.leftAt) {
            await ctx.db.patch(existing._id, {
                leftAt: new Date().toISOString(),
            });
        }
    },
});
