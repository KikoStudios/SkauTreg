import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authError, requireCurrentUser } from "./lib/auth";

const requestStatus = v.union(
  v.literal("requested"),
  v.literal("in_review"),
  v.literal("blocked"),
  v.literal("approved"),
  v.literal("completed"),
  v.literal("cancelled"),
  v.literal("rejected"),
);

function isDataAdmin(email: string | undefined) {
  const allowlist = (process.env.DATA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return Boolean(email && allowlist.includes(email.toLowerCase()));
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("data_requests")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const requestDeletion = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const existing = await ctx.db
      .query("data_requests")
      .withIndex("by_user", (index) => index.eq("userId", user._id))
      .filter((row) =>
        row.or(
          row.eq(row.field("status"), "requested"),
          row.eq(row.field("status"), "in_review"),
          row.eq(row.field("status"), "blocked"),
          row.eq(row.field("status"), "approved"),
        ),
      )
      .first();
    if (existing) return existing._id;

    const ownedTroops = await ctx.db
      .query("troops")
      .filter((row) => row.eq(row.field("ownerId"), user._id))
      .collect();
    const now = new Date().toISOString();
    return ctx.db.insert("data_requests", {
      userId: user._id,
      requestType: "deletion",
      status: ownedTroops.length ? "blocked" : "requested",
      ownershipBlockers: ownedTroops.length ? ownedTroops.map((troop) => troop._id) : undefined,
      resolutionNote: ownedTroops.length
        ? "Nejprve převeďte vlastnictví uvedených oddílů."
        : undefined,
      requestedAt: now,
      updatedAt: now,
    });
  },
});

export const cancelMine = mutation({
  args: { requestId: v.id("data_requests") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request) authError("NOT_FOUND", "Žádost nebyla nalezena.");
    if (request.userId !== user._id) authError("FORBIDDEN", "Tato žádost patří jinému účtu.");
    if (!["requested", "in_review", "blocked"].includes(request.status)) {
      authError("VALIDATION_ERROR", "Žádost v tomto stavu nelze zrušit.");
    }
    await ctx.db.patch(request._id, {
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    });
  },
});

export const transition = mutation({
  args: {
    requestId: v.id("data_requests"),
    status: requestStatus,
    resolutionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireCurrentUser(ctx);
    if (!isDataAdmin(admin.email)) authError("FORBIDDEN", "Tuto akci může provést pouze správce dat.");
    const request = await ctx.db.get(args.requestId);
    if (!request) authError("NOT_FOUND", "Žádost nebyla nalezena.");
    const user = await ctx.db.get(request.userId);
    if (!user) authError("NOT_FOUND", "Uživatel nebyl nalezen.");

    const ownedTroops = await ctx.db
      .query("troops")
      .filter((row) => row.eq(row.field("ownerId"), user._id))
      .collect();
    if (args.status === "completed" && ownedTroops.length) {
      authError("VALIDATION_ERROR", "Nejprve je nutné převést vlastnictví oddílů.");
    }

    const now = new Date().toISOString();
    if (args.status === "completed") {
      const [leaderships, staff, participants, cursors, votes] = await Promise.all([
        ctx.db.query("troop_leaders").filter((row) => row.eq(row.field("userId"), user._id)).collect(),
        ctx.db.query("trip_staff").filter((row) => row.eq(row.field("userId"), user._id)).collect(),
        ctx.db.query("meeting_participants").filter((row) => row.eq(row.field("userId"), user._id)).collect(),
        ctx.db.query("editor_cursors").filter((row) => row.eq(row.field("userId"), user._id)).collect(),
        ctx.db.query("feature_votes").filter((row) => row.eq(row.field("userId"), user._id)).collect(),
      ]);
      for (const row of [...leaderships, ...staff, ...participants, ...cursors, ...votes]) {
        await ctx.db.delete(row._id);
      }
      await ctx.db.patch(user._id, {
        name: "Anonymizovaný uživatel",
        email: undefined,
        image: undefined,
        dateOfBirth: undefined,
        benefit: undefined,
        birthDate: undefined,
        address: undefined,
        personalEmail: undefined,
        personalPhone: undefined,
        emergencyContactName: undefined,
        emergencyContactPhone: undefined,
        emergencyContactEmail: undefined,
        parent1Name: undefined,
        parent1Phone: undefined,
        parent1Email: undefined,
        parent2Name: undefined,
        parent2Phone: undefined,
        parent2Email: undefined,
      });
    }

    await ctx.db.patch(request._id, {
      status: args.status,
      resolutionNote: args.resolutionNote,
      ownershipBlockers: ownedTroops.length ? ownedTroops.map((troop) => troop._id) : undefined,
      updatedAt: now,
      completedAt: args.status === "completed" ? now : undefined,
    });
    return args.status === "completed"
      ? { clerkDeletionRequired: true, postHogDeletionRequired: true }
      : { clerkDeletionRequired: false, postHogDeletionRequired: false };
  },
});
