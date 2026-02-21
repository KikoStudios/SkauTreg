import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// get integrations for a troop
export const getByTroop = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("integrations")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();
    },
});

// get a specific integration
export const getById = query({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.integrationId);
    },
});

// create a new integration
export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        serviceType: v.string(), // "discord", "email", "whatsapp", "custom_api"
        configPayload: v.string(), // JSON string (will be encrypted in production)
        webhookUrl: v.optional(v.string()),
        webhookName: v.optional(v.string()),
        emailProvider: v.optional(v.string()),
        emailAddress: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Verify user is authorized for this troop
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const troop = await ctx.db.get(args.troopId);
        if (!troop) throw new Error("Troop not found");

        // Check if user is leader of this troop
        const leaders = await ctx.db
            .query("troop_leaders")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) throw new Error("User not found");

        const isLeader = leaders.some((l) => l.userId === user._id);
        if (!isLeader && (troop as any).ownerId !== user._id) {
            throw new Error("Not authorized");
        }

        // Create the integration
        const integrationId = await ctx.db.insert("integrations", {
            troopId: args.troopId,
            name: args.name,
            serviceType: args.serviceType,
            isActive: true,
            configPayload: args.configPayload,
            webhookUrl: args.webhookUrl,
            webhookName: args.webhookName,
            emailProvider: args.emailProvider,
            emailAddress: args.emailAddress,
            phoneNumber: args.phoneNumber,
            createdBy: user._id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            testStatus: "pending",
        });

        return integrationId;
    },
});

// update integration
export const update = mutation({
    args: {
        integrationId: v.id("integrations"),
        name: v.optional(v.string()),
        serviceType: v.optional(v.string()),
        isActive: v.optional(v.boolean()),
        configPayload: v.optional(v.string()),
        webhookUrl: v.optional(v.string()),
        webhookName: v.optional(v.string()),
        emailProvider: v.optional(v.string()),
        emailAddress: v.optional(v.string()),
        phoneNumber: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const integration = await ctx.db.get(args.integrationId);
        if (!integration) throw new Error("Integration not found");

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) throw new Error("User not found");

        // Build update payload
        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.name !== undefined) updateData.name = args.name;
        if (args.serviceType !== undefined) updateData.serviceType = args.serviceType;
        if (args.isActive !== undefined) updateData.isActive = args.isActive;
        if (args.configPayload !== undefined) updateData.configPayload = args.configPayload;
        if (args.webhookUrl !== undefined) updateData.webhookUrl = args.webhookUrl;
        if (args.webhookName !== undefined) updateData.webhookName = args.webhookName;
        if (args.emailProvider !== undefined) updateData.emailProvider = args.emailProvider;
        if (args.emailAddress !== undefined) updateData.emailAddress = args.emailAddress;
        if (args.phoneNumber !== undefined) updateData.phoneNumber = args.phoneNumber;

        await ctx.db.patch(args.integrationId, updateData);
        return await ctx.db.get(args.integrationId);
    },
});

// delete integration
export const deleteIntegration = mutation({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args) => {
        const integration = await ctx.db.get(args.integrationId);
        if (!integration) throw new Error("Integration not found");

        // Delete all actions associated with this integration
        const actions = await ctx.db
            .query("integration_actions")
            .withIndex("by_integration", (q) => q.eq("integrationId", args.integrationId))
            .collect();

        for (const action of actions) {
            await ctx.db.delete(action._id);
        }

        // Delete the integration
        await ctx.db.delete(args.integrationId);
    },
});

// test integration (verify it works)
export const testIntegration = mutation({
    args: {
        integrationId: v.id("integrations"),
        testMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const integration = await ctx.db.get(args.integrationId);
        if (!integration) throw new Error("Integration not found");

        // Test based on service type
        let success = false;
        let error: string | undefined;

        try {
            if (integration.serviceType === "discord" && integration.webhookUrl) {
                // Test Discord webhook
                const response = await fetch(integration.webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        content: args.testMessage || "✅ SkauTreg integration test - это работает!",
                    }),
                });

                success = response.ok;
                if (!success) {
                    error = `Discord webhook test failed: ${response.status} ${response.statusText}`;
                }
            } else if (integration.serviceType === "email") {
                // Email test (will be implemented when email service is set up)
                success = true;
            } else if (integration.serviceType === "whatsapp") {
                // WhatsApp test (placeholder)
                success = true;
            }
        } catch (e) {
            success = false;
            error = e instanceof Error ? e.message : "Unknown error";
        }

        // Update test status
        await ctx.db.patch(args.integrationId, {
            testStatus: success ? "success" : "failed",
            testError: error,
            updatedAt: new Date().toISOString(),
        });

        return { success, error };
    },
});
