import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
        dateOfBirth: v.optional(v.string()),
        benefit: v.optional(v.string()),
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
        publicDirectoryOptIn: v.optional(v.boolean()),
        archivedAt: v.optional(v.string()),
        archivedBy: v.optional(v.id("users")),
        archiveReason: v.optional(v.string()),
        
        // Email provider integration (legacy OAuth or Gmail SMTP app password)
        emailProvider: v.optional(v.object({
            provider: v.string(), // "gmail-smtp" or legacy "gmail"
            email: v.string(), // Connected email address
            // OAuth fields (for Gmail)
            refreshToken: v.optional(v.string()), // OAuth refresh token
            // SMTP fields (Gmail settings are server-controlled)
            smtpHost: v.optional(v.string()),
            smtpPort: v.optional(v.number()),
            smtpPassword: v.optional(v.string()), // Encrypted Google app password
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
            requiresReconnect: v.optional(v.boolean()),
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
        financeSettings: v.optional(v.object({
            currency: v.string(), // "CZK"
            manualPricePerParticipant: v.optional(v.number()),
            paymentDueDate: v.optional(v.string()),
            useManualParticipantPrice: v.optional(v.boolean()),
            notes: v.optional(v.string()),
        })),
    }).index("by_troop", ["troopId"]),

    trip_budget_items: defineTable({
        tripId: v.id("trips"),
        category: v.string(),
        subcategory: v.string(),
        name: v.string(),
        plannedAmount: v.optional(v.number()),
        actualAmount: v.optional(v.number()),
        quantity: v.optional(v.number()),
        unitLabel: v.optional(v.string()),
        note: v.optional(v.string()),
        sortOrder: v.number(),
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_trip", ["tripId"])
        .index("by_trip_category", ["tripId", "category"]),

    trip_member_payments: defineTable({
        tripId: v.id("trips"),
        memberId: v.id("members"),
        status: v.string(), // "unpaid" | "partial" | "paid" | "excused"
        expectedAmount: v.optional(v.number()),
        paidAmount: v.optional(v.number()),
        paidAt: v.optional(v.string()),
        note: v.optional(v.string()),
        updatedAt: v.string(),
    })
        .index("by_trip", ["tripId"])
        .index("by_trip_member", ["tripId", "memberId"]),

    transport_routes: defineTable({
        tripId: v.id("trips"),
        direction: v.string(), // "outbound" | "return" | "unknown"
        source: v.string(), // "idos" | "manual"
        from: v.optional(v.string()),
        to: v.optional(v.string()),
        date: v.optional(v.string()), // YYYY-MM-DD
        departureTime: v.optional(v.string()), // HH:MM
        arrivalTime: v.optional(v.string()), // HH:MM
        duration: v.optional(v.string()),
        transferCount: v.optional(v.number()),
        price: v.optional(v.string()),
        shareLink: v.optional(v.string()),
        idosTrip: v.optional(v.any()), // Snapshot of IDOS trip payload
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_trip", ["tripId"])
        .index("by_trip_direction", ["tripId", "direction"]),

    transport_tickets: defineTable({
        tripId: v.id("trips"),
        routeId: v.optional(v.id("transport_routes")),
        storageId: v.string(),
        name: v.string(),
        contentType: v.string(), // "application/pdf" | "image/*" | other
        parsed: v.optional(v.any()), // { ticketCode?, ... }
        shareEnabled: v.optional(v.boolean()),
        shareSlug: v.optional(v.string()),
        shareUpdatedAt: v.optional(v.string()),
        shareExpiresAt: v.optional(v.string()),
        priceOverview: v.optional(v.object({
            // v2 (preferred): unit prices + counts
            kidUnitCzk: v.optional(v.number()),
            adultUnitCzk: v.optional(v.number()),
            studentUnitCzk: v.optional(v.number()),
            kidCount: v.optional(v.number()),
            adultCount: v.optional(v.number()),
            studentCount: v.optional(v.number()),
            // v1 legacy: treat as unit prices in UI
            kidCzk: v.optional(v.number()),
            adultCzk: v.optional(v.number()),
            studentCzk: v.optional(v.number()),
        })),
        createdAt: v.string(),
        updatedAt: v.string(),
    })
        .index("by_trip", ["tripId"])
        .index("by_route", ["routeId"])
        .index("by_share_slug", ["shareSlug"]),

    trip_ticket_shares: defineTable({
        tripId: v.id("trips"),
        shareSlug: v.string(),
        enabled: v.boolean(),
        selectedTicketIds: v.array(v.id("transport_tickets")),
        expiresAt: v.string(),
        createdAt: v.string(),
        createdBy: v.id("users"),
        updatedAt: v.string(),
        updatedBy: v.id("users"),
        revokedAt: v.optional(v.string()),
    })
        .index("by_trip", ["tripId"])
        .index("by_share_slug", ["shareSlug"]),

    participations: defineTable({
        tripId: v.id("trips"),
        memberId: v.id("members"),
        status: v.string(), // "attending", "not_attending", "pending"
        accessKey: v.string(), // unique random key for public link
        secureAccessKey: v.optional(v.string()),
        legacyAccessExpiresAt: v.optional(v.string()),
        responses: v.optional(v.any()), // flexible JSON for form answers
        lateCancellation: v.optional(v.boolean()),
        lateCancellationAt: v.optional(v.string()),
    })
        .index("by_trip", ["tripId"])
        .index("by_access_key", ["accessKey"])
        .index("by_secure_access_key", ["secureAccessKey"]),

    gmail_oauth_states: defineTable({
        nonceHash: v.string(),
        troopId: v.id("troops"),
        userId: v.id("users"),
        expiresAt: v.number(),
        consumedAt: v.optional(v.string()),
        createdAt: v.string(),
    }).index("by_nonce_hash", ["nonceHash"]),

    email_send_attempts: defineTable({
        draftId: v.id("email_drafts"),
        tripId: v.id("trips"),
        requestedBy: v.id("users"),
        retryOfAttemptId: v.optional(v.id("email_send_attempts")),
        idempotencyKey: v.string(),
        status: v.string(),
        recipientCount: v.number(),
        sentCount: v.number(),
        failedCount: v.number(),
        createdAt: v.string(),
        completedAt: v.optional(v.string()),
    })
        .index("by_draft", ["draftId"])
        .index("by_idempotency_key", ["idempotencyKey"]),

    email_deliveries: defineTable({
        attemptId: v.id("email_send_attempts"),
        memberId: v.id("members"),
        contactKind: v.string(),
        status: v.string(),
        providerMessageId: v.optional(v.string()),
        errorCode: v.optional(v.string()),
        sentAt: v.optional(v.string()),
    })
        .index("by_attempt", ["attemptId"])
        .index("by_attempt_member_contact", ["attemptId", "memberId", "contactKind"]),

    trip_staff: defineTable({
        tripId: v.id("trips"),
        troopId: v.id("troops"),
        role: v.string(), // "leader" | "rover"
        source: v.string(), // "user" | "external" | "preset"
        userId: v.optional(v.id("users")),
        name: v.string(),
        age: v.optional(v.number()),
        benefit: v.optional(v.string()),
        createdAt: v.string(),
    })
        .index("by_trip", ["tripId"])
        .index("by_troop", ["troopId"])
        .index("by_user_trip", ["userId", "tripId"]),

    leader_presets: defineTable({
        troopId: v.id("troops"),
        name: v.string(),
        role: v.string(), // "leader" | "rover"
        age: v.optional(v.number()),
        benefit: v.optional(v.string()),
        createdAt: v.string(),
        updatedAt: v.string(),
    }).index("by_troop", ["troopId"]),

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
        requiresReconnect: v.optional(v.boolean()),
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

    data_requests: defineTable({
        userId: v.id("users"),
        requestType: v.literal("deletion"),
        status: v.union(
            v.literal("requested"),
            v.literal("in_review"),
            v.literal("blocked"),
            v.literal("approved"),
            v.literal("completed"),
            v.literal("cancelled"),
            v.literal("rejected")
        ),
        requestedAt: v.string(),
        updatedAt: v.string(),
        completedAt: v.optional(v.string()),
        ownershipBlockers: v.optional(v.array(v.id("troops"))),
        resolutionNote: v.optional(v.string()),
    })
        .index("by_user", ["userId"])
        .index("by_status", ["status"]),

    // Dokumenty is the product-level domain layer over the existing
    // meetings/meeting_pages collaborative editor storage. Keeping the legacy
    // references makes the migration non-destructive and preserves all
    // ProseMirror document ids.
    documents: defineTable({
        troopId: v.id("troops"),
        meetingId: v.id("meetings"),
        tripId: v.optional(v.id("trips")),
        kind: v.union(
            v.literal("document"),
            v.literal("schuzka"),
            v.literal("trip_document"),
            v.literal("decision"),
        ),
        lifecycle: v.union(
            v.literal("plan"),
            v.literal("in_session"),
            v.literal("outcome"),
            v.literal("final"),
            v.literal("archived"),
        ),
        title: v.string(),
        description: v.optional(v.string()),
        tags: v.array(v.string()),
        contentVersion: v.number(),
        schemaVersion: v.number(),
        createdBy: v.id("users"),
        updatedBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
        finalizedAt: v.optional(v.number()),
        archivedAt: v.optional(v.number()),
    })
        .index("by_meeting", ["meetingId"])
        .index("by_troop_updated", ["troopId", "updatedAt"])
        .index("by_troop_kind_updated", ["troopId", "kind", "updatedAt"])
        .index("by_trip", ["tripId"])
        .searchIndex("search_title", {
            searchField: "title",
            filterFields: ["troopId", "kind", "lifecycle"],
        }),

    document_blocks: defineTable({
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        pageId: v.id("meeting_pages"),
        blockId: v.string(),
        parentBlockId: v.optional(v.string()),
        blockType: v.string(),
        phase: v.union(v.literal("plan"), v.literal("outcome"), v.literal("neutral")),
        orderKey: v.string(),
        text: v.string(),
        normalizedText: v.string(),
        contentHash: v.string(),
        sourceVersion: v.number(),
        agendaStartMinute: v.optional(v.number()),
        agendaEndMinute: v.optional(v.number()),
        gameId: v.optional(v.id("games")),
        updatedAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_page_order", ["pageId", "orderKey"])
        .index("by_page_block", ["pageId", "blockId"])
        .index("by_document_updated", ["documentId", "updatedAt"]),

    document_tasks: defineTable({
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        sourcePageId: v.id("meeting_pages"),
        sourceBlockId: v.string(),
        taskKey: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        status: v.union(
            v.literal("todo"),
            v.literal("in_progress"),
            v.literal("blocked"),
            v.literal("done"),
            v.literal("cancelled"),
        ),
        isOpen: v.boolean(),
        priority: v.union(
            v.literal("low"),
            v.literal("normal"),
            v.literal("high"),
            v.literal("critical"),
        ),
        priorityRank: v.number(),
        assigneeIds: v.array(v.id("users")),
        dueAt: v.optional(v.number()),
        tags: v.array(v.string()),
        tagsNormalized: v.array(v.string()),
        sourceDocumentTitle: v.string(),
        sourceExcerpt: v.string(),
        sourceVersion: v.number(),
        sourceState: v.union(v.literal("linking"), v.literal("linked"), v.literal("orphaned")),
        meetingStartAt: v.optional(v.number()),
        aiSummary: v.optional(v.string()),
        aiConfidence: v.optional(v.number()),
        aiJobId: v.optional(v.id("document_ai_jobs")),
        createdBy: v.id("users"),
        updatedBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_task_key", ["taskKey"])
        .index("by_document_block", ["documentId", "sourceBlockId"])
        .index("by_troop_open_due", ["troopId", "isOpen", "dueAt"])
        .index("by_troop_document", ["troopId", "documentId"])
        .index("by_troop_priority", ["troopId", "priorityRank", "dueAt"]),

    document_task_assignees: defineTable({
        troopId: v.id("troops"),
        taskId: v.id("document_tasks"),
        assigneeId: v.id("users"),
        isOpen: v.boolean(),
        dueAt: v.optional(v.number()),
    })
        .index("by_task", ["taskId"])
        .index("by_task_assignee", ["taskId", "assigneeId"])
        .index("by_assignee_open_due", ["troopId", "assigneeId", "isOpen", "dueAt"]),

    schuzka_setups: defineTable({
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        scheduledStartAt: v.number(),
        scheduledEndAt: v.number(),
        timezone: v.string(),
        location: v.optional(v.string()),
        participantLeaderIds: v.array(v.id("users")),
        facilitatorId: v.optional(v.id("users")),
        metadata: v.optional(v.any()),
        state: v.union(
            v.literal("draft"),
            v.literal("scheduled"),
            v.literal("running"),
            v.literal("finished"),
            v.literal("cancelled"),
        ),
        createdAt: v.number(),
        updatedAt: v.number(),
    })
        .index("by_document", ["documentId"])
        .index("by_troop_start", ["troopId", "scheduledStartAt"]),

    games: defineTable({
        troopId: v.id("troops"),
        name: v.string(),
        description: v.string(),
        instructions: v.string(),
        durationMinutes: v.number(),
        minGroupSize: v.optional(v.number()),
        maxGroupSize: v.optional(v.number()),
        physicalIntensity: v.union(v.literal("low"), v.literal("medium"), v.literal("high")),
        environments: v.array(v.string()),
        equipment: v.array(v.string()),
        tags: v.array(v.string()),
        searchText: v.string(),
        createdBy: v.id("users"),
        createdAt: v.number(),
        updatedAt: v.number(),
        archivedAt: v.optional(v.number()),
    })
        .index("by_troop_updated", ["troopId", "updatedAt"])
        .index("by_troop_name", ["troopId", "name"])
        .searchIndex("search_games", {
            searchField: "searchText",
            filterFields: ["troopId", "physicalIntensity"],
        }),

    document_ai_runs: defineTable({
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        pageId: v.id("meeting_pages"),
        requestedVersion: v.number(),
        generation: v.number(),
        status: v.union(
            v.literal("queued"), v.literal("running"), v.literal("partial"),
            v.literal("complete"), v.literal("stale"), v.literal("failed"),
        ),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
        scheduledId: v.optional(v.id("_scheduled_functions")),
    })
        .index("by_page_generation", ["pageId", "generation"])
        .index("by_document_created", ["documentId", "createdAt"]),

    document_ai_jobs: defineTable({
        runId: v.id("document_ai_runs"),
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        pageId: v.id("meeting_pages"),
        blockId: v.optional(v.string()),
        processor: v.string(),
        schemaVersion: v.string(),
        modelProfile: v.string(),
        inputHash: v.string(),
        requestedVersion: v.number(),
        status: v.union(
            v.literal("queued"), v.literal("running"), v.literal("succeeded"),
            v.literal("failed"), v.literal("timed_out"), v.literal("cancelled"),
            v.literal("stale"), v.literal("cache_hit"),
        ),
        attempt: v.number(),
        confidence: v.optional(v.number()),
        outputJson: v.optional(v.any()),
        errorCode: v.optional(v.string()),
        durationMs: v.optional(v.number()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_run", ["runId"])
        .index("by_input_processor", ["inputHash", "processor", "schemaVersion"])
        .index("by_document_status", ["documentId", "status"]),

    document_ai_suggestions: defineTable({
        troopId: v.id("troops"),
        documentId: v.id("documents"),
        pageId: v.id("meeting_pages"),
        blockId: v.string(),
        jobId: v.id("document_ai_jobs"),
        kind: v.string(),
        payload: v.any(),
        confidence: v.number(),
        sourceVersion: v.number(),
        state: v.union(
            v.literal("pending"), v.literal("accepted"), v.literal("rejected"),
            v.literal("expired"), v.literal("stale"),
        ),
        createdAt: v.number(),
        resolvedAt: v.optional(v.number()),
        resolvedBy: v.optional(v.id("users")),
    })
        .index("by_document_state", ["documentId", "state"])
        .index("by_block_state", ["pageId", "blockId", "state"]),

    document_search_chunks: defineTable({
        troopId: v.id("troops"),
        entityType: v.string(),
        entityId: v.string(),
        documentId: v.optional(v.id("documents")),
        pageId: v.optional(v.id("meeting_pages")),
        blockId: v.optional(v.string()),
        title: v.string(),
        text: v.string(),
        searchText: v.string(),
        href: v.string(),
        contentHash: v.string(),
        sourceVersion: v.number(),
        updatedAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_document", ["documentId"])
        .index("by_entity", ["entityType", "entityId"])
        .searchIndex("search_content", {
            searchField: "searchText",
            filterFields: ["troopId", "entityType"],
        }),

    document_calendar_items: defineTable({
        troopId: v.id("troops"),
        sourceType: v.string(),
        sourceId: v.string(),
        sourceVersion: v.number(),
        title: v.string(),
        startsAt: v.number(),
        endsAt: v.optional(v.number()),
        allDay: v.boolean(),
        status: v.string(),
        href: v.string(),
        assigneeIds: v.array(v.id("users")),
        updatedAt: v.number(),
    })
        .index("by_source", ["sourceType", "sourceId"])
        .index("by_troop_start", ["troopId", "startsAt"]),

    rate_limits: defineTable({
        key: v.string(),
        windowStartedAt: v.number(),
        count: v.number(),
    }).index("by_key", ["key"]),

});
