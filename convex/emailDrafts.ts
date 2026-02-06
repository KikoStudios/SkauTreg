import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { api } from "./_generated/api";

// Create a new email draft for a trip
export const create = mutation({
    args: {
        tripId: v.id("trips"),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit pro vytvoření konceptu.");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("👤 Váš uživatelský profil nebyl nalezen. Zkuste se odhlásit a přihlásit znovu.");

        const trip = await ctx.db.get(args.tripId);
        if (!trip) throw new Error("🚗 Výprava nebyla nalezena. Zkuste načíst stránku znovu.");

        const now = new Date().toISOString();

        const draftId = await ctx.db.insert("email_drafts", {
            tripId: args.tripId,
            subject: args.subject,
            body: args.body,
            createdBy: user._id,
            createdAt: now,
            updatedAt: now,
            status: "draft",
        });

        return draftId;
    },
});

// Update an existing draft
export const update = mutation({
    args: {
        id: v.id("email_drafts"),
        subject: v.optional(v.string()),
        body: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit pro úpravu konceptu.");

        const draft = await ctx.db.get(args.id);
        if (!draft) throw new Error("📄 Koncept nebyl nalezen. Možná byl smazán.");

        if (draft.status === "sent") {
            throw new Error("📨 Nelze upravit již odeslaný e-mail. Vytvořte nový koncept.");
        }

        const { id, ...updates } = args;
        await ctx.db.patch(id, {
            ...updates,
            updatedAt: new Date().toISOString(),
        });
    },
});

// Delete a draft
export const remove = mutation({
    args: { id: v.id("email_drafts") },
    handler: async (ctx, args) => {
        const draft = await ctx.db.get(args.id);
        if (!draft) throw new Error("📄 Koncept nebyl nalezen. Možná již byl smazán.");

        await ctx.db.delete(args.id);
    },
});

// List all drafts for a trip
export const listByTrip = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const drafts = await ctx.db
            .query("email_drafts")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        // Enrich with creator info
        const enriched = await Promise.all(
            drafts.map(async (draft) => {
                const creator = await ctx.db.get(draft.createdBy);
                const sender = draft.sentBy ? await ctx.db.get(draft.sentBy) : null;
                return {
                    ...draft,
                    creator: creator ? { _id: creator._id, name: creator.name, email: creator.email } : null,
                    sender: sender ? { _id: sender._id, name: sender.name, email: sender.email } : null,
                };
            })
        );

        return enriched;
    },
});

// Get a single draft
export const getById = query({
    args: { id: v.id("email_drafts") },
    handler: async (ctx, args) => {
        const draft = await ctx.db.get(args.id);
        if (!draft) return null;

        const creator = await ctx.db.get(draft.createdBy);
        const sender = draft.sentBy ? await ctx.db.get(draft.sentBy) : null;

        return {
            ...draft,
            creator: creator ? { _id: creator._id, name: creator.name, email: creator.email } : null,
            sender: sender ? { _id: sender._id, name: sender.name, email: sender.email } : null,
        };
    },
});

// Mark draft as sent
export const markAsSent = mutation({
    args: {
        id: v.id("email_drafts"),
        recipientCount: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit pro označení konceptu jako odeslaného.");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("👤 Váš uživatelský profil nebyl nalezen.");

        await ctx.db.patch(args.id, {
            status: "sent",
            sentAt: new Date().toISOString(),
            sentBy: user._id,
            recipientCount: args.recipientCount,
        });
    },
});

// Get recipient list for preview (members with emails)
export const getRecipients = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) throw new Error("🚗 Výprava nebyla nalezena.");

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const recipients = await Promise.all(
            participations.map(async (p) => {
                const member = await ctx.db.get(p.memberId);
                return {
                    memberId: member?._id,
                    name: member?.name,
                    email: member?.email,
                    accessKey: p.accessKey,
                    hasEmail: !!member?.email,
                };
            })
        );

        return {
            total: recipients.length,
            withEmail: recipients.filter((r) => r.hasEmail).length,
            withoutEmail: recipients.filter((r) => !r.hasEmail).length,
            recipients: recipients.filter((r) => r.hasEmail),
        };
    },
});

// List sent drafts across all trips in a troop
export const listSentByTroop = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        const trips = await ctx.db
            .query("trips")
            .filter((q) => q.eq(q.field("troopId"), args.troopId))
            .collect();

        const tripIds = new Set(trips.map((t) => t._id));

        const drafts = await ctx.db
            .query("email_drafts")
            .filter((q) => q.eq(q.field("status"), "sent"))
            .collect();

        const filtered = drafts.filter((d) => tripIds.has(d.tripId));

        const enriched = await Promise.all(
            filtered.map(async (draft) => {
                const sender = draft.sentBy ? await ctx.db.get(draft.sentBy) : null;
                const trip = await ctx.db.get(draft.tripId);
                return {
                    ...draft,
                    sender: sender ? { _id: sender._id, name: sender.name, email: sender.email } : null,
                    trip: trip ? { _id: trip._id, name: trip.name } : null,
                };
            })
        );

        return enriched.sort((a, b) => (a.sentAt || "").localeCompare(b.sentAt || "")).reverse();
    },
});
