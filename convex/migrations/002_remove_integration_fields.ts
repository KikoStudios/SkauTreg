import { internalMutation } from "../_generated/server";

export const removeIntegrationFields = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Get all troops from the database
        const troops = await ctx.db.query("troops").collect();
        
        let cleanedCount = 0;
        
        for (const troop of troops) {
            const troopAny = troop as any;
            
            // Check if this troop has old integration fields
            if (troopAny.discordIntegrations || troopAny.integrationActions || troopAny.integrationConnections) {
                try {
                    // Remove the old integration fields by patching with undefined
                    await ctx.db.patch(troop._id, {
                        discordIntegrations: undefined,
                        integrationActions: undefined,
                        integrationConnections: undefined,
                    } as any);
                    cleanedCount++;
                } catch (e) {
                    console.error(`Failed to clean troop ${troop._id}:`, e);
                }
            }
        }
        
        return { success: true, cleanedCount };
    }
});
