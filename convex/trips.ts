import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function parseDateParts(value?: string | null) {
    if (!value) return null;
    const trimmed = value.trim();
    const parts = trimmed.match(/\d+/g);
    if (!parts || parts.length < 3) return null;

    const [a, b, c] = parts;
    const toInt = (n?: string) => (n ? parseInt(n, 10) : NaN);

    let y = NaN;
    let m = NaN;
    let d = NaN;

    if (a.length === 4) {
        // YYYY M D
        y = toInt(a);
        m = toInt(b);
        d = toInt(c);
    } else if (c.length === 4) {
        // D M YYYY
        d = toInt(a);
        m = toInt(b);
        y = toInt(c);
    } else {
        // Fallback for 2-digit years (assume 2000+)
        d = toInt(a);
        m = toInt(b);
        y = toInt(c);
        if (y < 100) y += 2000;
    }

    if (!y || !m || !d) return null;
    return { y, m, d };
}

function computeAgeOnDate(birthDate?: string | null, refDate?: string | null): number | null {
    const birth = parseDateParts(birthDate);
    const ref = parseDateParts(refDate);
    if (!birth || !ref) return null;
    let age = ref.y - birth.y;
    if (ref.m < birth.m || (ref.m === birth.m && ref.d < birth.d)) age -= 1;
    return age >= 0 && age <= 120 ? age : null;
}

export const create = mutation({
    args: {
        troopId: v.id("troops"),
        name: v.string(),
        description: v.string(),
        location: v.string(),
        startDate: v.string(),
        endDate: v.optional(v.string()),
        lastCancellationDate: v.optional(v.string()), // Latest date to cancel without payment
        lateCancellationMessage: v.optional(v.string()),

        formType: v.optional(v.string()), // "registration" or "apology"
        customFields: v.optional(v.array(v.object({
            label: v.string(),
            type: v.string(),
            required: v.boolean(),
            info: v.optional(v.string()),
            placeholder: v.optional(v.string()),
            options: v.optional(v.array(v.string()))
        }))),
    },
    handler: async (ctx, args) => {
        // 1. Create the Trip
        const tripId = await ctx.db.insert("trips", {
            troopId: args.troopId,
            name: args.name,
            description: args.description,
            location: args.location,
            startDate: args.startDate,
            endDate: args.endDate,
            lastCancellationDate: args.lastCancellationDate,
            lateCancellationMessage: args.lateCancellationMessage,
            formType: args.formType,
            customFields: args.customFields,
        });

        // 2. Automatically create Participation records for ALL current members of the troop
        const members = await ctx.db
            .query("members")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();

        for (const member of members) {
            const accessKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await ctx.db.insert("participations", {
                tripId,
                memberId: member._id,
                status: "pending",
                accessKey: accessKey,
                responses: {},
            });
        }

        return tripId;
    },
});

export const update = mutation({
    args: {
        id: v.id("trips"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        location: v.optional(v.string()),
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
        lastCancellationDate: v.optional(v.string()),
        lateCancellationMessage: v.optional(v.string()),
        formType: v.optional(v.string()),
        customFields: v.optional(v.array(v.object({
            label: v.string(),
            type: v.string(),
            required: v.boolean(),
            info: v.optional(v.string()),
            placeholder: v.optional(v.string()),
            options: v.optional(v.array(v.string()))
        }))),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const remove = mutation({
    args: { id: v.id("trips") },
    handler: async (ctx, args) => {
        // Delete participations first
        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.id))
            .collect();

        for (const p of participations) {
            await ctx.db.delete(p._id);
        }

        await ctx.db.delete(args.id);
    },
});

export const getDashboard = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) return null;

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const participantsWithDetails = await Promise.all(
            participations.map(async (p) => {
                const member = await ctx.db.get(p.memberId);
                return {
                    ...p,
                    member,
                };
            })
        );

        // Fetch assigned base if exists
        let base = null;
        if (trip.baseId) {
            base = await ctx.db.get(trip.baseId);
        }

        // Current user (if authenticated)
        const identity = await ctx.auth.getUserIdentity();
        const currentUser = identity
            ? await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
                .unique()
            : null;

        // Leaders for troop
        const troop = await ctx.db.get(trip.troopId);
        const leaders = troop
            ? await (async () => {
                const owner = await ctx.db.get(troop.ownerId);
                const leaderRecords = await ctx.db
                    .query("troop_leaders")
                    .withIndex("by_troop", (q) => q.eq("troopId", trip.troopId))
                    .collect();

                const leaderUsers = await Promise.all(
                    leaderRecords.map(async (record) => {
                        const user = await ctx.db.get(record.userId);
                        if (!user) return null;
                        return {
                            ...user,
                            role: record.role,
                            isOwner: user._id === troop.ownerId,
                        };
                    })
                );

                const validLeaders = leaderUsers.filter((l) => l !== null) as Array<any>;
                const ownerInList = validLeaders.find((l) => l?._id === troop.ownerId);

                if (!ownerInList && owner) {
                    return [{ ...owner, role: "owner", isOwner: true }, ...validLeaders];
                }

                return validLeaders;
            })()
            : [];

        const tripStaff = await ctx.db
            .query("trip_staff")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const tripStaffWithUsers = await Promise.all(
            tripStaff.map(async (row) => {
                const user = row.userId ? await ctx.db.get(row.userId) : null;
                return { ...row, user };
            })
        );

        const leaderPresets = await ctx.db
            .query("leader_presets")
            .withIndex("by_troop", (q) => q.eq("troopId", trip.troopId))
            .collect();

        return {
            trip,
            participants: participantsWithDetails,
            base,
            leaders,
            currentUser,
            tripStaff: tripStaffWithUsers,
            leaderPresets,
        };
    },
});

export const getAttendanceCounts = query({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        const refDate = trip?.startDate ?? null;
        const studentBenefits = new Set([
            "žákovský průkaz ČR",
            "karta ISIC",
            "karta ITIC",
            "karta ALIVE",
            "karta EYCA (EURO<26)",
            "potvrzení o studiu",
            "JUNIOR (ZSSK)",
        ]);
        const isStudentBenefit = (benefit?: string | null) =>
            typeof benefit === "string" && studentBenefits.has(benefit);

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const attending = participations.filter((p) => p.status === "attending");
        let kidCount = 0;
        let adultCount = 0;
        let studentCount = 0;
        let unknownCount = 0;

        for (const p of attending) {
            const member = await ctx.db.get(p.memberId);
            const age = computeAgeOnDate(member?.birthDate ?? null, refDate);
            if (age === null) {
                // For participants (members), unknown birth dates are usually kids.
                kidCount += 1;
                continue;
            }
            if (age >= 6 && age <= 15) kidCount += 1;
            else adultCount += 1;
        }

        const staff = await ctx.db
            .query("trip_staff")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        let staffKid = 0;
        let staffAdult = 0;
        let staffStudent = 0;
        let staffUnknown = 0;

        for (const s of staff) {
            const user = s.userId ? await ctx.db.get(s.userId) : null;
            const staffBenefit = user?.benefit ?? s.benefit ?? null;
            const staffBirth = user?.dateOfBirth ?? null;
            const staffAge =
                typeof s.age === "number"
                    ? s.age
                    : computeAgeOnDate(staffBirth, refDate);
            if (staffAge === null) {
                staffUnknown += 1;
                if (isStudentBenefit(staffBenefit)) staffStudent += 1;
                else staffAdult += 1;
                continue;
            }
            if (staffAge <= 15) staffKid += 1;
            else if (isStudentBenefit(staffBenefit)) staffStudent += 1;
            else staffAdult += 1;
        }

        return {
            attendingCount: attending.length + staff.length,
            kidCount: kidCount + staffKid,
            adultCount: adultCount + staffAdult,
            studentCount: studentCount + staffStudent,
            unknownCount: unknownCount + staffUnknown,
        };
    },
});

export const ensureParticipations = mutation({
    args: { tripId: v.id("trips") },
    handler: async (ctx, args) => {
        const trip = await ctx.db.get(args.tripId);
        if (!trip) throw new Error("🚗 Výprava nebyla nalezena. Zkuste načíst stránku znovu.");

        const members = await ctx.db
            .query("members")
            .withIndex("by_troop", (q) => q.eq("troopId", trip.troopId))
            .collect();

        const participations = await ctx.db
            .query("participations")
            .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
            .collect();

        const existingMemberIds = new Set(participations.map((p) => p.memberId));
        let createdCount = 0;

        for (const member of members) {
            if (existingMemberIds.has(member._id)) continue;

            const accessKey = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            await ctx.db.insert("participations", {
                tripId: args.tripId,
                memberId: member._id,
                status: "pending",
                accessKey,
                responses: {},
            });
            createdCount++;
        }

        return { createdCount };
    },
});

export const list = query({
    args: { troopId: v.id("troops") },
    handler: async (ctx, args) => {
        const trips = await ctx.db
            .query("trips")
            .withIndex("by_troop", (q) => q.eq("troopId", args.troopId))
            .collect();
        
        // Fetch base data for each trip
        const tripsWithBases = await Promise.all(
            trips.map(async (trip) => {
                let baseName = null;
                if (trip.baseId) {
                    const base = await ctx.db.get(trip.baseId);
                    baseName = base?.name || null;
                }
                return {
                    ...trip,
                    baseName,
                };
            })
        );
        
        return tripsWithBases;
    },
});

export const getAllUserTrips = query({
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

        // 1. Get all troops I am part of
        // A. Owned
        const ownedTroops = await ctx.db
            .query("troops")
            .filter((q) => q.eq(q.field("ownerId"), user._id))
            .collect();

        // B. Leader of
        const leaderships = await ctx.db
            .query("troop_leaders")
            .withIndex("by_user_troop", q => q.eq("userId", user._id))
            .collect();

        const leadingTroops = await Promise.all(
            leaderships.map(l => ctx.db.get(l.troopId))
        );

        // Deduplicate troops
        const allTroops = [...ownedTroops, ...leadingTroops]
            .filter((t): t is NonNullable<typeof t> => t !== null);

        const uniqueTroops = Array.from(new Map(allTroops.map(t => [t._id, t])).values());
        const troopIds = uniqueTroops.map(t => t._id);

        // 2. Get trips for these troops
        // Convex doesn't have "IN" query easily, so we might have to parallel fetch
        const trips = await Promise.all(
            troopIds.map(async (troopId) => {
                const troopTrips = await ctx.db
                    .query("trips")
                    .withIndex("by_troop", (q) => q.eq("troopId", troopId))
                    .collect();

                // Add troop info for color coding
                const troop = uniqueTroops.find(t => t._id === troopId);
                return troopTrips.map(trip => ({
                    ...trip,
                    troopName: troop?.name,
                    troopColor: troop?.accentColor || "#ccc"
                }));
            })
        );

        return trips.flat();
    }
});

export const assignBase = mutation({
    args: {
        tripId: v.id("trips"),
        baseId: v.id("bases"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tripId, { baseId: args.baseId });
    },
});

export const unassignBase = mutation({
    args: {
        tripId: v.id("trips"),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.tripId, { baseId: undefined });
    },
});
