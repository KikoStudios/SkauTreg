import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireTripLeader, requireTripViewer } from "./lib/auth";

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    await requireTripViewer(ctx, args.tripId);
    const rows = await ctx.db
      .query("trip_staff")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();

    const withUsers = await Promise.all(
      rows.map(async (row) => {
        const user = row.userId ? await ctx.db.get(row.userId) : null;
        return { ...row, user };
      })
    );

    return withUsers;
  },
});

export const addUser = mutation({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");

    const existing = await ctx.db
      .query("trip_staff")
      .withIndex("by_user_trip", (q) => q.eq("userId", args.userId).eq("tripId", args.tripId))
      .unique();
    if (existing) return existing._id;

    const user = await ctx.db.get(args.userId);
    const name = user?.name || user?.email || "Neznámý";

    return await ctx.db.insert("trip_staff", {
      tripId: args.tripId,
      troopId: trip.troopId,
      role: args.role,
      source: "user",
      userId: args.userId,
      name,
      createdAt: new Date().toISOString(),
    });
  },
});

export const addExternal = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    age: v.optional(v.number()),
    benefit: v.optional(v.string()),
    role: v.string(),
    saveAsPreset: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireTripLeader(ctx, args.tripId);
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");

    const normalizedName = args.name.trim();
    if (!normalizedName) throw new Error("Name is required");

    const existing = await ctx.db
      .query("trip_staff")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    const dup = existing.find(
      (r) =>
        !r.userId &&
        r.name === normalizedName &&
        r.role === args.role &&
        (r.age ?? null) === (args.age ?? null) &&
        (r.benefit ?? null) === (args.benefit ?? null)
    );
    if (dup) return dup._id;

    const id = await ctx.db.insert("trip_staff", {
      tripId: args.tripId,
      troopId: trip.troopId,
      role: args.role,
      source: args.saveAsPreset ? "preset" : "external",
      name: normalizedName,
      age: args.age,
      benefit: args.benefit,
      createdAt: new Date().toISOString(),
    });

    if (args.saveAsPreset) {
      const now = new Date().toISOString();
      await ctx.db.insert("leader_presets", {
        troopId: trip.troopId,
        name: normalizedName,
        role: args.role,
        age: args.age,
        benefit: args.benefit,
        createdAt: now,
        updatedAt: now,
      });
    }

    return id;
  },
});

export const addFromPreset = mutation({
  args: { tripId: v.id("trips"), presetId: v.id("leader_presets") },
  handler: async (ctx, args) => {
    const authorization = await requireTripLeader(ctx, args.tripId);
    const trip = await ctx.db.get(args.tripId);
    if (!trip) throw new Error("Trip not found");

    const preset = await ctx.db.get(args.presetId);
    if (!preset) throw new Error("Preset not found");
    if (preset.troopId !== authorization.trip.troopId) {
      throw new Error("Preset does not belong to this troop");
    }

    const existing = await ctx.db
      .query("trip_staff")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    const dup = existing.find(
      (r) =>
        !r.userId &&
        r.name === preset.name &&
        r.role === preset.role &&
        (r.age ?? null) === (preset.age ?? null) &&
        (r.benefit ?? null) === (preset.benefit ?? null)
    );
    if (dup) return dup._id;

    return await ctx.db.insert("trip_staff", {
      tripId: args.tripId,
      troopId: trip.troopId,
      role: preset.role,
      source: "preset",
      name: preset.name,
      age: preset.age,
      benefit: preset.benefit,
      createdAt: new Date().toISOString(),
    });
  },
});

export const remove = mutation({
  args: { tripStaffId: v.id("trip_staff") },
  handler: async (ctx, args) => {
    const staff = await ctx.db.get(args.tripStaffId);
    if (!staff) return;
    await requireTripLeader(ctx, staff.tripId);
    await ctx.db.delete(args.tripStaffId);
  },
});
