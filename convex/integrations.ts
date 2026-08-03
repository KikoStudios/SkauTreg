import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireTroopManager } from "./lib/auth";
import { decryptCredential, encryptCredential } from "./lib/credentials";

function publicIntegration(integration: Doc<"integrations">) {
    const {
        configPayload: _configPayload,
        webhookUrl: _webhookUrl,
        phoneNumber: _phoneNumber,
        ...safe
    } = integration;
    return safe;
}

function validateWebhookUrl(value: string | undefined) {
    if (!value) return;
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        throw new Error("Webhook URL is invalid.");
    }
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    const blocked =
        hostname === "localhost" ||
        hostname === "::1" ||
        hostname === "0.0.0.0" ||
        hostname.endsWith(".local") ||
        /^127\./.test(hostname) ||
        /^10\./.test(hostname) ||
        /^192\.168\./.test(hostname) ||
        /^169\.254\./.test(hostname) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
        /^fc/i.test(hostname) ||
        /^fd/i.test(hostname) ||
        /^fe[89ab]/i.test(hostname);
    if (url.protocol !== "https:" || blocked || url.username || url.password) {
        throw new Error("Webhook URL must use public HTTPS without embedded credentials.");
    }
}

// get integrations for a troop
export const getByTroop = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const integrations = await ctx.db
            .query("integrations")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();
        return integrations.map(publicIntegration);
    },
});

// get a specific integration
export const getById = query({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args) => {
        const integration = await ctx.db.get(args.integrationId);
        if (!integration) return null;
        await requireTroopManager(ctx, integration.troopId);
        return publicIntegration(integration);
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
        const { user } = await requireTroopManager(ctx, args.troopId);
        validateWebhookUrl(args.webhookUrl);

        // Create the integration
        const integrationId = await ctx.db.insert("integrations", {
            troopId: args.troopId,
            name: args.name,
            serviceType: args.serviceType,
            isActive: true,
            configPayload: await encryptCredential(args.configPayload) as string,
            webhookUrl: await encryptCredential(args.webhookUrl),
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
        await requireTroopManager(ctx, integration.troopId);
        validateWebhookUrl(args.webhookUrl);

        // Build update payload
        const updateData: any = {
            updatedAt: new Date().toISOString(),
        };

        if (args.name !== undefined) updateData.name = args.name;
        if (args.serviceType !== undefined) updateData.serviceType = args.serviceType;
        if (args.isActive !== undefined) updateData.isActive = args.isActive;
        if (args.configPayload !== undefined) updateData.configPayload = await encryptCredential(args.configPayload);
        if (args.webhookUrl !== undefined) updateData.webhookUrl = await encryptCredential(args.webhookUrl);
        if (args.webhookName !== undefined) updateData.webhookName = args.webhookName;
        if (args.emailProvider !== undefined) updateData.emailProvider = args.emailProvider;
        if (args.emailAddress !== undefined) updateData.emailAddress = args.emailAddress;
        if (args.phoneNumber !== undefined) updateData.phoneNumber = args.phoneNumber;

        await ctx.db.patch(args.integrationId, updateData);
        const updated = await ctx.db.get(args.integrationId);
        return updated ? publicIntegration(updated) : null;
    },
});

// delete integration
export const deleteIntegration = mutation({
    args: { integrationId: v.id("integrations") },
    handler: async (ctx, args) => {
        const integration = await ctx.db.get(args.integrationId);
        if (!integration) throw new Error("Integration not found");
        await requireTroopManager(ctx, integration.troopId);

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
        await requireTroopManager(ctx, integration.troopId);

        // Test based on service type
        let success = false;
        let error: string | undefined;

        try {
            const webhookUrl = await decryptCredential(integration.webhookUrl);
            if (integration.serviceType === "discord" && webhookUrl) {
                // Test Discord webhook
                const response = await fetch(webhookUrl, {
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
