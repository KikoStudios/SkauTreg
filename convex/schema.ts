import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        tokenIdentifier: v.string(),
    })
        .index("by_token", ["tokenIdentifier"])
        .index("by_email", ["email"]),

    troops: defineTable({
        name: v.string(),
        description: v.optional(v.string()),
        leaderIds: v.optional(v.array(v.id("users"))), // Deprecated, will be removed after migration
        ownerId: v.id("users"), // Owner/Creator (Full Admin)
        number: v.optional(v.string()), // e.g. "106"
        type: v.optional(v.string()), // e.g. "Vlčata"
        logo: v.optional(v.string()), // URL or base64
        accentColor: v.optional(v.string()), // Hex code (pastel preferred)
        contactEmail: v.optional(v.string()),
    }),

    troop_leaders: defineTable({
        troopId: v.id("troops"),
        userId: v.id("users"),
        role: v.string(), // "main_leader", "leader", "rover"
    })
        .index("by_troop", ["troopId"])
        .index("by_user_troop", ["userId", "troopId"]),

    members: defineTable({
        troopId: v.id("troops"),
        name: v.string(),
        nickname: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        parentName: v.string(),
        parentPhone: v.string(),
        email: v.optional(v.string()),
        // Extensible fields
    }).index("by_troop", ["troopId"]),

    trips: defineTable({
        troopId: v.id("troops"),
        name: v.string(),
        description: v.string(),
        location: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        linkStub: v.optional(v.string()),

        // "registration" (Complex form) or "apology" (Simple I'm not coming)
        formType: v.optional(v.string()),

        // Structured custom fields
        customFields: v.optional(v.array(v.object({
            label: v.string(),
            type: v.string(), // "text", "boolean", "checkbox", "select"
            required: v.boolean(),
            info: v.optional(v.string()),
            placeholder: v.optional(v.string()),
            options: v.optional(v.array(v.string()))
        }))),
    }).index("by_troop", ["troopId"]),

    participations: defineTable({
        tripId: v.id("trips"),
        memberId: v.id("members"),
        status: v.string(), // "attending", "not_attending", "pending"
        accessKey: v.string(), // unique random key for public link
        responses: v.optional(v.any()), // flexible JSON for form answers
    })
        .index("by_trip", ["tripId"])
        .index("by_access_key", ["accessKey"]),
});
