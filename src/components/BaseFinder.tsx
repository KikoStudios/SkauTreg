"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useSidebar } from "../context/SidebarContext";
import { useFeedback } from "../context/FeedbackContext";
import styles from './BaseFinder.module.css';

// Dynamically import map to avoid SSR issues
const BaseFinderMap = dynamic(() => import('./BaseFinderMap'), {
    ssr: false,
    loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-500">Načítám mapu...</div>
});

type TabType = 'info' | 'doprava';

interface TripSegment {
    vehicleName: string;
    vehicleType: string;
    departureTime: string;
    arrivalTime: string;
    departureStation: string;
    arrivalStation: string;
}

interface Trip {
    departureTime: string;
    arrivalTime: string;
    duration: string;
    transferCount: number;
    price: string;
    segments: TripSegment[];
    shareLink?: string;
}

// Utility function to strip HTML tags
function stripHtmlTags(html: string | undefined): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '');
}

export default function BaseFinder() {
    const { showError, showSuccess } = useFeedback();
    const searchParams = useSearchParams();
    const baseIdParam = searchParams?.get('baseId');
    
    const [selectedBaseId, setSelectedBaseId] = useState<Id<"bases"> | null>(
        baseIdParam ? (baseIdParam as Id<"bases">) : null
    );
    const [activeTab, setActiveTab] = useState<TabType>('info');
    const [isConditionsExpanded, setIsConditionsExpanded] = useState(false);
    const [isEquipmentExpanded, setIsEquipmentExpanded] = useState(false);
    const { isSidebarCollapsed } = useSidebar();
    
    // Trip planning state
    const [selectedStation, setSelectedStation] = useState<string>('');
    const [destinationCity, setDestinationCity] = useState<string>('');
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isLoadingTrips, setIsLoadingTrips] = useState(false);
    const [tripError, setTripError] = useState<string>('');
    const [isStationPickerOpen, setIsStationPickerOpen] = useState(false);
    const [isPanelHidden, setIsPanelHidden] = useState(false);
    const [isPanelMinimized, setIsPanelMinimized] = useState(false); // New state for mobile bottom panel
    const [departureDate, setDepartureDate] = useState<string>('');
    const [departureTime, setDepartureTime] = useState<string>('');
    const [isArrivalTime, setIsArrivalTime] = useState<boolean>(false);
    const [displayedTripsCount, setDisplayedTripsCount] = useState<number>(5);
    
    // Photo gallery state
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    
    // Trip assignment state
    const [isTripAssignModalOpen, setIsTripAssignModalOpen] = useState(false);
    const [tripAssignMode, setTripAssignMode] = useState<"base" | "route">("base");
    const [routeToAssign, setRouteToAssign] = useState<any | null>(null);
    const [routeAssignDirection, setRouteAssignDirection] = useState<"outbound" | "return" | "unknown">("outbound");
    const [isRouteDirectionModalOpen, setIsRouteDirectionModalOpen] = useState(false);
    
    // Assigned trip state
    const [assignedTrip, setAssignedTrip] = useState<Trip | null>(null);
    const [selectedTripForAssignment, setSelectedTripForAssignment] = useState<Trip | null>(null);

    // Auto-show panel when base is selected
    useEffect(() => {
        if (selectedBaseId) {
            setIsPanelHidden(false);
        }
    }, [selectedBaseId]);

    // Fetch all bases from Convex
    const bases = useQuery(api.bases.getAllBases);
    
    // Fetch all user trips
    const userTrips = useQuery(api.trips.getAllUserTrips);
    
    // Mutations for trip assignment                                                                        
    const assignBase = useMutation(api.trips.assignBase);                                                   
    const unassignBase = useMutation(api.trips.unassignBase);                                               
    const addTransportRoute = useMutation(api.transportRoutes.addFromIdos);
    
    // Fetch selected base with stations
    const selectedBaseData = useQuery(
        api.bases.getBaseWithStations,
        selectedBaseId ? { baseId: selectedBaseId } : "skip"
    );

    useEffect(() => {
        setSelectedStation('');
        setDestinationCity('');
        setTrips([]);
        setTripError('');
        setDisplayedTripsCount(8);
        setIsLoadingTrips(false);
        setIsStationPickerOpen(false);
        setDepartureDate('');
        setDepartureTime('');
        setIsArrivalTime(false);
        setAssignedTrip(null);
        setSelectedTripForAssignment(null);
        setRouteToAssign(null);
        setTripAssignMode("base");
        setRouteAssignDirection("outbound");
        setIsTripAssignModalOpen(false);
        setIsRouteDirectionModalOpen(false);
    }, [selectedBaseId]);

    useEffect(() => {
        if (!selectedBaseData) return;
        if (!selectedStation && selectedBaseData.stations && selectedBaseData.stations.length > 0) {
            setSelectedStation(selectedBaseData.stations[0].name);
        }
    }, [selectedBaseData, selectedStation]);

    // Transform bases for map
    const mapBases = useMemo(() => {
        if (!bases) return [];
        return bases
            .filter(b => b.coordinates?.lat && b.coordinates?.lng)
            .map(b => ({
                id: b._id,
                name: b.name,
                lat: b.coordinates.lat,
                lng: b.coordinates.lng,
                type: b.typeKey,
            }));
    }, [bases]);

    const timelineColors = ['#18C6D8', '#5C6BF5', '#E5536A', '#F2C94C'];

    const getVehicleTypeClass = (vehicleType: string) => {
        const normalized = vehicleType.toLowerCase();
        if (normalized.includes('bus')) return styles.tripLegTypeBus;
        if (normalized.includes('metro')) return styles.tripLegTypeMetro;
        if (normalized.includes('tram')) return styles.tripLegTypeTram;
        if (normalized.includes('trolley')) return styles.tripLegTypeTrolley;
        return styles.tripLegTypeTrain;
    };

    const getVehicleTypeLabel = (vehicleType: string) => {
        const normalized = vehicleType.toLowerCase();
        if (normalized.includes("metro")) return "METRO";
        if (normalized.includes("tram")) return "TRAM";
        if (normalized.includes("trolley")) return "TROL";
        if (normalized.includes("bus")) return "BUS";
        return "VLAK";
    };

    const getIdosUrlForTrip = (trip: Trip): string => {
        const fallbackFrom = selectedStation.trim();
        const fallbackTo = destinationCity.trim();
        if (trip.shareLink) {
            try {
                return new URL(trip.shareLink, "https://idos.cz").toString();
            } catch {
                // ignore
            }
        }

        const params = new URLSearchParams({
            f: fallbackFrom,
            t: fallbackTo,
        });
        if (departureDate) params.append("date", departureDate);
        if (departureTime) params.append("time", departureTime);

        return `https://idos.cz/vlakyautobusymhdvse/spojeni/vysledky/?${params.toString()}`;
    };
    
    // Fetch trip connections with streaming
    const fetchTrips = async () => {
        const resolvedFrom = selectedStation.trim();
        const resolvedTo = destinationCity.trim();
        if (!resolvedFrom || !resolvedTo) {
            showError({
                title: "⚠️ Chyby ve formuláři",
                message: "Vyberte prosím stanici a cílové město.",
                icon: "warning",
            });
            return;
        }
        
        setIsLoadingTrips(true);
        setTripError('');
        setTrips([]);
        setDisplayedTripsCount(8);
        
        let receivedTrips = 0;

        try {
            const params = new URLSearchParams({
                from: resolvedFrom,
                to: resolvedTo,
                maxPages: '4'
            });
            
            if (departureDate) params.append('date', departureDate);
            if (departureTime) params.append('time', departureTime);
            if (isArrivalTime) params.append('arrival', 'true');
            
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 30000);
            let response: Response;
            try {
                response = await fetch(`/api/idos/connections?${params}`, {
                    signal: controller.signal,
                });
            } finally {
                window.clearTimeout(timeoutId);
            }
            
            if (!response.ok) {
                throw new Error('Chyba při načítání spojení. Zkuste znovu.');
            }
            
            // Read streaming response
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            
            if (!reader) {
                throw new Error('Stream not available');
            }

            const pushTripLine = (rawLine: string) => {
                const trip = JSON.parse(rawLine) as Trip & { error?: unknown; details?: unknown };
                if (trip.error) {
                    const details = typeof trip.details === 'string' ? trip.details.trim() : '';
                    throw new Error(details || 'IDOS nevratil pouzitelna spojeni.');
                }
                receivedTrips += 1;
                setTrips(prev => [...prev, trip]);
            };
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.trim()) {
                        pushTripLine(line);
                    }
                }
            }
            if (buffer.trim()) {
                pushTripLine(buffer);
            }

            if (receivedTrips === 0) {
                setTripError('IDOS nenasel zadne spoje nebo odpoved selhala. Zkuste jiny cas nebo stanici.');
            }
        } catch (error) {
            console.error('Error fetching trips:', error);
            const errorMessage = error instanceof Error ? error.message : 'Chyba při načítání spojení';
            setTripError(errorMessage);
            showError({
                title: "❌ Chyba",
                message: errorMessage,
                icon: "error",
                details: error instanceof Error ? error.message : undefined,
                canReport: true,
            });
        } finally {
            setIsLoadingTrips(false);
        }
    };

    return (
        <>
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 768px) {
                    html, body {
                        overscroll-behavior: none !important;
                        overflow: hidden !important;
                        position: fixed !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                }
            `}} />
            <div className={styles.container}>
                {/* Close Button */}
                {selectedBaseId && (
                    <button
                        className={`${styles.closeButton} ${isSidebarCollapsed ? styles.closeButtonCollapsed : ''}`}
                        onClick={() => setSelectedBaseId(null)}
                        title="Zavřít"
                    >
                        ✕
                    </button>
                )}
            {/* Left Map Area */}
            <div className={styles.mapArea}>
                <BaseFinderMap
                    bases={mapBases}
                    selectedBaseId={selectedBaseId}
                    onBaseSelect={setSelectedBaseId}
                    stations={selectedBaseData?.stations?.filter(s => s.lat !== undefined && s.lng !== undefined) as Array<{ _id: Id<"stations">; name: string; lat: number; lng: number; type?: string; distanceKm: number; }> || []}
                />
            </div>

            {/* Right Info Panel */}
            {!isPanelHidden && (
                <div className={`${styles.infoPanel} ${isPanelMinimized ? styles.infoPanelMinimized : ''}`}>
                    {/* Mobile Close Button */}
                    <button 
                        className={styles.mobileCloseButton}
                        onClick={() => {
                            setSelectedBaseId(null);
                            setIsPanelMinimized(false);
                        }}
                        title="Zavřít"
                    >
                        ✕
                    </button>
                    
                    {/* Mobile Drag Handle */}
                    <div 
                        className={styles.mobileDragHandle}
                        onClick={() => setIsPanelMinimized(!isPanelMinimized)}
                    >
                        <div className={styles.dragHandleBar}></div>
                    </div>
                    
                {selectedBaseData ? (
                    <>
                        {/* Tab Navigation */}
                        <div className={styles.tabNavWrapper}>
                            <div className={styles.tabNav}>
                            <button 
                                className={`${styles.tab} ${activeTab === 'info' ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab('info')}
                            >
                                INFO
                            </button>
                            <button 
                                className={`${styles.tab} ${activeTab === 'doprava' ? styles.tabActive : ''}`}
                                onClick={() => setActiveTab('doprava')}
                            >
                                DOPRAVA
                            </button>
                        </div>
                    </div>

                        {/* Info Tab Content */}
                        {activeTab === 'info' && (
                            <div className={styles.tabContent}>
                                {/* Title */}
                                <h2 className={styles.baseTitle}>{selectedBaseData.name}</h2>

                                {/* Key Info Badges Row 1 */}
                                <div className={styles.badgesSection}>
                                    <div className={styles.badge}>
                                        <img src="/ppl-icon.svg" alt="Capacity" className={styles.badgeIconImg} />
                                        <span className={styles.badgeNumber}>{selectedBaseData.capacity || 'N/A'}</span>
                                        <img src="/info-question-icon.svg" alt="Info" className={styles.badgeQuestionImg} />
                                    </div>
                                    <div className={styles.badge}>
                                        <img src="/houe-icon.svg" alt="Type" className={styles.badgeIconImg} />
                                        <span className={styles.badgeName}>ZAKLADNA</span>
                                        <img src="/info-question-icon.svg" alt="Info" className={styles.badgeQuestionImg} />
                                    </div>
                                </div>
                                {/* Row 2 - Conditions Header */}
                                <div className={styles.conditionsRow}>
                                     <div className={styles.conditionsHeader}>
                                        <img src="/info-icon.svg" alt="Info" className={styles.infoIconImg} />
                                        PODMÍNKY
                                    </div>
                                    <div>
                                        <span className={`${styles.conditionsText} ${!isConditionsExpanded ? styles.textTruncated : ''}`}>
                                            {stripHtmlTags(selectedBaseData.conditions?.specialNotes) || 'Žádné zvláštní podmínky'}
                                        </span>
                                        {selectedBaseData.conditions?.specialNotes && (
                                            <button 
                                                className={styles.expandButton}
                                                onClick={() => setIsConditionsExpanded(!isConditionsExpanded)}
                                            >
                                                {isConditionsExpanded ? 'Méně' : 'Více'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Equipment Section */}
                                <div className={styles.equipmentSection}>
                                    <div className={styles.equipmentHeader}>
                                        <img src="/equipment-icon.svg" alt="Equipment" className={styles.sectionIconImg} />
                                        Vybavení
                                    </div>
                                    <div>
                                        <p className={`${styles.description} ${!isEquipmentExpanded ? styles.textTruncated : ''}`}>
                                            {selectedBaseData.amenities?.equipment?.join(', ') || 'Žádné vybavení'}
                                        </p>
                                        {selectedBaseData.amenities?.equipment && selectedBaseData.amenities.equipment.length > 0 && (
                                            <button 
                                                className={styles.expandButton}
                                                onClick={() => setIsEquipmentExpanded(!isEquipmentExpanded)}
                                            >
                                                {isEquipmentExpanded ? 'Méně' : 'Více'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Price and Contact Split Section */}
                                <div className={styles.detailsSplit}>
                                    {/* Left: Price */}
                                    <div className={styles.priceColumn}>
                                        {selectedBaseData.pricing?.priceType && (
                                            <div className={styles.priceItem}>
                                                <span className={styles.priceLabel}>Cena</span>
                                                <span className={styles.priceValue}>
                                                    {selectedBaseData.pricing.priceType}
                                                </span>
                                            </div>
                                        )}
                                        {selectedBaseData.pricing?.minimalPrice && (
                                            <div className={styles.priceItem}>
                                                <span className={styles.priceLabel}>Minimální cena</span>
                                                <span className={styles.priceValue}>
                                                    {selectedBaseData.pricing.minimalPrice} Kč
                                                </span>
                                            </div>
                                        )}
                                        {!selectedBaseData.pricing?.priceType && !selectedBaseData.pricing?.minimalPrice && (
                                            <div className={styles.priceItem}>
                                                <span className={styles.priceLabel}>Cena</span>
                                                <span className={styles.priceValue}>N/A</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Divider */}
                                    <div className={styles.verticalDivider}></div>

                                    {/* Right: Contact */}
                                    <div className={styles.contactColumn}>
                                        {selectedBaseData.contacts && selectedBaseData.contacts.length > 0 && (
                                            <>
                                                <div className={styles.contactRow}>
                                                    <img src="/person-icon.svg" alt="Person" className={styles.contactIconImg} />
                                                    <span className={styles.contactText}>
                                                        {selectedBaseData.contacts[0].name || 'N/A'}
                                                        {selectedBaseData.contacts[0].role && ` (${selectedBaseData.contacts[0].role})`}
                                                    </span>
                                                </div>
                                                {selectedBaseData.contacts[0].email && (
                                                    <a href={`mailto:${selectedBaseData.contacts[0].email}`} className={styles.contactRow}>
                                                        <img src="/mail-icon.svg" alt="Email" className={styles.contactIconImg} />
                                                        <span className={styles.contactText}>{selectedBaseData.contacts[0].email}</span>
                                                    </a>
                                                )}
                                                {selectedBaseData.contacts[0].phone && (
                                                    <a href={`tel:${selectedBaseData.contacts[0].phone}`} className={styles.contactRow}>
                                                        <img src="/phone-icon.svg" alt="Phone" className={styles.contactIconImg} />
                                                        <span className={styles.contactText}>{selectedBaseData.contacts[0].phone}</span>
                                                    </a>
                                                )}
                                                {selectedBaseData.contacts[0].website && (
                                                    <a href={selectedBaseData.contacts[0].website} target="_blank" rel="noopener noreferrer" className={styles.contactRow}>
                                                        <img src="/Link-icon.svg" alt="Link" className={styles.contactIconImg} />
                                                        <span className={styles.contactText}>{selectedBaseData.contacts[0].website}</span>
                                                    </a>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Photo Gallery */}
                                <div className={styles.photoGallery}>
                                    {selectedBaseData.media?.photos && selectedBaseData.media.photos.slice(0, 2).map((photo, idx) => (
                                        <div 
                                            key={idx} 
                                            className={`${styles.photoItem} ${styles.photoGreen}`} 
                                            style={{ backgroundImage: `url(${photo.url})`, backgroundSize: 'cover', backgroundPosition: 'center', cursor: 'pointer' }}
                                            onClick={() => {
                                                setCurrentPhotoIndex(idx);
                                                setIsGalleryOpen(true);
                                            }}
                                        >
                                            <span className={styles.photoText}></span>
                                        </div>
                                    ))}
                                    {selectedBaseData.media?.photos && selectedBaseData.media.photos.length > 2 && (
                                        <div className={styles.photoItem}>
                                            <button 
                                                className={styles.viewGalleryButton}
                                                onClick={() => {
                                                    setCurrentPhotoIndex(0);
                                                    setIsGalleryOpen(true);
                                                }}
                                            >
                                                <div className={styles.galleryIconRow}>
                                                    <span className={styles.galleryIcon}>🖼️</span>
                                                    <span className={styles.galleryCount}>+{selectedBaseData.media.photos.length - 2}</span>
                                                </div>
                                                <span className={styles.galleryText}>Galerie</span>
                                            </button>
                                        </div>
                                    )}
                                    {selectedBaseData.media?.photoGalleryUrl && (
                                        <div className={styles.photoItem}>
                                            <a href={selectedBaseData.media.photoGalleryUrl} target="_blank" rel="noopener noreferrer" className={styles.addPhotoButton}>
                                                <div className={styles.otherRow}>
                                                    <img src="/diagonal-arrow-icon.svg" alt="Arrow" className={styles.arrowIconImg} />
                                                    <span>externí</span>
                                                </div>
                                                <div className={styles.plusRow}>
                                                    <img src="/plus-icon-base.svg" alt="Plus" className={styles.plusIconImg} />
                                                    <span className={styles.plusText}>galerie</span>
                                                </div>
                                            </a>
                                        </div>
                                    )}
                                </div>

                                {/* Footer Icons */}
                                <div className={styles.footerIcons}>
                                    <a 
                                        href={`https://zakladny.skaut.cz/${selectedBaseData.slug}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.databaseButton}
                                    >
                                        <img src="/skaut-logo.png" alt="Database" className={styles.dbIconImg} />
                                        DATABAZE
                                    </a>
                                    <div className={styles.mapButtons}>
                                        {selectedBaseData.coordinates && (
                                            <>
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${selectedBaseData.coordinates.lat},${selectedBaseData.coordinates.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.mapIconBtn}
                                                >
                                                    <img src="/google-maps-logo.png" alt="Google Maps" className={styles.mapPinIconImg} />
                                                </a>
                                                <a 
                                                    href={`https://mapy.cz/zakladni?x=${selectedBaseData.coordinates.lng}&y=${selectedBaseData.coordinates.lat}&z=15`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`${styles.mapIconBtn} ${styles.mapyCzBtn}`}
                                                >
                                                    <img src="/mapy-cz-logo.png" alt="Mapy.cz" className={styles.mapyCzIconImg} />
                                                </a>
                                            </>
                                        )}  
                                    </div>
                                </div>
                                
                                {/* Assign to Trip Button */}
                                <button
                                    className={styles.assignToTripButton}
                                    onClick={() => {
                                        setTripAssignMode("base");
                                        setIsTripAssignModalOpen(true);
                                    }}
                                >
                                    <span className={styles.assignTripPlus}>+</span>
                                    <span>Přiřadit k výpravě</span>
                                </button>
                                
                                {/* Trip Assignment Section */}
                                {assignedTrip && (
                                    <div className={styles.assignedTripSection}>
                                        <div className={styles.assignedTripHeader}>
                                            <span className={styles.assignedTripTitle}>🚆 Přiřazená cesta</span>
                                            <button 
                                                className={styles.removeTrip}
                                                onClick={() => setAssignedTrip(null)}
                                                title="Odebrat cestu"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className={styles.assignedTripInfo}>
                                            <div className={styles.assignedTripTime}>
                                                {assignedTrip.departureTime} → {assignedTrip.arrivalTime}
                                            </div>
                                            <div className={styles.assignedTripDetails}>
                                                <span>{assignedTrip.duration}</span>
                                                <span>•</span>
                                                <span>{assignedTrip.transferCount}x přestup</span>
                                                <span>•</span>
                                                <span>{assignedTrip.price}</span>
                                            </div>
                                            <div className={styles.assignedTripRoute}>
                                                {assignedTrip.segments.map((seg, idx) => (
                                                    <span key={idx}>
                                                        {seg.departureStation}
                                                        {idx < assignedTrip.segments.length - 1 && ' → '}
                                                    </span>
                                                ))}
                                                {assignedTrip.segments.length > 0 && ` → ${assignedTrip.segments[assignedTrip.segments.length - 1].arrivalStation}`}
                                            </div>
                                            {assignedTrip.shareLink && (
                                                <a 
                                                    href={assignedTrip.shareLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.viewOnIdos}
                                                >
                                                    Zobrazit na IDOS
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Doprava Tab Content */}
                        {activeTab === 'doprava' && (
                            <div className={styles.tabContent}>
                                <div className={styles.dopravSection}>
                                    {/* Trip Planner */}
                                    <div className={styles.tripPlanner}>
                                        <h3>Plánování cesty</h3>
                                        <div className={styles.tripForm}>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Ze stanice:</label>
                                                    <div className={styles.inputWithButton}>
                                                        <input 
                                                            type="text"
                                                            value={selectedStation}
                                                            onChange={(e) => setSelectedStation(e.target.value)}
                                                            placeholder="Vyberte stanici"
                                                            className={styles.input}
                                                        />
                                                        <button
                                                            type="button"
                                                            className={styles.stationPickerButton}
                                                            onClick={() => setIsStationPickerOpen(!isStationPickerOpen)}
                                                            title="Nejbližší stanice"
                                                        >
                                                            #
                                                        </button>
                                                        {isStationPickerOpen && (
                                                            <div className={styles.stationPickerPopup}>
                                                                <div className={styles.stationPickerHeader}>Nejbližší stanice</div>
                                                                {selectedBaseData.stations && selectedBaseData.stations.length > 0 ? (
                                                                    <div className={styles.stationPickerList}>
                                                                        {selectedBaseData.stations.slice(0, 10).map((station: any) => (
                                                                            <div 
                                                                                key={station._id} 
                                                                                className={`${styles.stationItem} ${selectedStation === station.name ? styles.stationItemSelected : ''}`}
                                                                                onClick={() => {
                                                                                    setSelectedStation(station.name);
                                                                                    setIsStationPickerOpen(false);
                                                                                }}
                                                                            >
                                                                                <div className={styles.stationRank}>#{station.rank}</div>
                                                                                <div className={styles.stationInfo}>
                                                                                    <div className={styles.stationName}>{station.name}</div>
                                                                                    <div className={styles.stationDetails}>
                                                                                        <span className={styles.stationType}>{station.type}</span>
                                                                                        <span className={styles.stationDistance}>{station.distanceKm.toFixed(1)} km</span>
                                                                                        {station.transportModes && station.transportModes.length > 0 && (
                                                                                            <span className={styles.stationModes}>
                                                                                                {station.transportModes.join(', ')}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                ) : (
                                                                    <div className={styles.stationPickerEmpty}>Žádné dopravní stanice v blízkosti</div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Do města:</label>
                                                    <input 
                                                        type="text"
                                                        value={destinationCity}
                                                        onChange={(e) => setDestinationCity(e.target.value)}
                                                        placeholder="např. Praha"
                                                        className={styles.input}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label>Datum:</label>
                                                    <input 
                                                        type="date"
                                                        value={departureDate}
                                                        onChange={(e) => setDepartureDate(e.target.value)}
                                                        className={styles.input}
                                                    />
                                                </div>
                                                <div className={styles.formGroup}>
                                                    <label>Čas:</label>
                                                    <input 
                                                        type="time"
                                                        value={departureTime}
                                                        onChange={(e) => setDepartureTime(e.target.value)}
                                                        className={styles.input}
                                                    />
                                                </div>
                                            </div>
                                            <div className={styles.timeTypeToggle}>
                                                <button
                                                    type="button"
                                                    className={`${styles.toggleButton} ${!isArrivalTime ? styles.toggleButtonActive : ''}`}
                                                    onClick={() => setIsArrivalTime(false)}
                                                >
                                                    Odjezd
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`${styles.toggleButton} ${isArrivalTime ? styles.toggleButtonActive : ''}`}
                                                    onClick={() => setIsArrivalTime(true)}
                                                >
                                                    Příjezd
                                                </button>
                                            </div>
                                            <button 
                                                onClick={fetchTrips}
                                                disabled={isLoadingTrips || !selectedStation || !destinationCity}
                                                className={styles.searchButton}
                                            >
                                                {isLoadingTrips ? 'Hledám...' : 'Hledat spojení'}
                                            </button>
                                        </div>
                                        
                                        {tripError && (
                                            <div className={styles.tripError}>{tripError}</div>
                                        )}
                                        
                                        {trips.length > 0 && (
                                            <div className={styles.tripResults}>
                                                {trips.slice(0, displayedTripsCount).map((trip, idx) => (
                                                    <div key={idx} className={styles.tripCard}>
                                                        <div className={styles.tripCardHeader}>
                                                            <span className={styles.tripCardTimes}>
                                                                {trip.departureTime} - {trip.arrivalTime}
                                                            </span>
                                                            <span className={styles.tripCardDuration}>{trip.duration}</span>
                                                        </div>
                                                        <div className={styles.tripTimeline}>
                                                            {trip.segments.map((seg, segIdx) => {
                                                                const isTopRow = segIdx % 2 === 0;
                                                                const color = timelineColors[segIdx % timelineColors.length];
                                                                return (
                                                                    <div
                                                                        key={segIdx}
                                                                        className={`${styles.timelineSegment} ${isTopRow ? styles.timelineRowTop : styles.timelineRowBottom}`}
                                                                    >
                                                                        <span className={`${styles.timelineTime} ${styles.timelineTimeStart} ${isTopRow ? styles.timelineTimeTop : styles.timelineTimeBottom}`}>
                                                                            {seg.departureTime}
                                                                        </span>
                                                                        <span className={`${styles.timelineDot} ${styles.timelineDotStart}`} style={{ backgroundColor: color }} />
                                                                        <span className={styles.timelineLine} style={{ backgroundColor: color }} />
                                                                        <span className={`${styles.timelineDot} ${styles.timelineDotEnd}`} style={{ backgroundColor: color }} />
                                                                        <span className={`${styles.timelineTime} ${styles.timelineTimeEnd} ${isTopRow ? styles.timelineTimeTop : styles.timelineTimeBottom}`}>
                                                                            {seg.arrivalTime}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className={styles.tripLegs}>
                                                            {trip.segments.map((seg, segIdx) => (
                                                                <div key={segIdx} className={styles.tripLeg}>
                                                                    <div 
                                                                        className={styles.tripLegIndex}
                                                                        style={{ backgroundColor: timelineColors[segIdx % timelineColors.length] }}
                                                                    >
                                                                        {segIdx + 1}
                                                                    </div>
                                                                    <div className={styles.tripLegContent}>
                                                                        <div className={styles.tripLegTop}>
                                                                            <span className={`${styles.tripLegType} ${getVehicleTypeClass(seg.vehicleType)}`}>
                                                                                {getVehicleTypeLabel(seg.vehicleType)}
                                                                            </span>
                                                                            <div className={styles.tripLegRoute}>
                                                                                {seg.departureStation} → {seg.arrivalStation}
                                                                            </div>
                                                                        </div>
                                                                        <div className={styles.tripLegBottom}>
                                                                            <span className={styles.tripLegTime}>
                                                                                {seg.departureTime} - {seg.arrivalTime}
                                                                            </span>
                                                                            <span className={styles.tripLegVehicle}>{seg.vehicleName}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <div className={styles.tripFooter}>
                                                            <a 
                                                                href={getIdosUrlForTrip(trip)}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className={styles.tripFooterIdos}
                                                            >
                                                                <img src="/map-elements/idos-logo.png" alt="IDOS" className={styles.tripFooterIcon} />
                                                                IDOS
                                                            </a>
                                                            <div className={styles.tripFooterPrice}>
                                                                <img src="/map-elements/money-symbol.png" alt="" className={styles.tripFooterIcon} />
                                                                {trip.price}
                                                            </div>
                                                            <div className={styles.tripFooterTransfers}>
                                                                <img src="/map-elements/transfers-icon.png" alt="" className={styles.tripFooterIcon} />
                                                                {trip.transferCount}x
                                                            </div>
                                                            <button 
                                                                className={styles.assignTripCardButton}
                                                                onClick={() => {
                                                                    setAssignedTrip(trip);
                                                                    setTripAssignMode("route");
                                                                    setRouteToAssign(trip);
                                                                    setIsRouteDirectionModalOpen(true);
                                                                }}
                                                                title="Použít toto spojení"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {trips.length > displayedTripsCount && (
                                                    <button
                                                        className={styles.loadMoreButton}
                                                        onClick={() => setDisplayedTripsCount(prev => prev + 8)}
                                                    >
                                                        Načíst další spojení
                                                    </button>
                                                )}  
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className={styles.emptyState}>
                        <p>Vyberte základnu na mapě pro zobrazení informací</p>
                    </div>
                )}
            </div>
            )}
            
            {/* Panel Hide Button - Fixed Position */}
            {!isPanelHidden && selectedBaseData && (
                <button 
                    className={styles.panelHideButton}
                    onClick={() => setIsPanelHidden(true)}
                    title="Skrýt panel"
                >
                    ▶
                </button>
            )}
            
            {/* Panel Show Button */}
            {isPanelHidden && selectedBaseId && (
                <button
                    className={styles.panelShowButton}
                    onClick={() => setIsPanelHidden(false)}
                    title="Zobrazit panel"
                >
                    ◀
                </button>
            )}
            
            {/* Trip Assignment Modal */}
            {isTripAssignModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsTripAssignModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>
                                {tripAssignMode === "base" ? "Přiřadit základnu k výpravě" : "Uložit trasu k výpravě"}
                            </h3>
                            <button 
                                className={styles.modalClose}
                                onClick={() => setIsTripAssignModalOpen(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            {!userTrips || userTrips.length === 0 ? (
                                <p className={styles.noTripsMessage}>Nemáte žádné naplánované výpravy</p>
                            ) : (
                                <div className={styles.tripsList}>
                                    {userTrips.map((trip: any) => (
                                        <div 
                                            key={trip._id}
                                            className={styles.tripModalItem}
                                            onClick={async () => {
                                                if (tripAssignMode === "base") {
                                                    if (selectedBaseId) {
                                                        await assignBase({ tripId: trip._id, baseId: selectedBaseId });
                                                        setIsTripAssignModalOpen(false);
                                                    }
                                                    return;
                                                }

                                                if (!routeToAssign) {
                                                    showError({
                                                        title: "⚠️ Chybí trasa",
                                                        message: "Nejdřív vyberte konkrétní spojení (tlačítko + u spoje).",
                                                        icon: "warning",
                                                    });
                                                    return;
                                                }
                                                if (!selectedStation || !destinationCity) {
                                                    showError({
                                                        title: "⚠️ Chybí údaje",
                                                        message: "Vyberte prosím stanici a cílové město.",
                                                        icon: "warning",
                                                    });
                                                    return;
                                                }

                                                await addTransportRoute({
                                                    tripId: trip._id,
                                                    direction: routeAssignDirection,
                                                    from: selectedStation,
                                                    to: destinationCity,
                                                    date: departureDate || undefined,
                                                    idosTrip: routeToAssign,
                                                });
                                                setIsTripAssignModalOpen(false);
                                                showSuccess({
                                                    title: "✅ Uloženo",
                                                    message: "Trasa byla přiřazena k výpravě.",
                                                    duration: 2000,
                                                });
                                            }}
                                        >
                                            <div className={styles.tripModalInfo}>
                                                <div className={styles.tripModalName}>{trip.name}</div>
                                                <div className={styles.tripModalDate}>
                                                    {new Date(trip.startDate).toLocaleDateString('cs-CZ')}
                                                    {trip.endDate && ` - ${new Date(trip.endDate).toLocaleDateString('cs-CZ')}`}
                                                </div>
                                                <div className={styles.tripModalTroop}>{trip.troopName}</div>
                                            </div>
                                            {trip.baseId === selectedBaseId && (
                                                <div className={styles.tripAssignedBadge}>✓ Přiřazeno</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Route Direction Modal */}
            {isRouteDirectionModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsRouteDirectionModalOpen(false)}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Vyberte směr cesty</h3>
                            <button 
                                className={styles.modalClose}
                                onClick={() => setIsRouteDirectionModalOpen(false)}
                            >
                                x
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.routeDirectionButtons}>
                                <button
                                    className={`${styles.routeDirectionButton} ${styles.routeDirectionPrimary}`}
                                    onClick={() => {
                                        setRouteAssignDirection("outbound");
                                        setIsRouteDirectionModalOpen(false);
                                        setIsTripAssignModalOpen(true);
                                    }}
                                >
                                    Cesta tam
                                </button>
                                <button
                                    className={`${styles.routeDirectionButton} ${styles.routeDirectionSecondary}`}
                                    onClick={() => {
                                        setRouteAssignDirection("return");
                                        setIsRouteDirectionModalOpen(false);
                                        setIsTripAssignModalOpen(true);
                                    }}
                                >
                                    Cesta zpět
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Photo Gallery Modal */}
            {isGalleryOpen && selectedBaseData?.media?.photos && (
                <div className={styles.galleryModal} onClick={() => setIsGalleryOpen(false)}>
                    <div className={styles.galleryContent} onClick={(e) => e.stopPropagation()}>
                        <button className={styles.galleryClose} onClick={() => setIsGalleryOpen(false)}>×</button>
                        
                        <div className={styles.galleryImageContainer}>
                            {currentPhotoIndex > 0 && (
                                <button 
                                    className={`${styles.galleryNav} ${styles.galleryNavPrev}`}
                                    onClick={() => setCurrentPhotoIndex(prev => prev - 1)}
                                >
                                    ‹
                                </button>
                            )}
                            
                            <img 
                                src={selectedBaseData.media.photos[currentPhotoIndex].url} 
                                alt={`Photo ${currentPhotoIndex + 1}`}
                                className={styles.galleryImage}
                            />
                            
                            {currentPhotoIndex < selectedBaseData.media.photos.length - 1 && (
                                <button 
                                    className={`${styles.galleryNav} ${styles.galleryNavNext}`}
                                    onClick={() => setCurrentPhotoIndex(prev => prev + 1)}
                                >
                                    ›
                                </button>
                            )}
                        </div>
                        
                        <div className={styles.galleryCounter}>
                            {currentPhotoIndex + 1} / {selectedBaseData.media.photos.length}
                        </div>
                        
                        <div className={styles.galleryThumbnails}>
                            {selectedBaseData.media.photos.map((photo, idx) => (
                                <div
                                    key={idx}
                                    className={`${styles.galleryThumbnail} ${idx === currentPhotoIndex ? styles.galleryThumbnailActive : ''}`}
                                    style={{ backgroundImage: `url(${photo.url})` }}
                                    onClick={() => setCurrentPhotoIndex(idx)}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}
            </div>
        </>
    );
}


