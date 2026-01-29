/**
 * Complete Base + Station Sync Script
 * 
 * Fetches all 371 scout bases from zakladny.skaut.cz and enriches each with:
 * - 20 nearest transit stations from OSM/Overpass API
 * - Full base details (contacts, conditions, amenities, photos)
 * - Station rankings and scores
 * 
 * Usage: node scripts/sync-all-bases-with-stations.mjs
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// Load environment variables from .env.local
const CONVEX_URL = "https://kindred-okapi-371.convex.cloud";

if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found");
  process.exit(1);
}

const client = new ConvexHttpClient(CONVEX_URL);

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/cgi/interpreter",
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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

// ============================================================================
// FETCH BASE LIST
// ============================================================================

async function fetchBasesList() {
  console.log("📋 Fetching base list from zakladny.skaut.cz...");
  
  const response = await fetch("https://zakladny.skaut.cz/api/search", {
    headers: {
      "User-Agent": "SkautREG-sync",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`API responded with ${response.status}`);
  }

  const data = await response.json();
  if (!data.Items || !Array.isArray(data.Items)) {
    throw new Error("Unexpected API response");
  }

  console.log(`✅ Found ${data.Items.length} bases\n`);
  return data.Items;
}

// ============================================================================
// FETCH BASE DETAILS (from detail page)
// ============================================================================

async function fetchBaseDetails(base) {
  const url = base.Slug 
    ? `https://zakladny.skaut.cz/${base.Slug}` 
    : `https://zakladny.skaut.cz/detail/${base.ID}`;
  
  let retries = 3;
  while (retries > 0) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "SkautREG-sync" },
      });
      
      if (!resp.ok) {
        retries--;
        if (retries > 0) await new Promise(r => setTimeout(r, 500));
        continue;
      }
      
      const html = await resp.text();
      const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
      if (!match) return { detail: null, html };
      
      const nextData = JSON.parse(match[1]);
      return { 
        detail: nextData.props?.pageProps?.detail || null,
        html
      };
    } catch (err) {
      retries--;
      if (retries > 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  
  return { detail: null, html: '' };
}

// ============================================================================
// FETCH STATIONS (OSM/Overpass)
// ============================================================================

function detectStationType(tags) {
  if (tags.bus === 'yes' || tags.amenity === 'bus_station') return 'Bus';
  if (tags.tram === 'yes' || tags.tram_stop === 'yes') return 'Tram';
  if (tags.subway === 'yes' || tags.metro === 'yes') return 'Metro';
  if (tags.trolleybus === 'yes') return 'Trolleybus';
  if (tags.ferry === 'yes' || tags.amenity === 'ferry_terminal') return 'Ferry';
  if (tags.light_rail === 'yes') return 'Light Rail';
  
  if (tags.railway === 'station' || tags.railway === 'halt') {
    if (tags['railway:type'] === 'light_rail' || tags['railway:type'] === 'tram') return 'Tram';
    if (tags['railway:type'] === 'subway' || tags['railway:type'] === 'metro') return 'Metro';
    return 'Train';
  }
  
  if (tags.public_transport === 'stop_position') {
    if (tags.route === 'tram') return 'Tram';
    if (tags.route === 'bus') return 'Bus';
    if (tags.route === 'subway' || tags.route === 'metro') return 'Metro';
    return 'Bus';
  }
  
  return 'Unknown';
}

function calculateHubIndex(station) {
  const typeMultiplier = {
    'Train': 10.0,
    'Metro': 8.0,
    'Tram': 3.0,
    'Bus': 1.6,
    'Unknown': 1.0
  };
  
  const mult = typeMultiplier[station.type] || 1.0;
  const lines = 2; // Estimate
  const freq = 4;
  
  return lines * freq * mult;
}

function getZoneCoefficient(distance_km) {
  if (distance_km <= 0.5) return 1.0;
  if (distance_km <= 5.0) {
    return 1.0 + (distance_km - 0.5) / 4.5 * 0.5;
  }
  return 1.5 * Math.exp(0.3 * (distance_km - 5.0));
}

async function fetchStationsNearBase(lat, lng, radius_km = 5) {
  const radius_m = Math.max(100, Math.floor(radius_km * 1000));
  
  const query = `
[out:json][timeout:90];
(
  node["railway"="station"](around:${radius_m},${lat},${lng});
  node["railway"="halt"](around:${radius_m},${lat},${lng});
  node["public_transport"="stop_position"](around:${radius_m},${lat},${lng});
);
out center 100;
`;

  for (let i = 0; i < OVERPASS_ENDPOINTS.length; i++) {
    const endpoint = OVERPASS_ENDPOINTS[i];
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      const elements = data.elements || [];

      if (elements.length === 0) {
        continue;
      }

      // Parse and score stations
      const stations = elements
        .filter(el => el.tags?.name && !el.tags.name.match(/^stop_\d+$/))
        .map(el => {
          const tags = el.tags || {};
          const type = detectStationType(tags);
          const distance = haversineDistance(lat, lng, el.lat, el.lon);
          const hubIndex = calculateHubIndex({ type });
          const walkingTime = (distance * 1000) / 60; // 1 m/s
          const zoneCoef = getZoneCoefficient(distance);
          const score = (walkingTime * zoneCoef) - hubIndex + 95;
          
          return {
            osmId: el.id?.toString() || '',
            name: tags.name,
            idosName: tags.name, // Will be enhanced later if needed
            lat: el.lat,
            lng: el.lon,
            type,
            transportModes: [type],
            hubIndex,
            distance_km: distance,
            score: Math.round(score * 100) / 100
          };
        });

      // Sort by score and deduplicate
      stations.sort((a, b) => a.score - b.score);
      
      const deduped = [];
      const seen = new Set();
      
      for (const station of stations) {
        const key = `${station.name}_${Math.round(station.lat * 1000)}_${Math.round(station.lng * 1000)}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(station);
        }
      }
      
      return deduped.slice(0, 20); // Return top 20

    } catch (err) {
      continue;
    }
  }

  return [];
}

// ============================================================================
// BUILD COMPLETE BASE OBJECT
// ============================================================================

function buildBaseObject(baseItem, detail, html) {
  const clean = (val) => (val === null || val === undefined || val === '' ? undefined : val);
  
  const base = {
    zakladnyId: baseItem.ID,
    name: (baseItem.DisplayName || "").trim(),
    slug: clean(baseItem.Slug),
    url: baseItem.Slug ? `https://zakladny.skaut.cz/${baseItem.Slug}` : undefined,
    type: clean(baseItem.RealtyType),
    typeKey: clean(baseItem.RealtyTypeKey),
    capacity: clean(baseItem.Capacity),
    capacityNote: clean(baseItem.CapacityNote),
    coordinates: {
      lat: baseItem.GpsLatitude,
      lng: baseItem.GpsLongitude,
    },
    pricing: baseItem.MinimalPrice || baseItem.MinimalPriceRentPriceType ? {
      minimalPrice: clean(baseItem.MinimalPrice),
      priceType: clean(baseItem.MinimalPriceRentPriceType),
    } : undefined,
    location: baseItem.Street || baseItem.City || baseItem.Postcode ? {
      address: clean(baseItem.Street),
      city: clean(baseItem.City),
      postalCode: clean(baseItem.Postcode),
      country: "Česká republika",
    } : undefined,
    highlighted: Boolean(baseItem.Highlighted),
    availability: clean(baseItem.Availability),
    lastSyncedAt: new Date().toISOString(),
  };
  
  // Enrich with detail data
  if (detail) {
    // Update location with detail data (more accurate than search results)
    if (detail.Street || detail.City || detail.Postcode) {
      base.location = {
        address: clean(detail.Street),
        city: clean(detail.City),
        postalCode: clean(detail.Postcode),
        country: "Česká republika",
      };
    }
    
    // Contacts
    if (detail.ContactPerson || detail.ContactEmail || detail.Email || detail.ContactPhone || detail.ContactWeb) {
      const contact = {
        name: detail.ContactPerson || undefined,
        role: "správce",
        email: detail.ContactEmail || detail.Email || undefined,
        phone: detail.ContactPhone || undefined,
        website: detail.ContactWeb || undefined,
      };
      Object.keys(contact).forEach(k => contact[k] === undefined && delete contact[k]);
      if (Object.keys(contact).length > 1) {
        base.contacts = [contact];
      }
    }
    
    // Conditions - use Requirements field which contains podmínky text
    const conditionsObj = {};
    
    // Main conditions text from Requirements field
    if (detail.Requirements && typeof detail.Requirements === 'string' && detail.Requirements.trim()) {
      conditionsObj.specialNotes = decodeHtmlEntities(detail.Requirements).trim();
    }
    
    // Check DocumentRequirement as fallback
    if (!conditionsObj.specialNotes && detail.DocumentRequirement) {
      if (typeof detail.DocumentRequirement === 'string') {
        conditionsObj.specialNotes = decodeHtmlEntities(detail.DocumentRequirement).trim();
      } else if (detail.DocumentRequirement.Description) {
        conditionsObj.specialNotes = decodeHtmlEntities(detail.DocumentRequirement.Description).trim();
      }
    }
    
    if (Object.keys(conditionsObj).length > 0) {
      conditionsObj.language = "Česky";
      base.conditions = conditionsObj;
    }
    
    // Media - extract from both JSON and HTML
    const allPhotos = [];
    const seenDocumentIds = new Set();
    
    // 1. Get photos from detail.Photos JSON
    if (detail.Photos && Array.isArray(detail.Photos) && detail.Photos.length > 0) {
      detail.Photos.forEach(p => {
        const docId = String(p.ID_Document);
        if (!seenDocumentIds.has(docId)) {
          allPhotos.push({
            url: `https://prd-images-zakladny-skaut.azureedge.net/api/images/thumb/${p.ID_Document}.jpg`,
            documentId: docId,
            description: p.Description ? decodeHtmlEntities(p.Description).trim() : '',
          });
          seenDocumentIds.add(docId);
        }
      });
    }
    
    // 2. Extract additional images from HTML <img> tags
    if (html) {
      const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
      let match;
      
      while ((match = imgRegex.exec(html)) !== null) {
        let src = match[1];
        
        // Only include images from the Azure CDN
        if (src.includes('prd-images-zakladny-skaut.azureedge.net')) {
          // Normalize URL
          if (src.startsWith('//')) src = 'https:' + src;
          else if (src.startsWith('/')) src = 'https://zakladny.skaut.cz' + src;
          
          // Skip icons, logos, fallback images
          if (src.includes('icon') || src.includes('logo') || src.includes('fallback')) {
            continue;
          }
          
          // Extract document ID from URL
          const docIdMatch = src.match(/\/(\d+)\.(jpg|jpeg|png|gif)/i);
          if (docIdMatch) {
            const documentId = docIdMatch[1];
            
            // Only add if we haven't seen this document ID yet
            if (!seenDocumentIds.has(documentId)) {
              allPhotos.push({
                url: src,
                documentId,
                description: '',
              });
              seenDocumentIds.add(documentId);
            }
          }
        }
      }
    }
    
    if (allPhotos.length > 0) {
      base.media = { photos: allPhotos };
    }
    
    if (detail.PhotogalleryUrl) {
      base.media = base.media || {};
      base.media.photoGalleryUrl = detail.PhotogalleryUrl;
    }
    
    // Equipment - only save equipment array in amenities
    if (detail.OccupationEquipment && Array.isArray(detail.OccupationEquipment) && detail.OccupationEquipment.length > 0) {
      const equipment = detail.OccupationEquipment.map(e => e.DisplayName).filter(Boolean);
      if (equipment.length > 0) {
        base.amenities = { equipment };
        console.log(`  ✓ Equipment: ${equipment.length} items`);
      }
    }
  }
  
  // Debug output for verification
  if (base.conditions) {
    const notePreview = base.conditions.specialNotes ? `"${base.conditions.specialNotes.substring(0, 50)}..."` : '';
    console.log(`  ✓ Conditions: ${notePreview}`);
  }
  if (base.media?.photos) {
    console.log(`  ✓ Media: ${base.media.photos.length} photos`);
  } else {
    console.log(`  ✓ Media: NONE`);
  }
  if (base.location) {
    console.log(`  ✓ Location: ${base.location.city || 'N/A'}, ${base.location.address || 'N/A'}`);
  }
  if (base.contacts && base.contacts.length > 0) {
    console.log(`  ✓ Contacts: ${base.contacts.length} contact(s)`);
  }
  
  // Remove undefined fields to avoid Convex validation issues
  Object.keys(base).forEach(key => {
    if (base[key] === undefined) {
      delete base[key];
    }
  });
  
  return base;
}

// ============================================================================
// SAVE TO CONVEX
// ============================================================================

async function saveBaseWithStations(base, stations) {
  try {
    // Save base
    const baseId = await client.mutation(api.bases.upsertBase, { base });
    
    // Save stations and create base_stations links
    for (let i = 0; i < stations.length; i++) {
      const station = stations[i];
      
      // Save station (upsert by osmId)
      const stationData = {
        osmId: station.osmId,
        name: station.name,
        idosName: station.idosName,
        lat: station.lat,
        lng: station.lng,
        type: station.type,
        transportModes: station.transportModes,
        hubIndex: station.hubIndex,
        score: station.score,
        lastSyncedAt: new Date().toISOString(),
      };
      
      const stationId = await client.mutation(api.bases.upsertStation, { station: stationData });
      
      // Link base to station
      await client.mutation(api.bases.linkBaseToStation, {
        baseId,
        stationId,
        distanceKm: station.distance_km,
        rank: i + 1,
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
  } catch (error) {
    console.error(`    ❌ Save error: ${error.message}`);
    throw error;
  }
}

// ============================================================================
// MAIN SYNC FUNCTION
// ============================================================================

async function syncAllBasesWithStations() {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀  COMPLETE BASE + STATION SYNC');
  console.log('═'.repeat(80) + '\n');
  
  try {
    // Fetch all bases
    const baseItems = await fetchBasesList();
    console.log(`📊 Processing ${baseItems.length} bases...\n`);
    
    // Start from beginning to find missing bases
    const startIndex = 0;
    
    let successCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    const failedBases = [];
    
    for (let i = startIndex; i < baseItems.length; i++) {
      const baseItem = baseItems[i];
      const progress = `[${i + 1}/${baseItems.length}]`;
      
      console.log(`${progress} 🏕️  ${baseItem.DisplayName}`);
      
      try {
        // Check if base already exists
        console.log(`  🔍 Checking if base exists...`);
        const existingBase = await client.query(api.bases.getBaseByZakladnyId, { 
          zakladnyId: baseItem.ID 
        });
        
        if (existingBase) {
          console.log(`  ⏭️  Already exists, skipping...\n`);
          skippedCount++;
          continue;
        }
        
        // Fetch detailed info
        console.log(`  ⏳ Fetching details...`);
        const { detail, html } = await fetchBaseDetails(baseItem);
        
        // Build complete base object
        const base = buildBaseObject(baseItem, detail, html);
        
        // Fetch stations
        console.log(`  ⏳ Fetching stations (radius: 5km)...`);
        const stations = await fetchStationsNearBase(
          base.coordinates.lat, 
          base.coordinates.lng,
          10
        );
        
        console.log(`  ✅ Found ${stations.length} stations`);
        if (stations.length > 0) {
          const trainCount = stations.filter(s => s.type === 'Train').length;
          const busCount = stations.filter(s => s.type === 'Bus').length;
          const tramCount = stations.filter(s => s.type === 'Tram').length;
          const metroCount = stations.filter(s => s.type === 'Metro').length;
          console.log(`     Types: Train(${trainCount}), Bus(${busCount}), Tram(${tramCount}), Metro(${metroCount})`);
        }
        
        // Save to database
        console.log(`  💾 Saving to database...`);
        await saveBaseWithStations(base, stations);
        
        successCount++;
        console.log(`  ✅ Success!\n`);
        
        // Rate limiting
        await new Promise(r => setTimeout(r, 1500));
        
      } catch (error) {
        errorCount++;
        failedBases.push({
          id: baseItem.ID,
          name: baseItem.DisplayName,
          error: error.message
        });
        console.error(`  ❌ Error: ${error.message}\n`);
        continue;
      }
    }
    
    console.log('═'.repeat(80));
    console.log(`✅ Sync Complete!`);
    console.log(`   Total bases: ${baseItems.length}`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Final count: ${successCount + skippedCount} (should be ${baseItems.length})`);
    
    if (failedBases.length > 0) {
      console.log('\n❌ Failed bases:');
      failedBases.forEach(fb => {
        console.log(`   [${fb.id}] ${fb.name}: ${fb.error}`);
      });
    }
    
    console.log('═'.repeat(80) + '\n');
    
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run
syncAllBasesWithStations();
