import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { normalizeLeaderRole } from "./lib/memberEmails";
import { authError, requireCurrentUser, requireTroopManager, requireTroopOwner, requireTroopViewer } from "./lib/auth";
import { decryptCredential, encryptCredential } from "./lib/credentials";

function redactTroopSecrets<T extends {
    emailProvider?: {
        provider: string;
        email: string;
        connectedAt: string;
        connectedBy: unknown;
        groupEmail?: string;
        memberMapping?: unknown;
        matchedMemberIds?: unknown;
        requiresReconnect?: boolean;
    };
    gmailOAuth?: unknown;
}>(troop: T) {
    const provider = troop.emailProvider;
    return {
        ...troop,
        emailProvider: provider ? {
            provider: provider.provider,
            email: provider.email,
            groupEmail: provider.groupEmail,
            memberMapping: provider.memberMapping,
            matchedMemberIds: provider.matchedMemberIds,
            connectedAt: provider.connectedAt,
            connectedBy: provider.connectedBy,
            requiresReconnect: provider.requiresReconnect,
        } : undefined,
        gmailOAuth: undefined,
    };
}

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
            publicDirectoryOptIn: false,
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
        await requireTroopManager(ctx, args.id);

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
        const allTroops = [...ownedTroops, ...memberTroops]
            .filter((t): t is NonNullable<typeof t> => t !== null && !t.archivedAt);

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
            return redactTroopSecrets({ ...t, logo: logoUrl });
        }));

        return troopsWithUrls;
    },
});

export const getById = query({
    args: { id: v.id("troops") },
    handler: async (ctx, args) => {
        const authorization = await requireTroopViewer(ctx, args.id);
        const troop = await ctx.db.get(args.id);
        if (!troop) return null;
        if (troop.archivedAt && authorization.role !== "owner") {
            authError("NOT_FOUND", "Oddíl nebyl nalezen.");
        }

        let logoUrl = troop.logo;
        if (troop.logo && !troop.logo.startsWith("http")) {
            try {
                logoUrl = await ctx.storage.getUrl(troop.logo as any) || troop.logo;
            } catch (e) {
                // ignore
            }
        }

        return redactTroopSecrets({ ...troop, logo: logoUrl });
    }
});

// --- Leadership Management ---

export const addLeader = mutation({
    args: {
        troopId: v.id("troops"),
        email: v.string(),
        role: v.string() // "main_leader", "leader", "rover"
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit. Přejít na přihlášení?");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst. Zkuste se odhlásit a znovu přihlásit.");

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
            role: normalizeLeaderRole(args.role) ?? "leader"
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
        await requireTroopManager(ctx, args.troopId);
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit.");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst.");

        const leaderRecord = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", args.userId).eq("troopId", args.troopId))
            .unique();

        if (!leaderRecord) throw new Error("👤 Vedoucí nebyl nalezen.");

        await ctx.db.patch(leaderRecord._id, { role: normalizeLeaderRole(args.newRole) ?? leaderRecord.role });
    }
});

export const removeLeader = mutation({
    args: {
        troopId: v.id("troops"),
        userId: v.id("users")
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("🔐 Musíte se přihlásit.");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();
        if (!currentUser) throw new Error("⚠️ Váš profil se nepodařilo načíst.");

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
        await requireTroopViewer(ctx, args.troopId);
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
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    image: user.image,
                    role: normalizeLeaderRole(record.role), // "main_leader", "leader", "rover"
                    isOwner: user._id === troop.ownerId
                }
            })
        );

        const validLeaders = leaders.filter(l => l !== null);

        // Check if owner is already in the list via explicit role
        const ownerInList = validLeaders.find(l => l!._id === troop.ownerId);

        if (!ownerInList && owner) {
            // Add owner with default role if not assigned a specific one
            return [
                {
                    _id: owner._id,
                    name: owner.name,
                    email: owner.email,
                    image: owner.image,
                    role: "owner",
                    isOwner: true,
                },
                ...validLeaders
            ];
        }

        return validLeaders;
    }
});

export const getMyRole = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        const { role } = await requireTroopViewer(ctx, args.troopId);
        return role;
    },
});

export const getEmailConfiguration = internalQuery({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const troop = await ctx.db.get(args.troopId);
        if (!troop) return null;
        return {
            troopId: troop._id,
            name: troop.name,
            contactEmail: troop.contactEmail,
            infoEmail: troop.infoEmail,
            emailProvider: troop.emailProvider
                ? {
                    ...troop.emailProvider,
                    refreshToken: await decryptCredential(troop.emailProvider.refreshToken),
                    smtpPassword: await decryptCredential(troop.emailProvider.smtpPassword),
                }
                : undefined,
            gmailOAuth: troop.gmailOAuth
                ? {
                    ...troop.gmailOAuth,
                    refreshToken: await decryptCredential(troop.gmailOAuth.refreshToken),
                }
                : undefined,
        };
    },
});

export const deleteTroop = internalMutation({
    args: { id: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopOwner(ctx, args.id);
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

export const archive = mutation({
    args: {
        troopId: v.id("troops"),
        confirmationName: v.string(),
        reason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { user, troop } = await requireTroopOwner(ctx, args.troopId);
        if (args.confirmationName.trim() !== troop.name.trim()) {
            authError("VALIDATION_ERROR", "Název oddílu se neshoduje.");
        }
        await ctx.db.patch(args.troopId, {
            archivedAt: new Date().toISOString(),
            archivedBy: user._id,
            archiveReason: args.reason?.trim() || undefined,
            publicDirectoryOptIn: false,
        });
        return { ok: true };
    },
});

export const restore = mutation({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopOwner(ctx, args.troopId);
        await ctx.db.patch(args.troopId, {
            archivedAt: undefined,
            archivedBy: undefined,
            archiveReason: undefined,
        });
        return { ok: true };
    },
});

export const listArchived = query({
    args: {},
    handler: async (ctx) => {
        const user = await requireCurrentUser(ctx);
        const troops = await ctx.db
            .query("troops")
            .filter((q) => q.eq(q.field("ownerId"), user._id))
            .collect();
        return troops
            .filter((troop) => Boolean(troop.archivedAt))
            .map((troop) => ({
                _id: troop._id,
                name: troop.name,
                archivedAt: troop.archivedAt,
                archiveReason: troop.archiveReason,
            }));
    },
});

// --- Email Provider Integration (Multi-Provider Support) ---

export const connectEmailProvider = mutation({
    args: {
        troopId: v.id("troops"),
        provider: v.string(), // "gmail" | "outlook" | "seznam" | "centrum" | "google-groups"
        email: v.string(),
        // OAuth fields
        refreshToken: v.optional(v.string()),
        // SMTP fields
        smtpHost: v.optional(v.string()),
        smtpPort: v.optional(v.number()),
        smtpPassword: v.optional(v.string()),
        // Google Groups fields
        groupEmail: v.optional(v.string()),
        memberMapping: v.optional(v.array(v.object({
            memberId: v.id("members"),
            emails: v.array(v.string()),
        }))),
        // New Google Groups import format
        matchedMemberIds: v.optional(v.array(v.id("members"))),
        newMembers: v.optional(v.array(v.object({
            email: v.string(),
            name: v.string(),
        }))),
    },
    handler: async (ctx, args) => {
        const { user } = await requireTroopManager(ctx, args.troopId);
        if (args.provider !== "gmail") {
            authError("VALIDATION_ERROR", "Toto připojení podporuje pouze starší Gmail OAuth.");
        }
        const email = args.email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
            authError("VALIDATION_ERROR", "Zadejte platnou e-mailovou adresu Google účtu.");
        }
        if (!args.refreshToken || args.refreshToken.length > 4096 || args.smtpHost || args.smtpPort || args.smtpPassword || args.groupEmail || args.memberMapping || args.matchedMemberIds || args.newMembers) {
            authError("VALIDATION_ERROR", "Gmail propojení nepřijímá nastavení jiných poskytovatelů.");
        }

        await ctx.db.patch(args.troopId, {
            emailProvider: {
                provider: "gmail",
                email,
                refreshToken: await encryptCredential(args.refreshToken),
                connectedAt: new Date().toISOString(),
                connectedBy: user._id,
                requiresReconnect: false,
            },
        });
    },
});

export const storeGmailSmtp = internalMutation({
    args: {
        troopId: v.id("troops"),
        email: v.string(),
        appPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const { user } = await requireTroopManager(ctx, args.troopId);
        const email = args.email.trim().toLowerCase();
        const appPassword = args.appPassword.replace(/\s/g, "");
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
            authError("VALIDATION_ERROR", "Zadejte platnou e-mailovou adresu Google účtu.");
        }
        if (!/^[a-zA-Z0-9]{16}$/.test(appPassword)) {
            authError("VALIDATION_ERROR", "Zadejte platné šestnáctimístné heslo aplikace Google.");
        }
        await ctx.db.patch(args.troopId, {
            emailProvider: {
                provider: "gmail-smtp",
                email,
                smtpHost: "smtp.gmail.com",
                smtpPort: 465,
                smtpPassword: await encryptCredential(appPassword),
                connectedAt: new Date().toISOString(),
                connectedBy: user._id,
                requiresReconnect: false,
            },
        });
    },
});

export const disconnectEmailProvider = mutation({
    args: {
        troopId: v.id("troops"),
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.troopId, {
            emailProvider: undefined,
            gmailOAuth: undefined, // Clear legacy too
        });
    },
});

// --- Legacy Gmail OAuth Integration (Backward Compatible) ---

export const connectGmail = internalMutation({
    args: {
        troopId: v.id("troops"),
        email: v.string(),
        refreshToken: v.string(),
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
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

        // Use new emailProvider format instead of legacy gmailOAuth
        await ctx.db.patch(args.troopId, {
            emailProvider: {
                provider: "gmail",
                email: args.email,
                refreshToken: await encryptCredential(args.refreshToken),
                connectedAt: new Date().toISOString(),
                connectedBy: user._id,
                requiresReconnect: false,
            },
        });
    },
});

export const disconnectGmail = internalMutation({
    args: {
        troopId: v.id("troops"),
    },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(args.troopId, {
            emailProvider: undefined,
            gmailOAuth: undefined,
        });
    },
});

export const listPublic = query({
    args: {},
    handler: async (ctx) => {
        const allTroops = (await ctx.db.query("troops").collect())
            .filter((troop) => troop.publicDirectoryOptIn === true && !troop.archivedAt);

        // Resolve Logo URLs
        const troopsWithUrls = await Promise.all(
            allTroops.map(async (t) => {
                let logoUrl = t.logo;
                if (t.logo && !t.logo.startsWith("http")) {
                    try {
                        logoUrl = await ctx.storage.getUrl(t.logo as any) || t.logo;
                    } catch (e) {
                        // ignore invalid ID format
                    }
                }
                return { 
                    _id: t._id,
                    name: t.name,
                    logo: logoUrl,
                };
            })
        );

        return troopsWithUrls;
    },
});

export const markGmailReconnectRequired = internalMutation({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        await requireTroopManager(ctx, args.troopId);
        const troop = await ctx.db.get(args.troopId);
        if (!troop?.emailProvider || !["gmail", "gmail-smtp"].includes(troop.emailProvider.provider)) return;
        await ctx.db.patch(args.troopId, {
            emailProvider: { ...troop.emailProvider, requiresReconnect: true },
        });
    },
});

export const setPublicDirectoryOptIn = mutation({
    args: {
        troopId: v.id("troops"),
        enabled: v.boolean(),
    },
    handler: async (ctx, args) => {
        await requireTroopOwner(ctx, args.troopId);
        await ctx.db.patch(args.troopId, { publicDirectoryOptIn: args.enabled });
    },
});
