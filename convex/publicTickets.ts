import { v } from "convex/values";
import { query } from "./_generated/server";

export const getByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("transport_tickets")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();

    if (!ticket) return null;
    if (!ticket.shareEnabled) return null;

    const url = await ctx.storage.getUrl(ticket.storageId);
    return {
      _id: ticket._id,
      name: ticket.name,
      contentType: ticket.contentType,
      shareSlug: ticket.shareSlug,
      url,
      updatedAt: ticket.updatedAt,
    };
  },
});

