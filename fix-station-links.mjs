#!/usr/bin/env node

import { ConvexClient } from 'convex/browser';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  console.error('Error: NEXT_PUBLIC_CONVEX_URL environment variable not set');
  process.exit(1);
}

const client = new ConvexClient(convexUrl);

async function fixStationLinks() {
  console.log('Fetching all stations...');
  const stations = await client.query('bases:listAllStations');
  console.log(`Found ${stations.length} stations`);

  // Create a map of idosName -> station ID
  const idosNameMap = {};
  stations.forEach(station => {
    const key = `${station.idosName || station.name}|${station.type}`;
    idosNameMap[key] = station._id;
  });

  console.log('Fetching all base_stations links...');
  const baseStations = await client.query('bases:listAllBaseStations');
  console.log(`Found ${baseStations.length} base_station links`);

  let fixed = 0;
  let failed = 0;

  // Fix each base_station link
  for (const link of baseStations) {
    try {
      // Find matching station by idosName and type
      const key = `${link.stationIdosName}|${link.type}`;
      const correctStationId = idosNameMap[key];

      if (!correctStationId) {
        console.error(`⚠️  No station found for: ${key}`);
        failed++;
        continue;
      }

      if (link.stationId !== correctStationId) {
        // Update with correct stationId
        await client.mutation('bases:updateBaseStationCoordinates', {
          baseStationId: link._id,
          lat: link.lat,
          lng: link.lng,
          stationId: correctStationId,
        });
        fixed++;
        if (fixed % 100 === 0) {
          console.log(`Fixed ${fixed} links...`);
        }
      }
    } catch (err) {
      console.error(`Failed to fix ${link._id}:`, err.message);
      failed++;
    }
  }

  console.log(`\n✓ Fixed ${fixed} station links`);
  if (failed > 0) {
    console.log(`✗ Failed to fix ${failed} links`);
  }
}

fixStationLinks().catch(err => {
  console.error('Fix failed:', err);
  process.exit(1);
});
