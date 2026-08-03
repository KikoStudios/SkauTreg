import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { encryptCredential, isEncryptedCredential } from "../lib/credentials";

export const auditCredentialState = internalQuery({
  args: {},
  handler: async (ctx) => {
    const troops = await ctx.db.query("troops").collect();
    const integrations = await ctx.db.query("integrations").collect();
    const gmailTokens = troops.flatMap((troop) => {
      const token = troop.emailProvider?.provider === "gmail"
        ? troop.emailProvider.refreshToken
        : troop.gmailOAuth?.refreshToken;
      return token ? [token] : [];
    });
    const integrationSecrets = integrations.flatMap((integration) => [integration.configPayload, integration.webhookUrl].filter((value): value is string => Boolean(value)));
    return {
      gmailConnections: gmailTokens.length,
      gmailEncrypted: gmailTokens.filter(isEncryptedCredential).length,
      gmailPlaintext: gmailTokens.filter((token) => !isEncryptedCredential(token)).length,
      integrationSecrets: integrationSecrets.length,
      integrationEncrypted: integrationSecrets.filter(isEncryptedCredential).length,
      integrationPlaintext: integrationSecrets.filter((secret) => !isEncryptedCredential(secret)).length,
    };
  },
});

export const encryptCredentialBatch = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 100);
    const integrations = await ctx.db.query("integrations").paginate({
      cursor: args.cursor ?? null,
      numItems: limit,
    });
    let encryptedIntegrations = 0;
    for (const integration of integrations.page) {
      const legacy =
        !isEncryptedCredential(integration.configPayload) ||
        Boolean(integration.webhookUrl && !isEncryptedCredential(integration.webhookUrl));
      if (!legacy) continue;
      await ctx.db.patch(integration._id, {
        configPayload: await encryptCredential(integration.configPayload) as string,
        webhookUrl: await encryptCredential(integration.webhookUrl),
        requiresReconnect: true,
      });
      encryptedIntegrations += 1;
    }

    if (!args.cursor) {
      const troops = await ctx.db.query("troops").collect();
      for (const troop of troops) {
        if (troop.emailProvider) {
          await ctx.db.patch(troop._id, {
            emailProvider: {
              ...troop.emailProvider,
              refreshToken: await encryptCredential(troop.emailProvider.refreshToken),
              smtpPassword: await encryptCredential(troop.emailProvider.smtpPassword),
              requiresReconnect: true,
            },
          });
        } else if (troop.gmailOAuth) {
          await ctx.db.patch(troop._id, {
            gmailOAuth: {
              ...troop.gmailOAuth,
              refreshToken: await encryptCredential(troop.gmailOAuth.refreshToken) as string,
            },
          });
        }
      }
    }

    return {
      encryptedIntegrations,
      continueCursor: integrations.continueCursor,
      isDone: integrations.isDone,
    };
  },
});
