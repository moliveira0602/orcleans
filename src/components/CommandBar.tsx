import { useState, useEffect, useRef } from 'react';
import { Search, Users, Columns3, Sparkles, Settings, ArrowRight, Command, X } from 'lucide-react';
import { useAppState } from '../store';
import type { Page } from './Layout';
import type { Lead } from '../types';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: Page) => void;
    onOpenLead: (id: string) => void;
}

export default function CommandBar({ isOpen, onClose, onNavigate, onOpenLead }: CommandBarProps) {
    const { leads } = useAppState();
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const filteredLeads = leads
        .filter(l => l.nome?.toLowerCase().includes(search.toLowerCase()) || l.segmento?.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 5);

    const navigationItems: { id: Page; label: string; icon: any }[] = ([
        { id: 'dashboard', label: 'Dashboard', icon: <Search size={14} /> },
        { id: 'leads', label: 'Lista de Leads', icon: <Users size={14} /> },
        { id: 'pipeline', label: 'Pipeline de Vendas', icon: <Columns3 size={14} /> },
        { id: 'insights', label: 'Sonar (Mapa)', icon: <Sparkles size={14} /> },
        { id: 'settings', label: 'Configurações', icon: <Settings size={14} /> },
    ] as { id: Page; label: string; icon: any }[]).filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

    const totalItems = filteredLeads.length + navigationItems.length;

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 10);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % totalItems);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        } else if (e.key === 'Enter') {
            if (selectedIndex < navigationItems.length) {
                onNavigate(navigationItems[selectedIndex].id);
                onClose();
            } else {
                const lead = filteredLeads[selectedIndex - navigationItems.length];
                onOpenLead(lead.id);
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div 
            className="modal-overlay open" 
            style={{ zIndex: 9999, alignItems: 'flex-start', paddingTop: '15vh' }}
            onClick={onClose}
        >
            <div 
                className="card" 
                style={{ 
                    width: '100%', 
                    maxWidth: 600, 
                    padding: 0, 
                    overflow: 'hidden', 
                    background: 'rgba(10, 11, 16, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 32px 64px rgba(0,0,0,0.8)'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                    <Search size={18} color="rgba(255,255,255,0.4)" style={{ marginRight: 12 }} />
                    <input
                        ref={inputRef}
                        className="input"
                        placeholder="Pesquisar leads, páginas ou comandos..."
                        style={{ border: 'none', background: 'none', padding: 0, fontSize: 16, color: '#FFF' }}
                        value={search}
                        onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                        onKeyDown={handleKeyDown}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
                        <X size={10} /> ESC
                    </div>
                </div>

                <div style={{ maxHeight: 400, overflowY: 'auto', padding: '8px' }}>
                    {navigationItems.length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '8px 12px' }}>Navegação</div>
                            {navigationItems.map((item, i) => (
                                <div
                                    key={item.id}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                        background: selectedIndex === i ? 'rgba(255,255,255,0.08)' : 'transparent',
                                        color: selectedIndex === i ? '#FFF' : 'rgba(255,255,255,0.6)'
                                    }}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    onClick={() => { onNavigate(item.id); onClose(); }}
                                >
                                    <div style={{ color: selectedIndex === i ? 'var(--blue)' : 'inherit' }}>{item.icon}</div>
                                    <div style={{ fontSize: 13, flex: 1 }}>{item.label}</div>
                                    {selectedIndex === i && <ArrowRight size={14} opacity={0.5} />}
                                </div>
                            ))}
                        </div>
                    )}

                    {filteredLeads.length > 0 && (
                        <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', padding: '8px 12px' }}>Leads Recentes</div>
                            {filteredLeads.map((l, i) => {
                                const idx = i + navigationItems.length;
                                return (
                                    <div
                                        key={l.id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                            background: selectedIndex === idx ? 'rgba(255,255,255,0.08)' : 'transparent',
                                            color: selectedIndex === idx ? '#FFF' : 'rgba(255,255,255,0.6)'
                                        }}
                                        onMouseEnter={() => setSelectedIndex(idx)}
                                        onClick={() => { onOpenLead(l.id); onClose(); }}
                                    >
                                        {l.foto ? <img src={l.foto} style={{ width: 24, height: 24, borderRadius: 4 }} /> : <Users size={14} />}
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600 }}>{l.nome}</div>
                                            <div style={{ fontSize: 11, opacity: 0.5 }}>{l.segmento} · {l.cidade || 'Localização N/D'}</div>
                                        </div>
                                        {selectedIndex === idx && <ArrowRight size={14} opacity={0.5} />}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {totalItems === 0 && (
                        <div style={{ padding: '40px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
                            Nenhum resultado encontrado para "{search}"
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', gap: 16, padding: '12px 20px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ArrowRight size={12} /> Selecionar</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Command size={12} /> Ir para</div>
                </div>
            </div>
        </div>
    );
}
