import { v } from "convex/values";
import { query } from "./_generated/server";

function isExpired(expiresAt: string | undefined) {
  if (!expiresAt) return false;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiresAt)) {
    const todayInPrague = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Prague",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return todayInPrague > expiresAt;
  }
  const timestamp = Date.parse(expiresAt);
  return !Number.isFinite(timestamp) || timestamp < Date.now();
}

export const getByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const ticket = await ctx.db
      .query("transport_tickets")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();

    if (!ticket) return null;
    if (!ticket.shareEnabled || isExpired(ticket.shareExpiresAt)) return null;

    const url = await ctx.storage.getUrl(ticket.storageId);
    return {
      _id: ticket._id,
      name: ticket.name,
      contentType: ticket.contentType,
      shareSlug: ticket.shareSlug,
      parsed: ticket.parsed,
      url,
      updatedAt: ticket.updatedAt,
    };
  },
});

export const getBundleByShareSlug = query({
  args: { shareSlug: v.string() },
  handler: async (ctx, args) => {
    const seedTicket = await ctx.db
      .query("transport_tickets")
      .withIndex("by_share_slug", (q) => q.eq("shareSlug", args.shareSlug))
      .first();

    if (!seedTicket?.shareEnabled || isExpired(seedTicket.shareExpiresAt)) return null;

    const routeTickets = seedTicket.routeId
      ? await ctx.db
          .query("transport_tickets")
          .withIndex("by_route", (q) => q.eq("routeId", seedTicket.routeId))
          .collect()
      : [seedTicket];

    const publicTickets = routeTickets
      .filter((ticket) => ticket.shareEnabled === true && !isExpired(ticket.shareExpiresAt))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const [trip, route, tickets] = await Promise.all([
      ctx.db.get(seedTicket.tripId),
      seedTicket.routeId ? ctx.db.get(seedTicket.routeId) : Promise.resolve(null),
      Promise.all(
        publicTickets.map(async (ticket) => ({
          _id: ticket._id,
          name: ticket.name,
          contentType: ticket.contentType,
          parsed: ticket.parsed,
          url: await ctx.storage.getUrl(ticket.storageId),
          updatedAt: ticket.updatedAt,
        }))
      ),
    ]);

    const idosTrip = route?.idosTrip && typeof route.idosTrip === "object"
      ? route.idosTrip as { segments?: Array<{ departureStation?: string; arrivalStation?: string }> }
      : null;
    const firstSegment = idosTrip?.segments?.[0];
    const lastSegment = idosTrip?.segments?.[idosTrip.segments.length - 1];

    return {
      shareSlug: seedTicket.shareSlug,
      trip: trip ? { name: trip.name, location: trip.location, startDate: trip.startDate, endDate: trip.endDate } : null,
      route: route
        ? {
            direction: route.direction,
            from: route.from || firstSegment?.departureStation,
            to: route.to || lastSegment?.arrivalStation,
            date: route.date,
          }
        : null,
      tickets,
    };
  },
});

