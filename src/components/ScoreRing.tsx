import { scoreClass } from '../utils/scoring';

interface ScoreRingProps {
    score: number;
    hot: number;
    warm: number;
    size?: 'sm' | 'md' | 'lg';
}

export default function ScoreRing({ score, hot, warm, size = 'sm' }: ScoreRingProps) {
    const cls = scoreClass(score, hot, warm);
    const config = {
        sm: { size: 38, stroke: 3, font: 11 },
        md: { size: 48, stroke: 4, font: 14 },
        lg: { size: 64, stroke: 5, font: 18 }
    };
    const { size: s, stroke, font } = config[size];
    const center = s / 2;
    const radius = (s - stroke) / 2;
    const circum = 2 * Math.PI * radius;
    const offset = circum * (1 - Math.min(score, 10) / 10);
    const color = cls === 'hot' ? '#4ADE80' : cls === 'warm' ? '#FBBF24' : 'rgba(255,255,255,0.2)';

    return (
        <div style={{ position: 'relative', width: s, height: s, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {/* Background Glow */}
            <div style={{ 
                position: 'absolute', 
                inset: stroke, 
                borderRadius: '50%', 
                background: `radial-gradient(circle, ${color.replace(')', ', 0.1)')} 0%, transparent 70%)`,
                filter: 'blur(4px)'
            }} />
            
            <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background Ring */}
                <circle 
                    cx={center} cy={center} r={radius} 
                    fill="none" 
                    stroke="rgba(255,255,255,0.05)" 
                    strokeWidth={stroke} 
                />
                {/* Active Ring */}
                <circle 
                    cx={center} cy={center} r={radius} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth={stroke} 
                    strokeDasharray={circum} 
                    strokeDashoffset={offset} 
                    strokeLinecap="round" 
                    style={{ 
                        transition: 'stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                        filter: score >= (hot || 7) ? `drop-shadow(0 0 2px ${color})` : 'none'
                    }} 
                />
            </svg>
            <span style={{ 
                position: 'absolute', 
                fontSize: score >= 10 ? font - 1 : font, 
                fontWeight: 900, 
                color: '#FFF',
                fontFamily: 'var(--font-d)',
                letterSpacing: '-0.02em'
            }}>
                {Math.round(score)}
            </span>
        </div>
    );
}
