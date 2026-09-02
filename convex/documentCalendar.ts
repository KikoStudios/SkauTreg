import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireTroopViewer } from "./lib/auth";

export const listRange = query({
  args: { troopId: v.id("troops"), from: v.number(), to: v.number() },
  handler: async (ctx, { troopId, from, to }) => {
    await requireTroopViewer(ctx, troopId);
    const [setups, tasks, projected] = await Promise.all([
      ctx.db
        .query("schuzka_setups")
        .withIndex("by_troop_start", (q) => q.eq("troopId", troopId).gte("scheduledStartAt", from).lt("scheduledStartAt", to))
        .collect(),
      ctx.db
        .query("document_tasks")
        .withIndex("by_troop_open_due", (q) => q.eq("troopId", troopId).eq("isOpen", true).gte("dueAt", from).lt("dueAt", to))
        .collect(),
      ctx.db
        .query("document_calendar_items")
        .withIndex("by_troop_start", (q) => q.eq("troopId", troopId).gte("startsAt", from).lt("startsAt", to))
        .collect(),
    ]);

    const meetings = await Promise.all(setups.map(async (setup) => {
      const document = await ctx.db.get(setup.documentId);
      return document ? {
        id: `schuzka:${setup._id}`,
        type: "schuzka",
        title: document.title,
        startsAt: setup.scheduledStartAt,
        endsAt: setup.scheduledEndAt,
        href: `/troop/${troopId}/documents/${document._id}`,
      } : null;
    }));

    return [
      ...meetings.filter((item) => item !== null),
      ...tasks.map((task) => ({
        id: `task:${task._id}`, type: "task", title: task.title,
        startsAt: task.dueAt!, endsAt: undefined, href: `/troop/${troopId}/documents/${task.documentId}?task=${task._id}`,
      })),
      ...projected.map((item) => ({
        id: `projection:${item._id}`, type: item.sourceType, title: item.title,
        startsAt: item.startsAt, endsAt: item.endsAt, href: item.href,
      })),
    ].sort((a, b) => a.startsAt - b.startsAt);
  },
});
