import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.ts");

type Fixture = {
  ownerId: Id<"users">;
  outsiderId: Id<"users">;
  roverId: Id<"users">;
  troopId: Id<"troops">;
  otherTroopId: Id<"troops">;
  tripId: Id<"trips">;
};

async function seed() {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx): Promise<Fixture> => {
    const ownerId = await ctx.db.insert("users", { name: "Owner", tokenIdentifier: "test|owner" });
    const outsiderId = await ctx.db.insert("users", { name: "Outsider", tokenIdentifier: "test|outsider" });
    const roverId = await ctx.db.insert("users", { name: "Rover", tokenIdentifier: "test|rover" });
    const troopId = await ctx.db.insert("troops", { name: "A", ownerId, publicDirectoryOptIn: false });
    const otherTroopId = await ctx.db.insert("troops", { name: "B", ownerId: outsiderId, publicDirectoryOptIn: false });
    await ctx.db.insert("troop_leaders", { troopId, userId: roverId, role: "rover" });
    await ctx.db.insert("members", { troopId, name: "Sensitive", guardianEmail: "guardian@example.cz" });
    const tripId = await ctx.db.insert("trips", {
      troopId,
      name: "Trip",
      description: "Description",
      location: "Prague",
      startDate: "2026-08-01",
    });
    return { ownerId, outsiderId, roverId, troopId, otherTroopId, tripId };
  });
  return { t, fixture };
}

describe("Convex authorization", () => {
  it("denies signed-out and cross-troop member reads", async () => {
    const { t, fixture } = await seed();
    await expect(t.query(api.members.list, { troopId: fixture.troopId })).rejects.toThrow();
    const outsider = t.withIdentity({ tokenIdentifier: "test|outsider" });
    await expect(outsider.query(api.members.list, { troopId: fixture.troopId })).rejects.toThrow();
  });

  it("allows troop viewers but prevents rover member management", async () => {
    const { t, fixture } = await seed();
    const rover = t.withIdentity({ tokenIdentifier: "test|rover" });
    const members = await rover.query(api.members.list, { troopId: fixture.troopId });
    expect(members).toHaveLength(1);
    await expect(rover.mutation(api.members.create, {
      troopId: fixture.troopId,
      name: "Nope",
    })).rejects.toThrow();
  });

  it("allows only an assigned rover to edit trip logistics", async () => {
    const { t, fixture } = await seed();
    const rover = t.withIdentity({ tokenIdentifier: "test|rover" });
    await expect(rover.mutation(api.trips.update, {
      id: fixture.tripId,
      location: "Brno",
    })).rejects.toThrow();
    await t.run(async (ctx) => {
      await ctx.db.insert("trip_staff", {
        tripId: fixture.tripId,
        troopId: fixture.troopId,
        userId: fixture.roverId,
        source: "user",
        role: "rover",
        name: "Rover",
        createdAt: new Date().toISOString(),
      });
    });
    await rover.mutation(api.trips.update, { id: fixture.tripId, location: "Brno" });
    await expect(rover.mutation(api.trips.update, {
      id: fixture.tripId,
      customFields: [],
    })).rejects.toThrow();
  });

  it("redacts integration secrets from authorized queries", async () => {
    const { t, fixture } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.insert("integrations", {
        troopId: fixture.troopId,
        name: "Discord",
        serviceType: "discord",
        isActive: true,
        configPayload: "secret",
        webhookUrl: "https://example.com/secret",
        createdBy: fixture.ownerId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const integrations = await owner.query(api.integrations.getByTroop, { troopId: fixture.troopId });
    expect(integrations[0]).not.toHaveProperty("configPayload");
    expect(integrations[0]).not.toHaveProperty("webhookUrl");
  });
});
