interface BarChartProps {
    data: { label: string; value: number; color: string }[];
}

export default function BarChart({ data }: BarChartProps) {
    const max = Math.max(...data.map((d) => d.value), 1);
    return (
        <div className="bar-chart">
            {data.map((d, i) => (
                <div className="bar-row" key={i}>
                    <div className="bar-lbl">{d.label.length > 18 ? d.label.slice(0, 18) + '…' : d.label}</div>
                    <div className="bar-track">
                        <div
                            className="bar-fill"
                            style={{
                                width: `${Math.round((d.value / max) * 100)}%`,
                                background: d.color,
                            }}
                        />
                    </div>
                    <div className="bar-val">{d.value}</div>
                </div>
            ))}
        </div>
    );
}
