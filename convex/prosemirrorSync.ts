// convex/prosemirrorSync.ts
import { components, internal } from "./_generated/api";
import { ProsemirrorSync } from "@convex-dev/prosemirror-sync";
import type { DataModel } from "./_generated/dataModel";
import { authError, requirePageEditor, requirePageViewer } from "./lib/auth";

const prosemirrorSync = new ProsemirrorSync(components.prosemirrorSync);

function textFromNode(node: unknown): string {
    if (!node || typeof node !== "object") return "";
    const value = node as { text?: unknown; content?: unknown[] };
    if (typeof value.text === "string") return value.text;
    return Array.isArray(value.content) ? value.content.map(textFromNode).join(" ").replace(/\s+/g, " ").trim() : "";
}

function contentHash(value: string) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function minutes(value: string) {
    const [hours, mins] = value.split(":").map(Number);
    return hours * 60 + mins;
}

// Export the sync API for pages (documents)
export const {
    getSnapshot,
    submitSnapshot,
    latestVersion,
    getSteps,
    submitSteps,
} = prosemirrorSync.syncApi<DataModel>({
    checkRead: async (ctx, id) => {
        const pageId = ctx.db.normalizeId("meeting_pages", id);
        if (!pageId) authError("NOT_FOUND", "Stránka nebyla nalezena.");
        await requirePageViewer(ctx, pageId);
    },
    checkWrite: async (ctx, id) => {
        const pageId = ctx.db.normalizeId("meeting_pages", id);
        if (!pageId) authError("NOT_FOUND", "Stránka nebyla nalezena.");
        await requirePageEditor(ctx, pageId);
    },
    onSnapshot: async (ctx, id, snapshot, version) => {
        const pageId = ctx.db.normalizeId("meeting_pages", id);
        if (!pageId) return;
        const { page } = await requirePageEditor(ctx, pageId);
        const document = await ctx.db
            .query("documents")
            .withIndex("by_meeting", (q) => q.eq("meetingId", page.meetingId))
            .unique();
        if (!document || version <= document.contentVersion) return;

        let parsed: { content?: Array<{ type?: string; attrs?: { blockId?: string; gameId?: string }; content?: unknown[]; text?: string }> };
        try {
            parsed = JSON.parse(snapshot) as typeof parsed;
        } catch {
            return;
        }
        const nodes = Array.isArray(parsed.content) ? parsed.content : [];
        const existing = await ctx.db
            .query("document_blocks")
            .withIndex("by_page_order", (q) => q.eq("pageId", pageId))
            .collect();
        const existingByBlock = new Map(existing.map((block) => [block.blockId, block]));
        const seen = new Set<string>();
        const changedBlockIds: string[] = [];
        let phase: "plan" | "outcome" | "neutral" = document.kind === "schuzka" ? "plan" : "neutral";

        for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            const text = textFromNode(node);
            if (/^(outcome|výsledek|závěr|rozhodnutí)\b/i.test(text)) phase = "outcome";
            const blockId = node.attrs?.blockId || `legacy-${pageId}-${index}`;
            const normalizedText = text.toLocaleLowerCase("cs").replace(/\s+/g, " ").trim();
            const hash = contentHash(`${node.type || "paragraph"}:${node.attrs?.gameId || ""}:${normalizedText}`);
            const range = text.match(/\b((?:[01]?\d|2[0-3]):[0-5]\d)\s*(?:-|–|—)\s*((?:[01]?\d|2[0-3]):[0-5]\d)\b/);
            const requestedGameId = node.attrs?.gameId ? ctx.db.normalizeId("games", node.attrs.gameId) : null;
            const game = requestedGameId ? await ctx.db.get(requestedGameId) : null;
            const values = {
                troopId: document.troopId,
                documentId: document._id,
                pageId,
                blockId,
                blockType: node.type || "paragraph",
                phase,
                orderKey: String(index).padStart(8, "0"),
                text,
                normalizedText,
                contentHash: hash,
                sourceVersion: version,
                agendaStartMinute: range ? minutes(range[1]) : undefined,
                agendaEndMinute: range ? minutes(range[2]) : undefined,
                gameId: game?.troopId === document.troopId ? game._id : undefined,
                updatedAt: Date.now(),
                deletedAt: undefined,
            };
            const prior = existingByBlock.get(blockId);
            const changed = !prior || prior.contentHash !== hash || prior.orderKey !== values.orderKey || Boolean(prior.deletedAt);
            if (!prior) {
                await ctx.db.insert("document_blocks", values);
                changedBlockIds.push(blockId);
            } else if (changed) {
                await ctx.db.patch(prior._id, values);
                changedBlockIds.push(blockId);
            }
            if (changed) {
                const entityId = `${pageId}:${blockId}`;
                const searchChunk = await ctx.db.query("document_search_chunks").withIndex("by_entity", (q) => q.eq("entityType", "document_block").eq("entityId", entityId)).unique();
                const searchValues = {
                    troopId: document.troopId,
                    entityType: "document_block",
                    entityId,
                    documentId: document._id,
                    pageId,
                    blockId,
                    title: document.title,
                    text,
                    searchText: `${document.title} ${text}`,
                    href: `/troop/${document.troopId}/documents/${document._id}?page=${pageId}#b_${blockId}`,
                    contentHash: hash,
                    sourceVersion: version,
                    updatedAt: Date.now(),
                    deletedAt: undefined,
                };
                if (searchChunk) await ctx.db.patch(searchChunk._id, searchValues);
                else await ctx.db.insert("document_search_chunks", searchValues);
            }
            seen.add(blockId);
        }

        for (const prior of existing) {
            if (!seen.has(prior.blockId) && !prior.deletedAt) {
                await ctx.db.patch(prior._id, { deletedAt: Date.now(), sourceVersion: version, updatedAt: Date.now() });
                const entityId = `${pageId}:${prior.blockId}`;
                const searchChunk = await ctx.db.query("document_search_chunks").withIndex("by_entity", (q) => q.eq("entityType", "document_block").eq("entityId", entityId)).unique();
                if (searchChunk) await ctx.db.patch(searchChunk._id, { deletedAt: Date.now(), sourceVersion: version, updatedAt: Date.now() });
            }
        }
        await ctx.db.patch(document._id, { contentVersion: version, updatedAt: Date.now() });
        if (changedBlockIds.length > 0) {
            await ctx.scheduler.runAfter(650, internal.documentAI.queueProjectedSnapshot, {
                documentId: document._id,
                pageId,
                requestedVersion: version,
                changedBlockIds,
            });
        }
    },
});
