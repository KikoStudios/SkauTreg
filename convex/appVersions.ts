import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser, requireDataAdmin } from "./lib/auth";

/**
 * Get the current active version of the app
 */
export const getCurrentVersion = query({
  args: {},
  handler: async (ctx) => {
    const activeVersion = await ctx.db
      .query("app_versions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    return activeVersion;
  },
});

/**
 * Get all versions sorted by release date (newest first)
 */
export const getAllVersions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("app_versions")
      .collect();

    // Sort by release date descending
    const sorted = versions.sort((a, b) => 
      new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()
    );

    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

/**
 * Get user's last seen version
 */
export const getUserVersionTracking = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) return null;

    const tracking = await ctx.db
      .query("user_version_tracking")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    return tracking;
  },
});

/**
 * Check if user needs to see update notification
 */
export const checkForUpdates = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { hasUpdate: false, currentVersion: null, userVersion: null };

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) return { hasUpdate: false, currentVersion: null, userVersion: null };

    const currentVersion = await ctx.db
      .query("app_versions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first();

    const tracking = await ctx.db
      .query("user_version_tracking")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!currentVersion) {
      return { hasUpdate: false, currentVersion: null, userVersion: null };
    }

    // User has never seen any version
    if (!tracking) {
      return { 
        hasUpdate: true, 
        currentVersion: currentVersion.version, 
        userVersion: null,
        changelogData: currentVersion 
      };
    }

    // Check if current version is newer than user's last seen
    const hasUpdate = currentVersion.version !== tracking.lastSeenVersion &&
                     !tracking.dismissedVersions?.includes(currentVersion.version);

    return {
      hasUpdate,
      currentVersion: currentVersion.version,
      userVersion: tracking.lastSeenVersion,
      changelogData: hasUpdate ? currentVersion : null
    };
  },
});

/**
 * Mark version as seen by user
 */
export const markVersionAsSeen = mutation({
  args: {
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("user_version_tracking")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastSeenVersion: args.version,
        lastSeenAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("user_version_tracking", {
        userId: user._id,
        lastSeenVersion: args.version,
        lastSeenAt: new Date().toISOString(),
        dismissedVersions: [],
      });
    }

    return { success: true };
  },
});

/**
 * Dismiss a version (user doesn't want to see it)
 */
export const dismissVersion = mutation({
  args: {
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);

    const existing = await ctx.db
      .query("user_version_tracking")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (existing) {
      const dismissed = existing.dismissedVersions || [];
      if (!dismissed.includes(args.version)) {
        dismissed.push(args.version);
      }
      
      await ctx.db.patch(existing._id, {
        dismissedVersions: dismissed,
        lastSeenVersion: args.version,
        lastSeenAt: new Date().toISOString(),
      });
    } else {
      await ctx.db.insert("user_version_tracking", {
        userId: user._id,
        lastSeenVersion: args.version,
        lastSeenAt: new Date().toISOString(),
        dismissedVersions: [args.version],
      });
    }

    return { success: true };
  },
});

/**
 * Create a new version (admin only)
 */
export const createVersion = mutation({
  args: {
    version: v.string(),
    changelogMarkdown: v.string(),
    changelogHtml: v.optional(v.string()),
    category: v.optional(v.string()),
    highlights: v.optional(v.array(v.string())),
    supernotesCardId: v.optional(v.string()),
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireDataAdmin(ctx);

    // If setting as active, deactivate all other versions
    if (args.setAsActive) {
      const allVersions = await ctx.db.query("app_versions").collect();
      for (const version of allVersions) {
        if (version.isActive) {
          await ctx.db.patch(version._id, { isActive: false });
        }
      }
    }

    const versionId = await ctx.db.insert("app_versions", {
      version: args.version,
      releaseDate: new Date().toISOString(),
      isActive: args.setAsActive ?? true,
      changelogMarkdown: args.changelogMarkdown,
      changelogHtml: args.changelogHtml,
      category: args.category,
      highlights: args.highlights,
      supernotesCardId: args.supernotesCardId,
      createdBy: user._id,
    });

    return { success: true, versionId };
  },
});

/**
 * Update active version
 */
export const setActiveVersion = mutation({
  args: {
    versionId: v.id("app_versions"),
  },
  handler: async (ctx, args) => {
    await requireDataAdmin(ctx);

    // Deactivate all versions
    const allVersions = await ctx.db.query("app_versions").collect();
    for (const version of allVersions) {
      if (version.isActive) {
        await ctx.db.patch(version._id, { isActive: false });
      }
    }

    // Activate the selected version
    await ctx.db.patch(args.versionId, { isActive: true });

    return { success: true };
  },
});

/**
 * Sync version from Supernotes card
 */
export const syncVersionFromSupernotes = mutation({
  args: {
    supernotesCardId: v.string(),
    version: v.string(),
    setAsActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireDataAdmin(ctx);

    // This will be called from the client after fetching from Supernotes
    // For now, just create a placeholder that will be updated with the actual content
    
    return { 
      success: true, 
      message: "Use the client-side sync to fetch and update Supernotes content" 
    };
  },
});
