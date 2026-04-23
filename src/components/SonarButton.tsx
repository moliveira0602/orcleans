import { useState } from 'react';

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
                border: '1px solid var(--orca-border-glow)',
                cursor: 'pointer',
                background: 'var(--orca-accent-glow)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all var(--transition)',
                transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
                boxShadow: isHovered 
                    ? '0 8px 32px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                    : '0 4px 16px rgba(255, 255, 255, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={onClick}
            role="button"
            aria-label="Iniciar varredura Sonar"
            tabIndex={0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {/* Content */}
            <div style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ flex: 1 }}>
                    <div className="kpi-label" style={{ color: 'var(--orca-accent)', marginBottom: 4, fontSize: compact ? 10 : 11 }}>
                        SONAR
                    </div>
                    <div className="kpi-val" style={{ 
                        fontSize: compact ? 13 : 16, 
                        color: 'var(--orca-accent)', 
                        fontWeight: 600,
                        lineHeight: 1.2,
                        letterSpacing: compact ? '0.01em' : '0.02em'
                    }}>
                        {hasCache ? 'Scan Recente' : label}
                    </div>
                    <div className="kpi-sub" style={{ color: 'var(--orca-text-muted)', marginTop: 2, fontSize: compact ? 10 : 11 }}>
                        {hasCache 
                            ? `${cachedCount} alvos (${ageDays}d)`
                            : subLabel}
                    </div>
                </div>
            </div>

            {/* Radar Animation Background */}
            <div className="sonar-radar-wrapper">
                <div className="sonar-radar">
                    <div className="blip" />
                    <div className="line" />
                    <div className="rings" />
                </div>
            </div>

            {/* Hover indicator */}
            <div 
                className="sonar-hover-indicator"
                style={{ 
                    opacity: isHovered ? 1 : 0,
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    fontSize: 10,
                    color: 'var(--orca-accent)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    transition: 'opacity var(--transition)',
                    zIndex: 20,
                }}
            >
                CLICAR
            </div>

            <style>{`
                /* ===== SONAR RADAR ANIMATION ===== */
                
                .sonar-kpi {
                    isolation: isolate;
                }

                /* Radar Container */
                .sonar-radar-wrapper {
                    position: absolute;
                    bottom: -40px;
                    right: -20px;
                    width: 80px;
                    height: 80px;
                    opacity: 0.4;
                    pointer-events: none;
                    z-index: 0;
                }

                .sonar-radar {
                    width: 80px;
                    height: 80px;
                    border: solid 2px rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    position: relative;
                    animation: sonar-rotate 2s linear infinite;
                    background: rgba(255, 255, 255, 0.1);
                }

                .sonar-radar .blip {
                    position: absolute;
                    top: -4px;
                    left: -4px;
                    width: 80px;
                    height: 80px;
                    border: solid 4px rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                    transform: scale(0.4);
                    animation: sonar-blip 2s infinite;
                    background: rgba(255, 255, 255, 0.4);
                }

                .sonar-radar .line {
                    position: absolute;
                    left: 39px;
                    top: 0;
                    width: 1px;
                    height: 40px;
                    background: rgba(255, 255, 255, 0.6);
                }
                
                .sonar-radar .rings {
                    position: absolute;
                    top: 19px;
                    left: 19px;
                    width: 40px;
                    height: 40px;
                    border: solid 1px rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                }
                
                .sonar-radar .rings::before {
                    content: '';
                    position: absolute;
                    top: 9px;
                    left: 9px;
                    width: 20px;
                    height: 20px;
                    border: solid 1px rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                }
                
                .sonar-radar .rings::after {
                    content: '';
                    position: absolute;
                    top: -11px;
                    left: -11px;
                    width: 60px;
                    height: 60px;
                    border: solid 1px rgba(255, 255, 255, 0.6);
                    border-radius: 50%;
                }

                @keyframes sonar-rotate {
                    0% {
                        transform: rotate(0deg);
                    }
                    100% {
                        transform: rotate(360deg);
                    }
                }

                @keyframes sonar-blip {
                    0% {
                        transform: scale(0);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(1);
                        opacity: 0;
                    }
                }

                /* Hover enhancements */
                .sonar-kpi:hover .sonar-radar-wrapper {
                    opacity: 0.6;
                }

                .sonar-kpi:hover .sonar-radar {
                    animation-duration: 1.5s;
                }

                /* Reduce motion for accessibility */
                @media (prefers-reduced-motion: reduce) {
                    .sonar-radar,
                    .sonar-radar .blip {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}