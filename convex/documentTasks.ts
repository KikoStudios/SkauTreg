import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  authError,
  getTroopRole,
  requireDocumentEditor,
  requireDocumentViewer,
  requireTroopViewer,
} from "./lib/auth";

const statusValidator = v.union(
  v.literal("todo"),
  v.literal("in_progress"),
  v.literal("blocked"),
  v.literal("done"),
  v.literal("cancelled"),
);

const priorityValidator = v.union(
  v.literal("low"),
  v.literal("normal"),
  v.literal("high"),
  v.literal("critical"),
);

const priorityRank = { low: 0, normal: 1, high: 2, critical: 3 } as const;

function normalizeTags(tags: string[]) {
  const cleaned = tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12);
  return {
    tags: [...new Set(cleaned)],
    tagsNormalized: [...new Set(cleaned.map((tag) => tag.toLocaleLowerCase("cs")))],
  };
}

async function assertAssigneesBelongToTroop(
  ctx: MutationCtx,
  troopId: Id<"troops">,
  assigneeIds: Id<"users">[],
) {
  const unique = [...new Set(assigneeIds)];
  for (const assigneeId of unique) {
    if (!(await getTroopRole(ctx, troopId, assigneeId))) {
      authError("VALIDATION_ERROR", "Přiřazený vedoucí nepatří do tohoto oddílu.");
    }
  }
  return unique;
}

async function replaceAssigneeRows(
  ctx: MutationCtx,
  taskId: Id<"document_tasks">,
  troopId: Id<"troops">,
  assigneeIds: Id<"users">[],
  isOpen: boolean,
  dueAt?: number,
) {
  const existing = await ctx.db
    .query("document_task_assignees")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const row of existing) await ctx.db.delete(row._id);
  for (const assigneeId of assigneeIds) {
    await ctx.db.insert("document_task_assignees", { troopId, taskId, assigneeId, isOpen, dueAt });
  }
}

export const list = query({
  args: {
    troopId: v.id("troops"),
    openOnly: v.optional(v.boolean()),
    documentId: v.optional(v.id("documents")),
    assigneeId: v.optional(v.id("users")),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    tag: v.optional(v.string()),
    dueFrom: v.optional(v.number()),
    dueTo: v.optional(v.number()),
    sortBy: v.optional(v.union(v.literal("due"), v.literal("priority"), v.literal("created"))),
  },
  handler: async (ctx, args) => {
    await requireTroopViewer(ctx, args.troopId);
    const openOnly = args.openOnly ?? true;
    let tasks;

    if (args.documentId) {
      const { document } = await requireDocumentViewer(ctx, args.documentId);
      if (document.troopId !== args.troopId) authError("FORBIDDEN", "Dokument nepatří do oddílu.");
      tasks = await ctx.db
        .query("document_tasks")
        .withIndex("by_troop_document", (q) => q.eq("troopId", args.troopId).eq("documentId", args.documentId!))
        .take(500);
    } else if (args.assigneeId) {
      const rows = await ctx.db
        .query("document_task_assignees")
        .withIndex("by_assignee_open_due", (q) => {
          const assigned = q.eq("troopId", args.troopId).eq("assigneeId", args.assigneeId!);
          return openOnly ? assigned.eq("isOpen", true) : assigned;
        })
        .take(500);
      tasks = (await Promise.all(rows.map((row) => ctx.db.get(row.taskId)))).filter((task) => task !== null);
    } else {
      tasks = await ctx.db
        .query("document_tasks")
        .withIndex("by_troop_open_due", (q) => {
          const troopTasks = q.eq("troopId", args.troopId);
          return openOnly ? troopTasks.eq("isOpen", true) : troopTasks;
        })
        .take(500);
    }

    const normalizedTag = args.tag?.trim().toLocaleLowerCase("cs");
    const filtered = tasks.filter((task) =>
      (!openOnly || task.isOpen) &&
      (!args.status || task.status === args.status) &&
      (!args.priority || task.priority === args.priority) &&
      (!normalizedTag || task.tagsNormalized.includes(normalizedTag)) &&
      (args.dueFrom === undefined || (task.dueAt !== undefined && task.dueAt >= args.dueFrom)) &&
      (args.dueTo === undefined || (task.dueAt !== undefined && task.dueAt <= args.dueTo)),
    );

    filtered.sort((a, b) => {
      if (args.sortBy === "priority") return b.priorityRank - a.priorityRank || (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER);
      if (args.sortBy === "created") return b.createdAt - a.createdAt;
      return (a.dueAt ?? Number.MAX_SAFE_INTEGER) - (b.dueAt ?? Number.MAX_SAFE_INTEGER) || b.priorityRank - a.priorityRank;
    });

    return Promise.all(
      filtered.map(async (task) => {
        const assignees = (await Promise.all(task.assigneeIds.map((id) => ctx.db.get(id))))
          .filter((user) => user !== null)
          .map((user) => ({ id: user._id, name: user.name || user.email || "Vedoucí", image: user.image }));
        return {
          ...task,
          assignees,
          sourceHref: `/troop/${task.troopId}/documents/${task.documentId}?page=${task.sourcePageId}&task=${task._id}#b_${task.sourceBlockId}`,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    documentId: v.id("documents"),
    sourcePageId: v.id("meeting_pages"),
    sourceBlockId: v.string(),
    taskKey: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    priority: v.optional(priorityValidator),
    assigneeIds: v.optional(v.array(v.id("users"))),
    dueAt: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    sourceExcerpt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { document, meeting, user } = await requireDocumentEditor(ctx, args.documentId);
    const page = await ctx.db.get(args.sourcePageId);
    if (!page || page.meetingId !== meeting._id) authError("VALIDATION_ERROR", "Zdrojová stránka nepatří do dokumentu.");
    const title = args.title.trim();
    if (!title || title.length > 240) authError("VALIDATION_ERROR", "Úkol musí mít 1 až 240 znaků.");
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(args.taskKey)) authError("VALIDATION_ERROR", "Neplatný klíč úkolu.");

    const existing = await ctx.db
      .query("document_tasks")
      .withIndex("by_task_key", (q) => q.eq("taskKey", args.taskKey))
      .unique();
    if (existing) {
      if (existing.documentId !== args.documentId) authError("VALIDATION_ERROR", "Klíč úkolu již existuje.");
      return existing._id;
    }

    const assigneeIds = await assertAssigneesBelongToTroop(ctx, document.troopId, args.assigneeIds ?? []);
    const tags = normalizeTags(args.tags ?? []);
    const priority = args.priority ?? "normal";
    const now = Date.now();
    const taskId = await ctx.db.insert("document_tasks", {
      troopId: document.troopId,
      documentId: document._id,
      sourcePageId: args.sourcePageId,
      sourceBlockId: args.sourceBlockId,
      taskKey: args.taskKey,
      title,
      description: args.description?.trim() || undefined,
      status: "todo",
      isOpen: true,
      priority,
      priorityRank: priorityRank[priority],
      assigneeIds,
      dueAt: args.dueAt,
      ...tags,
      sourceDocumentTitle: document.title,
      sourceExcerpt: args.sourceExcerpt?.trim() || title,
      sourceVersion: document.contentVersion,
      sourceState: "linked",
      meetingStartAt: (await ctx.db
        .query("schuzka_setups")
        .withIndex("by_document", (q) => q.eq("documentId", document._id))
        .unique())?.scheduledStartAt,
      createdBy: user._id,
      updatedBy: user._id,
      createdAt: now,
      updatedAt: now,
    });
    await replaceAssigneeRows(ctx, taskId, document.troopId, assigneeIds, true, args.dueAt);
    return taskId;
  },
});

export const update = mutation({
  args: {
    taskId: v.id("document_tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(statusValidator),
    priority: v.optional(priorityValidator),
    assigneeIds: v.optional(v.array(v.id("users"))),
    dueAt: v.optional(v.union(v.number(), v.null())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) authError("NOT_FOUND", "Úkol nebyl nalezen.");
    const { document, user } = await requireDocumentEditor(ctx, task.documentId);
    const title = args.title?.trim();
    if (args.title !== undefined && (!title || title.length > 240)) {
      authError("VALIDATION_ERROR", "Úkol musí mít 1 až 240 znaků.");
    }
    const status = args.status ?? task.status;
    const isOpen = status !== "done" && status !== "cancelled";
    const priority = args.priority ?? task.priority;
    const assigneeIds = args.assigneeIds
      ? await assertAssigneesBelongToTroop(ctx, document.troopId, args.assigneeIds)
      : task.assigneeIds;
    const dueAt = args.dueAt === null ? undefined : args.dueAt ?? task.dueAt;
    const tags = args.tags ? normalizeTags(args.tags) : { tags: task.tags, tagsNormalized: task.tagsNormalized };
    const now = Date.now();

    await ctx.db.patch(task._id, {
      ...(title ? { title } : {}),
      ...(args.description !== undefined ? { description: args.description.trim() || undefined } : {}),
      status,
      isOpen,
      priority,
      priorityRank: priorityRank[priority],
      assigneeIds,
      dueAt,
      ...tags,
      updatedBy: user._id,
      updatedAt: now,
      completedAt: status === "done" ? task.completedAt ?? now : undefined,
    });
    await replaceAssigneeRows(ctx, task._id, document.troopId, assigneeIds, isOpen, dueAt);
  },
});
