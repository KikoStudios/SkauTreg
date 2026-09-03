import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../../convex/schema";
import { api, internal } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const modules = import.meta.glob("../../convex/**/*.ts");

type Fixture = {
  ownerId: Id<"users">;
  outsiderId: Id<"users">;
  roverId: Id<"users">;
  troopId: Id<"troops">;
  otherTroopId: Id<"troops">;
  tripId: Id<"trips">;
  memberId: Id<"members">;
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
    const memberId = await ctx.db.insert("members", { troopId, name: "Sensitive", guardianEmail: "guardian@example.cz" });
    const tripId = await ctx.db.insert("trips", {
      troopId,
      name: "Trip",
      description: "Description",
      location: "Prague",
      startDate: "2026-08-01",
    });
    await ctx.db.insert("participations", { tripId, memberId, status: "pending", accessKey: "legacy", secureAccessKey: "secure" });
    return { ownerId, outsiderId, roverId, troopId, otherTroopId, tripId, memberId };
  });
  return { t, fixture };
}

describe("Convex authorization", () => {
  it("accepts current RSVP objects and legacy JSON payloads after validation", async () => {
    const { t, fixture } = await seed();
    await t.run(async (ctx) => {
      await ctx.db.patch(fixture.tripId, {
        formType: "registration",
        customFields: [{ label: "Alergie", type: "text", required: false }],
      });
    });

    await t.mutation(api.public_rsvp.submit, {
      accessKey: "secure",
      status: "attending",
      responses: { Alergie: "žádné" },
    });
    await t.mutation(api.public_rsvp.submit, {
      accessKey: "secure",
      status: "not_attending",
      responses: JSON.stringify({ Alergie: "bez odpovědi" }),
    });

    const participation = await t.run((ctx) => ctx.db
      .query("participations")
      .withIndex("by_secure_access_key", (q) => q.eq("secureAccessKey", "secure"))
      .unique());
    expect(participation?.responses).toEqual({ Alergie: "bez odpovědi" });
  });

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

  it("stores Gmail SMTP app passwords encrypted and redacts them from queries", async () => {
    const { t, fixture } = await seed();
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const previousKey = process.env.CREDENTIAL_ENCRYPTION_KEY;
    process.env.CREDENTIAL_ENCRYPTION_KEY = "ef".repeat(32);
    try {
      await owner.mutation(internal.troops.storeGmailSmtp, {
        troopId: fixture.troopId,
        email: " Troop@Example.com ",
        appPassword: "abcd efgh ijkl mnop",
      });

      const stored = await t.run((ctx) => ctx.db.get(fixture.troopId));
      expect(stored?.emailProvider).toMatchObject({
        provider: "gmail-smtp",
        email: "troop@example.com",
        smtpHost: "smtp.gmail.com",
        smtpPort: 465,
        requiresReconnect: false,
      });
      expect(stored?.emailProvider?.smtpPassword).toMatch(/^enc:v1:/);
      expect(stored?.emailProvider?.smtpPassword).not.toContain("abcdefghijklmnop");

      const publicTroop = await owner.query(api.troops.getById, { id: fixture.troopId });
      expect(publicTroop?.emailProvider).toMatchObject({ provider: "gmail-smtp", email: "troop@example.com" });
      expect(publicTroop?.emailProvider).not.toHaveProperty("smtpPassword");
      expect(publicTroop?.emailProvider).not.toHaveProperty("smtpHost");

      const sendConfiguration = await owner.query(api.emailDrafts.getSendConfiguration, { tripId: fixture.tripId });
      expect(sendConfiguration).toEqual({
        provider: "gmail-smtp",
        senderEmail: "troop@example.com",
        connected: true,
        requiresReconnect: false,
      });

      await expect(owner.mutation(internal.troops.storeGmailSmtp, {
        troopId: fixture.troopId,
        email: "troop@example.com",
        appPassword: "not-an-app-password",
      })).rejects.toThrow("šestnáctimístné heslo aplikace Google");
      await expect(t.withIdentity({ tokenIdentifier: "test|outsider" }).mutation(internal.troops.storeGmailSmtp, {
        troopId: fixture.troopId,
        email: "troop@example.com",
        appPassword: "abcdefghijklmnop",
      })).rejects.toThrow();

      await expect(owner.mutation(api.troops.connectEmailProvider, {
        troopId: fixture.troopId,
        provider: "gmail-smtp",
        email: "troop@example.com",
        smtpPassword: "abcdefghijklmnop",
        smtpHost: "attacker.example.com",
      })).rejects.toThrow("starší Gmail OAuth");
    } finally {
      if (previousKey === undefined) delete process.env.CREDENTIAL_ENCRYPTION_KEY;
      else process.env.CREDENTIAL_ENCRYPTION_KEY = previousKey;
    }
  });

  it("keeps participant PII out of the rover dashboard", async () => {
    const { t, fixture } = await seed();
    const rover = t.withIdentity({ tokenIdentifier: "test|rover" });
    const dashboard = await rover.query(api.trips.getDashboard, { tripId: fixture.tripId });
    expect(dashboard?.participants).toEqual([]);
    expect(dashboard?.attendanceSummary.total).toBe(1);
    await expect(rover.query(api.tripParticipants.list, { tripId: fixture.tripId })).rejects.toThrow();
  });

  it("archives a troop without deleting its data", async () => {
    const { t, fixture } = await seed();
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    await owner.mutation(api.troops.archive, { troopId: fixture.troopId, confirmationName: "A" });
    const archived = await owner.query(api.troops.listArchived, {});
    expect(archived).toHaveLength(1);
    const trip = await t.run((ctx) => ctx.db.get(fixture.tripId));
    expect(trip).not.toBeNull();
  });

  it("creates one trip share from only explicitly selected same-trip tickets", async () => {
    const { t, fixture } = await seed();
    const { ticketId, foreignTicketId } = await t.run(async (ctx) => {
      const now = new Date().toISOString();
      const ticketId = await ctx.db.insert("transport_tickets", { tripId: fixture.tripId, storageId: "storage-a", name: "Tam", contentType: "application/pdf", createdAt: now, updatedAt: now });
      const foreignTripId = await ctx.db.insert("trips", { troopId: fixture.otherTroopId, name: "Other", description: "Other", location: "Brno", startDate: "2027-09-01" });
      const foreignTicketId = await ctx.db.insert("transport_tickets", { tripId: foreignTripId, storageId: "storage-b", name: "Foreign", contentType: "application/pdf", createdAt: now, updatedAt: now });
      return { ticketId, foreignTicketId };
    });
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    await owner.mutation(api.tripTicketShares.createOrUpdate, { tripId: fixture.tripId, selectedTicketIds: [ticketId], expiresAt: "2027-12-31" });
    const share = await owner.query(api.tripTicketShares.getForManagement, { tripId: fixture.tripId });
    expect(share?.selectedTicketIds).toEqual([ticketId]);
    await expect(owner.mutation(api.tripTicketShares.createOrUpdate, { tripId: fixture.tripId, selectedTicketIds: [foreignTicketId], expiresAt: "2027-12-31" })).rejects.toThrow();
  });

  it("tracks email deliveries without storing recipient addresses", async () => {
    const { t, fixture } = await seed();
    const owner = t.withIdentity({ tokenIdentifier: "test|owner" });
    const draftId = await owner.mutation(api.emailDrafts.create, { tripId: fixture.tripId, subject: "Test", body: "Hello" });
    const started = await owner.mutation(internal.emailDelivery.startAttempt, {
      draftId,
      tripId: fixture.tripId,
      requestedBy: fixture.ownerId,
      idempotencyKey: "email-attempt-123456789",
      recipientCount: 1,
    });
    expect(started.created).toBe(true);
    await owner.mutation(internal.emailDelivery.initializeDeliveries, {
      attemptId: started.attempt!._id,
      targets: [{ memberId: fixture.memberId, contactKind: "guardian" }],
    });
    await owner.mutation(internal.emailDelivery.recordDelivery, {
      attemptId: started.attempt!._id,
      memberId: fixture.memberId,
      contactKind: "guardian",
      status: "failed",
      errorCode: "GMAIL_TEMPORARILY_UNAVAILABLE",
    });
    const rows = await t.run((ctx) => ctx.db.query("email_deliveries").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0]).not.toHaveProperty("email");
    expect(rows[0].errorCode).toBe("GMAIL_TEMPORARILY_UNAVAILABLE");
    await expect(t.withIdentity({ tokenIdentifier: "test|rover" }).query(api.emailDelivery.listByDraft, { draftId })).rejects.toThrow();
  });
});
