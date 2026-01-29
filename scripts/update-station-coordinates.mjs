#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.CONVEX_URL || "https://kindred-okapi-371.convex.cloud";
const client = new ConvexHttpClient(CONVEX_URL);

// Haversine distance calculator
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Query Overpass for a station by name
async function queryOverpassForStation(stationName) {
  const query = `
    [bbox:50.0,12.0,51.5,18.8];
    (
      node["name"~"^${stationName}$","public_transport"="stop_position"];
      way["name"~"^${stationName}$","public_transport"="platform"];
      relation["name"~"^${stationName}$","public_transport"="stop_area"];
    );
    out center;
  `;

  try {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });

    if (!response.ok) {
      console.warn(`  ⚠️ Overpass error for "${stationName}": ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      console.log(`  ⚠️ No results found for "${stationName}"`);
      return null;
    }

    // Find the best match (prefer nodes with center data)
    let bestMatch = null;
    for (const element of data.elements) {
      if (element.center) {
        bestMatch = element.center;
        break;
      }
      if (element.lat && element.lon) {
        bestMatch = { lat: element.lat, lon: element.lon };
        break;
      }
    }

    if (bestMatch) {
      console.log(`  ✅ Found: ${stationName} at (${bestMatch.lat.toFixed(4)}, ${bestMatch.lon.toFixed(4)})`);
      return bestMatch;
    }

    return null;
  } catch (error) {
    console.warn(`  ❌ Error querying Overpass for "${stationName}": ${error.message}`);
    return null;
  }
}

// Fetch all stations from Convex
async function fetchAllStations() {
  try {
    console.log("📡 Fetching all stations from Convex...");
    const stations = await client.query("bases:listAllStations");
    console.log(`✅ Found ${stations.length} stations in database\n`);
    return stations;
  } catch (error) {
    console.error("❌ Error fetching stations:", error.message);
    return [];
  }
}

// Update station coordinates in Convex
async function updateStationCoordinates(stationId, lat, lng) {
  try {
    await client.mutation("bases:updateStationCoordinates", {
      stationId,
      lat,
      lng,
    });
    return true;
  } catch (error) {
    console.error(`  ❌ Error updating station ${stationId}:`, error.message);
    return false;
  }
}

// Main script
async function main() {
  console.log("🚀 Station Coordinates Update Script\n");

  const stations = await fetchAllStations();
  if (stations.length === 0) {
    console.log("No stations found in database.");
    return;
  }

  let updated = 0;
  let missing = 0;
  let failed = 0;

  console.log("🔍 Processing stations...\n");

  for (let i = 0; i < stations.length; i++) {
    const station = stations[i];
    process.stdout.write(`[${i + 1}/${stations.length}] ${station.name}`);

    // Check if coordinates are already present
    if (station.lat && station.lng) {
      console.log(" ✓ (already has coordinates)");
      continue;
    }

    console.log("");
    missing++;

    // Query Overpass for coordinates
    const coordinates = await queryOverpassForStation(station.name);

    if (coordinates) {
      // Update in Convex
      const success = await updateStationCoordinates(
        station._id,
        coordinates.lat,
        coordinates.lon
      );

      if (success) {
        updated++;
      } else {
        failed++;
      }
    } else {
      failed++;
    }

    // Rate limiting: wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n📊 Summary:");
  console.log(`  Total stations: ${stations.length}`);
  console.log(`  Already have coordinates: ${stations.length - missing}`);
  console.log(`  Missing coordinates: ${missing}`);
  console.log(`  Successfully updated: ${updated}`);
  console.log(`  Failed to update: ${failed}`);
}

main().catch(console.error);
