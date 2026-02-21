import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { DatabaseReader, DatabaseWriter } from "../_generated/server";

export const migrateMemberFields = mutation({
    args: {},
    handler: async (ctx) => {
        // Get all members from the database
        const members = await ctx.db.query("members").collect();
        
        let migratedCount = 0;
        
        for (const member of members) {
            const memberAny = member as any;
            
            // Check if this member has old field names
            if (memberAny.parentName || memberAny.parentPhone || memberAny.email) {
                try {
                    // Update to new field names
                    await ctx.db.patch(member._id, {
                        guardianName: memberAny.parentName || memberAny.guardianName || "",
                        guardianPhone: memberAny.parentPhone || memberAny.guardianPhone || "",
                        guardianEmail: memberAny.email || memberAny.guardianEmail || "",
                    });
                    migratedCount++;
                } catch (e) {
                    console.error(`Failed to migrate member ${member._id}:`, e);
                }
            }
        }
        
        return { success: true, migratedCount };
    }
});
