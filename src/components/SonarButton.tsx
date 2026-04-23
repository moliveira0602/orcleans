import { useState } from 'react';
import LoadingRadar from './ui/LoadingRadar';

interface SonarButtonProps {
    onClick: () => void;
    label?: string;
    subLabel?: string;
    hasCache?: boolean;
    cachedCount?: number;
    ageDays?: number;
    compact?: boolean;
}

export default function SonarButton({ 
    onClick, 
    label = 'Iniciar Varredura', 
    subLabel = 'Seu radar está ativo',
    hasCache = false,
    cachedCount = 0,
    ageDays = 0,
    compact = false
}: SonarButtonProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            className="kpi sonar-kpi"
            style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                cursor: 'pointer',
                background: 'rgba(51, 51, 51, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 150ms cubic-bezier(.4, 0, .2, 1)',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                padding: compact ? '12px' : '20px',
                minHeight: compact ? '70px' : '100px',
                borderRadius: '12px',
                boxShadow: isHovered 
                    ? '0 8px 24px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.1)' 
                    : '0 4px 12px rgba(0, 0, 0, 0.2), inset 0 0 0 1px rgba(255, 255, 255, 0.05)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            role="button"
            aria-label="Iniciar varredura Sonar"
            tabIndex={0}
        >
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%', pointerEvents: 'none' }}>
                <div className="kpi-label" style={{ 
                    color: '#FFFFFF', 
                    marginBottom: 4, 
                    fontSize: 9, 
                    letterSpacing: '0.1em',
                    opacity: 0.6
                }}>
                    S O N A R
                </div>
                <div className="kpi-val" style={{ 
                    fontSize: compact ? 13 : 15, 
                    color: '#FFFFFF', 
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: '-0.01em',
                    marginBottom: 2
                }}>
                    {hasCache ? 'Scan Ativo' : label}
                </div>
                <div style={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: compact ? 10 : 11,
                    fontWeight: 500
                }}>
                    {hasCache 
                        ? `${cachedCount} alvos · ${ageDays}d`
                        : subLabel}
                </div>
            </div>

            {/* Premium Radar Background */}
            <div style={{ 
                position: 'absolute', 
                right: compact ? '-20px' : '-10px', 
                bottom: compact ? '-20px' : '-10px', 
                opacity: isHovered ? 0.6 : 0.3,
                transition: 'opacity 0.3s ease',
                pointerEvents: 'none',
                zIndex: 0,
                transform: compact ? 'scale(0.8)' : 'scale(1)'
            }}>
                <LoadingRadar size={compact ? 100 : 120} />
            </div>

            {/* Hover Shine Effect */}
            <div 
                style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(45deg, transparent 0%, rgba(255, 255, 255, 0.03) 50%, transparent 100%)',
                    transform: isHovered ? 'translateX(100%)' : 'translateX(-100%)',
                    transition: isHovered ? 'transform 0.6s ease' : 'none',
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            />
        </div>
    );
}