import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import schema from "../../convex/schema";

const modules = import.meta.glob("../../convex/**/*.ts");

async function seed() {
  const t = convexTest(schema, modules);
  const fixture = await t.run(async (ctx) => {
    const ownerId = await ctx.db.insert("users", { name: "Owner", tokenIdentifier: "test|doc-owner" });
    const outsiderId = await ctx.db.insert("users", { name: "Outsider", tokenIdentifier: "test|doc-outsider" });
    const troopId = await ctx.db.insert("troops", { name: "Oddíl", ownerId, publicDirectoryOptIn: false });
    const otherTroopId = await ctx.db.insert("troops", { name: "Jiný oddíl", ownerId: outsiderId, publicDirectoryOptIn: false });
    return { ownerId, outsiderId, troopId, otherTroopId };
  });
  return { t, fixture, owner: t.withIdentity({ tokenIdentifier: "test|doc-owner" }), outsider: t.withIdentity({ tokenIdentifier: "test|doc-outsider" }) };
}

async function createSchuzka(owner: ReturnType<Awaited<ReturnType<typeof seed>>["t"]["withIdentity"]>, troopId: Id<"troops">) {
  const startsAt = Date.UTC(2026, 9, 12, 16, 0);
  const created = await owner.mutation(api.documents.create, {
    troopId,
    kind: "schuzka",
    title: "Schůzka 12. 10.",
    scheduledStartAt: startsAt,
    scheduledEndAt: startsAt + 45 * 60_000,
    timezone: "Europe/Prague",
  });
  return { ...created, startsAt };
}

describe("Dokumenty domain", () => {
  it("creates Schůzka as a document and projects it into the calendar", async () => {
    const { owner, fixture } = await seed();
    const created = await createSchuzka(owner, fixture.troopId);

    const documents = await owner.query(api.documents.list, { troopId: fixture.troopId });
    expect(documents).toHaveLength(1);
    expect(documents[0]).toMatchObject({ kind: "schuzka", lifecycle: "plan", pageCount: 1 });

    const items = await owner.query(api.documentCalendar.listRange, {
      troopId: fixture.troopId,
      from: created.startsAt - 1,
      to: created.startsAt + 86_400_000,
    });
    expect(items).toEqual([expect.objectContaining({ type: "schuzka", title: "Schůzka 12. 10.", startsAt: created.startsAt })]);
  });

  it("aggregates completed and open tasks and keeps an exact source link", async () => {
    const { owner, fixture } = await seed();
    const created = await createSchuzka(owner, fixture.troopId);
    const taskId = await owner.mutation(api.documentTasks.create, {
      documentId: created.documentId,
      sourcePageId: created.pageId,
      sourceBlockId: "agenda-materials",
      taskKey: "task-source-001",
      title: "Vzít lana",
      dueAt: created.startsAt - 60_000,
      tags: ["Materiál"],
    });

    const open = await owner.query(api.documentTasks.list, { troopId: fixture.troopId, openOnly: true });
    expect(open).toHaveLength(1);
    expect(open[0].sourceHref).toContain(`#b_agenda-materials`);

    await owner.mutation(api.documentTasks.update, { taskId, status: "done" });
    expect(await owner.query(api.documentTasks.list, { troopId: fixture.troopId, openOnly: true })).toEqual([]);
    const all = await owner.query(api.documentTasks.list, { troopId: fixture.troopId, openOnly: false });
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ status: "done", isOpen: false });
  });

  it("enforces troop boundaries and lifecycle transitions", async () => {
    const { t, owner, outsider, fixture } = await seed();
    const created = await createSchuzka(owner, fixture.troopId);
    await expect(outsider.query(api.documents.get, { documentId: created.documentId })).rejects.toThrow();
    await expect(t.query(api.prosemirrorSync.getSnapshot, { id: created.pageId })).rejects.toThrow();
    await expect(outsider.query(api.prosemirrorSync.getSnapshot, { id: created.pageId })).rejects.toThrow();
    await expect(owner.mutation(api.documentTasks.create, {
      documentId: created.documentId,
      sourcePageId: created.pageId,
      sourceBlockId: "document-root",
      taskKey: "task-foreign-001",
      title: "Cross troop",
      assigneeIds: [fixture.outsiderId],
    })).rejects.toThrow();
    await expect(owner.mutation(api.documents.transitionLifecycle, { documentId: created.documentId, lifecycle: "final" })).rejects.toThrow();
    await owner.mutation(api.documents.transitionLifecycle, { documentId: created.documentId, lifecycle: "in_session" });
    await owner.mutation(api.documents.transitionLifecycle, { documentId: created.documentId, lifecycle: "outcome" });
    await owner.mutation(api.documents.transitionLifecycle, { documentId: created.documentId, lifecycle: "final" });
    expect((await owner.query(api.documents.get, { documentId: created.documentId })).lifecycle).toBe("final");
  });

  it("keeps AI extraction non-destructive until accepted", async () => {
    const { t, owner, fixture } = await seed();
    const created = await createSchuzka(owner, fixture.troopId);
    const suggestionId = await t.run(async (ctx) => {
      await ctx.db.insert("document_blocks", {
        troopId: fixture.troopId, documentId: created.documentId, pageId: created.pageId,
        blockId: "prep-block", blockType: "paragraph", phase: "plan", orderKey: "00000000",
        text: "Připravit lana", normalizedText: "připravit lana", contentHash: "hash", sourceVersion: 0, updatedAt: Date.now(),
      });
      const runId = await ctx.db.insert("document_ai_runs", {
        troopId: fixture.troopId, documentId: created.documentId, pageId: created.pageId,
        requestedVersion: 0, generation: 1, status: "complete", createdAt: Date.now(), completedAt: Date.now(),
      });
      const jobId = await ctx.db.insert("document_ai_jobs", {
        runId, troopId: fixture.troopId, documentId: created.documentId, pageId: created.pageId,
        blockId: "prep-block", processor: "extract_tasks", schemaVersion: "extract_tasks.v1",
        modelProfile: "fast-structured-cs-v1", inputHash: "input", requestedVersion: 0,
        status: "succeeded", attempt: 1, confidence: .91, outputJson: {}, createdAt: Date.now(), completedAt: Date.now(),
      });
      return ctx.db.insert("document_ai_suggestions", {
        troopId: fixture.troopId, documentId: created.documentId, pageId: created.pageId,
        blockId: "prep-block", jobId, kind: "extract_tasks",
        payload: { tasks: [{ block_id: "prep-block", title: "Připravit lana", priority: "high", tags: ["materiál"], confidence: .91 }] },
        confidence: .91, sourceVersion: 0, state: "pending", createdAt: Date.now(),
      });
    });

    expect(await owner.query(api.documentTasks.list, { troopId: fixture.troopId })).toEqual([]);
    const resolved = await owner.mutation(api.documentAI.resolveSuggestion, { suggestionId, decision: "accept" });
    expect(resolved.createdTaskIds).toHaveLength(1);
    const tasks = await owner.query(api.documentTasks.list, { troopId: fixture.troopId });
    expect(tasks[0]).toMatchObject({ title: "Připravit lana", priority: "high", aiConfidence: .91, sourceBlockId: "prep-block" });
  });
});
