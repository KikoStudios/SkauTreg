import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  authError,
  getTroopRole,
  requireDocumentEditor,
  requireDocumentViewer,
  requireTripEditor,
  requireTroopEditor,
  requireTroopViewer,
} from "./lib/auth";

async function validateLeaders(
  ctx: MutationCtx,
  troopId: Id<"troops">,
  participantIds: Id<"users">[],
  facilitatorId?: Id<"users">,
) {
  const unique = [...new Set(participantIds)];
  const candidates = facilitatorId ? [...new Set([...unique, facilitatorId])] : unique;
  for (const userId of candidates) {
    if (!(await getTroopRole(ctx, troopId, userId))) {
      authError("VALIDATION_ERROR", "Vybraný vedoucí nepatří do tohoto oddílu.");
    }
  }
  return unique;
}

const kindValidator = v.union(
  v.literal("document"),
  v.literal("schuzka"),
  v.literal("trip_document"),
  v.literal("decision"),
);

const lifecycleValidator = v.union(
  v.literal("plan"),
  v.literal("in_session"),
  v.literal("outcome"),
  v.literal("final"),
  v.literal("archived"),
);

const allowedTransitions = {
  plan: new Set(["in_session", "archived"]),
  in_session: new Set(["outcome", "plan"]),
  outcome: new Set(["final", "in_session"]),
  final: new Set(["outcome", "archived"]),
  archived: new Set(["plan", "final"]),
} as const;

export const list = query({
  args: { troopId: v.id("troops") },
  handler: async (ctx, { troopId }) => {
    await requireTroopViewer(ctx, troopId);
    const documents = await ctx.db
      .query("documents")
      .withIndex("by_troop_updated", (q) => q.eq("troopId", troopId))
      .order("desc")
      .take(200);

    return Promise.all(
      documents.map(async (document) => {
        const [setup, pages] = await Promise.all([
          ctx.db
            .query("schuzka_setups")
            .withIndex("by_document", (q) => q.eq("documentId", document._id))
            .unique(),
          ctx.db
            .query("meeting_pages")
            .withIndex("by_meeting", (q) => q.eq("meetingId", document.meetingId))
            .collect(),
        ]);
        const orderedPages = pages.sort((a, b) => a.order - b.order);
        return { ...document, setup, pageCount: pages.length, firstPageId: orderedPages[0]?._id };
      }),
    );
  },
});

export const get = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { document, meeting } = await requireDocumentViewer(ctx, documentId);
    const [setup, pages] = await Promise.all([
      ctx.db
        .query("schuzka_setups")
        .withIndex("by_document", (q) => q.eq("documentId", documentId))
        .unique(),
      ctx.db
        .query("meeting_pages")
        .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
        .collect(),
    ]);
    return { ...document, meeting, setup, pages: pages.sort((a, b) => a.order - b.order) };
  },
});

export const getByMeeting = query({
  args: { meetingId: v.id("meetings") },
  handler: async (ctx, { meetingId }) => {
    const document = await ctx.db
      .query("documents")
      .withIndex("by_meeting", (q) => q.eq("meetingId", meetingId))
      .unique();
    if (!document) return null;
    await requireDocumentViewer(ctx, document._id);
    const setup = await ctx.db
      .query("schuzka_setups")
      .withIndex("by_document", (q) => q.eq("documentId", document._id))
      .unique();
    return { ...document, setup };
  },
});

export const ensureLegacyDocuments = mutation({
  args: { troopId: v.id("troops") },
  handler: async (ctx, { troopId }) => {
    const { user } = await requireTroopEditor(ctx, troopId);
    const meetings = await ctx.db
      .query("meetings")
      .withIndex("by_troop", (q) => q.eq("troopId", troopId))
      .take(200);
    let created = 0;

    for (const meeting of meetings) {
      const existing = await ctx.db
        .query("documents")
        .withIndex("by_meeting", (q) => q.eq("meetingId", meeting._id))
        .unique();
      if (existing) continue;

      const now = Date.now();
      await ctx.db.insert("documents", {
        troopId,
        meetingId: meeting._id,
        tripId: meeting.tripId,
        kind: meeting.category === "documentation" ? "trip_document" : "document",
        lifecycle: "plan",
        title: meeting.title?.trim() || "Bez názvu",
        description: meeting.description,
        tags: [],
        contentVersion: 0,
        schemaVersion: 1,
        createdBy: user._id,
        updatedBy: user._id,
        createdAt: meeting._creationTime,
        updatedAt: now,
      });
      created += 1;
    }
    return { created, scanned: meetings.length, hasMore: meetings.length === 200 };
  },
});

export const create = mutation({
  args: {
    troopId: v.id("troops"),
    kind: kindValidator,
    title: v.string(),
    description: v.optional(v.string()),
    tripId: v.optional(v.id("trips")),
    scheduledStartAt: v.optional(v.number()),
    scheduledEndAt: v.optional(v.number()),
    timezone: v.optional(v.string()),
    location: v.optional(v.string()),
    participantLeaderIds: v.optional(v.array(v.id("users"))),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    if (!title || title.length > 160) {
      authError("VALIDATION_ERROR", "Název dokumentu musí mít 1 až 160 znaků.");
    }

    const authorization = args.tripId
      ? await requireTripEditor(ctx, args.tripId)
      : await requireTroopEditor(ctx, args.troopId);
    if (args.tripId && authorization.troop._id !== args.troopId) {
      authError("VALIDATION_ERROR", "Výprava nepatří do vybraného oddílu.");
    }

    const now = Date.now();
    const meetingId = await ctx.db.insert("meetings", {
      troopId: args.troopId,
      tripId: args.tripId,
      title,
      description: args.description?.trim() || undefined,
      category: args.kind === "trip_document" ? "documentation" : "notebook",
      status: args.kind === "schuzka" ? "prepared" : undefined,
    });
    const pageId = await ctx.db.insert("meeting_pages", {
      meetingId,
      title: args.kind === "schuzka" ? "Plán" : "Dokument",
      order: 0,
    });
    const documentId = await ctx.db.insert("documents", {
      troopId: args.troopId,
      meetingId,
      tripId: args.tripId,
      kind: args.kind,
      lifecycle: "plan",
      title,
      description: args.description?.trim() || undefined,
      tags: [],
      contentVersion: 0,
      schemaVersion: 1,
      createdBy: authorization.user._id,
      updatedBy: authorization.user._id,
      createdAt: now,
      updatedAt: now,
    });

    if (args.kind === "schuzka") {
      const start = args.scheduledStartAt ?? now;
      const end = args.scheduledEndAt ?? start + 90 * 60_000;
      if (end <= start) authError("VALIDATION_ERROR", "Konec schůzky musí být po začátku.");
      const participantLeaderIds = await validateLeaders(
        ctx,
        args.troopId,
        args.participantLeaderIds ?? [],
      );
      await ctx.db.insert("schuzka_setups", {
        troopId: args.troopId,
        documentId,
        scheduledStartAt: start,
        scheduledEndAt: end,
        timezone: args.timezone || "Europe/Prague",
        location: args.location?.trim() || undefined,
        participantLeaderIds,
        state: "draft",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { documentId, meetingId, pageId };
  },
});

export const updateMetadata = mutation({
  args: {
    documentId: v.id("documents"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { document, user } = await requireDocumentEditor(ctx, args.documentId);
    const title = args.title?.trim();
    if (args.title !== undefined && (!title || title.length > 160)) {
      authError("VALIDATION_ERROR", "Název dokumentu musí mít 1 až 160 znaků.");
    }
    const updates = {
      ...(title ? { title } : {}),
      ...(args.description !== undefined ? { description: args.description.trim() || undefined } : {}),
      ...(args.tags ? { tags: [...new Set(args.tags.map((tag) => tag.trim()).filter(Boolean))] } : {}),
      updatedBy: user._id,
      updatedAt: Date.now(),
    };
    await ctx.db.patch(document._id, updates);
    await ctx.db.patch(document.meetingId, {
      ...(title ? { title } : {}),
      ...(args.description !== undefined ? { description: args.description.trim() || undefined } : {}),
    });
  },
});

export const transitionLifecycle = mutation({
  args: { documentId: v.id("documents"), lifecycle: lifecycleValidator },
  handler: async (ctx, { documentId, lifecycle }) => {
    const { document, user } = await requireDocumentEditor(ctx, documentId);
    if (document.lifecycle === lifecycle) return;
    if (!allowedTransitions[document.lifecycle].has(lifecycle as never)) {
      authError("VALIDATION_ERROR", `Přechod ${document.lifecycle} → ${lifecycle} není povolen.`);
    }
    const now = Date.now();
    await ctx.db.patch(documentId, {
      lifecycle,
      updatedBy: user._id,
      updatedAt: now,
      ...(lifecycle === "final" ? { finalizedAt: now } : {}),
      ...(lifecycle === "archived" ? { archivedAt: now } : {}),
    });
    await ctx.db.patch(document.meetingId, {
      status: lifecycle === "in_session" ? "ongoing" : lifecycle === "plan" ? "prepared" : "past",
    });

    const setup = await ctx.db
      .query("schuzka_setups")
      .withIndex("by_document", (q) => q.eq("documentId", documentId))
      .unique();
    if (setup) {
      const state = lifecycle === "in_session" ? "running" : lifecycle === "plan" ? "scheduled" : "finished";
      await ctx.db.patch(setup._id, { state, updatedAt: now });
    }
  },
});

export const updateSchuzkaSetup = mutation({
  args: {
    documentId: v.id("documents"),
    scheduledStartAt: v.number(),
    scheduledEndAt: v.number(),
    timezone: v.string(),
    location: v.optional(v.string()),
    participantLeaderIds: v.array(v.id("users")),
    facilitatorId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const { document } = await requireDocumentEditor(ctx, args.documentId);
    if (document.kind !== "schuzka") authError("VALIDATION_ERROR", "Dokument není schůzka.");
    if (args.scheduledEndAt <= args.scheduledStartAt) {
      authError("VALIDATION_ERROR", "Konec schůzky musí být po začátku.");
    }
    const participantLeaderIds = await validateLeaders(
      ctx,
      document.troopId,
      args.participantLeaderIds,
      args.facilitatorId,
    );
    const setup = await ctx.db
      .query("schuzka_setups")
      .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
      .unique();
    const values = {
      scheduledStartAt: args.scheduledStartAt,
      scheduledEndAt: args.scheduledEndAt,
      timezone: args.timezone,
      location: args.location?.trim() || undefined,
      participantLeaderIds,
      facilitatorId: args.facilitatorId,
      updatedAt: Date.now(),
    };
    if (setup) await ctx.db.patch(setup._id, values);
    else {
      await ctx.db.insert("schuzka_setups", {
        troopId: document.troopId,
        documentId: args.documentId,
        ...values,
        state: "draft",
        createdAt: Date.now(),
      });
    }
  },
});
