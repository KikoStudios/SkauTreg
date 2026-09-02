import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type AuthCtx = QueryCtx | MutationCtx;

export type TroopRole = "owner" | "main_leader" | "leader" | "rover";

export type AuthorizedTroop = {
  user: Doc<"users">;
  troop: Doc<"troops">;
  role: TroopRole;
};

export type AuthorizedTrip = AuthorizedTroop & {
  trip: Doc<"trips">;
};

export function authError(
  code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION_ERROR" | "RATE_LIMITED",
  message: string,
): never {
  throw new ConvexError({ code, message });
}

function normalizeRole(role: string): Exclude<TroopRole, "owner"> | null {
  if (role === "main_leader") return "main_leader";
  if (role === "leader" || role === "vedouci") return "leader";
  if (role === "rover") return "rover";
  return null;
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    authError("UNAUTHENTICATED", "Pro tuto akci se musíte přihlásit.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    authError("UNAUTHENTICATED", "Uživatelský profil nebyl nalezen.");
  }

  return user;
}

export async function requireDataAdmin(ctx: AuthCtx): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);
  const allowlist = (process.env.DATA_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!user.email || !allowlist.includes(user.email.toLowerCase())) {
    authError("FORBIDDEN", "Tuto akci může provést pouze správce dat.");
  }
  return user;
}

export async function getTroopRole(
  ctx: AuthCtx,
  troopId: Id<"troops">,
  userId: Id<"users">,
): Promise<TroopRole | null> {
  const troop = await ctx.db.get(troopId);
  if (!troop) return null;
  if (troop.ownerId === userId) return "owner";

  const leadership = await ctx.db
    .query("troop_leaders")
    .withIndex("by_user_troop", (q) => q.eq("userId", userId).eq("troopId", troopId))
    .unique();

  return leadership ? normalizeRole(leadership.role) : null;
}

export async function requireTroopViewer(
  ctx: AuthCtx,
  troopId: Id<"troops">,
): Promise<AuthorizedTroop> {
  const user = await requireCurrentUser(ctx);
  const troop = await ctx.db.get(troopId);
  if (!troop) authError("NOT_FOUND", "Oddíl nebyl nalezen.");

  const role = await getTroopRole(ctx, troopId, user._id);
  if (!role) authError("FORBIDDEN", "K tomuto oddílu nemáte přístup.");

  return { user, troop, role };
}

export async function requireTroopEditor(
  ctx: AuthCtx,
  troopId: Id<"troops">,
): Promise<AuthorizedTroop> {
  const authorization = await requireTroopViewer(ctx, troopId);
  if (authorization.role === "rover") {
    authError("FORBIDDEN", "Tuto akci může provést pouze vedoucí oddílu.");
  }
  return authorization;
}

export async function requireTroopManager(
  ctx: AuthCtx,
  troopId: Id<"troops">,
): Promise<AuthorizedTroop> {
  const authorization = await requireTroopViewer(ctx, troopId);
  if (authorization.role !== "owner" && authorization.role !== "main_leader") {
    authError("FORBIDDEN", "Tuto akci může provést pouze majitel nebo hlavní vedoucí.");
  }
  return authorization;
}

export async function requireTroopOwner(
  ctx: AuthCtx,
  troopId: Id<"troops">,
): Promise<AuthorizedTroop> {
  const authorization = await requireTroopViewer(ctx, troopId);
  if (authorization.role !== "owner") {
    authError("FORBIDDEN", "Tuto akci může provést pouze majitel oddílu.");
  }
  return authorization;
}

export async function requireTripViewer(
  ctx: AuthCtx,
  tripId: Id<"trips">,
): Promise<AuthorizedTrip> {
  const trip = await ctx.db.get(tripId);
  if (!trip) authError("NOT_FOUND", "Výprava nebyla nalezena.");
  const authorization = await requireTroopViewer(ctx, trip.troopId);
  return { ...authorization, trip };
}

export async function requireAssignedTripRover(
  ctx: AuthCtx,
  tripId: Id<"trips">,
  userId: Id<"users">,
): Promise<Doc<"trip_staff">> {
  const assignment = await ctx.db
    .query("trip_staff")
    .withIndex("by_user_trip", (q) => q.eq("userId", userId).eq("tripId", tripId))
    .unique();

  if (!assignment || assignment.role !== "rover") {
    authError("FORBIDDEN", "Rover může upravovat pouze výpravy, ke kterým je přiřazen.");
  }
  return assignment;
}

export async function requireTripEditor(
  ctx: AuthCtx,
  tripId: Id<"trips">,
): Promise<AuthorizedTrip> {
  const authorization = await requireTripViewer(ctx, tripId);
  if (authorization.role === "rover") {
    await requireAssignedTripRover(ctx, tripId, authorization.user._id);
  }
  return authorization;
}

export async function requireTripLeader(
  ctx: AuthCtx,
  tripId: Id<"trips">,
): Promise<AuthorizedTrip> {
  const authorization = await requireTripViewer(ctx, tripId);
  if (authorization.role === "rover") {
    authError("FORBIDDEN", "Tuto akci může provést pouze vedoucí výpravy.");
  }
  return authorization;
}

export async function requireMeetingViewer(
  ctx: AuthCtx,
  meetingId: Id<"meetings">,
) {
  const meeting = await ctx.db.get(meetingId);
  if (!meeting) authError("NOT_FOUND", "Schůzka nebyla nalezena.");
  const authorization = meeting.tripId
    ? await requireTripViewer(ctx, meeting.tripId)
    : await requireTroopViewer(ctx, meeting.troopId);
  return { ...authorization, meeting };
}

export async function requireMeetingEditor(
  ctx: AuthCtx,
  meetingId: Id<"meetings">,
) {
  const meeting = await ctx.db.get(meetingId);
  if (!meeting) authError("NOT_FOUND", "Schůzka nebyla nalezena.");
  const authorization = meeting.tripId
    ? await requireTripEditor(ctx, meeting.tripId)
    : await requireTroopEditor(ctx, meeting.troopId);
  return { ...authorization, meeting };
}

export async function requireDocumentViewer(
  ctx: AuthCtx,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (!document) authError("NOT_FOUND", "Dokument nebyl nalezen.");
  const authorization = await requireMeetingViewer(ctx, document.meetingId);
  if (authorization.meeting.troopId !== document.troopId) {
    authError("FORBIDDEN", "Dokument nepatří do tohoto oddílu.");
  }
  return { ...authorization, document };
}

export async function requireDocumentEditor(
  ctx: AuthCtx,
  documentId: Id<"documents">,
) {
  const document = await ctx.db.get(documentId);
  if (!document) authError("NOT_FOUND", "Dokument nebyl nalezen.");
  const authorization = await requireMeetingEditor(ctx, document.meetingId);
  if (authorization.meeting.troopId !== document.troopId) {
    authError("FORBIDDEN", "Dokument nepatří do tohoto oddílu.");
  }
  return { ...authorization, document };
}

export async function requirePageViewer(ctx: AuthCtx, pageId: Id<"meeting_pages">) {
  const page = await ctx.db.get(pageId);
  if (!page) authError("NOT_FOUND", "Stránka nebyla nalezena.");
  const authorization = await requireMeetingViewer(ctx, page.meetingId);
  return { ...authorization, page };
}

export async function requirePageEditor(ctx: AuthCtx, pageId: Id<"meeting_pages">) {
  const page = await ctx.db.get(pageId);
  if (!page) authError("NOT_FOUND", "Stránka nebyla nalezena.");
  const authorization = await requireMeetingEditor(ctx, page.meetingId);
  return { ...authorization, page };
}

export async function requireMeetingFileViewer(
  ctx: AuthCtx,
  fileId: Id<"meeting_files">,
) {
  const file = await ctx.db.get(fileId);
  if (!file) authError("NOT_FOUND", "Soubor nebyl nalezen.");
  const authorization = await requireMeetingViewer(ctx, file.meetingId);
  return { ...authorization, file };
}

export async function requireMeetingFileEditor(
  ctx: AuthCtx,
  fileId: Id<"meeting_files">,
) {
  const file = await ctx.db.get(fileId);
  if (!file) authError("NOT_FOUND", "Soubor nebyl nalezen.");
  const authorization = await requireMeetingEditor(ctx, file.meetingId);
  return { ...authorization, file };
}
