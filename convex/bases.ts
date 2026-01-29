import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const baseInput = v.object({
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
  pricing: v.optional(v.object({
    minimalPrice: v.optional(v.number()),
    priceType: v.optional(v.string()),
    perNight: v.optional(v.number()),
    discountChildrenOrgs: v.optional(v.number()),
    discountScouts: v.optional(v.number()),
    minimumCharge: v.optional(v.number()),
    currencyCode: v.optional(v.string()),
    description: v.optional(v.string()),
  })),
  location: v.optional(v.object({
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    postalCode: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
  })),
  contacts: v.optional(v.array(v.object({
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    website: v.optional(v.string()),
  }))),
  amenities: v.optional(v.object({
    accommodationType: v.optional(v.string()),
    minCapacity: v.optional(v.number()),
    maxCapacity: v.optional(v.number()),
    absoluteMaxCapacity: v.optional(v.number()),
    equipment: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  })),
  conditions: v.optional(v.object({
    accessibility: v.optional(v.string()),
    heating: v.optional(v.string()),
    water: v.optional(v.string()),
    toilet: v.optional(v.string()),
    kitchen: v.optional(v.string()),
    bedding: v.optional(v.string()),
    specialNotes: v.optional(v.string()),
    restrictions: v.optional(v.array(v.string())),
    language: v.optional(v.string()),
  })),
  media: v.optional(v.object({
    photos: v.optional(v.array(v.object({
      url: v.string(),
      documentId: v.string(),
      description: v.optional(v.string()),
    }))),
    photoGalleryUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  })),
  highlighted: v.optional(v.boolean()),
  availability: v.optional(v.string()),
  lastSyncedAt: v.string(),
});

// Query to check if base exists
export const getBaseByZakladnyId = query({
  args: { zakladnyId: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bases")
      .withIndex("by_zakladny_id", (q) => q.eq("zakladnyId", args.zakladnyId))
      .unique();
  },
});

// Query to get all bases for map display
export const getAllBases = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("bases").collect();
  },
});

// Query to get a base with its stations by _id
export const getBaseWithStations = query({
  args: { baseId: v.id("bases") },
  handler: async (ctx, args) => {
    const base = await ctx.db.get(args.baseId);
    if (!base) return null;

    const links = await ctx.db
      .query("base_stations")
      .withIndex("by_base", (q) => q.eq("baseId", args.baseId))
      .collect();

    const stations = await Promise.all(
      links.map(async (link) => {
        const station = await ctx.db.get(link.stationId);
        if (!station) return null;
        return {
          ...station,
          distanceKm: link.distanceKm,
          rank: link.rank,
          score: link.score,
        };
      })
    );

    return {
      ...base,
      stations: stations.filter((s) => s !== null),
    };
  },
});

const stationInput = v.object({
  osmId: v.string(),
  name: v.string(),
  idosName: v.optional(v.string()),
  lat: v.number(),
  lng: v.number(),
  type: v.string(),
  transportModes: v.optional(v.array(v.string())),
  hubIndex: v.number(),
  score: v.number(),
  distanceKm: v.number(),
  rank: v.number(),
});

export const upsertBaseWithStations = mutation({
  args: {
    base: baseInput,
    stations: v.array(stationInput),
  },
  handler: async (ctx, args) => {
    // Upsert base by zakladnyId
    const existingBase = await ctx.db
      .query("bases")
      .withIndex("by_zakladny_id", (q) => q.eq("zakladnyId", args.base.zakladnyId))
      .unique();

    let baseId;
    if (existingBase) {
      await ctx.db.patch(existingBase._id, {
        ...args.base,
      });
      baseId = existingBase._id;
    } else {
      baseId = await ctx.db.insert("bases", {
        ...args.base,
      });
    }

    // Clear old links
    const oldLinks = await ctx.db
      .query("base_stations")
      .withIndex("by_base", (q) => q.eq("baseId", baseId))
      .collect();

    for (const link of oldLinks) {
      await ctx.db.delete(link._id);
    }

    // Upsert stations and create links
    for (const station of args.stations) {
      const existingStation = await ctx.db
        .query("stations")
        .withIndex("by_osm_id", (q) => q.eq("osmId", station.osmId))
        .unique();

      let stationId;
      if (existingStation) {
        await ctx.db.patch(existingStation._id, {
          osmId: station.osmId,
          name: station.name,
          idosName: station.idosName,
          lat: station.lat,
          lng: station.lng,
          type: station.type,
          transportModes: station.transportModes,
          hubIndex: station.hubIndex,
          score: station.score,
          lastSyncedAt: args.base.lastSyncedAt,
        });
        stationId = existingStation._id;
      } else {
        stationId = await ctx.db.insert("stations", {
          osmId: station.osmId,
          name: station.name,
          idosName: station.idosName,
          lat: station.lat,
          lng: station.lng,
          type: station.type,
          transportModes: station.transportModes,
          hubIndex: station.hubIndex,
          score: station.score,
          lastSyncedAt: args.base.lastSyncedAt,
        });
      }

      await ctx.db.insert("base_stations", {
        baseId,
        stationId,
        distanceKm: station.distanceKm,
        rank: station.rank,
        score: station.score,
        stationName: station.name,
        stationIdosName: station.idosName,
        lat: station.lat,
        lng: station.lng,
        type: station.type,
        transportModes: station.transportModes,
      });
    }

    return baseId;
  },
});

export const listBasesWithStations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const bases = await ctx.db.query("bases").collect();
    const sliced = args.limit ? bases.slice(0, args.limit) : bases;

    const result = [] as Array<any>;

    for (const base of sliced) {
      const links = await ctx.db
        .query("base_stations")
        .withIndex("by_base", (q) => q.eq("baseId", base._id))
        .collect();

      const stations = await Promise.all(
        links.map(async (link) => {
          const station = await ctx.db.get(link.stationId);
          if (!station) return null;
          return {
            ...station,
            distanceKm: link.distanceKm,
            rank: link.rank,
            score: link.score,
          };
        })
      );

      result.push({
        base,
        stations: stations.filter((s) => s !== null),
      });
    }

    return result;
  },
});

// Query: Get all stations (for coordinate updates)
export const listAllStations = query({
  args: {},
  handler: async (ctx) => {
    const stations = await ctx.db.query("stations").collect();
    return stations;
  },
});

// Query: Get all bases (raw)
export const listAllBases = query({
  args: {},
  handler: async (ctx) => {
    const bases = await ctx.db.query("bases").collect();
    return bases;
  },
});

// Mutation: Update station coordinates
export const updateStationCoordinates = mutation({
  args: {
    stationId: v.id("stations"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const station = await ctx.db.get(args.stationId);
    if (!station) {
      throw new Error("Station not found");
    }

    await ctx.db.patch(args.stationId, {
      lat: args.lat,
      lng: args.lng,
    });

    return { success: true, stationId: args.stationId };
  },
});

// Query: Get all base_stations
export const listAllBaseStations = query({
  args: {},
  handler: async (ctx) => {
    const baseStations = await ctx.db.query("base_stations").collect();
    return baseStations;
  },
});

// Mutation: Update base_station with coordinates
export const updateBaseStationCoordinates = mutation({
  args: {
    baseStationId: v.id("base_stations"),
    lat: v.number(),
    lng: v.number(),
  },
  handler: async (ctx, args) => {
    const baseStation = await ctx.db.get(args.baseStationId);
    if (!baseStation) {
      throw new Error("Base station not found");
    }

    await ctx.db.patch(args.baseStationId, {
      lat: args.lat,
      lng: args.lng,
    });

    return { success: true, baseStationId: args.baseStationId };
  },
});

// Mutation: Update base details (partial patch)
export const updateBaseDetails = mutation({
  args: {
    baseId: v.id("bases"),
    data: v.object({
      name: v.optional(v.string()),
      slug: v.optional(v.string()),
      url: v.optional(v.string()),
      type: v.optional(v.string()),
      typeKey: v.optional(v.string()),
      capacity: v.optional(v.number()),
      capacityNote: v.optional(v.string()),
      coordinates: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
      })),
      pricing: v.optional(v.object({
        minimalPrice: v.optional(v.number()),
        priceType: v.optional(v.string()),
        perNight: v.optional(v.number()),
        discountChildrenOrgs: v.optional(v.number()),
        discountScouts: v.optional(v.number()),
        minimumCharge: v.optional(v.number()),
        currencyCode: v.optional(v.string()),
        description: v.optional(v.string()),
      })),
      location: v.optional(v.object({
        address: v.optional(v.string()),
        city: v.optional(v.string()),
        postalCode: v.optional(v.string()),
        region: v.optional(v.string()),
        country: v.optional(v.string()),
      })),
      contacts: v.optional(v.array(v.object({
        name: v.optional(v.string()),
        role: v.optional(v.string()),
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        website: v.optional(v.string()),
      }))),
      amenities: v.optional(v.object({
        accommodationType: v.optional(v.string()),
        minCapacity: v.optional(v.number()),
        maxCapacity: v.optional(v.number()),
        absoluteMaxCapacity: v.optional(v.number()),
        equipment: v.optional(v.array(v.string())),
        description: v.optional(v.string()),
      })),
      conditions: v.optional(v.object({
        accessibility: v.optional(v.string()),
        heating: v.optional(v.string()),
        water: v.optional(v.string()),
        toilet: v.optional(v.string()),
        kitchen: v.optional(v.string()),
        bedding: v.optional(v.string()),
        specialNotes: v.optional(v.string()),
        restrictions: v.optional(v.array(v.string())),
        language: v.optional(v.string()),
      })),
      media: v.optional(v.object({
        photos: v.optional(v.array(v.object({
          url: v.string(),
          documentId: v.string(),
          description: v.optional(v.string()),
        }))),
        photoGalleryUrl: v.optional(v.string()),
        description: v.optional(v.string()),
      })),
      highlighted: v.optional(v.boolean()),
      availability: v.optional(v.string()),
      lastSyncedAt: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const base = await ctx.db.get(args.baseId);
    if (!base) {
      throw new Error("Base not found");
    }

    await ctx.db.patch(args.baseId, args.data);
    return { success: true, baseId: args.baseId };
  },
});

// Individual upsert mutations for sync script
export const upsertBase = mutation({
  args: { base: baseInput },
  handler: async (ctx, args) => {
    const existingBase = await ctx.db
      .query("bases")
      .withIndex("by_zakladny_id", (q) => q.eq("zakladnyId", args.base.zakladnyId))
      .unique();

    if (existingBase) {
      await ctx.db.patch(existingBase._id, args.base);
      return existingBase._id;
    } else {
      return await ctx.db.insert("bases", args.base);
    }
  },
});

export const upsertStation = mutation({
  args: {
    station: v.object({
      osmId: v.string(),
      name: v.string(),
      idosName: v.optional(v.string()),
      lat: v.number(),
      lng: v.number(),
      type: v.string(),
      transportModes: v.optional(v.array(v.string())),
      hubIndex: v.number(),
      score: v.number(),
      lastSyncedAt: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const existingStation = await ctx.db
      .query("stations")
      .withIndex("by_osm_id", (q) => q.eq("osmId", args.station.osmId))
      .unique();

    if (existingStation) {
      await ctx.db.patch(existingStation._id, args.station);
      return existingStation._id;
    } else {
      return await ctx.db.insert("stations", args.station);
    }
  },
});

export const linkBaseToStation = mutation({
  args: {
    baseId: v.id("bases"),
    stationId: v.id("stations"),
    distanceKm: v.number(),
    rank: v.number(),
    score: v.number(),
    stationName: v.optional(v.string()),
    stationIdosName: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    type: v.optional(v.string()),
    transportModes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Check if link already exists
    const existing = await ctx.db
      .query("base_stations")
      .withIndex("by_base", (q) => q.eq("baseId", args.baseId))
      .filter((q) => q.eq(q.field("stationId"), args.stationId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        distanceKm: args.distanceKm,
        rank: args.rank,
        score: args.score,
        stationName: args.stationName,
        stationIdosName: args.stationIdosName,
        lat: args.lat,
        lng: args.lng,
        type: args.type,
        transportModes: args.transportModes,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("base_stations", {
        baseId: args.baseId,
        stationId: args.stationId,
        distanceKm: args.distanceKm,
        rank: args.rank,
        score: args.score,
        stationName: args.stationName,
        stationIdosName: args.stationIdosName,
        lat: args.lat,
        lng: args.lng,
        type: args.type,
        transportModes: args.transportModes,
      });
    }
  },
});
