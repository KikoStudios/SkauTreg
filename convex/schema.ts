import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        tokenIdentifier: v.string(),
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
        infoEmail: v.optional(v.string()),
        
        // Email provider integration (OAuth or SMTP)
        emailProvider: v.optional(v.object({
            provider: v.string(), // "gmail", "outlook", "seznam", "centrum", "google-groups"
            email: v.string(), // Connected email address
            // OAuth fields (for Gmail)
            refreshToken: v.optional(v.string()), // OAuth refresh token
            // SMTP fields (for Seznam, Centrum, O2)
            smtpHost: v.optional(v.string()), // e.g., "smtp.seznam.cz"
            smtpPort: v.optional(v.number()), // e.g., 465
            smtpPassword: v.optional(v.string()), // Encrypted password
            // Google Groups integration
            groupEmail: v.optional(v.string()), // Google Group email address
            memberMapping: v.optional(v.array(v.object({
                memberId: v.id("members"),
                emails: v.array(v.string()), // Multiple emails per member (parent + kid)
            }))),
            matchedMemberIds: v.optional(v.array(v.id("members"))), // Members matched from Google Groups import
            // Metadata
            connectedAt: v.string(), // ISO timestamp
            connectedBy: v.id("users"), // User who connected
        })),
        
        // Legacy Gmail OAuth (deprecated, keeping for backward compatibility)
        gmailOAuth: v.optional(v.object({
            email: v.string(), 
            refreshToken: v.string(),
            connectedAt: v.string(),
            connectedBy: v.id("users"),
        })),
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
        // Member info
        name: v.string(),
        nickname: v.optional(v.string()),
        birthDate: v.optional(v.string()),
        // Guardian 1 (optional for backward compatibility)
        guardianName: v.optional(v.string()),
        guardianPhone: v.optional(v.string()),
        guardianEmail: v.optional(v.string()),
        // Guardian 2
        guardian2Name: v.optional(v.string()),
        guardian2Phone: v.optional(v.string()),
        guardian2Email: v.optional(v.string()),
        // Additional
        address: v.optional(v.string()),
        // Legacy fields (for backward compatibility with existing data)
        parentName: v.optional(v.string()),
        parentPhone: v.optional(v.string()),
        parent2Name: v.optional(v.string()),
        parent2Phone: v.optional(v.string()),
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
        baseId: v.optional(v.id("bases")), // Assigned scout base
        lastCancellationDate: v.optional(v.string()), // Latest date to cancel without payment
        lateCancellationMessage: v.optional(v.string()), // Message shown after deadline

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
        lateCancellation: v.optional(v.boolean()),
        lateCancellationAt: v.optional(v.string()),
    })
        .index("by_trip", ["tripId"])
        .index("by_access_key", ["accessKey"]),

    // Pre-synced catalogue of scout bases (zakladny.skaut.cz)
    bases: defineTable({
        zakladnyId: v.number(),
        name: v.string(),
        slug: v.optional(v.string()),
        url: v.optional(v.string()),
        type: v.optional(v.string()),
        typeKey: v.optional(v.string()),
        capacity: v.optional(v.number()),
        capacityNote: v.optional(v.string()),
        coordinates: v.object({
            lat: v.number(),
            lng: v.number(),
        }),
        // Extensive pricing information
        pricing: v.optional(v.object({
            minimalPrice: v.optional(v.number()),
            priceType: v.optional(v.string()),
            perNight: v.optional(v.number()), // Basic price per person per night
            discountChildrenOrgs: v.optional(v.number()), // Price for children's organizations
            discountScouts: v.optional(v.number()), // Price for scouts
            minimumCharge: v.optional(v.number()), // Minimum billable amount
            currencyCode: v.optional(v.string()), // e.g., "CZK"
            description: v.optional(v.string()), // Additional pricing notes
        })),
        // Location and address details
        location: v.optional(v.object({
            address: v.optional(v.string()),
            city: v.optional(v.string()),
            postalCode: v.optional(v.string()),
            region: v.optional(v.string()),
            country: v.optional(v.string()),
        })),
        // Contact information
        contacts: v.optional(v.array(v.object({
            name: v.optional(v.string()),
            role: v.optional(v.string()), // e.g., "manager", "booking"
            email: v.optional(v.string()),
            phone: v.optional(v.string()),
            website: v.optional(v.string()),
        }))),
        // Capacity and amenities details
        amenities: v.optional(v.object({
            accommodationType: v.optional(v.string()), // e.g., "Ubytování"
            minCapacity: v.optional(v.number()), // Ideal minimum people
            maxCapacity: v.optional(v.number()), // Ideal maximum people
            absoluteMaxCapacity: v.optional(v.number()), // Absolute maximum if needed
            equipment: v.optional(v.array(v.string())), // e.g., ["bez vody", "suchý záchod", ...]
            description: v.optional(v.string()), // Detailed amenities description
        })),
        // Base conditions and rules
        conditions: v.optional(v.object({
            accessibility: v.optional(v.string()), // e.g., "není bezbariérová"
            heating: v.optional(v.string()), // e.g., "topení tuhými palivy"
            water: v.optional(v.string()), // e.g., "bez vody"
            toilet: v.optional(v.string()), // e.g., "suchý záchod"
            kitchen: v.optional(v.string()), // e.g., "kuchyňka základně vybavená"
            bedding: v.optional(v.string()), // e.g., "vlastní spacák"
            specialNotes: v.optional(v.string()), // General conditions text
            restrictions: v.optional(v.array(v.string())), // e.g., ["(V řece se objevují bobři.)"]
            language: v.optional(v.string()), // Language for booking (e.g., "Čeština")
        })),
        // Media
        media: v.optional(v.object({
            photos: v.optional(v.array(v.object({
                url: v.string(), // Photo URL
                documentId: v.string(), // Document ID from source
                description: v.optional(v.string()), // Photo description
            }))), // Photos with URLs and metadata
            photoGalleryUrl: v.optional(v.string()), // Link to full photo gallery
            description: v.optional(v.string()), // Detailed description
        })),
        highlighted: v.optional(v.boolean()),
        availability: v.optional(v.string()),
        lastSyncedAt: v.string(), // ISO timestamp
    })
        .index("by_zakladny_id", ["zakladnyId"])
        .index("by_slug", ["slug"]),

    // Catalogue of transport stations (OSM/Overpass)
    stations: defineTable({
        osmId: v.string(), // OSM element id
        name: v.string(),
        idosName: v.optional(v.string()), // IDOS-formatted name with district notation
        lat: v.number(),
        lng: v.number(),
        type: v.string(), // station|halt|stop|unknown
        transportModes: v.optional(v.array(v.string())), // e.g. ["train", "bus", "tram", "metro"]
        hubIndex: v.number(),
        score: v.number(),
        lastSyncedAt: v.string(),
    })
        .index("by_osm_id", ["osmId"]),

    // Mapping bases -> nearest stations with ranking
    base_stations: defineTable({
        baseId: v.id("bases"),
        stationId: v.id("stations"),
        distanceKm: v.number(),
        rank: v.number(),
        score: v.number(),
        // denormalized for convenience when browsing links
        stationName: v.optional(v.string()),
        stationIdosName: v.optional(v.string()),
        lat: v.optional(v.number()),
        lng: v.optional(v.number()),
        type: v.optional(v.string()), // station|halt|stop|unknown
        transportModes: v.optional(v.array(v.string())), // e.g. ["train", "bus", "tram"]
    })
        .index("by_base", ["baseId"])
        .index("by_station", ["stationId"]),

    meetings: defineTable({
        troopId: v.id("troops"),
        tripId: v.optional(v.id("trips")),
        title: v.optional(v.string()),
        description: v.optional(v.string()),
        category: v.optional(v.string()), // "notebook" or "documentation"
        activePageId: v.optional(v.string()), // For syncing view state if needed. Storing as string to be flexible (id or prosemirror doc id)
        status: v.optional(v.string()), // Legacy field for backwards compatibility
    }).index("by_troop", ["troopId"])
      .index("by_trip", ["tripId"]),

    meeting_pages: defineTable({
        meetingId: v.id("meetings"),
        title: v.string(),
        // content is stored in prosemirror-sync component
        excludeFromExport: v.optional(v.boolean()),
        order: v.number(),
    }).index("by_meeting", ["meetingId"]),

    meeting_files: defineTable({
        meetingId: v.id("meetings"),
        storageId: v.string(),
        name: v.string(),
        type: v.string(), // "image", "pdf"
        uploadedBy: v.id("users"),
    }).index("by_meeting", ["meetingId"]),

    meeting_annotations: defineTable({
        fileId: v.id("meeting_files"),
        type: v.string(), // "point" or "draw"
        x: v.optional(v.number()), // Percentage for point annotations
        y: v.optional(v.number()),
        content: v.optional(v.string()), // Comment text for point annotations
        authorId: v.id("users"),
        color: v.optional(v.string()), // Color for drawing annotations
        resolved: v.optional(v.boolean()),
        drawingData: v.optional(v.string()), // SVG path string for draw annotations
        createdAt: v.string(), // ISO timestamp
    }).index("by_file", ["fileId"]),

    meeting_participants: defineTable({
        meetingId: v.id("meetings"),
        userId: v.id("users"),
        firstname: v.optional(v.string()),
        lastname: v.optional(v.string()),
        joinedAt: v.string(),
        leftAt: v.optional(v.string()),
    }).index("by_meeting", ["meetingId"]),

    editor_cursors: defineTable({
        pageId: v.id("meeting_pages"),
        userId: v.id("users"),
        position: v.optional(v.number()), // Cursor position in the document
        selection: v.optional(v.object({
            from: v.number(),
            to: v.number(),
        })),
        lastUpdate: v.number(), // Timestamp in milliseconds
    })
        .index("by_page", ["pageId"])
        .index("by_user_page", ["userId", "pageId"]),

    // Email drafts for trips
    email_drafts: defineTable({
        tripId: v.id("trips"),
        subject: v.string(),
        body: v.string(), // HTML content with smart tags like <user.sign.link>
        createdBy: v.id("users"),
        createdAt: v.string(), // ISO timestamp
        updatedAt: v.string(), // ISO timestamp
        status: v.string(), // "draft", "sent"
        sentAt: v.optional(v.string()), // ISO timestamp
        sentBy: v.optional(v.id("users")),
        recipientCount: v.optional(v.number()),
    }).index("by_trip", ["tripId"]),

    // Error reports - users can report unexpected errors
    error_reports: defineTable({
        userId: v.optional(v.id("users")),
        errorMessage: v.string(),
        errorStack: v.optional(v.string()),
        url: v.optional(v.string()),
        userAgent: v.optional(v.string()),
        userNotes: v.optional(v.string()), // User's additional notes
        status: v.string(), // "new", "investigating", "fixed", "wontfix"
        reportedAt: v.string(), // ISO timestamp
        updatedAt: v.optional(v.string()),
    }).index("by_status", ["status"])
      .index("by_user", ["userId"]),

    // Feature requests and ideas
    feature_requests: defineTable({
        userId: v.id("users"),
        title: v.string(),
        description: v.string(),
        category: v.optional(v.string()), // "bug", "feature", "improvement"
        votes: v.number(), // Total vote count
        status: v.string(), // "open", "planned", "completed", "rejected"
        createdAt: v.string(), // ISO timestamp
        updatedAt: v.optional(v.string()),
    }).index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Voting on feature requests
    feature_votes: defineTable({
        requestId: v.id("feature_requests"),
        userId: v.id("users"),
        vote: v.number(), // 1 for upvote, -1 for downvote
        votedAt: v.string(), // ISO timestamp
    }).index("by_request_user", ["requestId", "userId"])
      .index("by_request", ["requestId"]),

    // Integration Connections (The "Where") - Manage authentication and endpoints for third-party services
    integrations: defineTable({
        troopId: v.id("troops"),
        name: v.string(), // User-defined label (e.g., "Team Discord", "Newsletter Email")
        serviceType: v.string(), // "discord", "email", "whatsapp", "custom_api"
        isActive: v.boolean(), // Enable/disable integration
        
        // Encrypted configuration payload
        configPayload: v.string(), // JSON object containing credentials (encrypted in production)
        
        // Discord specific
        webhookUrl: v.optional(v.string()), // Discord webhook URL
        webhookName: v.optional(v.string()), // Webhook name for reference
        
        // Email specific  
        emailProvider: v.optional(v.string()), // "smtp", "mailgun", "sendgrid"
        emailAddress: v.optional(v.string()), // Sender email
        
        // WhatsApp specific
        phoneNumber: v.optional(v.string()), // WhatsApp Business Account number
        
        // Metadata
        createdBy: v.id("users"),
        createdAt: v.string(), // ISO timestamp
        updatedAt: v.string(), // ISO timestamp
        testStatus: v.optional(v.string()), // "pending", "success", "failed"
        testError: v.optional(v.string()), // Error message if test failed
    })
        .index("by_troop", ["troopId"])
        .index("by_service", ["troopId", "serviceType"]),

    // Integration Actions (The "What" & "When") - Event-driven automation rules
    integration_actions: defineTable({
        troopId: v.id("troops"),
        name: v.string(), // User-defined automation name (e.g., "Notify Discord on Late Cancellation")
        isEnabled: v.boolean(),
        
        // Trigger configuration
        trigger: v.string(), // Event type: "member_unregistered_late", "new_trip_created", "payment_received", "trip_assigned_base"
        triggerConfig: v.object({
            // Flexible config based on trigger type
            conditions: v.optional(v.array(v.object({
                field: v.string(), // "unit_id", "trip_type", "status"
                operator: v.string(), // "equals", "contains", "greater_than"
                value: v.string(), // The value to compare
            }))),
        }),
        
        // Target integration
        integrationId: v.id("integrations"),
        
        // Message template with dynamic variables
        messageTemplate: v.string(), // e.g., "Leader {leader_name} reported late cancellation for {trip_title}"
        messageFormat: v.optional(v.string()), // "plain_text", "markdown", "html"
        
        // Additional options
        includeAttachments: v.optional(v.boolean()),
        retryOnFailure: v.optional(v.boolean()),
        maxRetries: v.optional(v.number()),
        
        // Metadata
        createdBy: v.id("users"),
        createdAt: v.string(),
        updatedAt: v.string(),
        lastTriggeredAt: v.optional(v.string()),
        triggerCount: v.number(), // How many times this action has been triggered
    })
        .index("by_troop", ["troopId"])
        .index("by_trigger", ["troopId", "trigger"])
        .index("by_integration", ["integrationId"]),

    // Log of integration action executions
    integration_logs: defineTable({
        troopId: v.id("troops"),
        actionId: v.id("integration_actions"),
        integrationId: v.id("integrations"),
        
        // Trigger details
        triggerEvent: v.string(),
        triggerData: v.optional(v.string()), // JSON string of what triggered this
        
        // Execution details
        status: v.string(), // "success", "failed", "pending", "skipped"
        sentMessage: v.optional(v.string()), // The actual message that was sent
        responseStatus: v.optional(v.number()), // HTTP status if applicable
        error: v.optional(v.string()), // Error message if failed
        
        // Metadata
        executedAt: v.string(),
        executionTime: v.optional(v.number()), // milliseconds
    })
        .index("by_action", ["actionId"])
        .index("by_troop_date", ["troopId", "executedAt"]),

    // App Version and Update Logs
    app_versions: defineTable({
        version: v.string(), // Semantic version e.g., "1.2.3"
        releaseDate: v.string(), // ISO timestamp
        isActive: v.boolean(), // Current active version
        supernotesCardId: v.optional(v.string()), // Supernotes card ID containing changelog
        changelogMarkdown: v.string(), // Markdown content of the changelog
        changelogHtml: v.optional(v.string()), // HTML rendered version
        category: v.optional(v.string()), // "major", "minor", "patch", "hotfix"
        highlights: v.optional(v.array(v.string())), // Array of highlight bullet points
        createdBy: v.optional(v.id("users")),
    })
        .index("by_version", ["version"])
        .index("by_active", ["isActive"]),

    // User-specific version tracking
    user_version_tracking: defineTable({
        userId: v.id("users"),
        lastSeenVersion: v.string(), // Last version the user acknowledged
        lastSeenAt: v.string(), // ISO timestamp
        dismissedVersions: v.optional(v.array(v.string())), // Versions user explicitly dismissed
    })
        .index("by_user", ["userId"]),

});
