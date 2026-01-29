import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { pathToFileURL } from "url";

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/cgi/interpreter",
];

async function fetchBases() {
  const clean = (val) => (val === null ? undefined : val);

  const response = await fetch("https://zakladny.skaut.cz/api/search", {
    headers: {
      "User-Agent": "SkautREG-bases-sync",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`zakladny.skaut.cz responded with ${response.status}`);
  }

  const data = await response.json();
  if (!data.Items || !Array.isArray(data.Items)) {
    throw new Error("Unexpected API response shape from zakladny.skaut.cz");
  }

  return data.Items.map((item) => ({
    zakladnyId: item.ID,
    name: (item.DisplayName || "").trim(),
    slug: clean(item.Slug),
    url: item.Slug ? `https://zakladny.skaut.cz/${item.Slug}` : undefined,
    type: clean(item.RealtyType),
    typeKey: clean(item.RealtyTypeKey),
    capacity: clean(item.Capacity),
    capacityNote: clean(item.CapacityNote),
    coordinates: {
      lat: item.GpsLatitude,
      lng: item.GpsLongitude,
    },
    pricing: item.MinimalPrice || item.MinimalPriceRentPriceType ? {
      minimalPrice: clean(item.MinimalPrice),
      priceType: clean(item.MinimalPriceRentPriceType),
    } : undefined,
    location: item.Street || item.City || item.Postcode ? {
      address: clean(item.Street),
      city: clean(item.City),
      postalCode: clean(item.Postcode),
      country: "Česká republika",
    } : undefined,
    amenities: item.Capacity || item.RealtyType ? {
      accommodationType: clean(item.RealtyType),
      maxCapacity: clean(item.Capacity),
      minCapacity: clean(item.Capacity) ? Math.ceil(item.Capacity * 0.6) : undefined,
    } : undefined,
    highlighted: Boolean(item.Highlighted),
    availability: clean(item.Availability),
  }));
}

function decodeHtmlEntities(text) {
  if (!text) return text;
  let decoded = text.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  decoded = decoded
    .replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return decoded;
}

async function enrichBaseDetails(base) {
  if (!base.url && !base.zakladnyId) return base;
  
  const url = base.url || `https://zakladny.skaut.cz/detail/${base.zakladnyId}`;
  
  let retries = 3;
  while (retries > 0) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "SkautREG-bases-sync" },
      });
      if (!resp.ok) {
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      const html = await resp.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) return base;
      
      const nextData = JSON.parse(match[1]);
      const detail = nextData.props?.pageProps?.detail;
      if (!detail) return base;
      
      const enriched = { ...base };
      
      // Contacts
      if (detail.ContactPerson || detail.ContactEmail || detail.ContactPhone || detail.ContactWeb) {
        const contact = {
          name: detail.ContactPerson || undefined,
          role: "správce",
          email: detail.ContactEmail || undefined,
          phone: detail.ContactPhone || undefined,
          website: detail.ContactWeb || undefined,
        };
        Object.keys(contact).forEach(k => contact[k] === undefined && delete contact[k]);
        if (Object.keys(contact).length > 1) {
          enriched.contacts = [contact];
        }
      }
      
      // Conditions - extract all available condition fields
      const conditionsObj = {};
      if (detail.ConditionalNote) {
        conditionsObj.specialNotes = decodeHtmlEntities(detail.ConditionalNote).trim();
      }
      if (detail.AccessibilityType) {
        conditionsObj.accessibility = detail.AccessibilityType;
      }
      if (detail.HeatingType) {
        conditionsObj.heating = detail.HeatingType;
      }
      if (detail.WaterType) {
        conditionsObj.water = detail.WaterType;
      }
      if (detail.ToiletType) {
        conditionsObj.toilet = detail.ToiletType;
      }
      if (detail.KitchenType) {
        conditionsObj.kitchen = detail.KitchenType;
      }
      if (detail.BeddingType) {
        conditionsObj.bedding = detail.BeddingType;
      }
      
      // Extract restrictions from the detail
      const restrictions = [];
      if (detail.Restrictions && Array.isArray(detail.Restrictions)) {
        restrictions.push(...detail.Restrictions.map(r => r.DisplayName || r).filter(Boolean));
      }
      if (restrictions.length > 0) {
        conditionsObj.restrictions = restrictions;
      }
      
      if (Object.keys(conditionsObj).length > 0) {
        conditionsObj.language = "Česky";
        enriched.conditions = { ...enriched.conditions, ...conditionsObj };
      }
      
      // Media & Photos
      if (detail.Photos && Array.isArray(detail.Photos) && detail.Photos.length > 0) {
        const photos = detail.Photos.map(p => ({
          url: `https://prd-images-zakladny-skaut.azureedge.net/api/images/thumb/${p.ID_Document}.jpg`,
          documentId: String(p.ID_Document),
          description: p.Description ? decodeHtmlEntities(p.Description).trim() : '',
        }));
        enriched.media = enriched.media || {};
        enriched.media.photos = photos;
      }
      
      // Gallery URL
      if (detail.PhotogalleryUrl) {
        enriched.media = enriched.media || {};
        enriched.media.photoGalleryUrl = detail.PhotogalleryUrl;
      }
      
      // Equipment & Amenities enhancement
      if (detail.OccupationEquipment && Array.isArray(detail.OccupationEquipment) && detail.OccupationEquipment.length > 0) {
        enriched.amenities = enriched.amenities || {};
        enriched.amenities.equipment = detail.OccupationEquipment.map(e => e.DisplayName).filter(Boolean);
      }
      
      // Log enriched data if it has conditions
      if (enriched.conditions) {
        console.log(`  ✓ Enriched ${enriched.name} with conditions:`, Object.keys(enriched.conditions).join(', '));
      }
      if (enriched.contacts) {
        console.log(`  ✓ Got contacts for ${enriched.name}`);
      }
      if (enriched.media?.photos) {
        console.log(`  ✓ Got ${enriched.media.photos.length} photos for ${enriched.name}`);
      }
      
      return enriched;
    } catch (err) {
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return base;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

function detectType(tags) {
  if (tags.railway === "station") return "station";
  if (tags.railway === "halt") return "halt";
  if (tags.public_transport === "stop_position") return "stop";
  return "unknown";
}

function detectTransportModes(tags) {
  if (!tags) return undefined;
  
  const modes = [];
  
  // Railway-related
  if (tags.railway === "station" || tags.railway === "halt") {
    modes.push("train");
  }
  
  // Bus
  if (tags.bus === "yes") {
    modes.push("bus");
  }
  
  // Tram
  if (tags.tram === "yes") {
    modes.push("tram");
  }
  
  // Metro/Subway
  if (tags.metro === "yes" || tags.subway === "yes") {
    modes.push("metro");
  }
  
  // Light rail
  if (tags.light_rail === "yes") {
    modes.push("light_rail");
  }
  
  // Cable car
  if (tags.cable_car === "yes") {
    modes.push("cable_car");
  }
  
  // Trolleybus
  if (tags.trolleybus === "yes") {
    modes.push("trolleybus");
  }
  
  // Coach (long-distance buses)
  if (tags.coach === "yes") {
    modes.push("coach");
  }
  
  // Default to train if it's a railway station/halt but no specific mode detected
  if (modes.length === 0 && (tags.railway === "station" || tags.railway === "halt")) {
    modes.push("train");
  }
  
  return modes.length > 0 ? modes : undefined;
}

function estimateLines(name) {
  const lower = (name || "").toLowerCase();
  if (lower.includes("hl.n") || lower.includes("hlavni") || lower.includes("hlavní")) return 12;
  if (lower.includes("centrum")) return 8;
  return 2;
}

function calculateHubIndex(station) {
  const typeMultiplier = {
    station: 10.0,
    halt: 3.0,
    stop: 1.6,
    unknown: 1.0,
  };

  const mult = typeMultiplier[station.type] || 1.0;
  const lines = estimateLines(station.name);
  const freq = 4; // average departures per hour

  return lines * freq * mult;
}

function getZoneCoefficient(distanceKm) {
  if (distanceKm <= 0.5) return 1.0;
  if (distanceKm <= 5.0) {
    return 1.0 + ((distanceKm - 0.5) / 4.5) * 0.5;
  }
  return 1.5 * Math.exp(0.3 * (distanceKm - 5.0));
}

function scoreStation(baseLat, baseLng, station) {
  const distance = haversineDistance(baseLat, baseLng, station.lat, station.lng);
  const walkingTime = (distance * 1000) / 60;
  const zoneCoef = getZoneCoefficient(distance);
  const hubIndex = calculateHubIndex(station);
  const score = walkingTime * zoneCoef - hubIndex + 95;

  return {
    ...station,
    distanceKm: distance,
    hubIndex,
    score: Math.round(score * 100) / 100,
    idosName: station.name, // Will be updated after deduplication
  };
}

function generateIdosNames(stations) {
  // Count occurrences of each name
  const nameCounts = new Map();
  for (const s of stations) {
    nameCounts.set(s.name, (nameCounts.get(s.name) || 0) + 1);
  }

  // Generate IDOS names (add district notation for duplicates)
  return stations.map((s) => ({
    ...s,
    idosName: nameCounts.get(s.name) > 1 ? `${s.name},,HD` : s.name,
  }));
}

function deduplicateStations(stations) {
  const result = [];
  const seen = [];

  for (const station of stations) {
    const isDuplicate = seen.some(
      (s) =>
        s.name === station.name &&
        haversineDistance(s.lat, s.lng, station.lat, station.lng) < 0.1
    );

    if (!isDuplicate) {
      result.push(station);
      seen.push({ name: station.name, lat: station.lat, lng: station.lng });
    }
  }

  return result;
}

async function queryOverpass(lat, lng, radiusKm) {
  const radiusM = Math.max(100, Math.floor(radiusKm * 1000));
  const query = `
[out:json][timeout:90];
(
  node["railway"="station"](around:${radiusM},${lat},${lng});
  node["railway"="halt"](around:${radiusM},${lat},${lng});
  node["public_transport"="stop_position"](around:${radiusM},${lat},${lng});
  node["bus"="yes"](around:${radiusM},${lat},${lng});
  node["tram"="yes"](around:${radiusM},${lat},${lng});
  node["metro"="yes"](around:${radiusM},${lat},${lng});
);
out center 100;
`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        console.warn(`Overpass ${endpoint} -> ${response.status}`);
        continue;
      }

      const data = await response.json();
      const elements = data.elements || [];
      if (!elements.length) {
        console.warn(`Overpass ${endpoint} returned empty result`);
        continue;
      }

      return elements.map((el) => ({
        osmId: el.id?.toString() || "",
        name: el.tags?.name || el.tags?.ref || `stop_${el.id}`,
        lat: el.lat,
        lng: el.lon,
        type: detectType(el.tags || {}),
        transportModes: detectTransportModes(el.tags || {}),
      }));
    } catch (err) {
      console.error(`Overpass ${endpoint} failed: ${err}`);
      continue;
    }
  }

  return [];
}

async function findStations(lat, lng, radiusKm, limit) {
  try {
    const rawStations = await queryOverpass(lat, lng, radiusKm);
    if (!rawStations.length) return [];

    // Filter out weird stops (just stop_ID with no proper name)
    const filtered = rawStations.filter((s) => !s.name.match(/^stop_\d+$/));
    if (!filtered.length) {
      return [];
    }

    const scored = filtered.map((s) => scoreStation(lat, lng, s));
    const deduped = deduplicateStations(scored);

    deduped.sort((a, b) => a.score - b.score);

    // Generate IDOS names (handle duplicates with district notation)
    const withIdosNames = generateIdosNames(deduped);

    return withIdosNames.slice(0, limit).map((s, index) => ({ ...s, rank: index + 1 }));
  } catch (err) {
    console.warn(`Error finding stations: ${err.message}`);
    return [];
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const getVal = (flag, fallback) => {
    const found = args.find((a) => a.startsWith(`${flag}=`));
    return found ? found.split("=")[1] : fallback;
  };

  return {
    limitBases: getVal("--limit", null) ? Number(getVal("--limit", null)) : null,
    radiusKm: getVal("--radius", null) ? Number(getVal("--radius", null)) : 7,
    maxStations: getVal("--stations", null) ? Number(getVal("--stations", null)) : 8,
    dryRun: args.includes("--dry-run"),
  };
}

async function main() {
  const { limitBases, radiusKm, maxStations, dryRun } = parseArgs();
  const convexUrl = process.env.CONVEX_URL;

  if (!convexUrl && !dryRun) {
    throw new Error("Set CONVEX_URL to your deployment url (e.g. https://happy-otter-123.convex.cloud)");
  }

  const client = convexUrl ? new ConvexHttpClient(convexUrl) : null;

  const allBases = await fetchBases();
  const bases = limitBases ? allBases.slice(0, limitBases) : allBases;
  const now = new Date().toISOString();

  console.log(`Processing ${bases.length} bases (radius ${radiusKm} km, max ${maxStations} stations each)${dryRun ? " [dry-run]" : ""}`);

  let successCount = 0;
  for (let i = 0; i < bases.length; i++) {
    const base = bases[i];
    console.log(`[${i + 1}/${bases.length}] ${base.name}`);

    // Enrich with detailed info from HTML page
    const enrichedBase = await enrichBaseDetails(base);

    const stations = await findStations(base.coordinates.lat, base.coordinates.lng, radiusKm, maxStations);

    if (!stations.length) {
      console.warn(`No stations found for ${base.name}`);
    }

    if (!dryRun && client) {
      try {
        await client.mutation(api.bases.upsertBaseWithStations, {
          base: { ...enrichedBase, lastSyncedAt: now },
          stations,
        });
        successCount += 1;
      } catch (err) {
        console.error(`Failed to upsert ${base.name}:`, err);
      }
    }
    
    // Rate limiting: wait between requests to avoid overwhelming servers
    if (i < bases.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log(`Done. ${successCount}/${bases.length} bases written${dryRun ? " (dry-run)" : ""}.`);
}

const isEntry = () => {
  try {
    const arg = process.argv[1];
    if (!arg) return false;
    const argUrl = pathToFileURL(arg).href;
    return import.meta.url === argUrl;
  } catch {
    return false;
  }
};

if (isEntry()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
