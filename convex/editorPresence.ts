// convex/editorPresence.ts
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Update user's cursor position in the editor
export const updateCursor = mutation({
    args: {
        pageId: v.id("meeting_pages"),
        position: v.optional(v.number()), // null when cursor is not in editor
        selection: v.optional(v.object({
            from: v.number(),
            to: v.number(),
        })),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) return null;

        // Find existing cursor record
        const existing = await ctx.db
            .query("editor_cursors")
            .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        const now = Date.now();

        if (existing) {
            // Update cursor position
            await ctx.db.patch(existing._id, {
                position: args.position,
                selection: args.selection,
                lastUpdate: now,
            });
        } else {
            // Create new cursor record
            await ctx.db.insert("editor_cursors", {
                pageId: args.pageId,
                userId: user._id,
                position: args.position,
                selection: args.selection,
                lastUpdate: now,
            });
        }

        return user._id;
    },
});

// Get active cursors for a page (updated in last 5 seconds)
export const getActiveCursors = query({
    args: { pageId: v.id("meeting_pages") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const currentUser = identity
            ? await ctx.db
                  .query("users")
                  .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
                  .first()
            : null;

        const fiveSecondsAgo = Date.now() - 5000;

        const cursors = await ctx.db
            .query("editor_cursors")
            .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
            .filter((q) => q.gte(q.field("lastUpdate"), fiveSecondsAgo))
            .collect();

        // Enrich with user data and filter out current user
        const enriched = await Promise.all(
            cursors
                .filter((c) => !currentUser || c.userId !== currentUser._id)
                .map(async (c) => {
                    const user = await ctx.db.get(c.userId);
                    return {
                        ...c,
                        userName: user?.name || "Anonymous",
                        userImage: user?.image,
                    };
                })
        );

        return enriched;
    },
});

// Clean up cursor when user leaves
export const removeCursor = mutation({
    args: { pageId: v.id("meeting_pages") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) return;

        const existing = await ctx.db
            .query("editor_cursors")
            .withIndex("by_page", (q) => q.eq("pageId", args.pageId))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});
