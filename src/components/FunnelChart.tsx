import React from 'react';

interface FunnelStep {
    label: string;
    value: number;
    color: string;
}

interface FunnelChartProps {
    data: FunnelStep[];
}

export default function FunnelChart({ data }: FunnelChartProps) {
    const max = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;

    return (
        <div className="funnel-container" style={{ padding: '10px 0' }}>
            {data.map((step, i) => {
                const percentage = max > 0 ? (step.value / max) * 100 : 0;
                // Calculate conversion from previous step
                const prevStep = data[i - 1];
                const conversion = prevStep && prevStep.value > 0
                    ? Math.round((step.value / prevStep.value) * 100)
                    : null;

                return (
                    <div key={step.label} className="funnel-step-wrap" style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span className="text-sm font-semi">{step.label}</span>
                            <div className="flex gap-8 items-center">
                                {conversion !== null && (
                                    <span className="badge badge-gray" style={{ fontSize: 10, opacity: 0.8 }}>
                                        {conversion}% conv.
                                    </span>
                                )}
                                <span className="text-sm font-bold">{step.value}</span>
                            </div>
                        </div>
                        <div className="funnel-bar-bg" style={{
                            height: 10,
                            background: 'var(--card2)',
                            borderRadius: 5,
                            overflow: 'hidden',
                            position: 'relative'
                        }}>
                            <div className="funnel-bar-fill" style={{
                                height: '100%',
                                width: `${percentage}%`,
                                background: step.color,
                                borderRadius: 5,
                                transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)'
                            }} />
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
