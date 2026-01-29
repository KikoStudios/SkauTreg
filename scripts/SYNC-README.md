# Base + Station Sync Script

## Overview

This script fetches all 371 scout bases from `zakladny.skaut.cz` and enriches each with:
- **Full base details** (contacts, conditions, amenities, photos, pricing)
- **20 nearest transit stations** from OpenStreetMap/Overpass API
- **Station rankings and scores** based on distance, transport type, and hub importance

## Usage

```bash
npm run sync:all
```

## What it does

### 1. Fetch Base List
- Queries `https://zakladny.skaut.cz/api/search` for all bases
- Gets basic info (ID, name, coordinates, capacity, type)

### 2. Enrich Each Base
For each of the 371 bases:
- Fetches detail page HTML from `zakladny.skaut.cz/{slug}`
- Extracts structured JSON data (`__NEXT_DATA__` script tag)
- Parses:
  - **Contacts**: Name, email, phone, website
  - **Conditions**: Accessibility, heating, water, toilet, kitchen, bedding
  - **Amenities**: Equipment list
  - **Media**: Photos with URLs and descriptions
  - **Pricing**: Base price, scout discounts, price type

### 3. Find Nearby Stations
For each base:
- Queries Overpass API with 10km radius around base coordinates
- Fetches:
  - Railway stations
  - Railway halts
  - Public transport stops
- Filters out invalid/unnamed stops
- Detects transport type (Train, Metro, Tram, Bus, etc.)
- Calculates:
  - **Distance** (Haversine formula)
  - **Hub Index** (based on transport type and estimated connections)
  - **Score** (walking time × zone coefficient - hub index + 95)
- Ranks by score (lower is better)
- Returns top 20 stations

### 4. Save to Convex Database
- **Bases table**: Upserts base with all enriched data
- **Stations table**: Upserts each station (deduplicated by OSM ID)
- **Base_Stations table**: Links each base to its 20 stations with:
  - Distance
  - Rank (1-20)
  - Score
  - Denormalized station info for quick access

## Database Schema

### `bases`
- `zakladnyId` - Unique ID from zakladny.skaut.cz
- `name` - Base name
- `coordinates` - {lat, lng}
- `capacity`, `type`, `pricing`, `location`, `contacts`, `amenities`, `conditions`, `media`

### `stations`
- `osmId` - OpenStreetMap element ID
- `name` - Station name
- `idosName` - IDOS-formatted name (with district if needed)
- `lat`, `lng` - Coordinates
- `type` - Transport type (Train, Bus, Tram, Metro, etc.)
- `hubIndex` - Importance score
- `score` - Optimization metric

### `base_stations`
- `baseId` - Reference to base
- `stationId` - Reference to station
- `distanceKm` - Distance from base
- `rank` - Ranking (1 = closest/best)
- `score` - Combined optimization score
- Denormalized: `stationName`, `lat`, `lng`, `type`, etc.

## Rate Limiting

- **1.5 second delay** between base fetches to be respectful to APIs
- **Retries** (3x) for failed detail page fetches
- **Multiple Overpass endpoints** as fallback

## Expected Runtime

- ~371 bases × 1.5s = ~9-10 minutes
- Plus Overpass API time (~1-3s per base)
- **Total: ~15-20 minutes**

## Error Handling

- Continues on individual base errors
- Logs success/error count at end
- Saves successfully processed bases even if some fail

## Output Example

```
[1/371] 🏕️  Skautská základna Mentaurov
  ⏳ Fetching details...
  ⏳ Fetching stations (radius: 10km)...
  ✅ Found 18 stations
  💾 Saving to database...
  ✅ Success!

[2/371] 🏕️  Srub Tortuga
  ⏳ Fetching details...
  ⏳ Fetching stations (radius: 10km)...
  ✅ Found 12 stations
  💾 Saving to database...
  ✅ Success!

...

═══════════════════════════════════════════════════════════
✅ Sync Complete!
   Success: 369
   Errors: 2
═══════════════════════════════════════════════════════════
```

## Requirements

- Node.js environment with `node-fetch` available
- Convex database configured
- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` in environment

## Convex Mutations Used

- `api.bases.upsertBase` - Insert/update base
- `api.bases.upsertStation` - Insert/update station
- `api.bases.linkBaseToStation` - Create base→station link
