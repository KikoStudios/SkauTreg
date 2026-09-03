import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authError, requireDocumentEditor, requireDocumentViewer } from "./lib/auth";

const processors = [
  "segment_agenda",
  "extract_tasks",
  "extract_materials",
  "resolve_dates",
  "detect_people_roles",
  "generate_tags",
  "generate_task_context",
] as const;

const PROCESSOR_CONCURRENCY = 2;
const PROCESSING_DEBOUNCE_MS = 1_800;

function hashInput(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

const outputCollections: Record<string, string> = {
  segment_agenda: "segments",
  extract_tasks: "tasks",
  extract_materials: "materials",
  resolve_dates: "dates",
  detect_people_roles: "people",
  generate_tags: "tags",
  generate_task_context: "summaries",
};

const requiredOutputFields: Record<string, string> = {
  segment_agenda: "label",
  extract_tasks: "title",
  extract_materials: "name",
  resolve_dates: "iso",
  detect_people_roles: "name",
  generate_tags: "value",
  generate_task_context: "summary",
};

function validateProcessorOutput(processor: string, output: unknown) {
  if (!output || typeof output !== "object" || Array.isArray(output)) throw new Error("SCHEMA_INVALID");
  const collection = outputCollections[processor];
  const items = (output as Record<string, unknown>)[collection];
  if (!collection || !Array.isArray(items) || items.length > 50) throw new Error("SCHEMA_INVALID");
  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("SCHEMA_INVALID");
    const record = item as Record<string, unknown>;
    if (typeof record.block_id !== "string" || record.block_id.length > 160) throw new Error("SCHEMA_INVALID");
    const requiredField = requiredOutputFields[processor];
    if (!requiredField || typeof record[requiredField] !== "string" || !(record[requiredField] as string).trim() || (record[requiredField] as string).length > 2000) throw new Error("SCHEMA_INVALID");
    if (record.confidence !== undefined && (typeof record.confidence !== "number" || record.confidence < 0 || record.confidence > 1)) throw new Error("SCHEMA_INVALID");
  }
  return output;
}

function processorItems(job: Doc<"document_ai_jobs"> | undefined, collection: string, blockId?: string) {
  const output = job?.outputJson as Record<string, unknown> | undefined;
  const items = output?.[collection];
  if (!Array.isArray(items)) return [];
  return items.filter((item): item is Record<string, unknown> =>
    !!item && typeof item === "object" && (!blockId || (item as Record<string, unknown>).block_id === blockId),
  );
}

function normalizePersonName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").trim().toLocaleLowerCase("cs");
}

function hasExplicitTaskSignal(text: string) {
  return /\b(?:má|musí|připrav(?:it|í|te)?|vzít|vezm(?:e|ou)|donést|donese|přinést|přinese|zajistit|zajistí|udělat|udělá|poslat|pošle|objednat|objedná|ověřit|ověří|zkontrolovat|zkontroluje|domluvit|domluví|je\s+třeba|je\s+potřeba)\b/iu.test(text);
}

async function materializeTaskItems(
  ctx: MutationCtx,
  args: {
    document: Doc<"documents">;
    pageId: Id<"meeting_pages">;
    fallbackBlockId: string;
    sourceVersion: number;
    jobId: Id<"document_ai_jobs">;
    createdBy: Id<"users">;
    items: Array<Record<string, unknown>>;
    siblingJobs: Array<Doc<"document_ai_jobs">>;
  },
) {
  const createdTaskIds: Id<"document_tasks">[] = [];
  const leaderLinks = await ctx.db.query("troop_leaders").withIndex("by_troop", (q) => q.eq("troopId", args.document.troopId)).collect();
  const leaders = (await Promise.all(leaderLinks.map(async (link) => ({ link, user: await ctx.db.get(link.userId) })))).filter((entry) => entry.user);
  const setup = await ctx.db.query("schuzka_setups").withIndex("by_document", (q) => q.eq("documentId", args.document._id)).unique();

  for (const item of args.items.slice(0, 20)) {
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 240) : "";
    if (!title) continue;
    const requestedBlockId = typeof item.block_id === "string" ? item.block_id : args.fallbackBlockId;
    const requestedBlock = await ctx.db.query("document_blocks").withIndex("by_page_block", (q) => q.eq("pageId", args.pageId).eq("blockId", requestedBlockId)).unique();
    const blockId = requestedBlock?.documentId === args.document._id ? requestedBlockId : args.fallbackBlockId;
    const sourceBlock = blockId === requestedBlockId
      ? requestedBlock
      : await ctx.db.query("document_blocks").withIndex("by_page_block", (q) => q.eq("pageId", args.pageId).eq("blockId", blockId)).unique();
    const taskKey = `ai_${hashInput(`${args.document._id}:${args.pageId}`)}_${hashInput(`${blockId}:${title.toLocaleLowerCase("cs")}`)}`;
    const existing = await ctx.db.query("document_tasks").withIndex("by_task_key", (q) => q.eq("taskKey", taskKey)).unique();
    if (existing) continue;

    const priority = item.priority === "low" || item.priority === "high" || item.priority === "critical" ? item.priority : "normal";
    const generatedTags = processorItems(
      args.siblingJobs.find((candidate) => candidate.processor === "generate_tags" && (candidate.status === "succeeded" || candidate.status === "cache_hit")),
      "tags",
      blockId,
    ).map((tag) => tag.value).filter((tag): tag is string => typeof tag === "string");
    const tags = [...new Set([
      ...(Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : []),
      ...generatedTags,
    ].map((tag) => tag.trim()).filter(Boolean))].slice(0, 12);
    const resolvedDate = processorItems(
      args.siblingJobs.find((candidate) => candidate.processor === "resolve_dates" && (candidate.status === "succeeded" || candidate.status === "cache_hit")),
      "dates",
      blockId,
    ).map((date) => date.iso).find((iso): iso is string => typeof iso === "string" && Number.isFinite(Date.parse(iso)));
    const dueSource = typeof item.due_at === "string" && Number.isFinite(Date.parse(item.due_at)) ? item.due_at : resolvedDate;
    const dueAt = dueSource ? Date.parse(dueSource) : undefined;
    const summary = processorItems(
      args.siblingJobs.find((candidate) => candidate.processor === "generate_task_context" && (candidate.status === "succeeded" || candidate.status === "cache_hit")),
      "summaries",
      blockId,
    ).map((entry) => entry.summary).find((value): value is string => typeof value === "string" && !!value.trim());
    const requestedAssignees = Array.isArray(item.assignee_names)
      ? item.assignee_names.filter((name): name is string => typeof name === "string").map(normalizePersonName)
      : [];
    const assigneeIds = requestedAssignees.flatMap((requestedName) => {
      const matches = leaders.filter(({ user }) => {
        const fullName = normalizePersonName(user?.name || "");
        return fullName === requestedName || fullName.split(/\s+/)[0] === requestedName;
      });
      return matches.length === 1 ? [matches[0].link.userId] : [];
    }).filter((userId, position, all) => all.indexOf(userId) === position);
    const now = Date.now();
    const taskId = await ctx.db.insert("document_tasks", {
      troopId: args.document.troopId,
      documentId: args.document._id,
      sourcePageId: args.pageId,
      sourceBlockId: blockId,
      taskKey,
      title,
      description: typeof item.description === "string" ? item.description.trim().slice(0, 2000) || undefined : undefined,
      status: "todo",
      isOpen: true,
      priority,
      priorityRank: priority === "critical" ? 3 : priority === "high" ? 2 : priority === "low" ? 0 : 1,
      assigneeIds,
      dueAt,
      tags,
      tagsNormalized: tags.map((tag) => tag.toLocaleLowerCase("cs")),
      sourceDocumentTitle: args.document.title,
      sourceExcerpt: sourceBlock?.text || title,
      sourceVersion: args.sourceVersion,
      sourceState: sourceBlock ? "linked" : "linking",
      meetingStartAt: setup?.scheduledStartAt,
      aiSummary: summary?.trim().slice(0, 300),
      aiConfidence: typeof item.confidence === "number" ? item.confidence : undefined,
      aiJobId: args.jobId,
      createdBy: args.createdBy,
      updatedBy: args.createdBy,
      createdAt: now,
      updatedAt: now,
    });
    for (const assigneeId of assigneeIds) {
      await ctx.db.insert("document_task_assignees", { troopId: args.document.troopId, taskId, assigneeId, isOpen: true, dueAt });
    }
    createdTaskIds.push(taskId);
  }
  return createdTaskIds;
}

export const queueProjectedSnapshot = internalMutation({
  args: {
    documentId: v.id("documents"),
    pageId: v.id("meeting_pages"),
    requestedVersion: v.number(),
    changedBlockIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.documentId);
    if (!document || document.contentVersion !== args.requestedVersion) return;
    const previousRuns = await ctx.db
      .query("document_ai_runs")
      .withIndex("by_document_created", (q) => q.eq("documentId", args.documentId))
      .order("desc")
      .take(10);
    const generation = (previousRuns[0]?.generation ?? 0) + 1;
    for (const run of previousRuns.filter((run) => run.status === "queued" || run.status === "running")) {
      await ctx.db.patch(run._id, { status: "stale", completedAt: Date.now() });
      if (run.scheduledId) await ctx.scheduler.cancel(run.scheduledId).catch(() => undefined);
      const jobs = await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", run._id)).collect();
      for (const job of jobs) await ctx.db.patch(job._id, { status: "stale", completedAt: Date.now() });
    }
    const pendingSuggestions = await ctx.db
      .query("document_ai_suggestions")
      .withIndex("by_document_state", (q) => q.eq("documentId", args.documentId).eq("state", "pending"))
      .take(100);
    for (const suggestion of pendingSuggestions.filter((suggestion) => suggestion.sourceVersion !== args.requestedVersion)) {
      await ctx.db.patch(suggestion._id, { state: "stale", resolvedAt: Date.now() });
    }

    const runId = await ctx.db.insert("document_ai_runs", {
      troopId: document.troopId,
      documentId: document._id,
      pageId: args.pageId,
      requestedVersion: args.requestedVersion,
      generation,
      status: "queued",
      createdAt: Date.now(),
    });
    const inputHash = hashInput(`${args.documentId}:${args.requestedVersion}:${args.changedBlockIds.join(",")}`);
    for (const processor of processors) {
      await ctx.db.insert("document_ai_jobs", {
        runId,
        troopId: document.troopId,
        documentId: document._id,
        pageId: args.pageId,
        blockId: args.changedBlockIds[0],
        processor,
        schemaVersion: `${processor}.v1`,
        modelProfile: "fast-structured-cs-v1",
        inputHash,
        requestedVersion: args.requestedVersion,
        status: "queued",
        attempt: 0,
        createdAt: Date.now(),
      });
    }
    const scheduledId = await ctx.scheduler.runAfter(PROCESSING_DEBOUNCE_MS, internal.documentAI.executeRun, { runId, changedBlockIds: args.changedBlockIds });
    await ctx.db.patch(runId, { scheduledId });
  },
});

export const loadRun = internalQuery({
  args: { runId: v.id("document_ai_runs"), changedBlockIds: v.array(v.string()) },
  handler: async (ctx, { runId, changedBlockIds }) => {
    const run = await ctx.db.get(runId);
    if (!run) return null;
    const [document, jobs, allBlocks, setup] = await Promise.all([
      ctx.db.get(run.documentId),
      ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", runId)).collect(),
      ctx.db.query("document_blocks").withIndex("by_page_order", (q) => q.eq("pageId", run.pageId)).collect(),
      ctx.db.query("schuzka_setups").withIndex("by_document", (q) => q.eq("documentId", run.documentId)).unique(),
    ]);
    if (!document) return null;
    const visible = allBlocks.filter((block) => !block.deletedAt);
    const selected = visible.filter((block, index) => {
      if (changedBlockIds.includes(block.blockId)) return true;
      return visible[index - 1] && changedBlockIds.includes(visible[index - 1].blockId)
        || visible[index + 1] && changedBlockIds.includes(visible[index + 1].blockId);
    }).slice(0, 12);
    return { run, document, jobs, blocks: selected, setup };
  },
});

async function callProcessor(
  baseUrl: string,
  token: string,
  job: { _id: Id<"document_ai_jobs">; processor: string; schemaVersion: string; modelProfile: string },
  payload: {
    document: { kind: string; title: string };
    setup: null | { scheduledStartAt: number; scheduledEndAt: number; timezone: string; location?: string };
    blocks: Array<{ blockId: string; blockType: string; text: string }>;
  },
) {
  const controller = new AbortController();
  const timeoutMs = job.processor === "generate_task_context" ? 35_000 : 30_000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/process`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      signal: controller.signal,
      body: JSON.stringify({
        request_id: String(job._id),
        processor: job.processor,
        schema_version: job.schemaVersion,
        model_profile: job.modelProfile,
        locale: "cs-CZ",
        deadline_ms: job.processor === "generate_task_context" ? 32_000 : 27_000,
        generation: { temperature: 0, max_output_tokens: 600 },
        context: {
          document_kind: payload.document.kind,
          document_title: payload.document.title,
          meeting: payload.setup ? {
            starts_at: new Date(payload.setup.scheduledStartAt).toISOString(),
            ends_at: new Date(payload.setup.scheduledEndAt).toISOString(),
            timezone: payload.setup.timezone,
            location: payload.setup.location,
          } : undefined,
          blocks: payload.blocks.map((block) => ({ block_id: block.blockId, type: block.blockType, text: block.text })),
        },
      }),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json() as { output?: unknown; model_version?: string; confidence?: number };
    if (!data || typeof data !== "object" || !("output" in data)) throw new Error("SCHEMA_INVALID");
    const output = validateProcessorOutput(job.processor, data.output);
    const confidence = typeof data.confidence === "number" && data.confidence >= 0 && data.confidence <= 1 ? data.confidence : undefined;
    return { output, modelVersion: data.model_version, confidence };
  } finally {
    clearTimeout(timeout);
  }
}

async function callProcessorWithRetry(
  baseUrl: string,
  token: string,
  job: Parameters<typeof callProcessor>[2],
  payload: Parameters<typeof callProcessor>[3],
) {
  const startedAt = Date.now();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return { ...(await callProcessor(baseUrl, token, job, payload)), attempt, durationMs: Date.now() - startedAt };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const retryable = /^HTTP_(502|503|504)$/.test(message);
      if (!retryable || attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
  throw lastError;
}

export const getRunStatus = internalQuery({
  args: { runId: v.id("document_ai_runs") },
  handler: async (ctx, { runId }) => (await ctx.db.get(runId))?.status ?? null,
});

export const finishEmptyRun = internalMutation({
  args: { runId: v.id("document_ai_runs") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status === "stale") return;
    const jobs = await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", runId)).collect();
    for (const job of jobs) await ctx.db.patch(job._id, { status: "stale", completedAt: Date.now() });
    await ctx.db.patch(runId, { status: "complete", completedAt: Date.now() });
  },
});

export const findCache = internalQuery({
  args: { inputHash: v.string(), processor: v.string(), schemaVersion: v.string() },
  handler: async (ctx, args) => {
    const candidates = await ctx.db.query("document_ai_jobs").withIndex("by_input_processor", (q) => q.eq("inputHash", args.inputHash).eq("processor", args.processor).eq("schemaVersion", args.schemaVersion)).order("desc").take(5);
    return candidates.find((job) => (job.status === "succeeded" || job.status === "cache_hit") && job.outputJson !== undefined) ?? null;
  },
});

export const executeRun = internalAction({
  args: { runId: v.id("document_ai_runs"), changedBlockIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const payload = await ctx.runQuery(internal.documentAI.loadRun, args);
    if (!payload || payload.run.status === "stale") return;
    if (payload.blocks.length === 0) {
      await ctx.runMutation(internal.documentAI.finishEmptyRun, { runId: args.runId });
      return;
    }
    const baseUrl = process.env.WIN10_AI_BASE_URL;
    const token = process.env.WIN10_AI_TOKEN;
    if (!baseUrl || !token) {
      await ctx.runMutation(internal.documentAI.failRun, { runId: args.runId, errorCode: "AI_NOT_CONFIGURED" });
      return;
    }
    await ctx.runMutation(internal.documentAI.startRun, { runId: args.runId });
    for (let offset = 0; offset < payload.jobs.length; offset += PROCESSOR_CONCURRENCY) {
      if (offset > 0) {
        const status = await ctx.runQuery(internal.documentAI.getRunStatus, { runId: args.runId });
        if (status === null || status === "stale") return;
      }
      const jobs = payload.jobs.slice(offset, offset + PROCESSOR_CONCURRENCY);
      const outcomes = await Promise.allSettled(jobs.map(async (job) => {
        const cached = await ctx.runQuery(internal.documentAI.findCache, { inputHash: job.inputHash, processor: job.processor, schemaVersion: job.schemaVersion });
        if (cached) return { output: cached.outputJson, confidence: cached.confidence, attempt: 0, durationMs: 0, cacheHit: true };
        return { ...(await callProcessorWithRetry(baseUrl, token, job, payload)), cacheHit: false };
      }));
      await Promise.all(outcomes.map((outcome, index) => ctx.runMutation(internal.documentAI.completeJob, {
        jobId: jobs[index]._id,
        runId: args.runId,
        ok: outcome.status === "fulfilled",
        outputJson: outcome.status === "fulfilled" ? outcome.value.output : undefined,
        confidence: outcome.status === "fulfilled" ? outcome.value.confidence : undefined,
        attempt: outcome.status === "fulfilled" ? outcome.value.attempt : 1,
        durationMs: outcome.status === "fulfilled" ? outcome.value.durationMs : undefined,
        cacheHit: outcome.status === "fulfilled" ? outcome.value.cacheHit : false,
        errorCode: outcome.status === "rejected" ? String(outcome.reason instanceof Error ? outcome.reason.message : outcome.reason).slice(0, 120) : undefined,
      })));
    }
    await ctx.runMutation(internal.documentAI.finishRun, { runId: args.runId });
  },
});

export const startRun = internalMutation({
  args: { runId: v.id("document_ai_runs") },
  handler: async (ctx, { runId }) => { const run = await ctx.db.get(runId); if (run?.status === "queued") await ctx.db.patch(runId, { status: "running" }); },
});

export const failRun = internalMutation({
  args: { runId: v.id("document_ai_runs"), errorCode: v.string() },
  handler: async (ctx, { runId, errorCode }) => {
    const jobs = await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", runId)).collect();
    for (const job of jobs) await ctx.db.patch(job._id, { status: "failed", errorCode, completedAt: Date.now() });
    await ctx.db.patch(runId, { status: "failed", completedAt: Date.now() });
  },
});

export const completeJob = internalMutation({
  args: { jobId: v.id("document_ai_jobs"), runId: v.id("document_ai_runs"), ok: v.boolean(), outputJson: v.optional(v.any()), confidence: v.optional(v.number()), attempt: v.number(), durationMs: v.optional(v.number()), cacheHit: v.boolean(), errorCode: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const [job, run] = await Promise.all([ctx.db.get(args.jobId), ctx.db.get(args.runId)]);
    if (!job || !run) return;
    const document = await ctx.db.get(run.documentId);
    if (!document || document.contentVersion !== run.requestedVersion || run.status === "stale") {
      await ctx.db.patch(job._id, { status: "stale", completedAt: Date.now() });
      return;
    }
    const timedOut = !args.ok && (args.errorCode?.includes("abort") || args.errorCode?.includes("deadline") || args.errorCode?.includes("timeout"));
    await ctx.db.patch(job._id, {
      status: args.ok ? (args.cacheHit ? "cache_hit" : "succeeded") : timedOut ? "timed_out" : "failed",
      outputJson: args.outputJson,
      confidence: args.confidence,
      errorCode: args.errorCode,
      attempt: args.attempt,
      durationMs: args.durationMs,
      completedAt: Date.now(),
    });
    const confidence = args.confidence ?? 0;
    const taskCandidates = job.processor === "extract_tasks"
      ? processorItems({ ...job, outputJson: args.outputJson }, "tasks").filter((item) => typeof item.confidence === "number" && item.confidence >= 0.7)
      : [];
    if (args.ok && taskCandidates.length > 0 && job.blockId) {
      await ctx.db.insert("document_ai_suggestions", {
        troopId: job.troopId,
        documentId: job.documentId,
        pageId: job.pageId,
        blockId: typeof taskCandidates[0].block_id === "string" ? taskCandidates[0].block_id : job.blockId,
        jobId: job._id,
        kind: job.processor,
        payload: { tasks: taskCandidates },
        confidence: Math.max(confidence, ...taskCandidates.map((item) => typeof item.confidence === "number" ? item.confidence : 0)),
        sourceVersion: job.requestedVersion,
        state: "pending",
        createdAt: Date.now(),
      });
    }
  },
});

export const finishRun = internalMutation({
  args: { runId: v.id("document_ai_runs") },
  handler: async (ctx, { runId }) => {
    const run = await ctx.db.get(runId);
    if (!run || run.status === "stale") return;
    const jobs = await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", runId)).collect();
    const document = await ctx.db.get(run.documentId);
    if (!document || document.contentVersion !== run.requestedVersion) {
      await ctx.db.patch(runId, { status: "stale", completedAt: Date.now() });
      return;
    }
    const taskJob = jobs.find((job) => job.processor === "extract_tasks" && (job.status === "succeeded" || job.status === "cache_hit"));
    const extractedTasks = processorItems(taskJob, "tasks");
    const sourceBlocks = await ctx.db.query("document_blocks").withIndex("by_page_order", (q) => q.eq("pageId", run.pageId)).collect();
    const sourceTextByBlock = new Map(sourceBlocks.filter((block) => !block.deletedAt).map((block) => [block.blockId, block.text]));
    const automaticTasks = extractedTasks.filter((item) => {
      const blockId = typeof item.block_id === "string" ? item.block_id : taskJob?.blockId;
      const sourceText = blockId ? sourceTextByBlock.get(blockId) : undefined;
      return typeof item.confidence === "number" && item.confidence >= 0.9 && !!sourceText && hasExplicitTaskSignal(sourceText);
    });
    if (taskJob && automaticTasks.length > 0) {
      await materializeTaskItems(ctx, {
        document,
        pageId: run.pageId,
        fallbackBlockId: taskJob.blockId || "document-root",
        sourceVersion: run.requestedVersion,
        jobId: taskJob._id,
        createdBy: document.updatedBy,
        items: automaticTasks,
        siblingJobs: jobs,
      });
    }
    if (taskJob) {
      const suggestions = await ctx.db.query("document_ai_suggestions")
        .withIndex("by_document_state", (q) => q.eq("documentId", document._id).eq("state", "pending"))
        .take(100);
      const taskSuggestion = suggestions.find((suggestion) => suggestion.jobId === taskJob._id);
      if (taskSuggestion) {
        const automaticSet = new Set(automaticTasks);
        const remaining = extractedTasks.filter((item) => typeof item.confidence === "number" && item.confidence >= 0.7 && !automaticSet.has(item));
        if (remaining.length > 0) {
          await ctx.db.patch(taskSuggestion._id, {
            blockId: typeof remaining[0].block_id === "string" ? remaining[0].block_id : taskSuggestion.blockId,
            payload: { tasks: remaining },
            confidence: Math.max(...remaining.map((item) => item.confidence as number)),
          });
        } else {
          await ctx.db.patch(taskSuggestion._id, { state: "accepted", resolvedAt: Date.now(), resolvedBy: document.updatedBy });
        }
      }
    }
    const succeeded = jobs.filter((job) => job.status === "succeeded" || job.status === "cache_hit").length;
    await ctx.db.patch(runId, { status: succeeded === jobs.length ? "complete" : succeeded > 0 ? "partial" : "failed", completedAt: Date.now() });
  },
});

export const getPageInsights = query({
  args: { documentId: v.id("documents"), pageId: v.id("meeting_pages") },
  handler: async (ctx, { documentId, pageId }) => {
    const { document } = await requireDocumentViewer(ctx, documentId);
    const page = await ctx.db.get(pageId);
    if (!page || page.meetingId !== document.meetingId) authError("VALIDATION_ERROR", "Stránka nepatří do dokumentu.");
    const latestRun = await ctx.db.query("document_ai_runs").withIndex("by_page_generation", (q) => q.eq("pageId", pageId)).order("desc").first();
    if (!latestRun || latestRun.documentId !== documentId || latestRun.requestedVersion !== document.contentVersion) {
      return { status: latestRun?.status ?? "idle", segments: [], materials: [] };
    }
    const jobs = await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", latestRun._id)).collect();
    const successfulJob = (processor: string) => jobs.find((job) => job.processor === processor && (job.status === "succeeded" || job.status === "cache_hit"));
    const segments = processorItems(successfulJob("segment_agenda"), "segments")
      .filter((item) => typeof item.confidence === "number" && item.confidence >= 0.78)
      .map((item) => ({
        blockId: String(item.block_id),
        label: String(item.label).trim().slice(0, 180),
        startTime: typeof item.start_time === "string" ? item.start_time : "",
        endTime: typeof item.end_time === "string" ? item.end_time : "",
        confidence: item.confidence as number,
      }));
    const materialItems = processorItems(successfulJob("extract_materials"), "materials")
      .filter((item) => typeof item.confidence === "number" && item.confidence >= 0.72);
    const seenMaterials = new Set<string>();
    const materials = materialItems.flatMap((item) => {
      const name = String(item.name).trim().slice(0, 180);
      const key = `${String(item.block_id)}:${name.toLocaleLowerCase("cs")}`;
      if (!name || seenMaterials.has(key)) return [];
      seenMaterials.add(key);
      return [{
        blockId: String(item.block_id),
        name,
        quantity: typeof item.quantity === "string" ? item.quantity.trim().slice(0, 80) : undefined,
        reason: typeof item.reason === "string" ? item.reason.trim().slice(0, 280) : undefined,
        confidence: item.confidence as number,
      }];
    });
    return { status: latestRun.status, segments, materials };
  },
});

export const getState = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    await requireDocumentViewer(ctx, documentId);
    const [latestRun, suggestions, accepted] = await Promise.all([
      ctx.db.query("document_ai_runs").withIndex("by_document_created", (q) => q.eq("documentId", documentId)).order("desc").first(),
      ctx.db.query("document_ai_suggestions").withIndex("by_document_state", (q) => q.eq("documentId", documentId).eq("state", "pending")).take(30),
      ctx.db.query("document_ai_suggestions").withIndex("by_document_state", (q) => q.eq("documentId", documentId).eq("state", "accepted")).order("desc").take(30),
    ]);
    return {
      status: latestRun?.status ?? "idle",
      requestedVersion: latestRun?.requestedVersion,
      suggestions: suggestions.map((suggestion) => ({
        _id: suggestion._id,
        kind: suggestion.kind,
        blockId: suggestion.blockId,
        payload: suggestion.payload,
        confidence: suggestion.confidence,
        sourceVersion: suggestion.sourceVersion,
      })),
      accepted: accepted.map((suggestion) => ({
        _id: suggestion._id,
        kind: suggestion.kind,
        blockId: suggestion.blockId,
        payload: suggestion.payload,
        confidence: suggestion.confidence,
      })),
    };
  },
});

export const retryProcessing = mutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const { document } = await requireDocumentEditor(ctx, documentId);
    const pages = await ctx.db.query("meeting_pages").withIndex("by_meeting", (q) => q.eq("meetingId", document.meetingId)).collect();
    const page = pages.sort((a, b) => a.order - b.order)[0];
    if (!page) return { queued: false };
    const blocks = await ctx.db.query("document_blocks").withIndex("by_page_order", (q) => q.eq("pageId", page._id)).collect();
    const changedBlockIds = blocks.filter((block) => !block.deletedAt).map((block) => block.blockId).slice(0, 12);
    if (!changedBlockIds.length) return { queued: false };
    await ctx.scheduler.runAfter(0, internal.documentAI.queueProjectedSnapshot, {
      documentId,
      pageId: page._id,
      requestedVersion: document.contentVersion,
      changedBlockIds,
    });
    return { queued: true };
  },
});

export const resolveSuggestion = mutation({
  args: { suggestionId: v.id("document_ai_suggestions"), decision: v.union(v.literal("accept"), v.literal("reject")) },
  handler: async (ctx, { suggestionId, decision }) => {
    const suggestion = await ctx.db.get(suggestionId);
    if (!suggestion) authError("NOT_FOUND", "AI návrh nebyl nalezen.");
    const { document, user } = await requireDocumentEditor(ctx, suggestion.documentId);
    if (suggestion.state !== "pending") return { createdTaskIds: [] as Id<"document_tasks">[] };
    if (suggestion.sourceVersion !== document.contentVersion) {
      await ctx.db.patch(suggestion._id, { state: "stale", resolvedAt: Date.now(), resolvedBy: user._id });
      authError("VALIDATION_ERROR", "Dokument se mezitím změnil. Návrh byl označen jako zastaralý.");
    }

    const createdTaskIds: Id<"document_tasks">[] = [];
    if (decision === "accept" && suggestion.kind === "extract_tasks") {
      const payload = suggestion.payload as { tasks?: Array<Record<string, unknown>> };
      const sourceJob = await ctx.db.get(suggestion.jobId);
      const siblingJobs = sourceJob
        ? await ctx.db.query("document_ai_jobs").withIndex("by_run", (q) => q.eq("runId", sourceJob.runId)).collect()
        : [];
      createdTaskIds.push(...await materializeTaskItems(ctx, {
        document,
        pageId: suggestion.pageId,
        fallbackBlockId: suggestion.blockId,
        sourceVersion: suggestion.sourceVersion,
        jobId: suggestion.jobId,
        createdBy: user._id,
        items: payload.tasks ?? [],
        siblingJobs,
      }));
    }
    await ctx.db.patch(suggestion._id, {
      state: decision === "accept" ? "accepted" : "rejected",
      resolvedAt: Date.now(),
      resolvedBy: user._id,
    });
    return { createdTaskIds };
  },
});
