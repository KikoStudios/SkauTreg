import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireTroopViewer } from "./lib/auth";

export const search = query({
  args: { troopId: v.id("troops"), search: v.string() },
  handler: async (ctx, { troopId, search }) => {
    await requireTroopViewer(ctx, troopId);
    const clean = search.trim().split(/\s+/).slice(0, 16).join(" ");
    if (!clean) return [];

    const [chunks, documents, games] = await Promise.all([
      ctx.db
        .query("document_search_chunks")
        .withSearchIndex("search_content", (q) => q.search("searchText", clean).eq("troopId", troopId))
        .take(20),
      ctx.db
        .query("documents")
        .withSearchIndex("search_title", (q) => q.search("title", clean).eq("troopId", troopId))
        .take(10),
      ctx.db
        .query("games")
        .withSearchIndex("search_games", (q) => q.search("searchText", clean).eq("troopId", troopId))
        .take(10),
    ]);

    return [
      ...chunks.filter((chunk) => !chunk.deletedAt).map((chunk) => ({
        id: String(chunk._id), type: chunk.entityType, title: chunk.title,
        excerpt: chunk.text.slice(0, 240), href: chunk.href, updatedAt: chunk.updatedAt,
      })),
      ...documents.map((document) => ({
        id: String(document._id), type: "document", title: document.title,
        excerpt: document.description || "Dokument oddílu",
        href: `/troop/${troopId}/documents/${document._id}`, updatedAt: document.updatedAt,
      })),
      ...games.filter((game) => !game.archivedAt).map((game) => ({
        id: String(game._id), type: "game", title: game.name,
        excerpt: game.description.slice(0, 240), href: `/troop/${troopId}/documents?view=games&game=${game._id}`,
        updatedAt: game.updatedAt,
      })),
    ].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
  },
});
