"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";
import type { Id } from "../../convex/_generated/dataModel";

// Get icon based on base type
function getBaseIcon(type?: string, isSelected?: boolean) {
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
    
    return new L.Icon({
        iconUrl: iconUrl,
        iconSize: [43, 43],
        iconAnchor: [21.5, 43],
        popupAnchor: [0, -43],
    });
}

// Get station icon based on type
function getStationIcon(type?: string) {
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
    
    return new L.Icon({
        iconUrl: iconUrl,
        iconSize: [43, 43],
        iconAnchor: [21.5, 43],
        popupAnchor: [0, -43],
    });
}

// Map controller to handle view changes
function MapController({ selectedLocation }: { selectedLocation: [number, number] | null }) {
    const map = useMap();
    useEffect(() => {
        if (selectedLocation) {
            map.flyTo(selectedLocation, 13, {
                duration: 1.5
            });
        }
    }, [selectedLocation, map]);
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
    const mapyApiKey = process.env.NEXT_PUBLIC_MAPY_API_KEY || "";
    const selectedBase = bases.find(b => b.id === selectedBaseId);
    const center: [number, number] = selectedBase
        ? [selectedBase.lat, selectedBase.lng]
        : [49.8175, 15.4730]; // Center of CR

    return (
        <MapContainer
            center={center}
            zoom={selectedBase ? 13 : 8}
            style={{ height: "100%", width: "100%", zIndex: 0 }}
            zoomControl={false}
        >
            <ZoomControl position="bottomright" />
            <TileLayer
                attribution='&copy; <a href="https://mapy.com/">Mapy.com</a> &copy; <a href="https://api.mapy.cz/copyright">Seznam.cz a.s. a další</a>'
                url={`https://api.mapy.com/v1/maptiles/basic/256/{z}/{x}/{y}?apikey=${mapyApiKey}&lang=cs`}
            />

            <MapController selectedLocation={selectedBase ? [selectedBase.lat, selectedBase.lng] : null} />

            {/* Base Markers */}
            {bases.map((base) => {
                const isSelected = base.id === selectedBaseId;
                const opacity = isSelected ? 1 : (selectedBaseId ? 0.3 : 1);
                
                return (
                    <Marker
                        key={base.id}
                        position={[base.lat, base.lng]}
                        icon={getBaseIcon(base.type, isSelected)}
                        eventHandlers={{
                            click: () => onBaseSelect(base.id),
                        }}
                        opacity={opacity}
                    >
                        <Popup>
                            <div className="text-sm font-semibold">{base.name}</div>
                        </Popup>
                    </Marker>
                );
            })}

            {/* Station Markers - only show when base is selected */}
            {selectedBaseId && stations.map((station) => (
                <Marker
                    key={station._id}
                    position={[station.lat, station.lng]}
                    icon={getStationIcon(station.type)}
                >
                    <Popup>
                        <div>
                            <div className="text-sm font-semibold">{station.name}</div>
                            <div className="text-xs text-gray-600">{station.type}</div>
                            <div className="text-xs text-gray-600">{station.distanceKm.toFixed(1)} km</div>
                        </div>
                    </Popup>
                </Marker>
            ))}
        </MapContainer>
    );
}
