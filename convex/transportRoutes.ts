import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTripLeader, requireTripViewer } from "./lib/auth";

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripViewer(ctx, args.tripId);
    const routes = await ctx.db
      .query("transport_routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    return routes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  },
});

export const getLatestByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripViewer(ctx, args.tripId);
    const routes = await ctx.db
      .query("transport_routes")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const byDir: Record<string, any> = {};
    for (const r of routes) {
      const dir = r.direction || "unknown";
      const existing = byDir[dir];
      if (!existing) {
        byDir[dir] = r;
        continue;
      }
      if ((existing.updatedAt || existing.createdAt) < (r.updatedAt || r.createdAt)) {
        byDir[dir] = r;
      }
    }

    return {
      outbound: byDir["outbound"] || null,
      return: byDir["return"] || null,
      unknown: byDir["unknown"] || null,
    };
  },
});

export const addFromIdos = mutation({
  args: {
    tripId: v.id("trips"),
    direction: v.optional(v.string()), // "outbound" | "return" | "unknown"
    from: v.optional(v.string()),
    to: v.optional(v.string()),
    date: v.optional(v.string()),
    idosTrip: v.any(),
  },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    const now = new Date().toISOString();
    const idosTrip = args.idosTrip as Record<string, unknown>;
    const departureTime = typeof idosTrip["departureTime"] === "string" ? (idosTrip["departureTime"] as string) : undefined;
    const arrivalTime = typeof idosTrip["arrivalTime"] === "string" ? (idosTrip["arrivalTime"] as string) : undefined;
    const duration = typeof idosTrip["duration"] === "string" ? (idosTrip["duration"] as string) : undefined;
    const transferCount = typeof idosTrip["transferCount"] === "number" ? (idosTrip["transferCount"] as number) : undefined;
    const price = typeof idosTrip["price"] === "string" ? (idosTrip["price"] as string) : undefined;
    const shareLink = typeof idosTrip["shareLink"] === "string" ? (idosTrip["shareLink"] as string) : undefined;

    const routeId = await ctx.db.insert("transport_routes", {
      tripId: args.tripId,
      direction: args.direction || "unknown",
      source: "idos",
      from: args.from,
      to: args.to,
      date: args.date,
      departureTime,
      arrivalTime,
      duration,
      transferCount,
      price,
      shareLink,
      idosTrip,
      createdAt: now,
      updatedAt: now,
    });

    return routeId;
  },
});

export const remove = mutation({
  args: { routeId: v.id("transport_routes") },
  handler: async (ctx, args) => {
    const route = await ctx.db.get(args.routeId);
    if (!route) return;
    await requireTripLeader(ctx, route.tripId);
    const now = new Date().toISOString();

    const tickets = await ctx.db
      .query("transport_tickets")
      .withIndex("by_route", (q) => q.eq("routeId", args.routeId))
      .collect();

    for (const t of tickets) {
      await ctx.db.patch(t._id, { routeId: undefined, updatedAt: now });
    }

    await ctx.db.delete(args.routeId);
  },
});
