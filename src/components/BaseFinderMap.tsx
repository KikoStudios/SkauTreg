"use client";

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// Calculate icon size based on zoom level
function getIconSizeForZoom(zoom: number, baseSize: number = 43): number {
    // Scale icons based on zoom level
    // At zoom 8 (country view): smaller icons
    // At zoom 13+ (city view): normal size icons
    const minZoom = 6;
    const maxZoom = 16;
    const minSize = baseSize * 0.4; // 40% of base size at min zoom
    const maxSize = baseSize * 1.2; // 120% of base size at max zoom
    
    const normalizedZoom = Math.max(minZoom, Math.min(zoom, maxZoom));
    const scale = (normalizedZoom - minZoom) / (maxZoom - minZoom);
    
    return minSize + (maxSize - minSize) * scale;
}

const baseIconCache = new Map<string, L.Icon>();
const stationIconCache = new Map<string, L.Icon>();

const DEFAULT_CENTER: [number, number] = [49.8175, 15.4730]; // Center of CR

// Get icon based on base type and zoom level
function getBaseIcon(type?: string, isSelected?: boolean, zoom: number = 13) {
    let iconUrl = "/map-elements/zakladna-zakladna-map-icon.svg";
    
    if (isSelected) {
        iconUrl = "/map-elements/zakladna-map-icon.svg";
    } else {
        switch(type?.toLowerCase()) {
            case "klubovna":
                iconUrl = "/map-elements/klubovna-zakladna-map-icon.svg";
                break;
            case "ubytování":
                iconUrl = "/map-elements/ubytovaní-zakladna-map-icon.svg";
                break;
            case "tábořiště":
                iconUrl = "/map-elements/tabořiště-zakladna-map-icon.svg";
                break;
            default:
                iconUrl = "/map-elements/zakladna-zakladna-map-icon.svg";
        }
    }
    
    const baseSize = isSelected ? 46 : 36;
    const size = getIconSizeForZoom(zoom, baseSize);
    const cacheKey = `base|${iconUrl}|${size}`;
    const cached = baseIconCache.get(cacheKey);
    if (cached) return cached;

    const created = new L.Icon({
        iconUrl,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // Center the icon on the coordinates
        popupAnchor: [0, -size / 2], // Popup appears above the center
    });
    baseIconCache.set(cacheKey, created);
    return created;
}

// Get station icon based on type and zoom level
function getStationIcon(type?: string, zoom: number = 13) {
    let iconUrl = "/map-elements/other-vehucles-map-icon.png";
    
    if (type) {
        const typeLower = type.toLowerCase();
        if (typeLower.includes("train") || typeLower.includes("railway")) {
            iconUrl = "/map-elements/train-map-icon.png";
        } else if (typeLower.includes("bus")) {
            iconUrl = "/map-elements/bus-map-icon.png";
        } else if (typeLower.includes("tram")) {
            iconUrl = "/map-elements/tram-map-icon.png";
        } else if (typeLower.includes("metro") || typeLower.includes("subway")) {
            iconUrl = "/map-elements/metro-map-icon.png";
        } else if (typeLower.includes("ferry") || typeLower.includes("boat")) {
            iconUrl = "/map-elements/boat-map-icon.png";
        }
    }
    
    const size = getIconSizeForZoom(zoom, 28); // Visibly smaller than bases
    const cacheKey = `station|${iconUrl}|${size}`;
    const cached = stationIconCache.get(cacheKey);
    if (cached) return cached;

    const created = new L.Icon({
        iconUrl,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2], // Center the icon on the coordinates
        popupAnchor: [0, -size / 2], // Popup appears above the center
    });
    stationIconCache.set(cacheKey, created);
    return created;
}

// Map controller to handle view changes and zoom tracking
function MapController({ 
    selectedBaseId,
    selectedLocation, 
    onZoomChange 
}: { 
    selectedBaseId: Id<"bases"> | null;
    selectedLocation: [number, number] | null;
    onZoomChange: (zoom: number) => void;
}) {
    const map = useMap();
    const lastFlownToBaseIdRef = useRef<Id<"bases"> | null>(null);
    
    useEffect(() => {
        if (selectedBaseId && selectedLocation && lastFlownToBaseIdRef.current !== selectedBaseId) {
            lastFlownToBaseIdRef.current = selectedBaseId;
            map.flyTo(selectedLocation, 13, {
                duration: 1.5
            });
        }
    }, [selectedBaseId, selectedLocation, map]);
    
    useEffect(() => {
        const handleZoom = () => {
            onZoomChange(map.getZoom());
        };
        
        // Set initial zoom
        onZoomChange(map.getZoom());
        
        // Listen to zoom changes
        map.on('zoomend', handleZoom);
        
        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map, onZoomChange]);
    
    return null;
}

interface Base {
    id: Id<"bases">;
    name: string;
    lat: number;
    lng: number;
}

interface Station {
    _id: Id<"stations">;
    name: string;
    lat: number;
    lng: number;
    type?: string;
    distanceKm: number;
}

interface BaseFinderMapProps {
    bases: Array<Base & { type?: string }>;
    selectedBaseId: Id<"bases"> | null;
    onBaseSelect: (id: Id<"bases">) => void;
    stations?: Station[];
}

export default function BaseFinderMap({ bases, selectedBaseId, onBaseSelect, stations = [] }: BaseFinderMapProps) {
    const [currentZoom, setCurrentZoom] = useState(13);
    const mapyApiKey = process.env.NEXT_PUBLIC_MAPY_API_KEY || "";
    const selectedBase = bases.find(b => b.id === selectedBaseId);

    const selectedLocation: [number, number] | null = selectedBase
        ? [selectedBase.lat, selectedBase.lng]
        : null;

    const center: [number, number] = selectedLocation ?? DEFAULT_CENTER;

    return (
        <MapContainer
            center={center}
            zoom={selectedBase ? 13 : 8}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            zoomControl={false}
            preferCanvas={true}
        >
            <ZoomControl position="bottomright" />
            <TileLayer
                attribution='&copy; <a href="https://mapy.com/">Mapy.com</a> &copy; <a href="https://api.mapy.cz/copyright">Seznam.cz a.s. a další</a>'
                url={`https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${mapyApiKey}&lang=cs`}
            />

            <MapController 
                selectedBaseId={selectedBaseId}
                selectedLocation={selectedLocation}
                onZoomChange={setCurrentZoom}
            />

            {/* Base Markers */}
            {bases.map((base) => {
                const isSelected = base.id === selectedBaseId;
                const opacity = isSelected ? 1 : (selectedBaseId ? 0.3 : 1);
                
                return (
                    <React.Fragment key={base.id}>
                        {/* Circle around base - scales with zoom */}
                        <Circle
                            center={[base.lat, base.lng]}
                            radius={isSelected ? 5000 : 2000} // radius in meters (5km for selected, 2km for others)
                            pathOptions={{
                                color: isSelected ? '#5aa31b' : '#ffd31a',
                                fillColor: isSelected ? '#5aa31b' : '#ffd31a',
                                fillOpacity: 0.1,
                                weight: 2,
                                opacity: opacity * 0.5
                            }}
                        />
                        <Marker
                            position={[base.lat, base.lng]}
                            icon={getBaseIcon(base.type, isSelected, currentZoom)}
                            eventHandlers={{
                                click: () => onBaseSelect(base.id),
                            }}
                            opacity={opacity}
                        >
                            <Popup>
                                <div className="text-sm font-semibold">{base.name}</div>
                            </Popup>
                        </Marker>
                    </React.Fragment>
                );
            })}

            {/* Station Markers - only show when base is selected */}
            {selectedBaseId && stations.map((station) => (
                <React.Fragment key={station._id}>
                    <Marker
                        position={[station.lat, station.lng]}
                        icon={getStationIcon(station.type, currentZoom)}
                    >
                        <Popup>
                            <div>
                                <div className="text-sm font-semibold">{station.name}</div>
                                <div className="text-xs text-gray-600">{station.type}</div>
                                <div className="text-xs text-gray-600">{station.distanceKm.toFixed(1)} km</div>
                            </div>
                        </Popup>
                    </Marker>
                </React.Fragment>
            ))}
        </MapContainer>
    );
}

