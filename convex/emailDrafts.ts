import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getMemberEmailTargets, normalizeMemberContactFields } from "./lib/memberEmails";
import { requireTripLeader, requireTroopEditor, requireTroopManager } from "./lib/auth";

// Create a new email draft for a trip
export const create = mutation({
    args: {
        tripId: v.id("trips"),
        subject: v.string(),
        body: v.string(),
    },
    handler: async (ctx, args) => {
        const { user } = await requireTripLeader(ctx, args.tripId);

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
        const draft = await ctx.db.get(args.id);
        if (!draft) throw new Error("📄 Koncept nebyl nalezen. Možná byl smazán.");
        await requireTripLeader(ctx, draft.tripId);

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
        await requireTripLeader(ctx, draft.tripId);

        await ctx.db.delete(args.id);
    },
});

// List all drafts for a trip
export const listByTrip = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        await requireTripLeader(ctx, args.tripId);
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
        await requireTripLeader(ctx, draft.tripId);

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
        const draft = await ctx.db.get(args.id);
        if (!draft) throw new Error("Koncept nebyl nalezen.");
        const { user, troop } = await requireTripLeader(ctx, draft.tripId);
        await requireTroopManager(ctx, troop._id);

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
        await requireTripLeader(ctx, args.tripId);

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const recipients = await Promise.all(
            participations.map(async (p) => {
                const member = normalizeMemberContactFields(await ctx.db.get(p.memberId));
                const emails = getMemberEmailTargets(member);
                const contacts = member ? [
                    member.email ? { name: member.name || "Člen", email: member.email, role: "member" } : null,
                    member.guardianEmail ? { name: member.guardianName || "Rodič / zástupce", email: member.guardianEmail, role: "guardian" } : null,
                    member.guardian2Email ? { name: member.guardian2Name || "Druhý rodič / zástupce", email: member.guardian2Email, role: "guardian" } : null,
                ].filter(Boolean) : [];
                return {
                    memberId: member?._id,
                    name: member?.name,
                    email: emails[0],
                    emails,
                    contacts,
                    accessKey: p.secureAccessKey || p.accessKey,
                    hasEmail: emails.length > 0,
                    participationStatus: p.status,
                    responses: p.responses,
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
        await requireTroopEditor(ctx, args.troopId);
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
