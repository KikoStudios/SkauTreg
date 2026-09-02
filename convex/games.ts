import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authError, requireTroopEditor, requireTroopViewer } from "./lib/auth";

const intensityValidator = v.union(v.literal("low"), v.literal("medium"), v.literal("high"));

function buildSearchText(values: {
  name: string;
  description: string;
  instructions: string;
  environments: string[];
  equipment: string[];
  tags: string[];
}) {
  return [values.name, values.description, values.instructions, ...values.environments, ...values.equipment, ...values.tags]
    .join(" ")
    .toLocaleLowerCase("cs");
}

export const list = query({
  args: { troopId: v.id("troops"), search: v.optional(v.string()) },
  handler: async (ctx, { troopId, search }) => {
    await requireTroopViewer(ctx, troopId);
    const clean = search?.trim().split(/\s+/).slice(0, 16).join(" ");
    const games = clean
      ? await ctx.db
          .query("games")
          .withSearchIndex("search_games", (q) => q.search("searchText", clean).eq("troopId", troopId))
          .take(50)
      : await ctx.db.query("games").withIndex("by_troop_updated", (q) => q.eq("troopId", troopId)).order("desc").take(100);
    return games.filter((game) => !game.archivedAt);
  },
});

export const create = mutation({
  args: {
    troopId: v.id("troops"),
    name: v.string(),
    description: v.string(),
    instructions: v.string(),
    durationMinutes: v.number(),
    minGroupSize: v.optional(v.number()),
    maxGroupSize: v.optional(v.number()),
    physicalIntensity: intensityValidator,
    environments: v.array(v.string()),
    equipment: v.array(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireTroopEditor(ctx, args.troopId);
    const name = args.name.trim();
    if (!name || name.length > 160) authError("VALIDATION_ERROR", "Název hry musí mít 1 až 160 znaků.");
    if (args.durationMinutes < 1 || args.durationMinutes > 24 * 60) {
      authError("VALIDATION_ERROR", "Délka hry musí být mezi 1 a 1440 minutami.");
    }
    if (args.minGroupSize && args.maxGroupSize && args.maxGroupSize < args.minGroupSize) {
      authError("VALIDATION_ERROR", "Maximální velikost skupiny nesmí být menší než minimální.");
    }
    const values = {
      name,
      description: args.description.trim(),
      instructions: args.instructions.trim(),
      environments: [...new Set(args.environments.map((value) => value.trim()).filter(Boolean))],
      equipment: [...new Set(args.equipment.map((value) => value.trim()).filter(Boolean))],
      tags: [...new Set(args.tags.map((value) => value.trim()).filter(Boolean))],
    };
    const now = Date.now();
    return ctx.db.insert("games", {
      troopId: args.troopId,
      ...values,
      durationMinutes: Math.round(args.durationMinutes),
      minGroupSize: args.minGroupSize,
      maxGroupSize: args.maxGroupSize,
      physicalIntensity: args.physicalIntensity,
      searchText: buildSearchText(values),
      createdBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const archive = mutation({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) authError("NOT_FOUND", "Hra nebyla nalezena.");
    await requireTroopEditor(ctx, game.troopId);
    await ctx.db.patch(gameId, { archivedAt: Date.now(), updatedAt: Date.now() });
  },
});
