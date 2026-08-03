import { internalMutation } from "./_generated/server";

export const migrateTroops = internalMutation({
    args: {},
    handler: async (ctx) => {
        const troops = await ctx.db.query("troops").collect();

        for (const troop of troops) {
            // Check if it has legacy leaderIds
            if ((troop as any).leaderIds && Array.isArray((troop as any).leaderIds)) {
                const legacyIds: string[] = (troop as any).leaderIds;

                for (const userId of legacyIds) {
                    // Check if already in troop_leaders
                    const existing = await ctx.db
                        .query("troop_leaders")
                        .withIndex("by_user_troop", q => q.eq("userId", userId as any).eq("troopId", troop._id))
                        .unique();

                    if (!existing) {
                        console.log(`Migrating leader ${userId} for troop ${troop._id}`);
                        await ctx.db.insert("troop_leaders", {
                            troopId: troop._id,
                            userId: userId as any,
                            role: "leader" // Default to standard leader
                        });
                    }
                }

                // Remove the field from the document
                console.log(`Removing leaderIds from troop ${troop._id}`);
                await ctx.db.patch(troop._id, { leaderIds: undefined });
            }
        }
        return "Migration complete";
    },
});

export const removeIntegrationFields = internalMutation({
    args: {},
    handler: async (ctx) => {
        const troops = await ctx.db.query("troops").collect();
        
        let cleanedCount = 0;
        
        for (const troop of troops) {
            const troopAny = troop as any;
            
            // Check if this troop has old integration fields
            if (troopAny.discordIntegrations || troopAny.integrationActions || troopAny.integrationConnections) {
                console.log(`Removing integration fields from troop ${troop._id}`);
                await ctx.db.patch(troop._id, {
                    discordIntegrations: undefined,
                    integrationActions: undefined,
                    integrationConnections: undefined,
                } as any);
                cleanedCount++;
            }
        }
        
        return `Migration complete: cleaned ${cleanedCount} troops`;
    }
});
