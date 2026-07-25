import { mutation } from "./_generated/server";
import { requireCurrentUser } from "./lib/auth";

export const generateUploadUrl = mutation(async (ctx) => {
    await requireCurrentUser(ctx);
    return await ctx.storage.generateUploadUrl();
});
