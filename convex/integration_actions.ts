import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireTroopManager } from "./lib/auth";

// Get all actions for a troop
export const getByTroop = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        return await ctx.db
            .query("integration_actions")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();
    },
});

// Get actions filtered by trigger
export const getByTrigger = query({
    args: { troopId: v.id("troops"), trigger: v.string() },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        return await ctx.db
            .query("integration_actions")
            .withIndex("by_trigger", (q) => q.eq("troopId", args.troopId).eq("trigger", args.trigger))
            .collect();
    },
});

// Get a specific action
export const getById = query({
    args: { actionId: v.id("integration_actions") },
    handler: async (ctx, args) => {
        const action = await ctx.db.get(args.actionId);
        if (!action) return null;
        await requireTroopManager(ctx, action.troopId);
        return action;
    },
});

// Create new action
export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        trigger: v.string(), // "member_unregistered_late", "new_trip_created", "payment_received", "trip_assigned_base"
        integrationId: v.id("integrations"),
        messageTemplate: v.string(),
        triggerConfig: v.object({
            conditions: v.optional(v.array(v.object({
                field: v.string(),
                operator: v.string(),
                value: v.string(),
            }))),
        }),
        messageFormat: v.optional(v.string()),
        includeAttachments: v.optional(v.boolean()),
        retryOnFailure: v.optional(v.boolean()),
        maxRetries: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { user } = await requireTroopManager(ctx, args.troopId);

        // Verify integration belongs to this troop
        const integration = await ctx.db.get(args.integrationId);
        if (!integration || (integration as any).troopId !== args.troopId) {
            throw new Error("Integration not found for this troop");
        }

        // Create the action
        const actionId = await ctx.db.insert("integration_actions", {
            troopId: args.troopId,
            name: args.name,
            isEnabled: true,
            trigger: args.trigger,
            triggerConfig: args.triggerConfig,
            integrationId: args.integrationId,
            messageTemplate: args.messageTemplate,
            messageFormat: args.messageFormat,
            includeAttachments: args.includeAttachments || false,
            retryOnFailure: args.retryOnFailure || true,
            maxRetries: args.maxRetries || 3,
            createdBy: user._id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            triggerCount: 0,
        });

        return actionId;
    },
});

// Update action
export const update = mutation({
    args: {
        actionId: v.id("integration_actions"),
        name: v.optional(v.string()),
        isEnabled: v.optional(v.boolean()),
        trigger: v.optional(v.string()),
        triggerConfig: v.optional(v.object({
            conditions: v.optional(v.array(v.object({
                field: v.string(),
                operator: v.string(),
                value: v.string(),
            }))),
        })),
        integrationId: v.optional(v.id("integrations")),
        messageTemplate: v.optional(v.string()),
        messageFormat: v.optional(v.string()),
        includeAttachments: v.optional(v.boolean()),
        retryOnFailure: v.optional(v.boolean()),
        maxRetries: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const action = await ctx.db.get(args.actionId);
        if (!action) throw new Error("Action not found");
        await requireTroopManager(ctx, action.troopId);

        if (args.integrationId) {
            const integration = await ctx.db.get(args.integrationId);
            if (!integration || integration.troopId !== action.troopId) {
                throw new Error("Integration not found for this troop");
            }
        }

        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.name !== undefined) updateData.name = args.name;
        if (args.isEnabled !== undefined) updateData.isEnabled = args.isEnabled;
        if (args.trigger !== undefined) updateData.trigger = args.trigger;
        if (args.triggerConfig !== undefined) updateData.triggerConfig = args.triggerConfig;
        if (args.integrationId !== undefined) updateData.integrationId = args.integrationId;
        if (args.messageTemplate !== undefined) updateData.messageTemplate = args.messageTemplate;
        if (args.messageFormat !== undefined) updateData.messageFormat = args.messageFormat;
        if (args.includeAttachments !== undefined) updateData.includeAttachments = args.includeAttachments;
        if (args.retryOnFailure !== undefined) updateData.retryOnFailure = args.retryOnFailure;
        if (args.maxRetries !== undefined) updateData.maxRetries = args.maxRetries;

        await ctx.db.patch(args.actionId, updateData);
        return await ctx.db.get(args.actionId);
    },
});

// Toggle action enabled/disabled
export const toggleEnabled = mutation({
    args: {
        actionId: v.id("integration_actions"),
    },
    handler: async (ctx, args) => {
        const action = await ctx.db.get(args.actionId);
        if (!action) throw new Error("Action not found");
        await requireTroopManager(ctx, action.troopId);

        const newEnabled = !(action as any).isEnabled;
        await ctx.db.patch(args.actionId, { 
            isEnabled: newEnabled,
            updatedAt: new Date().toISOString(),
        });
        return await ctx.db.get(args.actionId);
    },
});

// Delete action
export const deleteAction = mutation({
    args: { actionId: v.id("integration_actions") },
    handler: async (ctx, args) => {
        const action = await ctx.db.get(args.actionId);
        if (!action) throw new Error("Action not found");
        await requireTroopManager(ctx, action.troopId);

        await ctx.db.delete(args.actionId);
    },
});

// Log action execution
export const logExecution = mutation({
    args: {
        troopId: v.id("troops"),
        actionId: v.id("integration_actions"),
        integrationId: v.id("integrations"),
        triggerEvent: v.string(),
        triggerData: v.optional(v.string()),
        status: v.string(), // "success", "failed", "pending", "skipped"
        sentMessage: v.optional(v.string()),
        responseStatus: v.optional(v.number()),
        error: v.optional(v.string()),
        executionTime: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const actionForTroop = await ctx.db.get(args.actionId);
        const integrationForTroop = await ctx.db.get(args.integrationId);
        if (
            !actionForTroop ||
            actionForTroop.troopId !== args.troopId ||
            !integrationForTroop ||
            integrationForTroop.troopId !== args.troopId
        ) {
            throw new Error("Integration action does not belong to this troop");
        }
        // Increment trigger count
        const action = await ctx.db.get(args.actionId);
        if (action) {
            await ctx.db.patch(args.actionId, {
                triggerCount: ((action as any).triggerCount || 0) + 1,
                lastTriggeredAt: new Date().toISOString(),
            });
        }

        // Log the execution
        return await ctx.db.insert("integration_logs", {
            troopId: args.troopId,
            actionId: args.actionId,
            integrationId: args.integrationId,
            triggerEvent: args.triggerEvent,
            triggerData: args.triggerData,
            status: args.status,
            sentMessage: args.sentMessage,
            responseStatus: args.responseStatus,
            error: args.error,
            executedAt: new Date().toISOString(),
            executionTime: args.executionTime,
        });
    },
});

// Get execution logs for an action
export const getExecutionLogs = query({
    args: { 
        actionId: v.id("integration_actions"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const action = await ctx.db.get(args.actionId);
        if (!action) throw new Error("Action not found");
        await requireTroopManager(ctx, action.troopId);
        return await ctx.db
            .query("integration_logs")
            .withIndex("by_action", (q) => q.eq("actionId", args.actionId))
            .order("desc")
            .take(args.limit || 50);
    },
});
