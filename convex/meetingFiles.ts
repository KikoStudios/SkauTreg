
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const upload = mutation({
    args: {
        storageId: v.string(),
        meetingId: v.id("meetings"),
        name: v.string(),
        type: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        // Find user
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) throw new Error("User not found");

        return await ctx.db.insert("meeting_files", {
            meetingId: args.meetingId,
            storageId: args.storageId,
            name: args.name,
            type: args.type,
            uploadedBy: user._id,
        });
    },
});

export const generateUploadUrl = mutation({
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl();
    },
});

export const list = query({
    args: { meetingId: v.id("meetings") },
    handler: async (ctx, args) => {
        const files = await ctx.db
            .query("meeting_files")
            .withIndex("by_meeting", q => q.eq("meetingId", args.meetingId))
            .collect();

        return Promise.all(files.map(async (f) => {
            const url = await ctx.storage.getUrl(f.storageId);
            return {
                ...f,
                url, // Include signed URL
            };
        }));
    }
});

export const listByTrip = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        // 1. Get all meetings for this trip
        const meetings = await ctx.db
            .query("meetings")
            .withIndex("by_trip", q => q.eq("tripId", args.tripId))
            .collect();
        
        const meetingIds = meetings.map(m => m._id);

        // 2. Get files for all these meetings
        // Convex doesn't have a broad $in for IDs in a single query easily without filtering 
        // or doing multiple queries. Since usually there aren't thousands of meetings per trip:
        const allFiles = [];
        for (const mid of meetingIds) {
            const mFiles = await ctx.db
                .query("meeting_files")
                .withIndex("by_meeting", q => q.eq("meetingId", mid))
                .collect();
            allFiles.push(...mFiles);
        }

        return Promise.all(allFiles.map(async (f) => {
            const url = await ctx.storage.getUrl(f.storageId);
            return {
                ...f,
                url, 
            };
        }));
    }
});

export const addAnnotation = mutation({
    args: {
        fileId: v.id("meeting_files"),
        type: v.string(), // "point" or "draw"
        x: v.optional(v.number()),
        y: v.optional(v.number()),
        content: v.optional(v.string()),
        color: v.optional(v.string()),
        drawingData: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();

        if (!user) throw new Error("User not found");

        return await ctx.db.insert("meeting_annotations", {
            fileId: args.fileId,
            type: args.type,
            x: args.x,
            y: args.y,
            content: args.content,
            color: args.color,
            authorId: user._id,
            resolved: false,
            drawingData: args.drawingData,
            createdAt: new Date().toISOString(),
        });
    }
});

export const getAnnotations = query({
    args: { fileId: v.id("meeting_files") },
    handler: async (ctx, args) => {
        const annotations = await ctx.db
            .query("meeting_annotations")
            .withIndex("by_file", q => q.eq("fileId", args.fileId))
            .collect();

        return Promise.all(annotations.map(async (a) => {
            const user = await ctx.db.get(a.authorId);
            return { ...a, authorName: user?.name, authorImage: user?.image };
        }));
    }
});

export const deleteFile = mutation({
    args: { fileId: v.id("meeting_files") },
    handler: async (ctx, args) => {
        const file = await ctx.db.get(args.fileId);
        if (!file) throw new Error("File not found");

        // Delete from storage
        await ctx.storage.delete(file.storageId);

        // Delete all annotations for this file
        const annotations = await ctx.db
            .query("meeting_annotations")
            .withIndex("by_file", q => q.eq("fileId", args.fileId))
            .collect();

        for (const annotation of annotations) {
            await ctx.db.delete(annotation._id);
        }

        // Delete the file record
        await ctx.db.delete(args.fileId);
    }
});

export const resolveAnnotation = mutation({
    args: { annotationId: v.id("meeting_annotations") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.annotationId, { resolved: true });
    }
});
