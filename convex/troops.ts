import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        number: v.optional(v.string()),
        type: v.optional(v.string()),
        logo: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        infoEmail: v.optional(v.string()),
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
            throw new Error("User not found in DB");
        }

        const troopId = await ctx.db.insert("troops", {
            name: args.name,
            description: args.description,
            ownerId: user._id,
            number: args.number,
            type: args.type,
            logo: args.logo,
            accentColor: args.accentColor,
            contactEmail: args.contactEmail,
            infoEmail: args.infoEmail,
        });

        return troopId;
    },
});

export const update = mutation({
    args: {
        id: v.id("troops"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        number: v.optional(v.string()),
        type: v.optional(v.string()),
        logo: v.optional(v.string()),
        accentColor: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        infoEmail: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const troop = await ctx.db.get(args.id);
        if (!troop) throw new Error("Troop not found");

        if (troop.ownerId !== user._id) {
            throw new Error("Only the owner can update the troop");
        }

        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const getByUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) return [];

        // 1. Troops I own
        const ownedTroops = await ctx.db
            .query("troops")
            .filter((q) => q.eq(q.field("ownerId"), user._id))
            .collect();

        // 2. Troops I lead (any role)
        const leaderships = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", user._id))
            .collect();

        const memberTroops = await Promise.all(
            leaderships.map(l => ctx.db.get(l.troopId))
        );

        // Filter out nulls and merge
        const allTroops = [...ownedTroops, ...memberTroops].filter(t => t !== null);

        // Deduplicate by ID
        const uniqueTroops = Array.from(new Map(allTroops.map(t => [t._id, t])).values());

        // Resolve Logo URLs
        const troopsWithUrls = await Promise.all(uniqueTroops.map(async (t) => {
            let logoUrl = t.logo;
            if (t.logo && !t.logo.startsWith("http")) {
                // Assume it's a storage ID
                try {
                    logoUrl = await ctx.storage.getUrl(t.logo as any) || t.logo;
                } catch (e) {
                    // ignore invalid ID format
                }
            }
            return { ...t, logo: logoUrl };
        }));

        return troopsWithUrls;
    },
});

export const getById = query({
    args: { id: v.id("troops") },
    handler: async (ctx, args) => {
        const troop = await ctx.db.get(args.id);
        if (!troop) return null;

        let logoUrl = troop.logo;
        if (troop.logo && !troop.logo.startsWith("http")) {
            try {
                logoUrl = await ctx.storage.getUrl(troop.logo as any) || troop.logo;
            } catch (e) {
                // ignore
            }
        }

        return { ...troop, logo: logoUrl };
    }
});

// --- Leadership Management ---

// Helper to check permissions
async function isAuthorizedToManage(ctx: any, troopId: any, userId: any) {
    const troop = await ctx.db.get(troopId);
    if (!troop) return false;
    if (troop.ownerId === userId) return true;

    // Check if Main Leader
    const leaderRecord = await ctx.db
        .query("troop_leaders")
        .withIndex("by_user_troop", (q: any) => q.eq("userId", userId).eq("troopId", troopId))
        .unique();

    return leaderRecord?.role === "main_leader";
}

export const addLeader = mutation({
    args: {
        troopId: v.id("troops"),
        email: v.string(),
        role: v.string() // "main_leader", "leader", "rover"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit. Přejít na přihlášení?");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst. Zkuste se odhlásit a znovu přihlásit.");

        if (!(await isAuthorizedToManage(ctx, args.troopId, currentUser._id))) {
            throw new Error("🔐 Pouze majitel nebo hlavní vedoucí může přidávat členy do vedení.");
        }

        const userToAdd = await ctx.db
            .query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .unique();

        if (!userToAdd) {
            throw new Error("👤 Uživatel nebyl nalezen. Vytvořte si účet na skautREG nebo zkuste jiný e-mail.");
        }

        // Check if already leader
        const existing = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", userToAdd._id).eq("troopId", args.troopId))
            .unique();

        if (existing) throw new Error("⚠️ Uživatel je již v týmu vedení.");

        const troop = await ctx.db.get(args.troopId);
        if (!troop) throw new Error("🎒 Oddíl nenalezen.");

        await ctx.db.insert("troop_leaders", {
            troopId: args.troopId,
            userId: userToAdd._id,
            role: args.role
        });
    }
});

export const updateRole = mutation({
    args: {
        troopId: v.id("troops"),
        userId: v.id("users"),
        newRole: v.string()
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit.");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst.");

        if (!(await isAuthorizedToManage(ctx, args.troopId, currentUser._id))) {
            throw new Error("🔐 Nemáte oprávnění měnit role.");
        }

        const leaderRecord = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", args.userId).eq("troopId", args.troopId))
            .unique();

        if (!leaderRecord) throw new Error("👤 Vedoucí nebyl nalezen.");

        await ctx.db.patch(leaderRecord._id, { role: args.newRole });
    }
});

export const removeLeader = mutation({
    args: {
        troopId: v.id("troops"),
        userId: v.id("users")
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit.");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst.");

        if (!(await isAuthorizedToManage(ctx, args.troopId, currentUser._id))) {
            throw new Error("🔐 Nemáte oprávnění odebírat vedoucí.");
        }

        const leaderRecord = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", args.userId).eq("troopId", args.troopId))
            .unique();

        if (leaderRecord) {
            await ctx.db.delete(leaderRecord._id);
        }
    }
});

export const getLeaders = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        const troop = await ctx.db.get(args.troopId);
        if (!troop) return [];

        // 1. Owner
        const owner = await ctx.db.get(troop.ownerId);

        // 2. Leaders from table
        const leaderRecords = await ctx.db
            .query("troop_leaders")
            .withIndex("by_troop", q => q.eq("troopId", args.troopId))
            .collect();

        const leaders = await Promise.all(
            leaderRecords.map(async (record) => {
                const user = await ctx.db.get(record.userId);
                if (!user) return null;
                return {
                    ...user,
                    role: record.role, // "main_leader", "leader", "rover"
                    isOwner: user._id === troop.ownerId
                }
            })
        );

        const validLeaders = leaders.filter(l => l !== null);

        // Check if owner is already in the list via explicit role
        const ownerInList = validLeaders.find(l => l!._id === troop.ownerId);

        if (!ownerInList) {
            // Add owner with default role if not assigned a specific one
            return [
                { ...owner, role: 'owner', isOwner: true },
                ...validLeaders
            ];
        }

        return validLeaders;
    }
});

export const deleteTroop = mutation({
    args: { id: v.id("troops") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const troop = await ctx.db.get(args.id);
        if (!troop) throw new Error("Troop not found");

        if (troop.ownerId !== user._id) {
            throw new Error("Only the owner can delete the troop");
        }

        // 1. Delete Leaders
        const leaders = await ctx.db
            .query("troop_leaders")
            .withIndex("by_troop", (q) => q.eq("troopId", args.id))
            .collect();
        for (const l of leaders) await ctx.db.delete(l._id);

        // 2. Delete Members
        const members = await ctx.db
            .query("members")
            .withIndex("by_troop", (q) => q.eq("troopId", args.id))
            .collect();
        for (const m of members) await ctx.db.delete(m._id);

        // 3. Delete Trips and Participations
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_troop", (q) => q.eq("troopId", args.id))
            .collect();

        for (const t of trips) {
            const participations = await ctx.db
                .query("participations")
                .withIndex("by_trip", (q) => q.eq("tripId", t._id))
                .collect();
            for (const p of participations) await ctx.db.delete(p._id);
            await ctx.db.delete(t._id);
        }

        // 4. Delete Troop
        await ctx.db.delete(args.id);
    },
});

// --- Gmail OAuth Integration ---

export const connectGmail = mutation({
    args: {
        troopId: v.id("troops"),
        email: v.string(),
        refreshToken: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const troop = await ctx.db.get(args.troopId);
        if (!troop) throw new Error("Troop not found");

        // Only owner or main_leader can connect
        if (!(await isAuthorizedToManage(ctx, args.troopId, user._id))) {
            throw new Error("Nemáte oprávnění nastavovat Gmail.");
        }

        await ctx.db.patch(args.troopId, {
            gmailOAuth: {
                email: args.email,
                refreshToken: args.refreshToken,
                connectedAt: new Date().toISOString(),
                connectedBy: user._id,
            },
        });
    },
});

export const disconnectGmail = mutation({
    args: {
        troopId: v.id("troops"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        // Only owner or main_leader can disconnect
        if (!(await isAuthorizedToManage(ctx, args.troopId, user._id))) {
            throw new Error("Nemáte oprávnění nastavovat Gmail.");
        }

        await ctx.db.patch(args.troopId, {
            gmailOAuth: undefined,
        });
    },
});
