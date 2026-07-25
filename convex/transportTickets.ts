import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function getRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  const c = (globalThis as unknown as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues) {
    c.getRandomValues(bytes);
    return bytes;
  }

  // Fallback (should not happen in Convex runtime): not cryptographically secure.
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
}

function generateShareSlug(): string {
  const bytes = getRandomBytes(8);
  const chars = Array.from(bytes, (b) => SHARE_ALPHABET[b % SHARE_ALPHABET.length]);
  return `${chars.slice(0, 4).join("")}-${chars.slice(4, 8).join("")}`;
}

async function generateUniqueShareSlug(ctx: any): Promise<string> {
  for (let i = 0; i < 15; i++) {
    const slug = generateShareSlug();
    const existing = await ctx.db
      .query("transport_tickets")
      .withIndex("by_share_slug", (q: any) => q.eq("shareSlug", slug))
      .first();
    if (!existing) return slug;
  }
  throw new Error("Failed to generate unique share slug");
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("transport_tickets")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    return await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f.storageId);
        return { ...f, url };
      })
    );
  },
});

export const listByRoute = query({
  args: { routeId: v.id("transport_routes") },
  handler: async (ctx, args) => {
    const files = await ctx.db
      .query("transport_tickets")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();

    return await Promise.all(
      files.map(async (f) => {
        const url = await ctx.storage.getUrl(f.storageId);
        return { ...f, url };
      })
    );
  },
});

export const upload = mutation({
  args: {
    tripId: v.id("trips"),
    routeId: v.optional(v.id("transport_routes")),
    storageId: v.string(),
    name: v.string(),
    contentType: v.string(),
    parsed: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    // Sharing is enabled by default so the QR is immediately available.
    const shareSlug = await generateUniqueShareSlug(ctx);

    return await ctx.db.insert("transport_tickets", {
      tripId: args.tripId,
      routeId: args.routeId,
      storageId: args.storageId,
      name: args.name,
      contentType: args.contentType,
      parsed: args.parsed,
      shareEnabled: true,
      shareSlug,
      shareUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const enableShare = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const shareSlug = ticket.shareSlug || (await generateUniqueShareSlug(ctx));
    await ctx.db.patch(args.ticketId, {
      shareEnabled: true,
      shareSlug,
      shareUpdatedAt: now,
      updatedAt: now,
    });
    return { shareSlug };
  },
});

export const disableShare = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.patch(args.ticketId, { shareEnabled: false, updatedAt: now });
    return { ok: true };
  },
});

export const regenerateShareSlug = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    const shareSlug = await generateUniqueShareSlug(ctx);
    await ctx.db.patch(args.ticketId, {
      shareEnabled: true,
      shareSlug,
      shareUpdatedAt: now,
      updatedAt: now,
    });
    return { shareSlug };
  },
});

export const updatePriceOverview = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    kidUnitCzk: v.optional(v.number()),
    adultUnitCzk: v.optional(v.number()),
    studentUnitCzk: v.optional(v.number()),
    kidCount: v.optional(v.number()),
    adultCount: v.optional(v.number()),
    studentCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");

    await ctx.db.patch(args.ticketId, {
      priceOverview: {
        kidUnitCzk: args.kidUnitCzk,
        adultUnitCzk: args.adultUnitCzk,
        studentUnitCzk: args.studentUnitCzk,
        kidCount: args.kidCount,
        adultCount: args.adultCount,
        studentCount: args.studentCount,
      },
      updatedAt: now,
    });
    return { ok: true };
  },
});

export const updateParsed = mutation({
  args: {
    ticketId: v.id("transport_tickets"),
    parsed: v.any(),
  },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) throw new Error("Ticket not found");
    await ctx.db.patch(args.ticketId, {
      parsed: args.parsed,
      updatedAt: new Date().toISOString(),
    });
    return { ok: true };
  },
});

export const remove = mutation({
  args: { ticketId: v.id("transport_tickets") },
  handler: async (ctx, args) => {
    const ticket = await ctx.db.get(args.ticketId);
    if (!ticket) return;
    await ctx.storage.delete(ticket.storageId);
    await ctx.db.delete(args.ticketId);
  },
});
