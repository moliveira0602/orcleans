import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { getLeadName, getLeadCategory, detectAddressCol, getLeadAddress, detectLatCol, detectLngCol, getRawCoord } from '../utils/detect';
import { scoreClass } from '../utils/scoring';
import { geocodeAddress } from '../utils/geocoding';
import { MapContainer, TileLayer, Circle, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Component to auto-resize and center map when leads change
 */
function MapResizer({ center, radius }: { center: [number, number], radius: number }) {
    const map = useMap();
    map.setView(center, map.getZoom());
    return null;
}

interface InsightsProps {
    onOpenDetail?: (id: string) => void;
}

export default function Insights({ onOpenDetail }: InsightsProps) {
    const { leads, settings } = useAppState();
    const dispatch = useAppDispatch();
    const [radius, setRadius] = useState<number>(5); // km
    const [filterCategory, setFilterCategory] = useState<string>('todos');

    const addressCol = useMemo(() => detectAddressCol(leads), [leads]);
    const latCol = useMemo(() => detectLatCol(leads), [leads]);
    const lngCol = useMemo(() => detectLngCol(leads), [leads]);

    const isGeocodingRef = useRef(false);

    // Background Geocoding Hook: Process leads needing coordinates one by one
    useEffect(() => {
        if (isGeocodingRef.current) return;

        const needsGeocoding = leads.find(l => {
            const hasRawLat = getRawCoord(l, latCol) !== undefined;
            const hasAddress = getLeadAddress(l, addressCol) !== '';
            return !l._lat && !l._lng && !hasRawLat && hasAddress;
        });

        if (needsGeocoding) {
            const address = getLeadAddress(needsGeocoding, addressCol);
            isGeocodingRef.current = true;

            // Wait 1.1s between requests to respect Nominatim policy
            const timer = setTimeout(async () => {
                const coords = await geocodeAddress(address);
                if (coords) {
                    dispatch({
                        type: 'UPDATE_LEAD',
                        payload: { id: needsGeocoding.id, fields: { _lat: coords.lat, _lng: coords.lng } }
                    });
                } else {
                    // Mark as geocoded with dummy value or skip to prevent infinite loop
                    // For now, we'll use a small offset so it's not "missing" but maybe simulated later
                    dispatch({
                        type: 'UPDATE_LEAD',
                        payload: { id: needsGeocoding.id, fields: { _geocoded: false } }
                    });
                }
                isGeocodingRef.current = false;
            }, 1100);

            return () => clearTimeout(timer);
        }
    }, [leads, addressCol, latCol, dispatch]);

    // Center logic: use average of leads or default to a safe location
    const leadsWithCoords = useMemo(() => {
        // First pass: Find all leads that ALREADY have real coords
        const realCoords = leads.map(l => {
            if (typeof l._lat === 'number' && typeof l._lng === 'number') return { lat: l._lat, lng: l._lng };
            const rl = getRawCoord(l, latCol);
            const rg = getRawCoord(l, lngCol);
            if (rl !== undefined && rg !== undefined) return { lat: rl, lng: rg };
            return null;
        }).filter(Boolean) as { lat: number, lng: number }[];

        if (realCoords.length > 0) {
            console.log(`[GeoScout] Found ${realCoords.length} leads with real coords. Using them as base.`);
        }

        // Default base (Sao Paulo) if absolutely nothing else found
        let baseLat = -23.5505;
        let baseLng = -46.6333;

        if (realCoords.length > 0) {
            baseLat = realCoords.reduce((acc, c) => acc + c.lat, 0) / realCoords.length;
            baseLng = realCoords.reduce((acc, c) => acc + c.lng, 0) / realCoords.length;
        }

        return leads.map((l) => {
            // Priority 1: Real _lat/_lng from state
            if (typeof l._lat === 'number' && typeof l._lng === 'number') return l;

            // Priority 2: Raw data columns
            const rawLat = getRawCoord(l, latCol);
            const rawLng = getRawCoord(l, lngCol);
            if (rawLat !== undefined && rawLng !== undefined) {
                return { ...l, _lat: rawLat, _lng: rawLng };
            }

            // Priority 3: Simulation around the detected base (FALLBACK)
            let hash = 0;
            const str = l.id;
            for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash) + str.charCodeAt(i);
                hash |= 0;
            }

            const angle = (Math.abs(hash) % 360) * (Math.PI / 180);
            const dist = (Math.abs(hash * 31) % 10000) / 1000; // 0-10km

            return {
                ...l,
                _lat: baseLat + (Math.cos(angle) * dist) / 111,
                _lng: baseLng + (Math.sin(angle) * dist) / 111,
                _distance: dist,
                _simulated: true
            };
        });
    }, [leads, latCol, lngCol]);

    const activeCenter = useMemo(() => {
        // Find only leads that have REAL coordinates
        const realCoords = leadsWithCoords.filter(l => {
            const isSimulated = (l as any)._simulated === true;
            return !isSimulated;
        });

        if (realCoords.length > 0) {
            const avgLat = realCoords.reduce((acc, l) => acc + (l as any)._lat, 0) / realCoords.length;
            const avgLng = realCoords.reduce((acc, l) => acc + (l as any)._lng, 0) / realCoords.length;
            console.log(`[GeoScout] Center moved to real area: ${avgLat}, ${avgLng}`);
            return [avgLat, avgLng] as [number, number];
        }

        return [-23.5505, -46.6333] as [number, number];
    }, [leadsWithCoords]);

    // Debug View
    const realCount = leadsWithCoords.filter(l => !(l as any)._simulated).length;

    const categories = useMemo(() => {
        const set = new Set<string>();
        leads.forEach(l => {
            const cat = getLeadCategory(l, 'segmento');
            if (cat) set.add(cat);
        });
        return Array.from(set);
    }, [leads]);

    const filteredLeads = useMemo(() => {
        return leadsWithCoords.filter(l => {
            // Recalculate distance to current center for filtering
            const dLat = (l as any)._lat - activeCenter[0];
            const dLng = (l as any)._lng - activeCenter[1];
            const dKm = Math.sqrt(dLat * dLat + dLng * dLng) * 111;
            (l as any)._distance = dKm;

            const inRadius = dKm <= radius;
            const matchesCat = filterCategory === 'todos' || getLeadCategory(l, 'segmento') === filterCategory;
            return inRadius && matchesCat;
        });
    }, [leadsWithCoords, radius, filterCategory, activeCenter]);

    const getMarkerColor = (score: number) => {
        if (score >= settings.hotThreshold) return 'var(--green)';
        if (score >= settings.warmThreshold) return 'var(--amber)';
        return 'var(--t3)';
    };

    return (
        <div className="page" style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: 24, height: '100%' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>GeoScout Intelligence</h1>
                    <p style={{ color: 'var(--t3)', marginTop: 4 }}>Mapeamento real e análise de proximidade de leads B2B.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
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
                    {/* Debug Overlay */}
                    <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 1000, background: 'rgba(255, 0, 0, 0.8)', color: 'white', padding: '4px 8px', fontSize: 10, borderRadius: 4, pointerEvents: 'none' }}>
                        DEBUG: {realCount} real coords | Center: {activeCenter[0].toFixed(2)}, {activeCenter[1].toFixed(2)}
                    </div>

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
                        {filteredLeads.map((l: any) => (
                            <CircleMarker
                                key={l.id}
                                center={[l._lat, l._lng]}
                                radius={6}
                                pathOptions={{
                                    color: getMarkerColor(l._score),
                                    fillColor: getMarkerColor(l._score),
                                    fillOpacity: 0.8,
                                    weight: 2
                                }}
                            >
                                <Popup>
                                    <div style={{ color: '#000', padding: '4px' }}>
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>{getLeadName(l, 'nome')}</div>
                                        <div style={{ fontSize: 11, color: '#666' }}>{getLeadCategory(l, 'segmento') || 'Sem segmento'}</div>
                                        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span className={`badge badge-${scoreClass(l._score, settings.hotThreshold, settings.warmThreshold)}`} style={{ fontSize: 10 }}>
                                                Score: {l._score.toFixed(1)}
                                            </span>
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
                        ))}
                        <MapResizer center={activeCenter} radius={radius} />
                    </MapContainer>

                    {/* Simple Legend Overlay */}
                    <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000, background: 'rgba(10, 11, 16, 0.8)', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', pointerEvents: 'none' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Legenda</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} /> Hot (Prioridade)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} /> Warm (Morno)
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--t3)' }} /> Cold (Frio)
                            </div>
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
