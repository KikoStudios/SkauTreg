
import { v } from "convex/values";
import { query } from "./_generated/server";

export const search = query({
    args: {
        query: v.string(),
        troopId: v.id("troops"),
    },
    handler: async (ctx, args) => {
        const q = args.query.toLowerCase();
        const suggestions: any[] = [];

        // 1. Search Users
        const users = await ctx.db
            .query("users")
            .collect();

        const matchedUsers = users
            .filter(u =>
                (u.name && u.name.toLowerCase().includes(q)) ||
                (u.email && u.email.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map(u => ({
                id: u._id,
                label: u.name || u.email || "Unknown",
                type: "user",
                icon: "👤",
                image: u.image
            }));

        suggestions.push(...matchedUsers);

        // 2. Search Members (if you have a members table)
        // Skip for now since schema might not have it

        // 3. Search Trips
        const trips = await ctx.db
            .query("trips")
            .filter(q_filter => q_filter.eq(q_filter.field("troopId"), args.troopId))
            .collect();

        const matchedTrips = trips
            .filter(t =>
                (t.name && t.name.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map(t => ({
                id: t._id,
                label: t.name,
                sublabel: t.startDate ? new Date(t.startDate).toLocaleDateString("cs-CZ") : undefined,
                type: "trip",
                icon: "🏕️"
            }));

        suggestions.push(...matchedTrips);

        // 4. Search Bases
        const bases = await ctx.db
            .query("bases")
            .collect();

        const matchedBases = bases
            .filter(b =>
                (b.name && b.name.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map(b => ({
                id: b._id,
                label: b.name,
                sublabel: b.location?.city,
                type: "base",
                icon: "🏠"
            }));

        suggestions.push(...matchedBases);

        // 5. Search Stations
        const stations = await ctx.db
            .query("stations")
            .collect();

        const matchedStations = stations
            .filter(s =>
                (s.name && s.name.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map(s => ({
                id: s._id,
                label: s.name,
                sublabel: s.type,
                type: "station",
                icon: "📍"
            }));

        suggestions.push(...matchedStations);

        // 6. Search Files
        const files = await ctx.db
            .query("meeting_files")
            .collect();

        const matchedFiles = files
            .filter(f =>
                (f.name && f.name.toLowerCase().includes(q))
            )
            .slice(0, 5)
            .map(f => ({
                id: f._id,
                label: f.name,
                sublabel: f.type,
                type: "file",
                icon: "📄"
            }));

        suggestions.push(...matchedFiles);

        return suggestions;
    },
});
