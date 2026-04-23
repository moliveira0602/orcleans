import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { getLeadName, getLeadCategory, detectAddressCol, getLeadAddress, detectPostalCol, getLeadPostal, detectLatCol, detectLngCol, getRawCoord } from '../utils/detect';
import { scoreClass } from '../utils/scoring';
import { geocodeAddress } from '../utils/geocoding';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { runScan, getScanStatus, SCAN_PRESETS, clearScanCache, type ScanPresetKey, GOOGLE_KEY } from '../utils/scanService';
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
    const [radius, setRadius] = useState<number>(5); // km
    const [filterCategory, setFilterCategory] = useState<string>('todos');
    const [locationText, setLocationText] = useState('');
    const [locationPin, setLocationPin] = useState<[number, number] | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isLocating, setIsLocating] = useState(false);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [legendFilter, setLegendFilter] = useState<'all' | 'green' | 'amber' | 'gray'>('all');
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
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState('');
    const [selectedPreset] = useState<ScanPresetKey>('clinicasOlhao');
    const [useDemoMode] = useState(() => localStorage.getItem('orca_scan_demo') === 'true');
    const [customApiKey, setCustomApiKey] = useState('');
    const [scanSource, setScanSource] = useState<'demo' | 'google'>(() => {
        const saved = localStorage.getItem('orca_scan_source');
        // Auto-detect Google if env key exists
        if (!saved && GOOGLE_KEY) return 'google';
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

    const checkboxLabelStyle: React.CSSProperties = {
        fontSize: 11,
        color: 'var(--t2)',
        cursor: 'pointer',
        userSelect: 'none',
    };

    // Category options mapped to OSM categories
    const categoryOptions = [
        { id: 'clinica', label: '🏥 Clínicas Médicas', segment: 'clínica médica' },
        { id: 'restaurante', label: '🍽️ Restaurantes', segment: 'restaurante' },
        { id: 'petshop', label: '🐾 Pet Shops', segment: 'pet shop' },
        { id: 'academia', label: '💪 Academias', segment: 'academia' },
        { id: 'loja', label: '🛍️ Lojas', segment: 'shop' },
        { id: 'cafe', label: '☕ Cafés', segment: 'café' },
        { id: 'hotel', label: '🏨 Hotéis', segment: 'hotel' },
        { id: 'farmacia', label: '💊 Farmácias', segment: 'farmácia' },
        { id: 'supermercado', label: '🛒 Supermercados', segment: 'supermercado' },
        { id: 'escola', label: '📚 Escolas', segment: 'escola' },
        { id: 'salao', label: '💇 Salões de Beleza', segment: 'salão de beleza' },
        { id: 'oficina', label: '🔧 Oficinas', segment: 'oficina' },
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

    const categories = useMemo(() => {
        const set = new Set<string>();
        leads.forEach(l => {
            const cat = getLeadCategory(l, 'segmento');
            if (cat) set.add(cat);
        });
        return Array.from(set);
    }, [leads]);

    const filteredLeads = useMemo(() => {
        // If no user location is set (locationPin is null), show all leads without radius filter
        if (!locationPin) {
            const results = mappableLeads.filter(l => {
                // Only apply category filter, no radius filter
                const matchesCat = filterCategory === 'todos' || getLeadCategory(l, 'segmento') === filterCategory;
                // Apply legend filter
                const matchesLegend = legendFilter === 'all' || getMarkerColorClass(l._score) === legendFilter;
                (l as any)._distance = 0; // No distance when not filtering
                return matchesCat && matchesLegend;
            });
            console.log('[ORCA Map] Filtered leads (no location):', results.length, 'of', mappableLeads.length, '(category:', filterCategory, ', legend:', legendFilter, ')');
            return results;
        }
        
        // User has set a location - apply radius filter
        const results = mappableLeads.filter(l => {
            // Recalculate distance to current center for filtering
            const dLat = (l as any)._lat - activeCenter[0];
            const dLng = (l as any)._lng - activeCenter[1];
            const dKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
            (l as any)._distance = dKm;

            const inRadius = dKm <= radius;
            const matchesCat = filterCategory === 'todos' || getLeadCategory(l, 'segmento') === filterCategory;
            return inRadius && matchesCat;
        });
        console.log('[ORCA Map] Filtered leads (with location):', results.length, 'of', mappableLeads.length, '(radius:', radius, 'km, category:', filterCategory, ')');
        return results;
    }, [mappableLeads, radius, filterCategory, activeCenter, locationPin]);

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
    const refreshScanStatus = () => {
        const preset = SCAN_PRESETS[selectedPreset];
        return getScanStatus(preset.segment, preset.city);
    };

    const handleScan = async () => {
        setScanLoading(true);
        setScanProgress('');

        // Determine effective API key
        const getApiKey = () => {
            if (scanSource === 'demo') return 'demo';
            // Use custom key if provided, otherwise use env key
            return customApiKey || GOOGLE_KEY || '';
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
                setScanProgress(`🔍 Buscando: ${segment} em ${location}...`);
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
                        icon: '🗺️',
                        time: new Date().toISOString(),
                    },
                });

                localStorage.setItem('orca_scan_demo', String(useDemoMode));

                toast(`✓ ${result.imported} leads importados do scan!`, 'success');
                setScanModalOpen(false);
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

    const scanStatus = refreshScanStatus();

    const getMarkerColor = (score: number) => {
        if (score >= settings.hotThreshold) return '#10D9A0';  // ORCA bioluminescent green
        if (score >= settings.warmThreshold) return '#F59E0B';  // ORCA amber
        return '#475569';  // ORCA cold gray-blue
    };

    const getMarkerColorClass = (score: number) => {
        if (score >= settings.hotThreshold) return 'green';
        if (score >= settings.warmThreshold) return 'amber';
        return 'gray';
    };

    const locate = async () => {
        const raw = locationText.trim();
        if (!raw) {
            setLocationPin(null);
            setLocationError(null);
            return;
        }

        setLocationError(null);
        setIsLocating(true);
        try {
            const m = raw.match(/(-?\d+(?:[.,]\d+)?)\s*,\s*(-?\d+(?:[.,]\d+)?)/);
            if (m) {
                const lat = Number(m[1].replace(',', '.'));
                const lng = Number(m[2].replace(',', '.'));
                if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                    setLocationPin([lat, lng]);
                    return;
                }
            }

            const coords = await geocodeAddress(raw);
            if (!coords) {
                setLocationError('Não foi possível encontrar este local.');
                return;
            }
            setLocationPin([coords.lat, coords.lng]);
        } finally {
            setIsLocating(false);
        }
    };

    return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, height: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <button
                        className="btn btn-primary"
                        onClick={() => setScanModalOpen(true)}
                        style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 8,
                            background: 'linear-gradient(135deg, #333333 0%, #0A0A0A 100%)',
                            boxShadow: '0 2px 8px rgba(255, 255, 255, 0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                            color: '#FFFFFF'
                        }}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                        Iniciar Varredura
                    </button>
                    {scanStatus?.hasCache && (
                        <span style={{ fontSize: 11, color: 'var(--t3)', marginLeft: 8 }}>
                            Scan recente: {scanStatus.cachedCount} estabelecimentos ({scanStatus.ageDays} dias)
                        </span>
                    )}
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Local</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="input"
                                style={{ width: 260 }}
                                value={locationText}
                                onChange={(e) => setLocationText(e.target.value)}
                                placeholder="Morada, código postal ou lat,lng"
                                onKeyDown={(e) => { if (e.key === 'Enter') void locate(); }}
                            />
                            <button className="btn btn-primary" onClick={() => void locate()} disabled={isLocating}>
                                {isLocating ? '...' : 'Localizar'}
                            </button>
                        </div>
                        {locationError && (
                            <div style={{ fontSize: 11, color: 'var(--red)' }}>{locationError}</div>
                        )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Raio de Atuação</label>
                        <select className="input" style={{ width: 120 }} value={radius} onChange={e => setRadius(Number(e.target.value))}>
                            <option value={1}>1 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={25}>25 km</option>
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Segmento</label>
                        <select className="input" style={{ width: 160 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                            <option value="todos">Todos os Segmentos</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, flex: 1, minHeight: 0 }}>
                {/* Real Map Component */}
                <div style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                    <MapWithFlashlight>
                        <MapContainer
                        center={activeCenter}
                        zoom={mapZoom}
                        style={{ height: '100%', width: '100%', background: '#0a0b10' }}
                        zoomControl={false}
                    >
                        {/* Google Maps Dark Mode - Requires API Key */}
                        <TileLayer
                            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                            attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
                        />
                        {/* Radar-style radius circle with animated sweep */}
                        <Circle
                            center={activeCenter}
                            radius={radius * 1000}
                            pathOptions={{ 
                                color: 'var(--orca-accent)', 
                                fillColor: 'var(--orca-accent)', 
                                fillOpacity: 0.03, 
                                weight: 2, 
                                dashArray: '8, 12',
                                className: 'radar-circle'
                            }}
                        />
                        {/* Animated radar sweep overlay */}
                        <Circle
                            center={activeCenter}
                            radius={radius * 1000}
                            pathOptions={{ 
                                color: 'var(--orca-accent)', 
                                fillColor: 'var(--orca-accent)', 
                                fillOpacity: 0.08, 
                                weight: 0,
                                className: 'radar-sweep'
                            }}
                        />
                        {locationPin && (
                            <CircleMarker
                                center={locationPin}
                                radius={8}
                                pathOptions={{ color: 'var(--blue)', fillColor: 'var(--blue)', fillOpacity: 0.9, weight: 2 }}
                            >
                                <Popup>
                                    <div style={{ color: '#000', padding: '4px' }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>Local pesquisado</div>
                                        <div style={{ fontSize: 11, color: '#666' }}>
                                            {locationPin[0].toFixed(6)}, {locationPin[1].toFixed(6)}
                                        </div>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        )}
                        {filteredLeads.map((l: any) => {
                            const isHighlighted = highlightedLeadId === l.id;
                            const isSelected = selectedLeadId === l.id;
                            const isSonarActive = isSelected || isHighlighted;
                            const isCentral = isSelected; // Only selected lead is central
                            return (
                                <CircleMarker
                                    key={l.id}
                                    center={[l._lat, l._lng]}
                                    radius={isCentral ? 14 : isSonarActive ? 10 : 6}
                                    pathOptions={{
                                        color: isCentral ? '#ef4444' : isSonarActive ? '#f87171' : getMarkerColor(l._score),
                                        fillColor: isCentral ? '#ef4444' : isSonarActive ? '#f87171' : getMarkerColor(l._score),
                                        fillOpacity: isCentral ? 1 : isSonarActive ? 0.7 : 0.9,
                                        weight: isCentral ? 4 : isSonarActive ? 3 : 2,
                                        className: isSonarActive ? 'sonar-pulse' : ''
                                    }}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedLeadId(l.id);
                                            // Trigger fly-to animation
                                            const coords = getLeadCoords(l);
                                            if (coords) {
                                                setFlyToCenter(coords);
                                                setFlyToZoom(18);
                                            }
                                        }
                                    }}
                                >
                                    <Popup>
                                        <div style={{ color: '#e5e7eb', padding: '12px', maxWidth: 280 }}>
                                            <div style={{ fontWeight: 700, fontSize: 14, color: '#f3f4f6', marginBottom: 4 }}>{getLeadName(l, 'nome')}</div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>{getLeadCategory(l, 'segmento') || 'Sem segmento'}</div>
                                            {l.endereco && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>📍 {l.endereco}</div>}
                                            {l.telefone && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>📞 <a href={`tel:${l.telefone}`} style={{ color: '#60a5fa', textDecoration: 'none' }}>{l.telefone}</a></div>}
                                            {l.website && <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>🌐 <a href={l.website} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>{l.website}</a></div>}
                                            
                                            {/* Photos section */}
                                            {l.fotos && l.fotos.length > 0 && (
                                                <div style={{ marginTop: 8, marginBottom: 8, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
                                                    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4 }}>
                                                        {l.fotos.slice(0, 3).map((foto: string, idx: number) => (
                                                            <img 
                                                                key={idx} 
                                                                src={foto} 
                                                                alt={`Foto ${idx + 1}`} 
                                                                style={{ 
                                                                    width: 60, 
                                                                    height: 60, 
                                                                    objectFit: 'cover', 
                                                                    borderRadius: 4,
                                                                    flexShrink: 0,
                                                                    border: '1px solid rgba(255,255,255,0.1)'
                                                                }} 
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span className={`badge badge-${scoreClass(l._score, settings.hotThreshold, settings.warmThreshold)}`} style={{ fontSize: 10, color: '#fff' }}>
                                                    Score: {l._score.toFixed(1)}
                                                </span>
                                                {l.avaliacao !== null && l.avaliacao !== undefined && (
                                                    <span style={{ fontSize: 10, color: '#fbbf24' }}>⭐ {l.avaliacao}{l.reviews ? ` (${l.reviews})` : ''}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                        <MapResizer center={activeCenter} zoom={mapZoom} />
                        <MapFlyTo center={flyToCenter} zoom={flyToZoom} />
                    </MapContainer>
                    </MapWithFlashlight>

                    {/* Interactive Legend Overlay */}
                    <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(13, 21, 37, 0.95)', padding: '12px 14px', borderRadius: 8, border: '1px solid var(--orca-border)', backdropFilter: 'blur(8px)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orca-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Legenda (clique para filtrar)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--orca-text)',
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'green' ? 1 : 0.4,
                                    padding: '4px 6px', borderRadius: 4,
                                    background: legendFilter === 'green' ? 'rgba(16,217,160,0.12)' : 'transparent',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'green' ? 'all' : 'green')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10D9A0', boxShadow: '0 0 6px rgba(16,217,160,0.5)' }} /> 
                                Hot ({mappableLeads.filter(l => l._score >= settings.hotThreshold).length})
                            </div>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--orca-text)',
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'amber' ? 1 : 0.4,
                                    padding: '4px 6px', borderRadius: 4,
                                    background: legendFilter === 'amber' ? 'rgba(245,158,11,0.1)' : 'transparent',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'amber' ? 'all' : 'amber')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} /> 
                                Warm ({mappableLeads.filter(l => l._score >= settings.warmThreshold && l._score < settings.hotThreshold).length})
                            </div>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--orca-text)',
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'gray' ? 1 : 0.4,
                                    padding: '4px 6px', borderRadius: 4,
                                    background: legendFilter === 'gray' ? 'rgba(71,85,105,0.15)' : 'transparent',
                                    transition: 'all 0.2s ease'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'gray' ? 'all' : 'gray')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#475569' }} /> 
                                Cold ({mappableLeads.filter(l => l._score < settings.warmThreshold).length})
                            </div>
                            {legendFilter !== 'all' && (
                                <div 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, 
                                        cursor: 'pointer', color: 'var(--orca-accent)', marginTop: 2,
                                        padding: '4px 6px', borderRadius: 4,
                                        transition: 'all 0.2s ease'
                                    }}
                                    onClick={() => setLegendFilter('all')}
                                >
                                    ↻ Mostrar todos
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Analysis */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
                    <div className="card" style={{ padding: 16, flexShrink: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 12 }}>Resumo da Área</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div style={{ background: 'var(--card2)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 20, fontWeight: 800 }}>{filteredLeads.length}</div>
                                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Leads Encontrados</div>
                            </div>
                            <div style={{ background: 'var(--card2)', padding: 12, borderRadius: 8 }}>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--green)' }}>
                                    {filteredLeads.filter(l => l._score >= settings.hotThreshold).length}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--t3)' }}>Alta Conversão</div>
                            </div>
                        </div>
                        <div style={{ marginTop: 12, fontSize: 11, color: 'var(--t3)' }}>
                            {geocodingPendingCount > 0 ? `🔄 A geocodificar ${geocodingPendingCount} lead(s)... ` : ''}
                            {leadsWithQueryButNoCoords.length > 0 ? `📍 ${leadsWithQueryButNoCoords.length} lead(s) na fila para geocodificação.` : ''}
                            {mappableLeads.length === 0 && leads.length > 0 ? '⚠️ Nenhum lead tem coordenadas. Verifique se os leads têm endereço válido.' : ''}
                        </div>
                        {leadsWithQueryButNoCoords.length > 0 && (
                            <div style={{ marginTop: 8, fontSize: 10, color: 'var(--t2)' }}>
                                Exemplo: "{getLeadName(leadsWithQueryButNoCoords[0], 'nome')}" - {getLeadAddress(leadsWithQueryButNoCoords[0], addressCol)}
                            </div>
                        )}
                    </div>

                    <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', fontSize: 12, fontWeight: 700 }}>PROXIMIDADE E SCORE</div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                            {filteredLeads.length > 0 ? (
                                filteredLeads.sort((a, b) => (a as any)._distance - (b as any)._distance).map((l: any) => (
                                    <div
                                        key={l.id}
                                        className={`hover-card${selectedLeadId === l.id ? ' selected' : ''}`}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 10px',
                                            borderBottom: '1px solid var(--border)',
                                            margin: '0 -10px',
                                            borderRadius: 8,
                                            cursor: 'pointer',
                                            background: selectedLeadId === l.id ? 'var(--blue-dim)' : 'transparent',
                                            border: selectedLeadId === l.id ? '1px solid var(--blue)' : 'none',
                                            transition: 'all 0.3s ease',
                                        }}
                                        onClick={() => {
                                            setSelectedLeadId(l.id);
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{getLeadName(l, 'nome')}</div>
                                            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{l._distance.toFixed(1)}km · {getLeadCategory(l, 'segmento') || '—'}</div>
                                        </div>
                                        <div className={`badge badge-${scoreClass(l._score, settings.hotThreshold, settings.warmThreshold)}`} style={{ fontSize: 10 }}>
                                            {l._score.toFixed(1)}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t3)', fontSize: 12 }}>
                                    Nenhum lead encontrado neste raio.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* GeoScout Scan Modal - Enhanced */}
            {scanModalOpen && (
                <div className="modal-overlay open" onClick={() => setScanModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 700, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ flexShrink: 0 }}>
                            <div>
                                <div className="modal-title" style={{ fontSize: 16, letterSpacing: 3 }}>🗺️ Sonar</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Scan Avançado de Estabelecimentos</div>
                            </div>
                            <button className="modal-close" onClick={() => setScanModalOpen(false)}>✕</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
                            {/* Google API Key status - always Google Places */}
                            {!GOOGLE_KEY && (
                                <input
                                    className="input mb-20"
                                    type="password"
                                    placeholder="Google API Key para o Sonar"
                                    value={customApiKey}
                                    onChange={(e) => setCustomApiKey(e.target.value)}
                                />
                            )}
                            {GOOGLE_KEY && (
                                <div style={{ fontSize: 11, color: 'var(--green)', marginBottom: 16 }}>
                                    ✓ Google Places API configurada
                                </div>
                            )}

                            {/* Section 1: Scan Name */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={formLabelStyle}>Nome do Scan</label>
                                <input
                                    className="input"
                                    placeholder="Ex: Restaurantes Lisboa Centro"
                                    value={scanConfig.scanName}
                                    onChange={(e) => setScanConfig({ ...scanConfig, scanName: e.target.value })}
                                />
                            </div>

                            {/* Section 2: Location */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={formLabelStyle}>📍 Localização</label>
                                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                                    <input
                                        className="input"
                                        style={{ flex: 1 }}
                                        placeholder="Endereço, cidade ou coordenadas"
                                        value={scanConfig.location}
                                        onChange={(e) => setScanConfig({ ...scanConfig, location: e.target.value })}
                                    />
                                    <button
                                        className="btn btn-ghost"
                                        style={{ whiteSpace: 'nowrap' }}
                                        onClick={() => {
                                            if (userLocation) {
                                                setScanConfig({
                                                    ...scanConfig,
                                                    location: `${userLocation[0].toFixed(6)}, ${userLocation[1].toFixed(6)}`,
                                                    useCurrentLocation: true
                                                });
                                                toast('Localização atual definida', 'success');
                                            } else {
                                                toast('Ative a geolocalização do navegador', 'info');
                                            }
                                        }}
                                    >
                                        📍 Usar Atual
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <label style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', fontWeight: 600 }}>Raio:</label>
                                    <select
                                        className="input"
                                        style={{ width: 120 }}
                                        value={scanConfig.radius}
                                        onChange={(e) => setScanConfig({ ...scanConfig, radius: Number(e.target.value) })}
                                    >
                                        <option value={1}>1 km</option>
                                        <option value={5}>5 km</option>
                                        <option value={10}>10 km</option>
                                        <option value={25}>25 km</option>
                                    </select>
                                    {scanConfig.useCurrentLocation && (
                                        <span style={{ fontSize: 10, color: 'var(--green)' }}>
                                            ● Usando localização atual
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Business Categories */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={formLabelStyle}>🏢 Tipo de Negócio</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                                    gap: 6
                                }}>
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
                                                    padding: '8px 10px',
                                                    borderRadius: 6,
                                                    border: `1px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                                                    background: isSelected ? 'var(--blue-dim)' : 'var(--card)',
                                                    color: isSelected ? 'var(--blue3)' : 'var(--t2)',
                                                    fontSize: 12,
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    transition: 'all var(--transition)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 6,
                                                }}
                                            >
                                                <span>{cat.label}</span>
                                                {isSelected && <span style={{ color: 'var(--blue3)' }}>✓</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Section 4: Advanced Filters */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={formLabelStyle}>🔧 Filtros Avançados</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 12,
                                    background: 'var(--card)',
                                    padding: 14,
                                    borderRadius: 8,
                                    border: '1px solid var(--border)'
                                }}>
                                    <div>
                                        <label style={subLabelStyle}>Avaliação Mínima</label>
                                        <select
                                            className="input"
                                            value={scanConfig.minRating}
                                            onChange={(e) => setScanConfig({ ...scanConfig, minRating: Number(e.target.value) })}
                                        >
                                            <option value={0}>Qualquer</option>
                                            <option value={3}>3+ estrelas</option>
                                            <option value={4}>4+ estrelas</option>
                                            <option value={4.5}>4.5+ estrelas</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={subLabelStyle}>Mín. Reviews</label>
                                        <select
                                            className="input"
                                            value={scanConfig.minReviews}
                                            onChange={(e) => setScanConfig({ ...scanConfig, minReviews: Number(e.target.value) })}
                                        >
                                            <option value={0}>Qualquer</option>
                                            <option value={10}>10+ reviews</option>
                                            <option value={50}>50+ reviews</option>
                                            <option value={100}>100+ reviews</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input
                                            type="checkbox"
                                            id="requireWebsite"
                                            checked={scanConfig.requireWebsite}
                                            onChange={(e) => setScanConfig({ ...scanConfig, requireWebsite: e.target.checked })}
                                            style={{ accentColor: 'var(--blue)' }}
                                        />
                                        <label htmlFor="requireWebsite" style={checkboxLabelStyle}>Tem website</label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input
                                            type="checkbox"
                                            id="requirePhone"
                                            checked={scanConfig.requirePhone}
                                            onChange={(e) => setScanConfig({ ...scanConfig, requirePhone: e.target.checked })}
                                            style={{ accentColor: 'var(--blue)' }}
                                        />
                                        <label htmlFor="requirePhone" style={checkboxLabelStyle}>Tem telefone</label>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input
                                            type="checkbox"
                                            id="openNow"
                                            checked={scanConfig.openNow}
                                            onChange={(e) => setScanConfig({ ...scanConfig, openNow: e.target.checked })}
                                            style={{ accentColor: 'var(--blue)' }}
                                        />
                                        <label htmlFor="openNow" style={checkboxLabelStyle}>Aberto agora</label>
                                    </div>
                                </div>
                            </div>

                            {/* Section 5: Data Fields to Extract */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={formLabelStyle}>📋 Dados para Extrair</label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: 6,
                                    background: 'var(--card)',
                                    padding: 14,
                                    borderRadius: 8,
                                    border: '1px solid var(--border)'
                                }}>
                                    {[
                                        { key: 'extractName', label: 'Nome', icon: '📛' },
                                        { key: 'extractPhone', label: 'Telefone', icon: '📞' },
                                        { key: 'extractWebsite', label: 'Website', icon: '🌐' },
                                        { key: 'extractEmail', label: 'Email', icon: '✉️' },
                                        { key: 'extractAddress', label: 'Endereço', icon: '📍' },
                                        { key: 'extractSocial', label: 'Redes Sociais', icon: '📱' },
                                    ].map((field) => (
                                        <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <input
                                                type="checkbox"
                                                id={field.key}
                                                checked={scanConfig[field.key as keyof typeof scanConfig] as boolean}
                                                onChange={(e) => setScanConfig({ ...scanConfig, [field.key]: e.target.checked })}
                                                style={{ accentColor: 'var(--blue)' }}
                                            />
                                            <label htmlFor={field.key} style={checkboxLabelStyle}>
                                                {field.icon} {field.label}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Cache Warning */}
                            {scanStatus?.hasCache && (
                                <div style={{
                                    background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.25)',
                                    borderRadius: 8, padding: 12, marginTop: 12,
                                    fontSize: 11, color: 'var(--amber)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                }}>
                                    <span>
                                        ⚠ Scan recente disponível ({scanStatus.cachedCount} estabelecimentos, {scanStatus.ageDays} dias).
                                    </span>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => {
                                            clearScanCache(SCAN_PRESETS[selectedPreset].segment, SCAN_PRESETS[selectedPreset].city);
                                            toast('Cache limpo. Você pode realizar um novo scan.', 'success');
                                        }}
                                        style={{ fontSize: 10, whiteSpace: 'nowrap', padding: '4px 8px' }}
                                    >
                                        Limpar Cache
                                    </button>
                                </div>
                            )}

                            {/* Progress */}
                            {scanProgress && (
                                <div style={{
                                    background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,.25)',
                                    borderRadius: 8, padding: 12, marginTop: 12,
                                    fontSize: 12, color: 'var(--blue)',
                                }}>
                                    {scanProgress}
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div style={{
                            display: 'flex', gap: 12, justifyContent: 'flex-end',
                            paddingTop: 16, marginTop: 16,
                            borderTop: '1px solid var(--border)',
                            flexShrink: 0
                        }}>
                            <button className="btn btn-ghost" onClick={() => setScanModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleScan}
                                disabled={scanLoading}
                                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                                {scanLoading ? (
                                    <>
                                        <span style={{ animation: 'spin 1s linear infinite' }}>🔍</span>
                                        Escaneando...
                                    </>
                                ) : (
                                    <>🗺️ Iniciar Scan</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .leaflet-container {
                    font-family: var(--font);
                }
                .leaflet-popup-content-wrapper {
                    background: rgba(15, 16, 22, 0.95) !important;
                    border: 1px solid var(--border) !important;
                    border-radius: 12px !important;
                    padding: 0 !important;
                    backdrop-filter: blur(12px);
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4) !important;
                    overflow: hidden;
                }
                .leaflet-popup-tip {
                    background: rgba(15, 16, 22, 0.95) !important;
                    border: 1px solid var(--border) !important;
                }
                .leaflet-popup-content {
                    margin: 0 !important;
                    padding: 0 !important;
                }
                /* Remove close button default styling */
                .leaflet-container a.leaflet-popup-close-button {
                   padding: 4px 8px 0 0;
                }
                
                /* Sonar pulse animation */
                @keyframes sonarPulse {
                    0% {
                        r: 12;
                        fill-opacity: 0.9;
                        filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
                    }
                    50% {
                        r: 20;
                        fill-opacity: 0.4;
                        filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.4));
                    }
                    100% {
                        r: 12;
                        fill-opacity: 0.9;
                        filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.8));
                    }
                }
                
                .sonar-pulse circle {
                    animation: sonarPulse 1.5s ease-in-out infinite;
                }
                
                /* Second ring for sonar effect */
                @keyframes sonarRing {
                    0% {
                        r: 12;
                        opacity: 0.6;
                    }
                    100% {
                        r: 35;
                        opacity: 0;
                    }
                }
                
                /* Flashlight/Sonar scan effect on map */
                .map-flashlight-overlay {
                    position: absolute;
                    inset: 0;
                    z-index: 500;
                    pointer-events: none;
                    background: radial-gradient(
                        circle 150px at var(--mouse-x, 50%) var(--mouse-y, 50%),
                        transparent 0%,
                        rgba(255, 255, 255, 0.03) 30%,
                        rgba(5, 7, 10, 0.4) 70%,
                        rgba(5, 7, 10, 0.7) 100%
                    );
                    transition: background 0.1s ease;
                }
                
                /* Sonar wave ripple effect */
                @keyframes sonarRipple {
                    0% {
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0.6;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(3);
                        opacity: 0;
                    }
                }
                
                .sonar-ripple {
                    position: absolute;
                    width: 100px;
                    height: 100px;
                    border-radius: 50%;
                    border: 2px solid var(--orca-accent);
                    pointer-events: none;
                    z-index: 501;
                    animation: sonarRipple 2s ease-out infinite;
                }
                
                /* Radar circle animation */
                .radar-circle {
                    stroke-dasharray: 8, 12;
                    animation: radarPulseBorder 3s ease-in-out infinite;
                }
                
                @keyframes radarPulseBorder {
                    0%, 100% {
                        stroke-opacity: 0.6;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-opacity: 1;
                        stroke-dashoffset: -20;
                    }
                }
                
                /* Radar sweep animation */
                .radar-sweep {
                    fill-opacity: 0 !important;
                    animation: radarSweepFill 3s linear infinite;
                }
                
                @keyframes radarSweepFill {
                    0% {
                        fill-opacity: 0;
                    }
                    20% {
                        fill-opacity: 0.08;
                    }
                    80% {
                        fill-opacity: 0.08;
                    }
                    100% {
                        fill-opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
}
