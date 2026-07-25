import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { generateSecureToken } from "../lib/tokens";

const PRAGUE_TIME_ZONE = "Europe/Prague";
const FALLBACK_GRACE_MS = 14 * 24 * 60 * 60 * 1000;

function timeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return representedUtc - date.getTime();
}

function endOfPragueDayIso(dateText: string, now: number) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateText);
  if (!match) return new Date(now + FALLBACK_GRACE_MS).toISOString();

  const localWallTime = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
  const firstGuess = new Date(localWallTime);
  const offset = timeZoneOffsetMs(firstGuess, PRAGUE_TIME_ZONE);
  const cutoff = localWallTime - offset;
  return new Date(cutoff <= now ? now - 1 : cutoff).toISOString();
}

export const backfillParticipationCapabilities = internalMutation({
  args: {
    cursor: v.union(v.string(), v.null()),
    numItems: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const page = await ctx.db.query("participations").paginate({
      cursor: args.cursor,
      numItems: Math.min(Math.max(args.numItems ?? 100, 1), 250),
    });
    const now = Date.now();
    let updated = 0;

    for (const participation of page.page) {
      if (participation.secureAccessKey) continue;
      const trip = await ctx.db.get(participation.tripId);
      await ctx.db.patch(participation._id, {
        secureAccessKey: generateSecureToken(),
        legacyAccessExpiresAt: trip?.startDate
          ? endOfPragueDayIso(trip.startDate, now)
          : new Date(now + FALLBACK_GRACE_MS).toISOString(),
      });
      updated += 1;
    }

    return {
      updated,
      continueCursor: page.continueCursor,
      isDone: page.isDone,
    };
  },
});
