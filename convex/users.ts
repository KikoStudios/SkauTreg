import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (user !== null) {
            if (user.name !== identity.name || user.email !== identity.email || user.image !== identity.pictureUrl) {
                await ctx.db.patch(user._id, {
                    name: identity.name,
                    email: identity.email,
                    image: identity.pictureUrl,
                });
            }
            return user._id;
        }

        return await ctx.db.insert("users", {
            name: identity.name,
            email: identity.email,
            image: identity.pictureUrl || "/icons/profile-pic.png",
            tokenIdentifier: identity.tokenIdentifier,
        });
    },
});

export const viewer = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return null;
        }
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();
        return user;
    },
});

/**
 * Everything the account centre needs in one request. A user's role belongs to
 * a troop, not to their global profile, so return each real assignment instead
 * of asking the user to maintain a second, potentially conflicting role switch.
 */
export const profileOverview = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!user) return null;

        const [leaderships, ownedTroops] = await Promise.all([
            ctx.db
                .query("troop_leaders")
                .withIndex("by_user_troop", (q) => q.eq("userId", user._id))
                .collect(),
            ctx.db
                .query("troops")
                .filter((q) => q.eq(q.field("ownerId"), user._id))
                .collect(),
        ]);

        const assignedTroops = await Promise.all(
            leaderships.map(async (leadership) => {
                const troop = await ctx.db.get(leadership.troopId);
                if (!troop) return null;
                return {
                    troopId: troop._id,
                    troopName: troop.name,
                    role: leadership.role === "vedouci" ? "leader" : leadership.role,
                };
            })
        );

        const roles = [
            ...ownedTroops.map((troop) => ({
                troopId: troop._id,
                troopName: troop.name,
                role: "owner",
            })),
            ...assignedTroops.filter((role) => role !== null),
        ].filter(
            (role, index, all) =>
                all.findIndex((candidate) => candidate.troopId === role.troopId) === index
        );

        return { user, roles };
    },
});

export const update = mutation({
    args: {
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        benefit: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        address: v.optional(v.string()),
        personalEmail: v.optional(v.string()),
        personalPhone: v.optional(v.string()),
        contactProfileType: v.optional(v.string()),
        emergencyContactName: v.optional(v.string()),
        emergencyContactPhone: v.optional(v.string()),
        emergencyContactEmail: v.optional(v.string()),
        parent1Name: v.optional(v.string()),
        parent1Phone: v.optional(v.string()),
        parent1Email: v.optional(v.string()),
        parent2Name: v.optional(v.string()),
        parent2Phone: v.optional(v.string()),
        parent2Email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthenticated");
        }
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();
        if (!user) {
            throw new Error("User not found");
        }
        await ctx.db.patch(user._id, args);
    },
});
