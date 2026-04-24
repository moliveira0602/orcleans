import { useMemo } from 'react';

interface PieChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    innerRadius?: number;
}

export default function PieChart({ data, size = 200, innerRadius = 0 }: PieChartProps) {
    const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);
    
    const arcs = useMemo(() => {
        let cumulativeAngle = -90; // Start at top
        return data.map((d) => {
            const angle = total > 0 ? (d.value / total) * 360 : 0;
            const startAngle = cumulativeAngle;
            cumulativeAngle += angle;
            return { ...d, startAngle, angle };
        });
    }, [data, total]);

    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
        const angleInRadians = ((angleInDegrees) * Math.PI) / 180.0;
        return {
            x: centerX + radius * Math.cos(angleInRadians),
            y: centerY + radius * Math.sin(angleInRadians),
        };
    };

    const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
        const start = polarToCartesian(x, y, radius, endAngle);
        const end = polarToCartesian(x, y, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        const d = [
            'M', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
            'L', x, y,
            'Z',
        ].join(' ');
        return d;
    };

    const describeDonut = (x: number, y: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) => {
        if (endAngle - startAngle >= 360) endAngle = startAngle + 359.99;
        
        const outerStart = polarToCartesian(x, y, radius, endAngle);
        const outerEnd = polarToCartesian(x, y, radius, startAngle);
        const innerStart = polarToCartesian(x, y, innerRadius, endAngle);
        const innerEnd = polarToCartesian(x, y, innerRadius, startAngle);
        
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        
        const d = [
            'M', outerStart.x, outerStart.y,
            'A', radius, radius, 0, largeArcFlag, 0, outerEnd.x, outerEnd.y,
            'L', innerEnd.x, innerEnd.y,
            'A', innerRadius, innerRadius, 0, largeArcFlag, 1, innerStart.x, innerStart.y,
            'Z'
        ].join(' ');
        return d;
    };

    if (total === 0) {
        return (
            <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
                Sem dados
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <defs>
                    {data.map((d, i) => (
                        <linearGradient key={i} id={`grad-${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={d.color} stopOpacity={1} />
                            <stop offset="100%" stopColor={d.color} stopOpacity={0.6} />
                        </linearGradient>
                    ))}
                </defs>
                {arcs.map((arc, i) => (
                    <path
                        key={i}
                        d={innerRadius > 0 
                            ? describeDonut(size/2, size/2, size/2, innerRadius, arc.startAngle, arc.startAngle + arc.angle)
                            : describeArc(size/2, size/2, size/2, arc.startAngle, arc.startAngle + arc.angle)
                        }
                        fill={`url(#grad-${i})`}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="1"
                        style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                    >
                        <title>{arc.label}: {arc.value}</title>
                    </path>
                ))}
                {innerRadius > 0 && (
                    <circle cx={size/2} cy={size/2} r={innerRadius - 2} fill="transparent" />
                )}
            </svg>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, boxShadow: `0 0 8px ${d.color}88` }} />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{d.label}</span>
                            <span style={{ fontSize: 16, color: '#FFF', fontWeight: 800 }}>{d.value} <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>({Math.round((d.value/total)*100)}%)</span></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
