import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { getLeadName, getLeadCategory, detectAddressCol, getLeadAddress, detectPostalCol, getLeadPostal, detectLatCol, detectLngCol, getRawCoord } from '../utils/detect';
import { scoreClass } from '../utils/scoring';
import { geocodeAddress } from '../utils/geocoding';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import { runScan, getScanStatus, SCAN_PRESETS, clearScanCache, type ScanPresetKey } from '../utils/scanService';
import { useToast } from '../components/Toast';
import 'leaflet/dist/leaflet.css';

/**
 * Component to auto-resize and center map when leads change
 */
function MapResizer({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center, map.getZoom());
    }, [map, center]);
    return null;
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
    const [selectedPreset, setSelectedPreset] = useState<ScanPresetKey>('clinicasOlhao');
    const [useDemoMode] = useState(() => localStorage.getItem('orca_scan_demo') === 'true');

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

        const preset = SCAN_PRESETS[selectedPreset];
        
        try {
            const result = await runScan(
                {
                    segment: preset.segment,
                    city: preset.city,
                    apiKey: useDemoMode ? 'demo' : 'nominatim',
                },
                leads,
                (msg) => setScanProgress(msg)
            );

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
                            name: `Scan: ${preset.label}`,
                            file: 'GeoScout',
                            rows: result.totalFound,
                            cols: 0,
                            date: new Date().toISOString(),
                            count: result.imported,
                        },
                    },
                });

                dispatch({
                    type: 'ADD_ACTIVITY',
                    payload: {
                        title: `Scan GeoScout: ${preset.label}`,
                        sub: `${result.imported} novos leads`,
                        icon: '🗺️',
                        time: new Date().toISOString(),
                    },
                });

                localStorage.setItem('orca_scan_demo', String(useDemoMode));

                toast(`✓ ${result.imported} leads importados do scan!`, 'success');
                setScanModalOpen(false);
            } else if (result.cached) {
                toast('Scan recente já existe. Aguarde 7 dias ou limpe o cache.', 'info');
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
        if (score >= settings.hotThreshold) return '#22c55e';
        if (score >= settings.warmThreshold) return '#f59e0b';
        return '#6b7280';
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
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        🗺️ Novo Scan
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
                <div className="card" style={{ position: 'relative', overflow: 'hidden', background: '#0a0b10', border: '1px solid var(--border)', padding: 0 }}>
                    <MapContainer
                        center={activeCenter}
                        zoom={13}
                        style={{ height: '100%', width: '100%', background: '#0a0b10' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        <Circle
                            center={activeCenter}
                            radius={radius * 1000}
                            pathOptions={{ color: 'var(--blue)', fillColor: 'var(--blue)', fillOpacity: 0.05, weight: 1, dashArray: '5, 10' }}
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
                            return (
                                <CircleMarker
                                    key={l.id}
                                    center={[l._lat, l._lng]}
                                    radius={isHighlighted ? 10 : 6}
                                    pathOptions={{
                                        color: isHighlighted ? 'var(--red)' : getMarkerColor(l._score),
                                        fillColor: isHighlighted ? 'var(--red)' : getMarkerColor(l._score),
                                        fillOpacity: 0.9,
                                        weight: isHighlighted ? 3 : 2
                                    }}
                                >
                                    <Popup>
                                        <div style={{ color: '#000', padding: '4px' }}>
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{getLeadName(l, 'nome')}</div>
                                            <div style={{ fontSize: 11, color: '#666' }}>{getLeadCategory(l, 'segmento') || 'Sem segmento'}</div>
                                            <div style={{ fontSize: 11, color: '#666' }}>{l.endereco || ''}</div>
                                            {l.telefone && <div style={{ fontSize: 11, color: '#666' }}>📞 {l.telefone}</div>}
                                            {l.website && <div style={{ fontSize: 11, color: '#666' }}>🌐 <a href={l.website} target="_blank" rel="noreferrer">{l.website}</a></div>}
                                            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                <span className={`badge badge-${scoreClass(l._score, settings.hotThreshold, settings.warmThreshold)}`} style={{ fontSize: 10 }}>
                                                    Score: {l._score.toFixed(1)}
                                                </span>
                                                {l.avaliacao !== null && l.avaliacao !== undefined && (
                                                    <span style={{ fontSize: 10, color: '#666' }}>⭐ {l.avaliacao}{l.reviews ? ` (${l.reviews})` : ''}</span>
                                                )}
                                                {onOpenDetail && (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        style={{ fontSize: 9, padding: '2px 6px' }}
                                                        onClick={() => onOpenDetail(l.id)}
                                                    >
                                                        Ver Detalhes →
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </Popup>
                                </CircleMarker>
                            );
                        })}
                        <MapResizer center={activeCenter} />
                    </MapContainer>

                    {/* Interactive Legend Overlay */}
                    <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(10, 11, 16, 0.9)', padding: '12px', borderRadius: 8, border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Legenda (clique para filtrar)</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, 
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'green' ? 1 : 0.4,
                                    padding: '2px 4px', borderRadius: 4,
                                    background: legendFilter === 'green' ? 'rgba(34,197,94,0.15)' : 'transparent'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'green' ? 'all' : 'green')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} /> 
                                Hot ({mappableLeads.filter(l => l._score >= settings.hotThreshold).length})
                            </div>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, 
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'amber' ? 1 : 0.4,
                                    padding: '2px 4px', borderRadius: 4,
                                    background: legendFilter === 'amber' ? 'rgba(245,158,11,0.15)' : 'transparent'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'amber' ? 'all' : 'amber')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} /> 
                                Warm ({mappableLeads.filter(l => l._score >= settings.warmThreshold && l._score < settings.hotThreshold).length})
                            </div>
                            <div 
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, 
                                    cursor: 'pointer', opacity: legendFilter === 'all' || legendFilter === 'gray' ? 1 : 0.4,
                                    padding: '2px 4px', borderRadius: 4,
                                    background: legendFilter === 'gray' ? 'rgba(107,114,128,0.15)' : 'transparent'
                                }}
                                onClick={() => setLegendFilter(legendFilter === 'gray' ? 'all' : 'gray')}
                            >
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6b7280' }} /> 
                                Cold ({mappableLeads.filter(l => l._score < settings.warmThreshold).length})
                            </div>
                            {legendFilter !== 'all' && (
                                <div 
                                    style={{ 
                                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, 
                                        cursor: 'pointer', color: 'var(--blue)', marginTop: 4,
                                        padding: '2px 4px', borderRadius: 4
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
                                        className="hover-card"
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 10px',
                                            borderBottom: '1px solid var(--border)',
                                            margin: '0 -10px',
                                            borderRadius: 8,
                                            cursor: onOpenDetail ? 'pointer' : 'default'
                                        }}
                                        onClick={() => onOpenDetail?.(l.id)}
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

            {/* GeoScout Scan Modal */}
            {scanModalOpen && (
                <div className="modal-overlay open" onClick={() => setScanModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">🗺️ GeoScout - Scan de Estabelecimentos</div>
                            <button className="modal-close" onClick={() => setScanModalOpen(false)}>✕</button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label mb-8">Fonte de Dados</label>
                            <div style={{
                                background: 'var(--card2)', border: '1px solid var(--border)',
                                borderRadius: 8, padding: 12, fontSize: 12, color: 'var(--t2)'
                            }}>
                                🗺️ <strong>OpenStreetMap (Nominatim)</strong> — Dados reais, 100% gratuito, sem necessidade de API key.
                            </div>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label mb-8">Configuração do Scan</label>
                            <select
                                className="input"
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value as ScanPresetKey)}
                            >
                                {Object.entries(SCAN_PRESETS).map(([key, preset]) => (
                                    <option key={key} value={key}>{preset.label}</option>
                                ))}
                            </select>
                        </div>

                        {scanStatus?.hasCache && (
                            <div style={{
                                background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.25)',
                                borderRadius: 8, padding: 12, marginBottom: 16,
                                fontSize: 12, color: 'var(--amber)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                            }}>
                                <span>
                                    ⚠ Scan recente disponível ({scanStatus.cachedCount} estabelecimentos, {scanStatus.ageDays} dias). 
                                    Novo scan só será realizado após 7 dias.
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

                        {scanProgress && (
                            <div style={{
                                background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,.25)',
                                borderRadius: 8, padding: 12, marginBottom: 16,
                                fontSize: 12, color: 'var(--blue)',
                            }}>
                                {scanProgress}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setScanModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleScan}
                                disabled={scanLoading}
                            >
                                {scanLoading ? '🔍 Escaneando...' : '🗺️ Iniciar Scan'}
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
                    background: #fff;
                    border-radius: 8px;
                    padding: 0;
                }
                .leaflet-popup-tip {
                    background: #fff;
                }
                /* Remove close button default styling */
                .leaflet-container a.leaflet-popup-close-button {
                   padding: 4px 8px 0 0;
                }
            `}</style>
        </div >
    );
}
