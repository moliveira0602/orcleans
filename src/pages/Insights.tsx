import { useState, useMemo, useEffect, useRef } from 'react';
import { 
    Radar, Search, MapPin, Activity, Phone, Mail, 
    Share2, Star, Check, Trash2, FolderPlus, 
    ChevronRight, Info, AlertTriangle, Crosshair,
    RotateCw, RefreshCw, Users, Target
} from 'lucide-react';
import { useAppState, useAppDispatch } from '../store';
import { getLeadName, getLeadCategory, detectAddressCol, getLeadAddress, detectPostalCol, getLeadPostal, detectLatCol, detectLngCol, getRawCoord } from '../utils/detect';
import { scoreClass } from '../utils/scoring';
import { geocodeAddress } from '../utils/geocoding';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { runScan, getScanStatus, clearScanCache } from '../utils/scanService';
import { useToast } from '../components/Toast';
import { createLeadsBulk } from '../services/leads';
import 'leaflet/dist/leaflet.css';

/**
 * Component to auto-resize and center map when leads change
 */
function MapResizer({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [map, center, zoom]);
    return null;
}

function MapFlyTo({ center, zoom }: { center: [number, number] | null; zoom: number }) {
    const map = useMap();
    const prevCenterRef = useRef<[number, number] | null>(null);
    
    useEffect(() => {
        if (center) {
            // Skip if center hasn't changed
            if (prevCenterRef.current && 
                prevCenterRef.current[0] === center[0] && 
                prevCenterRef.current[1] === center[1]) {
                return;
            }
            prevCenterRef.current = center;
            
            // Use smoother flyTo with better easing
            map.flyTo(center, zoom, {
                duration: 1.2,        // Faster but smoother
                easeLinearity: 0.3,   // Better easing curve
            });
        }
    }, [map, center, zoom]);
    return null;
}

// Helper to get lead coords for fly-to
function getLeadCoords(lead: any): [number, number] | null {
    if (typeof lead._lat === 'number' && typeof lead._lng === 'number') {
        return [lead._lat, lead._lng];
    }
    return null;
}

// MapWithFlashlight component - adds flashlight/sonar scan effect on mouse movement
function MapWithFlashlight({ children }: { children: React.ReactNode }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState({ x: '50%', y: '50%' });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setMousePos({ x: `${x}px`, y: `${y}px` });
        }
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            style={{
                position: 'relative',
                overflow: 'hidden',
                background: '#0a0b10',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                height: '100%',
                width: '100%',
            }}
        >
            {children}
            {/* Flashlight/Sonar overlay - stronger effect */}
            <div
                style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 500,
                    pointerEvents: 'none',
                    background: `radial-gradient(
                        circle 250px at ${mousePos.x} ${mousePos.y},
                        rgba(255, 255, 255, 0.25) 0%,
                        rgba(255, 255, 255, 0.12) 30%,
                        rgba(255, 255, 255, 0.04) 60%,
                        transparent 100%
                    )`,
                    transition: 'background 0.15s ease',
                }}
            />
        </div>
    );
}

interface InsightsProps {
    onOpenDetail?: (id: string) => void;
    highlightedLeadId?: string | null;
}

export default function Insights({ onOpenDetail, highlightedLeadId }: InsightsProps) {
    const { leads, settings } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationPin, setLocationPin] = useState<[number, number] | null>(null);
    const [mapZoom] = useState(13);
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);
    const [flyToZoom, setFlyToZoom] = useState<number>(18);

    // Get user's location on mount
    useEffect(() => {
        if (!navigator.geolocation) {
            console.log('[ORCA Map] Geolocation not supported');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
                setUserLocation(coords);
                console.log('[ORCA Map] User location:', coords);
            },
            (error) => {
                console.log('[ORCA Map] Geolocation error:', error.message);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutes cache
            }
        );
    }, []);

    // GeoScout Scan State
    const [scanLoading, setScanLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState('');
    const [customApiKey, setCustomApiKey] = useState('');
    const [scanSource, setScanSource] = useState<'demo' | 'google'>(() => {
        const saved = localStorage.getItem('orca_scan_source');
        return (saved as 'demo' | 'google') || 'google';
    });
    
    // Enhanced Scan Form State
    const [scanConfig, setScanConfig] = useState({
        // Location
        location: '',
        useCurrentLocation: false,
        radius: 5,
        
        // Business Type
        categories: [] as string[],
        customSegment: '',
        
        // Advanced Filters
        minRating: 0,
        minReviews: 0,
        requireWebsite: false,
        requirePhone: false,
        openNow: false,
        
        // Data Fields to Extract
        extractName: true,
        extractPhone: true,
        extractWebsite: true,
        extractEmail: true,
        extractAddress: true,
        extractSocial: true,
        
        // Scan Name
        scanName: '',
    });
    
    // Form label styles
    const formLabelStyle: React.CSSProperties = {
        fontSize: 10,
        fontWeight: 700,
        color: 'var(--t3)',
        textTransform: 'uppercase',
        letterSpacing: '.08em',
        marginBottom: 8,
        display: 'block',
    };

    const subLabelStyle: React.CSSProperties = {
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--t3)',
        textTransform: 'uppercase',
        letterSpacing: '.05em',
        marginBottom: 6,
        display: 'block',
    };

    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                const res = await fetch(`${import.meta.env.VITE_API_URL}/sonar/suggestions`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('orca_token')}` }
                });
                const data = await res.json();
                setSuggestions(data);
            } catch (err) {
                console.error('Failed to fetch suggestions:', err);
            } finally {
                setLoadingSuggestions(false);
            }
        };
        fetchSuggestions();
    }, []);

    const checkboxLabelStyle: React.CSSProperties = {
        fontSize: 11,
        color: 'var(--t2)',
        cursor: 'pointer',
        userSelect: 'none',
    };

    // Category options mapped to OSM categories
    const categoryOptions = [
        { id: 'clinica', label: 'Clínicas Médicas', icon: <FolderPlus size={16} />, segment: 'clínica médica' },
        { id: 'restaurante', label: 'Restaurantes', icon: <FolderPlus size={16} />, segment: 'restaurante' },
        { id: 'petshop', label: 'Pet Shops', icon: <FolderPlus size={16} />, segment: 'pet shop' },
        { id: 'academia', label: 'Academias', icon: <FolderPlus size={16} />, segment: 'academia' },
        { id: 'loja', label: 'Lojas', icon: <FolderPlus size={16} />, segment: 'shop' },
        { id: 'cafe', label: 'Cafés', icon: <FolderPlus size={16} />, segment: 'café' },
        { id: 'hotel', label: 'Hotéis', icon: <FolderPlus size={16} />, segment: 'hotel' },
        { id: 'farmacia', label: 'Farmácias', icon: <FolderPlus size={16} />, segment: 'farmácia' },
        { id: 'supermercado', label: 'Supermercados', icon: <FolderPlus size={16} />, segment: 'supermercado' },
        { id: 'escola', label: 'Escolas', icon: <FolderPlus size={16} />, segment: 'escola' },
        { id: 'salao', label: 'Salões de Beleza', icon: <FolderPlus size={16} />, segment: 'salão de beleza' },
        { id: 'oficina', label: 'Oficinas', icon: <FolderPlus size={16} />, segment: 'oficina' },
    ];

    const addressCol = useMemo(() => detectAddressCol(leads), [leads]);
    const postalCol = useMemo(() => detectPostalCol(leads), [leads]);
    const latCol = useMemo(() => detectLatCol(leads), [leads]);
    const lngCol = useMemo(() => detectLngCol(leads), [leads]);

    const isGeocodingRef = useRef(false);

    // Background Geocoding Hook: Process leads needing coordinates one by one
    useEffect(() => {
        if (isGeocodingRef.current) return;

        const needsGeocoding = leads.find(l => {
            const rawLat = getRawCoord(l, latCol);
            const rawLng = getRawCoord(l, lngCol);
            const hasRawCoords = rawLat !== undefined && rawLng !== undefined;
            const address = getLeadAddress(l, addressCol);
            const postal = getLeadPostal(l, postalCol);
            const hasQuery = address !== '' || postal !== '';
            const missingCoords = typeof l._lat !== 'number' || typeof l._lng !== 'number';
            return missingCoords && !hasRawCoords && hasQuery && l._geocodeStatus !== 'pending' && l._geocodeStatus !== 'failed';
        });

        if (needsGeocoding) {
            const address = getLeadAddress(needsGeocoding, addressCol);
            const postal = getLeadPostal(needsGeocoding, postalCol);
            const query = [address, postal].filter(Boolean).join(', ');
            isGeocodingRef.current = true;
            dispatch({
                type: 'UPDATE_LEAD',
                payload: { id: needsGeocoding.id, fields: { _geocodeStatus: 'pending' } }
            });

            // Wait 1.1s between requests to respect Nominatim policy
            const timer = setTimeout(async () => {
                const coords = await geocodeAddress(query);
                if (coords) {
                    dispatch({
                        type: 'UPDATE_LEAD',
                        payload: { id: needsGeocoding.id, fields: { _lat: coords.lat, _lng: coords.lng, _geocodeStatus: 'ok' } }
                    });
                } else {
                    dispatch({
                        type: 'UPDATE_LEAD',
                        payload: { id: needsGeocoding.id, fields: { _geocodeStatus: 'failed' } }
                    });
                }
                isGeocodingRef.current = false;
            }, 1100);

            return () => clearTimeout(timer);
        }
    }, [leads, addressCol, postalCol, latCol, lngCol, dispatch]);

    // Extract coordinates from various URL formats
    const extractCoordsFromUrl = (url: string): [number, number] | null => {
        if (!url) return null;
        
        // Pattern 1: OpenStreetMap format - mlat and mlon query parameters
        // https://www.openstreetmap.org/?mlat=38.7057382&mlon=-9.1483484#map=17/38.7057382/-9.1483484
        const osmMatch = url.match(/[?&]mlat=(-?\d+\.\d+).*?[?&]mlon=(-?\d+\.\d+)/);
        if (osmMatch) {
            const lat = parseFloat(osmMatch[1]);
            const lng = parseFloat(osmMatch[2]);
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return [lat, lng];
            }
        }
        
        // Pattern 2: Google Maps @lat,lng (most common in Google Maps share URLs)
        const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
            const lat = parseFloat(atMatch[1]);
            const lng = parseFloat(atMatch[2]);
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return [lat, lng];
            }
        }
        
        // Pattern 3: Google Maps /@lat,lng,zoom
        const slashAtMatch = url.match(/\/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (slashAtMatch) {
            const lat = parseFloat(slashAtMatch[1]);
            const lng = parseFloat(slashAtMatch[2]);
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return [lat, lng];
            }
        }
        
        // Pattern 4: Hash fragment with coordinates (common in many map services)
        // #map=zoom/lat/lng
        const hashMatch = url.match(/#map=\d+\/(-?\d+\.\d+)\/(-?\d+\.\d+)/);
        if (hashMatch) {
            const lat = parseFloat(hashMatch[1]);
            const lng = parseFloat(hashMatch[2]);
            if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                return [lat, lng];
            }
        }
        
        return null;
    };

    const mappableLeads = useMemo(() => {
        const results = leads.map((l) => {
            // Priority 1: Already has _lat/_lng
            if (typeof l._lat === 'number' && typeof l._lng === 'number' && Number.isFinite(l._lat) && Number.isFinite(l._lng)) return l;
            
            // Priority 2: Has raw lat/lng columns
            const rawLat = getRawCoord(l, latCol);
            const rawLng = getRawCoord(l, lngCol);
            if (
                rawLat !== undefined &&
                rawLng !== undefined &&
                Number.isFinite(rawLat) &&
                Number.isFinite(rawLng) &&
                Math.abs(rawLat) <= 90 &&
                Math.abs(rawLng) <= 180
            ) {
                return { ...l, _lat: rawLat, _lng: rawLng };
            }
            
            // Priority 3: Extract from linkOrigem URL
            if (l.linkOrigem) {
                const coords = extractCoordsFromUrl(String(l.linkOrigem));
                if (coords) {
                    console.log('[ORCA Map] Extracted coords from URL:', l.linkOrigem, '->', coords);
                    return { ...l, _lat: coords[0], _lng: coords[1] };
                } else {
                    console.log('[ORCA Map] No coords in URL:', l.linkOrigem);
                }
            }
            
            // Also check _raw for coordinates (from scan results)
            if (l._raw) {
                const raw = l._raw as any;
                // Check for lat/lng in _raw
                if (typeof raw.lat === 'number' && typeof raw.lng === 'number') {
                    return { ...l, _lat: raw.lat, _lng: raw.lng };
                }
                if (typeof raw.latitude === 'number' && typeof raw.longitude === 'number') {
                    return { ...l, _lat: raw.latitude, _lng: raw.longitude };
                }
            }
            
            return null;
        }).filter(Boolean) as any[];
        
        console.log('[ORCA Map] Total leads:', leads.length, 'Mappable:', results.length);
        return results;
    }, [leads, latCol, lngCol]);

    const activeCenter = useMemo(() => {
        if (locationPin) return locationPin;
        if (userLocation) return userLocation;
        if (mappableLeads.length > 0) {
            const avgLat = mappableLeads.reduce((acc, l) => acc + (l as any)._lat, 0) / mappableLeads.length;
            const avgLng = mappableLeads.reduce((acc, l) => acc + (l as any)._lng, 0) / mappableLeads.length;
            return [avgLat, avgLng] as [number, number];
        }
        return [38.7223, -9.1393] as [number, number];
    }, [mappableLeads, locationPin, userLocation]);

    const filteredLeads = useMemo(() => {
        return mappableLeads.filter(l => {
            // Category filter
            const matchesCat = scanConfig.categories.length === 0 || 
                scanConfig.categories.some(c => {
                    const cat = categoryOptions.find(o => o.id === c);
                    return getLeadCategory(l, 'segmento') === (cat?.segment || c);
                });

            // Radius filter
            const dLat = (l as any)._lat - activeCenter[0];
            const dLng = (l as any)._lng - activeCenter[1];
            const dKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
            (l as any)._distance = dKm;
            const inRadius = dKm <= scanConfig.radius;

            return matchesCat && inRadius;
        });
    }, [mappableLeads, scanConfig.categories, scanConfig.radius, activeCenter]);

    const leadsWithQueryButNoCoords = useMemo(() => {
        return leads.filter(l => {
            const rawLat = getRawCoord(l, latCol);
            const rawLng = getRawCoord(l, lngCol);
            const hasRawCoords = rawLat !== undefined && rawLng !== undefined;
            const hasCoords = typeof l._lat === 'number' && typeof l._lng === 'number';
            if (hasCoords || hasRawCoords) return false;
            const address = getLeadAddress(l, addressCol);
            const postal = getLeadPostal(l, postalCol);
            return address !== '' || postal !== '';
        });
    }, [leads, addressCol, postalCol, latCol, lngCol]);

    const geocodingPendingCount = useMemo(() => {
        return leads.filter(l => l._geocodeStatus === 'pending').length;
    }, [leads]);

    // GeoScout Scan Handlers

    const handleScan = async () => {
        setScanLoading(true);
        setScanProgress('');

        // Determine effective API key
        const getApiKey = () => {
            if (scanSource === 'demo') return 'demo';
            return 'google'; // Backend handles the actual key
        };
        
        const effectiveApiKey = getApiKey();
        
        // Validar se tem key do Google quando selecionou google
        if (scanSource === 'google' && !effectiveApiKey) {
            toast('Configure uma Google API Key ou use o modo Demo.', 'error');
            setScanLoading(false);
            return;
        }

        // Use actual form values instead of presets
        const location = scanConfig.location || (scanConfig.useCurrentLocation && userLocation)
            ? (scanConfig.useCurrentLocation && userLocation 
                ? `${userLocation[0]},${userLocation[1]}` 
                : scanConfig.location)
            : 'Portugal';
        
        console.log('[GeoScout] scanSource:', scanSource, 'effectiveApiKey:', effectiveApiKey ? 'SET' : 'EMPTY');
        
        // Build segment from selected categories or use custom segment
        const segments = scanConfig.categories.length > 0
            ? scanConfig.categories.map(c => {
                const cat = categoryOptions.find(o => o.id === c);
                return cat?.segment || c;
            })
            : ['shop', 'amenity']; // Default to general business categories
        
        console.log('[GeoScout] Segments to search:', segments);
        
        // Build scan name
        const scanName = scanConfig.scanName || `Scan: ${segments.join(', ')} em ${location}`;
        
        try {
            // Run scan for each selected category
            const allLeads: any[] = [];
            let totalFound = 0;
            
            for (const segment of segments) {
                setScanProgress(`Buscando: ${segment} em ${location}...`);
                console.log('[GeoScout] Running scan for:', segment, 'in', location);
                
                const result = await runScan(
                    {
                        segment,
                        city: location,
                        apiKey: effectiveApiKey,
                    },
                    leads,
                    (msg) => {
                        console.log('[GeoScout] Progress:', msg);
                        setScanProgress(msg);
                    }
                );
                
                console.log('[GeoScout] Result:', result.success, result.leads.length, 'leads');
                
                if (result.success && result.leads.length > 0) {
                    allLeads.push(...result.leads);
                    totalFound += result.totalFound;
                }
            }
            
            const result = {
                success: allLeads.length > 0,
                totalFound,
                imported: allLeads.length,
                duplicates: 0,
                errors: 0,
                leads: allLeads,
                cached: false,
                message: `Scan concluído: ${allLeads.length} leads encontrados.`,
            };

            if (result.success && result.leads.length > 0) {
                // Geocode leads that have address but no coordinates
                const leadsWithCoords = result.leads.map(lead => {
                    // Try to extract coordinates from linkOrigem if available
                    const latLngMatch = lead.linkOrigem?.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                    if (latLngMatch) {
                        return {
                            ...lead,
                            _lat: parseFloat(latLngMatch[1]),
                            _lng: parseFloat(latLngMatch[2]),
                            _geocodeStatus: 'ok' as const,
                        };
                    }
                    // Set pending for geocoding
                    return {
                        ...lead,
                        _geocodeStatus: 'pending' as const,
                    };
                });

                dispatch({
                    type: 'IMPORT_LEADS',
                    payload: {
                        leads: leadsWithCoords,
                        record: {
                            id: result.leads[0]._importId || 'scan_' + Date.now(),
                            name: scanName,
                            file: 'Sonar',
                            rows: result.totalFound,
                            cols: 0,
                            date: new Date().toISOString(),
                            count: result.imported,
                        },
                    },
                });

                // Sync to backend
                try {
                    await createLeadsBulk(leadsWithCoords);
                } catch (err) {
                    console.error('[Insights] Failed to sync leads to backend:', err);
                }

                dispatch({
                    type: 'ADD_ACTIVITY',
                    payload: {
                        title: `Scan Sonar: ${scanName}`,
                        sub: `${result.imported} novos leads`,
                        icon: 'radar',
                        time: new Date().toISOString(),
                    },
                });

                localStorage.setItem('orca_scan_demo', String(scanSource === 'demo'));

                toast(`${result.imported} leads importados do scan!`, 'success');
            } else if (result.success) {
                toast('Nenhum lead novo encontrado.', 'info');
            } else {
                toast('Erro no scan: ' + result.message, 'error');
            }
        } catch (err) {
            toast('Erro no scan: ' + (err as Error).message, 'error');
        } finally {
            setScanLoading(false);
        }
    };


    const getMarkerColor = (score: number) => {
        if (score >= settings.hotThreshold) return '#FFFFFF';  // High Contrast White
        if (score >= settings.warmThreshold) return '#A0A0A0'; // Medium Gray
        return '#404040'; // Dark Graphite
    };


    const getMarkerColorClass = (score: number) => {
        if (score >= settings.hotThreshold) return 'green';
        if (score >= settings.warmThreshold) return 'amber';
        return 'gray';
    };

    const handleLocationBlur = async () => {
        const raw = scanConfig.location.trim();
        if (!raw) return;
        
        try {
            const coords = await geocodeAddress(raw);
            if (coords) {
                setLocationPin([coords.lat, coords.lng]);
                setFlyToCenter([coords.lat, coords.lng]);
                setFlyToZoom(13);
            }
        } catch (err) {
            console.error('Geocoding error:', err);
        }
    };

    return (
        <div className="page" style={{ display: 'flex', gap: 0, padding: 0, height: '100%', background: '#07070a', overflow: 'hidden' }}>
            {/* LEFT AREA: CONTENT & MAP */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px 40px', overflowY: 'auto', position: 'relative' }}>
                
                {/* Header Text */}
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#FFF', margin: 0, letterSpacing: '-0.02em' }}>
                            Encontre os melhores pontos para <br />
                            prospecção com inteligência geográfica.
                        </h1>
                        <button 
                            className="btn"
                            style={{ 
                                background: 'rgba(255,255,255,0.03)', 
                                border: '1px solid rgba(255,255,255,0.1)', 
                                color: '#AAA',
                                fontSize: 11,
                                padding: '8px 16px',
                                borderRadius: 8,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}
                        >
                            <Activity size={14} /> Histórico de Scans
                        </button>
                    </div>
                    <p style={{ fontSize: 14, color: 'rgba(234, 246, 255, 0.5)', maxWidth: 600, lineHeight: 1.6 }}>
                        O Sonar analisa locais, segmentos e avaliações para identificar oportunidades com alto potencial de negócio de forma automatizada e precisa.
                    </p>
                </div>



                {/* MAP CONTAINER */}
                <div style={{ 
                    flex: 1, 
                    minHeight: 500, 
                    borderRadius: 24, 
                    overflow: 'hidden', 
                    position: 'relative', 
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }} className="monochrome-map">
                    <MapContainer
                        center={activeCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%', background: '#0a0b10' }}
                        zoomControl={false}
                        attributionControl={false}
                    >
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution='&copy; Google'
                        />
                        <MapFlyTo center={flyToCenter} zoom={flyToZoom} />
                        
                        {/* Static Radar Center */}
                        <Circle
                            center={activeCenter}
                            radius={scanConfig.radius * 1000}
                            pathOptions={{ 
                                color: 'rgba(255,255,255,0.1)', 
                                fillColor: 'rgba(255,255,255,0.02)', 
                                fillOpacity: 0.1, 
                                weight: 1, 
                                dashArray: '4, 8'
                            }}
                        />

                        {/* Animated Radar Expansion (Only when scanning) */}
                        {scanLoading && (
                            <>
                                <Circle
                                    center={activeCenter}
                                    radius={scanConfig.radius * 1000}
                                    className="radar-expanding-circle"
                                    pathOptions={{ color: 'rgba(255,255,255,0.2)', weight: 1, fillOpacity: 0 }}
                                />
                                <Circle
                                    center={activeCenter}
                                    radius={scanConfig.radius * 1000 * 0.6}
                                    className="radar-expanding-circle"
                                    pathOptions={{ color: 'rgba(255,255,255,0.1)', weight: 1, fillOpacity: 0 }}
                                />
                            </>
                        )}

                        {/* Technical Pins */}
                        {mappableLeads.map((l: any) => {
                            const isSelected = selectedLeadId === l.id;
                            const isRelevant = l._score >= settings.hotThreshold;
                            
                            return (
                                <CircleMarker
                                    key={l.id}
                                    center={getLeadCoords(l) as [number, number]}
                                    radius={isSelected ? 10 : isRelevant ? 6 : 4}
                                    pathOptions={{
                                        color: isSelected ? '#FFF' : isRelevant ? '#FFF' : '#444',
                                        fillColor: isSelected ? '#FFF' : isRelevant ? '#FFF' : '#222',
                                        fillOpacity: 1,
                                        weight: isSelected ? 4 : 2,
                                        className: isSelected ? 'sonar-pulse-white' : isRelevant ? 'relevant-glow' : ''
                                    }}
                                    eventHandlers={{
                                        click: () => setSelectedLeadId(l.id)
                                    }}
                                >
                                    <Popup className="sonar-premium-popup">
                                        <div style={{ padding: '16px 20px', minWidth: 260, background: 'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 100%)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                                                <div style={{ 
                                                    width: 32, 
                                                    height: 32, 
                                                    borderRadius: 8, 
                                                    background: 'rgba(255,255,255,0.05)', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    color: isRelevant ? '#FFF' : '#AAA'
                                                }}>
                                                    <Radar size={16} />
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        {getLeadCategory(l, 'segmento') || 'Negócio'}
                                                    </div>
                                                    <div style={{ fontWeight: 800, fontSize: 16, color: '#FFF', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
                                                        {getLeadName(l, 'nome')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ 
                                                display: 'flex', 
                                                flexDirection: 'column', 
                                                gap: 8, 
                                                paddingTop: 12, 
                                                borderTop: '1px solid rgba(255,255,255,0.08)' 
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                                                        <Activity size={12} /> Probabilidade
                                                    </div>
                                                    <div style={{ 
                                                        fontSize: 12, 
                                                        fontWeight: 800, 
                                                        color: isRelevant ? '#FFF' : '#CCC' 
                                                    }}>
                                                        {l._score.toFixed(1)}%
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                                                        <MapPin size={12} /> Distância
                                                    </div>
                                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                                                        {l._distance.toFixed(2)} km
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                style={{
                                                    width: '100%',
                                                    marginTop: 16,
                                                    padding: '8px',
                                                    borderRadius: 8,
                                                    background: 'rgba(255,255,255,0.08)',
                                                    border: '1px solid rgba(255,255,255,0.05)',
                                                    color: '#FFF',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: 8
                                                }}
                                                onClick={() => setSelectedLeadId(l.id)}
                                            >
                                                Ver Detalhes Técnicos <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}

                        <MapResizer center={activeCenter} zoom={mapZoom} />
                        <MapFlyTo center={flyToCenter} zoom={flyToZoom} />
                    </MapContainer>

                    {/* Floating Map Legend */}
                    <div style={{ position: 'absolute', bottom: 24, left: 24, zIndex: 1000, background: 'rgba(10, 10, 15, 0.8)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', marginBottom: 8 }}>Legenda</div>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#AAA' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF4444' }} /> Quente
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#AAA' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B' }} /> Morno
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#AAA' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4B5563' }} /> Frio
                            </div>
                        </div>
                    </div>
                </div>


            </div>

            {/* RIGHT SIDEBAR: CONFIGURATION PANEL */}
            <div className="glass-panel sonar-sidebar" style={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column', padding: 32, overflowY: 'auto' }}>
                
                {/* Spatial Suggestions */}
                <div style={{ marginBottom: 32, borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 24 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                        <Crosshair size={18} color="var(--blue)" />
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#FFF' }}>Inteligência Geográfica</div>
                    </div>
                    
                    {loadingSuggestions ? (
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>Analisando padrões...</div>
                    ) : suggestions.length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>Sem sugestões no momento. Registe interações para calibrar o Sonar.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {suggestions.map((s, i) => (
                                <div 
                                    key={i} 
                                    onClick={async () => {
                                        const coords = await geocodeAddress(s.region);
                                        if (coords) {
                                            setFlyToCenter([coords.lat, coords.lng]);
                                            setFlyToZoom(14);
                                            setScanConfig(prev => ({ ...prev, location: s.region }));
                                        }
                                    }}
                                    style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        padding: '10px 12px', 
                                        borderRadius: 10, 
                                        border: '1px solid rgba(255,255,255,0.05)', 
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{s.region}</div>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--blue)' }}>P:{s.potential}</div>
                                    </div>
                                    <div style={{ fontSize: 10, color: 'var(--t3)', lineHeight: 1.2 }}>{s.reason}</div>
                                    <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                                        <div style={{ fontSize: 9, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 }}><Users size={10} /> {s.density}</div>
                                        <div style={{ fontSize: 9, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 3 }}><Target size={10} /> IQ {s.avgOutcome.toFixed(1)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: 32 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Configurar Varredura</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Defina os parâmetros técnicos da operação</div>
                </div>

                {/* Section 1: Operation Name */}
                <div className="config-card">
                    <label style={formLabelStyle}>Nome da Operação</label>
                    <div style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                        <input
                            className="input"
                            placeholder="Ex: Clínicas Lisboa Centro"
                            style={{ paddingLeft: 36, background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                            value={scanConfig.scanName}
                            onChange={(e) => setScanConfig({ ...scanConfig, scanName: e.target.value })}
                        />
                    </div>
                </div>

                {/* Section 2: Location */}
                <div className="config-card">
                    <label style={formLabelStyle}>Localização de Foco</label>
                    <div style={{ position: 'relative', marginBottom: 12 }}>
                        <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#444' }} />
                        <input
                            className="input"
                            placeholder="Endereço, cidade ou coordenadas"
                            style={{ paddingLeft: 36, paddingRight: 36, background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                            value={scanConfig.location}
                            onChange={(e) => setScanConfig({ ...scanConfig, location: e.target.value })}
                            onBlur={handleLocationBlur}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleLocationBlur();
                            }}
                        />
                        <button 
                            onClick={handleLocationBlur}
                            style={{ 
                                position: 'absolute', 
                                right: 10, 
                                top: '50%', 
                                transform: 'translateY(-50%)', 
                                background: 'none', 
                                border: 'none', 
                                color: '#444', 
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                            title="Localizar no mapa"
                        >
                            <RotateCw size={14} />
                        </button>
                    </div>
                    <button
                        className="btn"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', color: '#EEE', border: '1px solid rgba(255,255,255,0.05)', fontSize: 11 }}
                        onClick={() => {
                            if (userLocation) {
                                setScanConfig({
                                    ...scanConfig,
                                    location: `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
                                    useCurrentLocation: true
                                });
                            }
                        }}
                    >
                        <Crosshair size={14} style={{ marginRight: 8 }} /> Usar Localização Atual
                    </button>
                    
                    <div style={{ marginTop: 16 }}>
                        <label style={subLabelStyle}>Raio de Busca</label>
                        <select
                            className="input"
                            style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                            value={scanConfig.radius}
                            onChange={(e) => setScanConfig({ ...scanConfig, radius: Number(e.target.value) })}
                        >
                            <option value={1}>1 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                        </select>
                    </div>
                </div>

                {/* Section 3: Categories */}
                <div style={{ marginBottom: 24 }}>
                    <label style={formLabelStyle}>Segmentos Alvo</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {categoryOptions.map((cat) => {
                            const isSelected = scanConfig.categories.includes(cat.id);
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => {
                                        const newCategories = isSelected
                                            ? scanConfig.categories.filter(c => c !== cat.id)
                                            : [...scanConfig.categories, cat.id];
                                        setScanConfig({ ...scanConfig, categories: newCategories });
                                    }}
                                    style={{
                                        padding: '12px',
                                        borderRadius: 8,
                                        border: `1px solid ${isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.03)'}`,
                                        background: isSelected ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.1)',
                                        color: isSelected ? '#FFF' : '#555',
                                        fontSize: 11,
                                        textAlign: 'left',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    {isSelected ? <Check size={12} /> : <div style={{ width: 12 }} />}
                                    {cat.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Section 4: Technical Settings */}
                <div className="config-card">
                    <label style={formLabelStyle}>Configurações Técnicas</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div>
                            <label style={subLabelStyle}>Rating Mínimo</label>
                            <select 
                                className="input" 
                                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                                value={scanConfig.minRating}
                                onChange={e => setScanConfig({...scanConfig, minRating: Number(e.target.value)})}
                            >
                                <option value={0}>Qualquer</option>
                                <option value={3}>3.0+</option>
                                <option value={4}>4.0+</option>
                                <option value={4.5}>4.5+</option>
                            </select>
                        </div>
                        <div>
                            <label style={subLabelStyle}>Avaliações Mínimas</label>
                            <select 
                                className="input" 
                                style={{ background: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)', color: '#FFF' }}
                                value={scanConfig.minReviews}
                                onChange={e => setScanConfig({...scanConfig, minReviews: Number(e.target.value)})}
                            >
                                <option value={0}>Qualquer</option>
                                <option value={10}>10+</option>
                                <option value={50}>50+</option>
                                <option value={100}>100+</option>
                            </select>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={scanConfig.openNow} 
                                onChange={e => setScanConfig({...scanConfig, openNow: e.target.checked})}
                            />
                            <span style={{ fontSize: 11, color: '#AAA' }}>Incluir temporariamente fechado</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                checked={scanConfig.requirePhone} 
                                onChange={e => setScanConfig({...scanConfig, requirePhone: e.target.checked})}
                            />
                            <span style={{ fontSize: 11, color: '#AAA' }}>Apenas com telefone</span>
                        </label>
                    </div>
                </div>

                {/* Primary Action */}
                <button
                    className="btn"
                    onClick={() => handleScan()}
                    disabled={scanLoading}
                    style={{
                        marginTop: 'auto',
                        background: '#FFF',
                        color: '#000',
                        fontWeight: 800,
                        height: 56,
                        borderRadius: 12,
                        fontSize: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 12,
                        boxShadow: '0 10px 20px rgba(255,255,255,0.1)'
                    }}
                >
                    {scanLoading ? <RefreshCw size={20} className="spin" /> : <Radar size={20} />}
                    {scanLoading ? 'Varredura em curso...' : 'Iniciar Varredura'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12, fontSize: 10, color: '#444' }}>
                    A varredura pode levar alguns minutos
                </div>
            </div>

            <style>{`
                .leaflet-container {
                    font-family: var(--font);
                }
                /* Custom scrollbar for sidebar */
                .sonar-sidebar::-webkit-scrollbar { width: 4px; }
                .sonar-sidebar::-webkit-scrollbar-track { background: transparent; }
                .sonar-sidebar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
                .sonar-sidebar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }

                /* Monochrome map styling */
                .monochrome-map .leaflet-tile-pane {
                    filter: grayscale(1) invert(0.92) brightness(0.9) contrast(1.1);
                }

                .leaflet-popup-content-wrapper {
                    background: rgba(15, 15, 20, 0.92) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    border-radius: 16px !important;
                    padding: 0 !important;
                    backdrop-filter: blur(20px) saturate(180%);
                    -webkit-backdrop-filter: blur(20px) saturate(180%);
                    box-shadow: 
                        0 20px 50px rgba(0, 0, 0, 0.8),
                        inset 0 0 0 1px rgba(255, 255, 255, 0.05) !important;
                    overflow: hidden;
                    animation: popupFadeScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .leaflet-popup-tip {
                    background: rgba(15, 15, 20, 0.92) !important;
                    border: 1px solid rgba(255, 255, 255, 0.08) !important;
                    box-shadow: none !important;
                }
                .leaflet-popup-content { margin: 0 !important; padding: 0 !important; }

                @keyframes popupFadeScale {
                    from { opacity: 0; transform: scale(0.9) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                
                /* Sonar pulse animation (Technical White) */
                @keyframes sonarPulseWhite {
                    0% { stroke-width: 4; stroke-opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8)); }
                    50% { stroke-width: 12; stroke-opacity: 0.4; filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.6)); }
                    100% { stroke-width: 4; stroke-opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8)); }
                }
                
                .sonar-pulse-white {
                    animation: sonarPulseWhite 2s ease-in-out infinite;
                }

                /* Radar effect concentric circles */
                @keyframes radarCircleExpand {
                    0% { transform: scale(0.1); opacity: 0; }
                    10% { opacity: 0.5; }
                    80% { opacity: 0.2; }
                    100% { transform: scale(1.5); opacity: 0; }
                }

                .radar-expanding-circle {
                    transform-origin: center;
                    animation: radarCircleExpand 4s linear infinite;
                    pointer-events: none;
                }

                .radar-expanding-circle:nth-child(2) { animation-delay: 1.33s; }
                .radar-expanding-circle:nth-child(3) { animation-delay: 2.66s; }
                

                /* Glassmorphism Sidebar */
                .glass-panel {
                    background: rgba(15, 15, 15, 0.7);
                    backdrop-filter: blur(16px) saturate(180%);
                    -webkit-backdrop-filter: blur(16px) saturate(180%);
                    border-left: 1px solid rgba(255, 255, 255, 0.08);
                }

                .config-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 16px;
                }

                @keyframes relevantGlow {
                    0% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3)); }
                    50% { filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.6)); }
                    100% { filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3)); }
                }

                .relevant-glow {
                    animation: relevantGlow 3s ease-in-out infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 2s linear infinite;
                }

                @media (max-width: 1024px) {
                    .page { flex-direction: column !important; overflow-y: auto !important; }
                    .sonar-sidebar { 
                        width: 100% !important; 
                        position: relative !important; 
                        border-left: none !important; 
                        border-top: 1px solid rgba(255,255,255,0.08) !important;
                        height: auto !important;
                    }
                    .map-container-sonar { height: 400px !important; }
                }
            `}</style>
        </div>
    );
}
