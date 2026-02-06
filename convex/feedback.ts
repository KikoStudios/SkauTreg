import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ERROR REPORTS
export const createErrorReport = mutation({
    args: {
        errorMessage: v.string(),
        errorStack: v.optional(v.string()),
        url: v.optional(v.string()),
        userNotes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const userId = identity ? 
            (await ctx.db.query("users")
                .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
                .unique())?._id 
            : undefined;

        const reportId = await ctx.db.insert("error_reports", {
            userId,
            errorMessage: args.errorMessage,
            errorStack: args.errorStack,
            url: args.url,
            userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
            userNotes: args.userNotes,
            status: "new",
            reportedAt: new Date().toISOString(),
        });

        return reportId;
    },
});

export const getErrorReports = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) return [];

        const reports = await ctx.db.query("error_reports")
            .collect();

        // Return all reports with user info for dashboard
        return Promise.all(reports.map(async (report) => {
            const author = report.userId ? await ctx.db.get(report.userId) : null;
            return {
                ...report,
                author: author ? { name: author.name, email: author.email } : null,
            };
        }));
    },
});

// FEATURE REQUESTS
export const createFeatureRequest = mutation({
    args: {
        title: v.string(),
        description: v.string(),
        category: v.optional(v.string()), // "bug", "feature", "improvement"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const requestId = await ctx.db.insert("feature_requests", {
            userId: user._id,
            title: args.title,
            description: args.description,
            category: args.category || "feature",
            votes: 0,
            status: "open",
            createdAt: new Date().toISOString(),
        });

        return requestId;
    },
});

export const getFeatureRequests = query({
    args: {
        status: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let requests;

        if (args.status && args.status.length > 0) {
            requests = await ctx.db.query("feature_requests")
                .withIndex("by_status", q => q.eq("status", args.status as string))
                .collect();
        } else {
            requests = await ctx.db.query("feature_requests").collect();
        }

        // Sort by votes descending
        requests.sort((a, b) => b.votes - a.votes);

        // Add user info and check if current user voted
        const identity = await ctx.auth.getUserIdentity();
        let currentUserId: any = null;

        if (identity) {
            const user = await ctx.db.query("users")
                .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
                .unique();
            currentUserId = user?._id;
        }

        return Promise.all(requests.map(async (request) => {
            const author = await ctx.db.get(request.userId);
            
            // Check if current user voted
            let userVote = 0;
            if (currentUserId) {
                const vote = await ctx.db.query("feature_votes")
                    .withIndex("by_request_user", q => 
                        q.eq("requestId", request._id).eq("userId", currentUserId)
                    )
                    .unique();
                userVote = vote?.vote || 0;
            }

            return {
                ...request,
                author: author ? { name: author.name || "", email: author.email || "" } : { name: "Unknown", email: "" },
                userVote,
            };
        }));
    },
});

export const voteOnFeature = mutation({
    args: {
        requestId: v.id("feature_requests"),
        vote: v.number(), // 1 for upvote, -1 for downvote, 0 to remove vote
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        // Check if user already voted
        const existingVote = await ctx.db.query("feature_votes")
            .withIndex("by_request_user", q => 
                q.eq("requestId", args.requestId).eq("userId", user._id)
            )
            .unique();

        if (args.vote === 0) {
            // Remove vote
            if (existingVote) {
                await ctx.db.delete(existingVote._id);
                const newVotes = Math.max(0, request.votes - (existingVote.vote || 0));
                await ctx.db.patch(args.requestId, { votes: newVotes });
            }
        } else {
            // Update or create vote
            const oldVote = existingVote?.vote || 0;
            const voteChange = args.vote - oldVote;

            if (existingVote) {
                await ctx.db.patch(existingVote._id, { 
                    vote: args.vote,
                    votedAt: new Date().toISOString(),
                });
            } else {
                await ctx.db.insert("feature_votes", {
                    requestId: args.requestId,
                    userId: user._id,
                    vote: args.vote,
                    votedAt: new Date().toISOString(),
                });
            }

            const newVotes = Math.max(0, request.votes + voteChange);
            await ctx.db.patch(args.requestId, { votes: newVotes });
        }
    },
});

export const updateFeatureStatus = mutation({
    args: {
        requestId: v.id("feature_requests"),
        status: v.string(), // "open", "planned", "completed", "rejected"
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .unique();

        if (!user) throw new Error("User not found");

        const request = await ctx.db.get(args.requestId);
        if (!request) throw new Error("Request not found");

        // Only admin or owner can update status (for now, just owner)
        if (request.userId !== user._id && user.email !== "admin@skautreg.app") {
            throw new Error("Nemáte oprávnění měnit stav");
        }

        await ctx.db.patch(args.requestId, {
            status: args.status,
            updatedAt: new Date().toISOString(),
        });
    },
});
