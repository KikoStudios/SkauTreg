import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

async function findParticipationByCapability(
    ctx: QueryCtx | MutationCtx,
    accessKey: string,
) {
    const secure = await ctx.db
        .query("participations")
        .withIndex("by_secure_access_key", (q) => q.eq("secureAccessKey", accessKey))
        .unique();
    if (secure) return secure;

    const legacy = await ctx.db
        .query("participations")
        .withIndex("by_access_key", (q) => q.eq("accessKey", accessKey))
        .unique();
    if (!legacy) return null;
    if (legacy.legacyAccessExpiresAt && Date.now() > Date.parse(legacy.legacyAccessExpiresAt)) {
        return null;
    }
    return legacy;
}

function validateResponses(
    responses: unknown,
    customFields: Array<{ label: string; type: string; options?: string[] }> | undefined,
) : Record<string, unknown> | undefined {
    if (responses === undefined) return undefined;

    // Older RSVP clients sent the form object as JSON. Keep accepting those
    // links during the additive rollout, but always validate and store an object.
    let normalized = responses;
    if (typeof normalized === "string") {
        try {
            normalized = JSON.parse(normalized);
        } catch {
            throw new Error("Neplatný formát odpovědí.");
        }
    }

    if (!normalized || typeof normalized !== "object" || Array.isArray(normalized)) {
        throw new Error("Neplatný formát odpovědí.");
    }

    const record = normalized as Record<string, unknown>;
    const allowed = new Map((customFields ?? []).map((field) => [field.label, field]));
    if (Object.keys(record).length > 50 || JSON.stringify(record).length > 20_000) {
        throw new Error("Odpověď je příliš velká.");
    }

    for (const [key, value] of Object.entries(record)) {
        const field = allowed.get(key);
        if (!field) throw new Error("Odpověď obsahuje neznámé pole.");
        if (typeof value === "string" && value.length > 2_000) {
            throw new Error("Text odpovědi je příliš dlouhý.");
        }
        if (field.options && typeof value === "string" && !field.options.includes(value)) {
            throw new Error("Odpověď obsahuje neplatnou možnost.");
        }
        if (Array.isArray(value)) {
            if (value.length > 50 || value.some((item) => typeof item !== "string" || item.length > 500)) {
                throw new Error("Odpověď obsahuje neplatný seznam.");
            }
            if (field.options && value.some((item) => !field.options?.includes(item))) {
                throw new Error("Odpověď obsahuje neplatnou možnost.");
            }
        } else if (!["string", "boolean", "number"].includes(typeof value) && value !== null) {
            throw new Error("Odpověď obsahuje nepodporovanou hodnotu.");
        }
    }

    return record;
}

// Public query: no auth required, identified by a high-entropy capability.
export const getByAccessKey = query({
    args: { accessKey: v.string() },
    handler: async (ctx, args) => {
        // 1. Find participation record by accessKey
        const participation = await findParticipationByCapability(ctx, args.accessKey);

        if (!participation) {
            return null; // Invalid link
        }

        // 2. Fetch Trip details
        const trip = await ctx.db.get(participation.tripId);
        if (!trip) {
            return null; // Should not happen if referential integrity is maintained
        }

        // 3. Fetch Member details (to show "Hello [Name]" on the page)
        const member = await ctx.db.get(participation.memberId);
        if (!member) {
            return null;
        }

        // Return only public-safe info
        return {
            tripName: trip.name,
            tripDescription: trip.description,
            tripLocation: trip.location,
            tripStartDate: trip.startDate,
            tripEndDate: trip.endDate,
            tripLastCancellationDate: trip.lastCancellationDate,
            tripLateCancellationMessage: trip.lateCancellationMessage,
            formType: trip.formType || "registration",
            customFields: trip.customFields,
            memberName: member.name, // Personalization
            memberNickname: member.nickname,
            currentStatus: participation.status,
            currentResponses: participation.responses,
        };
    },
});

// Public mutation: Submit RSVP
export const submit = mutation({
    args: {
        accessKey: v.string(),
        status: v.union(v.literal("attending"), v.literal("not_attending")),
        responses: v.optional(v.any()), // Form data matching customFields
    },
    handler: async (ctx, args) => {
        // 1. Verify availability
        const participation = await findParticipationByCapability(ctx, args.accessKey);

        if (!participation) {
            throw new Error("Invalid access key");
        }

        const trip = await ctx.db.get(participation.tripId);
        if (!trip) {
            throw new Error("Trip not found");
        }
        const responses = validateResponses(args.responses, trip.customFields);

        const isAfterDeadline = (lastCancellationDate: string | undefined) => {
            if (!lastCancellationDate) return false;
            const [y, m, d] = lastCancellationDate.split("-").map(Number);
            const deadline = new Date(y, m - 1, d);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return today > deadline;
        };

        const lateCancellation = args.status === "not_attending" && isAfterDeadline(trip.lastCancellationDate);
        const lateCancellationAt = lateCancellation ? new Date().toISOString() : undefined;

        // 2. Update status and responses
        await ctx.db.patch(participation._id, {
            status: args.status,
            responses,
            lateCancellation,
            lateCancellationAt,
        });

        return { success: true };
    },
});
