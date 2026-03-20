const DEFAULT_OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/cgi/interpreter",
];

async function getFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  const mod = await import("node-fetch");
  return mod.default;
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

function bearingDegrees(lat1, lon1, lat2, lon2) {
  const y = Math.sin(toRadians(lon2 - lon1)) * Math.cos(toRadians(lat2));
  const x =
    Math.cos(toRadians(lat1)) * Math.sin(toRadians(lat2)) -
    Math.sin(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.cos(toRadians(lon2 - lon1));
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return (brng + 360) % 360;
}

function removeDiacritics(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function stripDirectionHints(text) {
  let t = text;
  t = t.replace(/\([^)]*(?:sm\u011br|smer|direction|towards|->|<-|\u2192|\u2190)[^)]*\)/gi, "");
  t = t.replace(/\s*(?:->|<-|\u2192|\u2190)\s*.*$/g, "");
  t = t.replace(/(?:,|\s)+(?:sm\u011br|smer|direction|towards)\b.*$/i, "");
  return t.replace(/\s+/g, " ").trim();
}

function isStandNumberPart(part) {
  const p = part.trim();
  if (/^\d+$/.test(p)) return true;
  const normalized = removeDiacritics(p).toLowerCase();
  return /^(?:st\.?|stand|platform|stan\.?|stanoviste)\s*\d+$/.test(normalized);
}

function normalizeStationNameForMerge(name) {
  let cleaned = stripDirectionHints(String(name || "").trim());
  let parts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3 && isStandNumberPart(parts[2])) {
    parts = parts.slice(0, 2);
  }
  if (parts.length >= 2 && isStandNumberPart(parts[parts.length - 1])) {
    parts = parts.slice(0, parts.length - 1);
  }
  const merged = parts.join(", ");
  return removeDiacritics(merged).toLowerCase().replace(/\s+/g, " ").trim();
}

function detectType(tags) {
  if (tags.highway === "bus_stop") return "Bus";
  if (tags.bus === "yes" || tags.amenity === "bus_station" || tags.route === "bus") return "Bus";
  if (tags.tram === "yes" || tags.tram_stop === "yes" || tags.route === "tram") return "Tram";
  if (
    tags.subway === "yes" ||
    tags.metro === "yes" ||
    tags.route === "subway" ||
    tags.route === "metro" ||
    tags.line === "M1" ||
    tags.line === "M2" ||
    tags.line === "M3"
  ) {
    return "Metro";
  }
  if (tags.trolleybus === "yes" || tags.route === "trolleybus") return "Trolleybus";
  if (tags.ferry === "yes" || tags.amenity === "ferry_terminal") return "Ferry";
  if (tags["railway:type"] === "light_rail" || tags.light_rail === "yes") return "Light Rail";
  if (tags.railway === "station" || tags.railway === "halt") return "Train";
  if (tags.public_transport === "stop_position" || tags.public_transport === "platform") return "Bus";
  return "Unknown";
}

function transportModesFromType(type) {
  switch (type) {
    case "Train":
      return ["train"];
    case "Bus":
      return ["bus"];
    case "Tram":
      return ["tram"];
    case "Metro":
      return ["metro"];
    case "Light Rail":
      return ["light_rail"];
    case "Trolleybus":
      return ["trolleybus"];
    case "Ferry":
      return ["ferry"];
    default:
      return ["unknown"];
  }
}

function getTransportTypeScore(type) {
  const typeScores = {
    Metro: 100,
    Tram: 80,
    Train: 70,
    "Light Rail": 65,
    Trolleybus: 50,
    Bus: 40,
    Ferry: 20,
    Unknown: 10,
  };
  return typeScores[type] || 10;
}

function getOptimalTypeScore(type, distanceKm) {
  const baseScore = getTransportTypeScore(type);

  let distancePenalty = 1.0;
  if (distanceKm <= 0.3) {
    distancePenalty = 1.0;
  } else if (distanceKm <= 1.0) {
    distancePenalty = 1.0 + (distanceKm - 0.3) * 0.2;
  } else if (distanceKm <= 2.5) {
    distancePenalty = 1.15 + (distanceKm - 1.0) * 0.15;
    if (type === "Bus") distancePenalty *= 1.3;
  } else {
    distancePenalty = 1.35 + (distanceKm - 2.5) * 0.25;
    if (type === "Bus") distancePenalty *= 1.5;
  }

  return baseScore / distancePenalty;
}

function estimateUrbanFactor(stations) {
  const nearby = stations.filter((s) => s.distance_km <= 1.5).length;
  const raw = (nearby - 4) / (16 - 4);
  return Math.max(0, Math.min(1, raw));
}

function addContextScores(stations, neighborRadiusKm = 0.6) {
  if (stations.length === 0) return stations;

  const stopDensityRaw = new Array(stations.length).fill(0);

  for (let i = 0; i < stations.length; i++) {
    let neighborCount = 0;
    let neighborTransportSum = 0;

    for (let j = 0; j < stations.length; j++) {
      if (i === j) continue;
      const d = haversineDistanceKm(
        stations[i].latitude,
        stations[i].longitude,
        stations[j].latitude,
        stations[j].longitude,
      );
      if (d > neighborRadiusKm) continue;
      neighborCount += 1;
      neighborTransportSum += getTransportTypeScore(stations[j].type);
    }

    stopDensityRaw[i] = neighborCount + neighborTransportSum / 120;
  }

  const maxStop = Math.max(...stopDensityRaw, 1);
  const stopDensityScore = stopDensityRaw.map((v) => Math.max(0, Math.min(1, v / maxStop)));

  return stations.map((st, idx) => {
    const building = st.buildingDensityScore ?? 0;
    const stop = stopDensityScore[idx] ?? 0;
    const contextScore = Math.max(stop, building * 0.85) * 0.6 + (stop * 0.4 + building * 0.6) * 0.4;

    return {
      ...st,
      stopDensityScore: stop,
      contextScore: Math.max(0, Math.min(1, contextScore)),
      hubScore: 0,
      feederPenalty: 0,
    };
  });
}

function clusterStations(stations, clusterRadiusKm = 0.35) {
  if (stations.length === 0) return [];

  const sorted = [...stations].sort((a, b) => a.distance_km - b.distance_km);
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < sorted.length; i++) {
    if (used.has(i)) continue;

    const seed = sorted[i];

    const cluster = [];
    const queue = [i];
    used.add(i);

    while (queue.length > 0) {
      const idx = queue.shift();
      const current = sorted[idx];
      cluster.push(current);

      for (let j = 0; j < sorted.length; j++) {
        if (used.has(j)) continue;
        const other = sorted[j];
        const dist = haversineDistanceKm(current.latitude, current.longitude, other.latitude, other.longitude);
        if (dist > clusterRadiusKm) continue;

        used.add(j);
        queue.push(j);
      }
    }

    clusters.push({
      center: { lat: seed.latitude, lng: seed.longitude },
      radius: clusterRadiusKm,
      stations: cluster,
    });
  }

  return clusters;
}

function applyHubScoresAndClusterRanks(clusters, urbanFactor) {
  const contextWeight = 70 * urbanFactor + 25 * (1 - urbanFactor);
  const typeBoost = {
    Metro: 40,
    Train: 28,
    Tram: 22,
    "Light Rail": 18,
    Trolleybus: 10,
    Bus: 0,
    Ferry: 0,
    Unknown: 0,
  };

  const isPotentialHubName = (name, type) => {
    if (type !== "Train" && type !== "Metro") return false;
    const normalized = removeDiacritics(String(name || "")).toLowerCase();
    return /(hlavni|main|central|nadrazi|station)$/.test(normalized);
  };

  const sigmoid = (x) => 1 / (1 + Math.exp(-x));

  for (const cluster of clusters) {
    for (const st of cluster.stations) {
      const nameBoost = isPotentialHubName(st.name, st.type) ? 15 : 0;
      st.hubScore = st.transportScore + (typeBoost[st.type] || 0) + st.contextScore * contextWeight + nameBoost;
    }

    cluster.stations.sort((a, b) => {
      const diff = b.hubScore - a.hubScore;
      if (diff !== 0) return diff;
      if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
      return String(a.id).localeCompare(String(b.id));
    });

    cluster.stations.forEach((st, idx) => {
      st.clusterRank = idx + 1;
    });

    const hub = cluster.stations[0];
    const maxExtraWalkKm = 0.35 + 1.05 * urbanFactor;
    const hubDiffThreshold = 22 - 6 * urbanFactor;
    const hubDiffScale = 10 + 6 * (1 - urbanFactor);
    const walkScale = 0.18 + 0.12 * (1 - urbanFactor);

    for (const st of cluster.stations) {
      if (st.id === hub.id) continue;

      const extraWalkKm = hub.distance_km - st.distance_km;
      if (extraWalkKm <= 0) continue;
      if (extraWalkKm > maxExtraWalkKm) continue;

      const hubDiff = hub.hubScore - st.hubScore;
      const hubGain = sigmoid((hubDiff - hubDiffThreshold) / hubDiffScale);
      const walkOk = sigmoid((maxExtraWalkKm - extraWalkKm) / walkScale);

      const penaltyStrength = hubGain * walkOk;
      if (penaltyStrength < 0.25) continue;

      st.feederPenalty =
        penaltyStrength *
        (hubDiff * (0.42 + 0.25 * urbanFactor) + extraWalkKm * (14 + 10 * urbanFactor));
    }
  }
}

function calculateFinalScore(station, urbanFactor) {
  const walkingWeight = 2.6 - 0.7 * urbanFactor;
  const walkingComponent = station.walkingTime_min * walkingWeight;

  const typeWeight = 0.55 + 0.6 * urbanFactor;
  const typeComponent = (100 - station.typeScore) * typeWeight;

  const contextBonus = station.contextScore * (2 + 14 * urbanFactor);
  const feederComponent = station.feederPenalty ?? 0;
  const clusterComponent = (station.clusterRank - 1) * (0.8 + 0.6 * urbanFactor);

  const finalScore = walkingComponent + typeComponent + clusterComponent + feederComponent - contextBonus;
  return Math.round(finalScore * 100) / 100;
}

function pruneTrainRoutes(stations) {
  const trains = stations.filter((s) => s.type === "Train" && (s.routeIds?.length || 0) > 0);
  if (trains.length < 2) return stations;

  const byRoute = new Map();
  for (const t of trains) {
    for (const rid of t.routeIds || []) {
      const arr = byRoute.get(rid) || [];
      arr.push(t);
      byRoute.set(rid, arr);
    }
  }

  const removeIds = new Set();
  for (const arr of byRoute.values()) {
    if (arr.length < 2) continue;
    const closest = arr.reduce((a, b) => (a.distance_km <= b.distance_km ? a : b));
    const biggest = arr.reduce((a, b) => {
      if ((a.contextScore ?? 0) !== (b.contextScore ?? 0)) return (a.contextScore ?? 0) > (b.contextScore ?? 0) ? a : b;
      return (a.hubScore ?? 0) >= (b.hubScore ?? 0) ? a : b;
    });

    if (closest.id === biggest.id && (biggest.contextScore ?? 0) >= 0.6) {
      for (const t of arr) {
        if (t.id !== biggest.id) removeIds.add(t.id);
      }
    }
  }

  if (removeIds.size === 0) return stations;
  return stations.filter((s) => !removeIds.has(s.id));
}

function pruneTrainCorridors(stations, originLat, originLon) {
  const trains = stations.filter((s) => s.type === "Train");
  if (trains.length < 2) return stations;

  const groups = new Map();
  for (const t of trains) {
    const bearing = bearingDegrees(originLat, originLon, t.latitude, t.longitude);
    const bucket = Math.round(bearing / 15) % 24;
    const g = groups.get(bucket) || [];
    g.push(t);
    groups.set(bucket, g);
  }

  const removeIds = new Set();
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const closest = g.reduce((a, b) => (a.distance_km <= b.distance_km ? a : b));
    const biggest = g.reduce((a, b) => {
      if ((a.contextScore ?? 0) !== (b.contextScore ?? 0)) return (a.contextScore ?? 0) > (b.contextScore ?? 0) ? a : b;
      return (a.hubScore ?? 0) >= (b.hubScore ?? 0) ? a : b;
    });

    if (closest.id === biggest.id && (biggest.contextScore ?? 0) >= 0.6) {
      for (const t of g) {
        if (t.id !== biggest.id) removeIds.add(t.id);
      }
    }
  }

  if (removeIds.size === 0) return stations;
  return stations.filter((s) => !removeIds.has(s.id));
}

function smartDeduplicate(stations) {
  const result = [];
  const indicesByKey = new Map();

  const sorted = [...stations].sort((a, b) => {
    const keyA = a.stopAreaId ? `sa:${a.stopAreaId}` : `n:${normalizeStationNameForMerge(a.name)}`;
    const keyB = b.stopAreaId ? `sa:${b.stopAreaId}` : `n:${normalizeStationNameForMerge(b.name)}`;
    if (keyA !== keyB) return keyA.localeCompare(keyB);
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return String(a.id).localeCompare(String(b.id));
  });

  const mergeRadiusFor = (type) => {
    if (type === "Train") return 0.18;
    if (type === "Metro") return 0.22;
    if (type === "Tram" || type === "Light Rail") return 0.12;
    return 0.1;
  };

  for (const station of sorted) {
    const key = station.stopAreaId ? `sa:${station.stopAreaId}` : `n:${normalizeStationNameForMerge(station.name)}`;
    const list = indicesByKey.get(key) || [];

    const mergeRadiusKm = station.stopAreaId ? 0.28 : mergeRadiusFor(station.type);

    let merged = false;
    for (const idx of list) {
      const kept = result[idx];
      const d = haversineDistanceKm(kept.latitude, kept.longitude, station.latitude, station.longitude);
      if (d > mergeRadiusKm) continue;

      const isBetter =
        station.distance_km < kept.distance_km ||
        (station.distance_km === kept.distance_km && station.typeScore > kept.typeScore) ||
        (station.distance_km === kept.distance_km &&
          station.typeScore === kept.typeScore &&
          station.transportScore > kept.transportScore);

      if (isBetter) {
        result[idx] = station;
      }

      merged = true;
      break;
    }

    if (merged) continue;

    const newIndex = result.length;
    result.push(station);
    list.push(newIndex);
    indicesByKey.set(key, list);
  }

  return result;
}

function generateIdosNames(stations) {
  const nameCounts = new Map();
  for (const s of stations) {
    nameCounts.set(s.name, (nameCounts.get(s.name) || 0) + 1);
  }

  return stations.map((s) => ({
    ...s,
    idosName: nameCounts.get(s.name) > 1 ? `${s.name},,HD` : s.name,
  }));
}

async function overpassRequest(fetchImpl, endpoint, query, timeoutMs) {
  const controller = timeoutMs ? new AbortController() : null;
  const timer = timeoutMs
    ? setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
    : null;

  try {
    const response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller?.signal,
    });
    if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
    return await response.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function queryOverpassStops(fetchImpl, endpoints, lat, lon, radiusKm, timeoutMs) {
  const radiusM = Math.max(100, Math.floor(radiusKm * 1000));
  const query = `
[out:json][timeout:90];
(
  node["railway"="station"](around:${radiusM},${lat},${lon});
  node["railway"="halt"](around:${radiusM},${lat},${lon});
  node["public_transport"="stop_position"](around:${radiusM},${lat},${lon});
  node["public_transport"="platform"](around:${radiusM},${lat},${lon});
  node["highway"="bus_stop"](around:${radiusM},${lat},${lon});
);
out center 200;
`;

  for (const endpoint of endpoints) {
    try {
      const data = await overpassRequest(fetchImpl, endpoint, query, timeoutMs);
      const elements = data?.elements || [];
      if (!elements.length) continue;
      return elements;
    } catch {
      // try next endpoint
    }
  }
  return [];
}

async function queryOverpassStopAreas(fetchImpl, endpoints, lat, lon, radiusKm, timeoutMs) {
  const radiusM = Math.max(100, Math.floor(radiusKm * 1000));
  const query = `
[out:json][timeout:90];
(
  relation["public_transport"="stop_area"](around:${radiusM},${lat},${lon});
);
out body;
>;
out skel qt;
`;

  for (const endpoint of endpoints) {
    try {
      const data = await overpassRequest(fetchImpl, endpoint, query, timeoutMs);
      const elements = data?.elements || [];
      if (!elements.length) return [];

      const relations = elements.filter((e) => e.type === "relation");
      const result = [];
      for (const rel of relations) {
        const memberNodeIds = new Set();
        const members = rel.members || [];
        for (const m of members) {
          if (m.type === "node" && m.ref != null) memberNodeIds.add(String(m.ref));
        }
        if (memberNodeIds.size === 0) continue;
        result.push({
          id: String(rel.id),
          name: rel.tags?.name || rel.tags?.ref || "",
          memberNodeIds,
        });
      }
      return result;
    } catch {
      // try next endpoint
    }
  }

  return [];
}

async function queryOverpassTrainRoutes(fetchImpl, endpoints, lat, lon, radiusKm, timeoutMs) {
  const radiusM = Math.max(100, Math.floor(Math.min(radiusKm, 6) * 1000));
  const query = `
[out:json][timeout:120];
(
  relation["type"="route"]["route"="train"](around:${radiusM},${lat},${lon});
);
out body;
>;
out skel qt;
`;

  for (const endpoint of endpoints) {
    try {
      const data = await overpassRequest(fetchImpl, endpoint, query, timeoutMs);
      const elements = data?.elements || [];
      if (!elements.length) return { routes: [], nodesById: new Map() };

      const nodesById = new Map();
      for (const el of elements) {
        if (el.type === "node" && el.id != null && el.lat != null && el.lon != null) {
          nodesById.set(String(el.id), { lat: el.lat, lon: el.lon });
        }
      }

      const relations = elements.filter((e) => e.type === "relation");
      const routes = [];
      for (const rel of relations) {
        const memberNodeIds = new Set();
        const members = rel.members || [];
        for (const m of members) {
          if (m.type !== "node" || m.ref == null) continue;
          const role = String(m.role || "");
          if (role.includes("stop") || role.includes("platform") || role === "") {
            memberNodeIds.add(String(m.ref));
          }
        }
        if (memberNodeIds.size === 0) continue;
        routes.push({
          id: String(rel.id),
          name: rel.tags?.ref || rel.tags?.name || "",
          memberNodeIds,
        });
      }

      return { routes, nodesById };
    } catch {
      // try next endpoint
    }
  }

  return { routes: [], nodesById: new Map() };
}

async function queryOverpassBuildings(fetchImpl, endpoints, lat, lon, radiusKm, timeoutMs) {
  const radiusM = Math.max(200, Math.floor(Math.min(radiusKm, 3) * 1000));
  const query = `
[out:json][timeout:120];
(
  way["building"](around:${radiusM},${lat},${lon});
);
out center 500;
`;

  for (const endpoint of endpoints) {
    try {
      const data = await overpassRequest(fetchImpl, endpoint, query, timeoutMs);
      const elements = data?.elements || [];
      if (!elements.length) return [];
      const centers = [];
      for (const el of elements) {
        const c = el.center;
        if (c?.lat != null && c?.lon != null) centers.push({ lat: c.lat, lon: c.lon });
      }
      return centers;
    } catch {
      // try next endpoint
    }
  }

  return [];
}

function computeBuildingDensityScores(stations, buildingCenters) {
  if (stations.length === 0) return stations;
  if (buildingCenters.length === 0) {
    return stations.map((s) => ({ ...s, buildingDensityScore: 0 }));
  }

  const cellSizeKm = 0.35;
  const keyFor = (lat, lon) =>
    `${Math.floor(lat / (cellSizeKm / 110.574))}_${Math.floor(
      lon / (cellSizeKm / (111.32 * Math.cos((lat * Math.PI) / 180) || 1)),
    )}`;

  const grid = new Map();
  for (const b of buildingCenters) {
    const k = keyFor(b.lat, b.lon);
    const arr = grid.get(k) || [];
    arr.push(b);
    grid.set(k, arr);
  }

  const scores = [];
  for (const st of stations) {
    const cells = [];
    const baseLatCell = Math.floor(st.latitude / (cellSizeKm / 110.574));
    const baseLonCell = Math.floor(
      st.longitude / (cellSizeKm / (111.32 * Math.cos((st.latitude * Math.PI) / 180) || 1)),
    );
    for (let dLat = -1; dLat <= 1; dLat++) {
      for (let dLon = -1; dLon <= 1; dLon++) {
        cells.push(`${baseLatCell + dLat}_${baseLonCell + dLon}`);
      }
    }

    let count300 = 0;
    let count600 = 0;
    for (const ck of cells) {
      const arr = grid.get(ck);
      if (!arr) continue;
      for (const b of arr) {
        const d = haversineDistanceKm(st.latitude, st.longitude, b.lat, b.lon);
        if (d <= 0.3) count300++;
        if (d <= 0.6) count600++;
      }
    }

    const raw = count300 * 1.0 + count600 * 0.35;
    scores.push(raw);
  }

  const max = Math.max(...scores, 1);
  return stations.map((s, idx) => ({
    ...s,
    buildingDensityScore: Math.max(0, Math.min(1, scores[idx] / max)),
  }));
}

function attachStopAreas(stations, stopAreas) {
  if (stations.length === 0 || stopAreas.length === 0) return stations;
  const memberToArea = new Map();
  for (const sa of stopAreas) {
    for (const id of sa.memberNodeIds) {
      if (!memberToArea.has(id)) memberToArea.set(id, sa);
    }
  }

  return stations.map((s) => {
    const sa = memberToArea.get(s.id);
    if (!sa) return s;
    return { ...s, stopAreaId: sa.id, stopAreaName: sa.name || s.name };
  });
}

function attachTrainRoutes(stations, routes, nodesById) {
  const trains = stations.filter((s) => s.type === "Train");
  if (trains.length === 0 || routes.length === 0) return stations;

  const routeIdsByStation = new Map();
  for (const route of routes) {
    for (const nodeId of route.memberNodeIds) {
      const n = nodesById.get(nodeId);
      if (!n) continue;
      let best = null;
      for (const st of trains) {
        const d = haversineDistanceKm(st.latitude, st.longitude, n.lat, n.lon);
        if (d > 0.25) continue;
        if (!best || d < best.d) best = { id: st.id, d };
      }
      if (!best) continue;
      const set = routeIdsByStation.get(best.id) || new Set();
      set.add(route.id);
      routeIdsByStation.set(best.id, set);
    }
  }

  return stations.map((s) => {
    const set = routeIdsByStation.get(s.id);
    if (!set) return s;
    return { ...s, routeIds: Array.from(set) };
  });
}

export async function findStationsV2({
  lat,
  lng,
  radiusKm = 5,
  limit = 15,
  overpassEndpoints = DEFAULT_OVERPASS_ENDPOINTS,
  timeoutMs = 120_000,
  enableStopAreas = true,
  enableBuildings = true,
  enableTrainRoutes = true,
} = {}) {
  if (Number.isNaN(Number(lat)) || Number.isNaN(Number(lng))) {
    throw new Error("Invalid coordinates");
  }

  const fetchImpl = await getFetch();
  const rawElements = await queryOverpassStops(fetchImpl, overpassEndpoints, lat, lng, radiusKm, timeoutMs);

  const rawStations = rawElements
    .map((el) => ({
      id: el.id?.toString() || "",
      name: el.tags?.name || el.tags?.ref || `stop_${el.id}`,
      latitude: el.lat,
      longitude: el.lon,
      type: detectType(el.tags || {}),
    }))
    .filter((s) => s.id && s.name && !/^stop_\d+$/.test(s.name));

  if (rawStations.length === 0) return [];

  let scored = rawStations.map((s) => {
    const distanceKm = haversineDistanceKm(lat, lng, s.latitude, s.longitude);
    const walkingTimeMin = ((distanceKm * 1000) / 1.2) / 60;
    const typeScore = getOptimalTypeScore(s.type, distanceKm);

    return {
      ...s,
      distance_km: distanceKm,
      walkingTime_min: walkingTimeMin,
      transportScore: getTransportTypeScore(s.type),
      typeScore,
      clusterRank: 999,
      contextScore: 0,
      hubScore: 0,
      feederPenalty: 0,
      stopAreaId: undefined,
      stopAreaName: undefined,
      routeIds: undefined,
      buildingDensityScore: 0,
      stopDensityScore: 0,
      finalScore: undefined,
      idosName: "",
      overallRank: undefined,
    };
  });

  if (enableStopAreas) {
    const stopAreas = await queryOverpassStopAreas(fetchImpl, overpassEndpoints, lat, lng, radiusKm, timeoutMs);
    scored = attachStopAreas(scored, stopAreas);
  }

  if (enableBuildings) {
    const buildingCenters = await queryOverpassBuildings(fetchImpl, overpassEndpoints, lat, lng, radiusKm, timeoutMs);
    scored = computeBuildingDensityScores(scored, buildingCenters);
  }

  if (enableTrainRoutes) {
    const routeData = await queryOverpassTrainRoutes(fetchImpl, overpassEndpoints, lat, lng, radiusKm, timeoutMs);
    scored = attachTrainRoutes(scored, routeData.routes, routeData.nodesById);
  }

  scored = smartDeduplicate(scored);
  scored = addContextScores(scored);
  const urbanFactor = estimateUrbanFactor(scored);

  const clusters = clusterStations(scored, 0.35);
  applyHubScoresAndClusterRanks(clusters, urbanFactor);

  let ranked = [];
  for (const cluster of clusters) ranked = ranked.concat(cluster.stations);

  ranked = ranked.map((s) => ({ ...s, finalScore: calculateFinalScore(s, urbanFactor) }));

  ranked.sort((a, b) => {
    const diff = (a.finalScore ?? 9e9) - (b.finalScore ?? 9e9);
    if (diff !== 0) return diff;
    if (a.distance_km !== b.distance_km) return a.distance_km - b.distance_km;
    return String(a.id).localeCompare(String(b.id));
  });

  ranked = pruneTrainRoutes(ranked);
  ranked = pruneTrainCorridors(ranked, lat, lng);

  const result = generateIdosNames(ranked)
    .map((s, idx) => ({ ...s, overallRank: idx + 1 }))
    .slice(0, limit);

  return result.map((s, idx) => ({
    osmId: String(s.id),
    name: s.name,
    idosName: s.idosName || s.name,
    lat: s.latitude,
    lng: s.longitude,
    type: s.type,
    transportModes: transportModesFromType(s.type),
    hubIndex: Math.round(((s.hubScore ?? s.transportScore) || 0) * 100) / 100,
    score: Math.round(((s.finalScore ?? 0) || 0) * 100) / 100,
    distanceKm: Math.round((s.distance_km || 0) * 1000) / 1000,
    rank: idx + 1,
  }));
}