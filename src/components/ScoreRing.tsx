import { scoreClass } from '../utils/scoring';

interface ScoreRingProps {
    score: number;
    hot: number;
    warm: number;
    size?: 'sm' | 'md' | 'lg';
}

export default function ScoreRing({ score, hot, warm, size = 'sm' }: ScoreRingProps) {
    const cls = scoreClass(score, hot, warm);
    const sizeStyles: Record<string, React.CSSProperties> = {
        sm: {},
        md: { width: 44, height: 44, fontSize: 15 },
        lg: { width: 56, height: 56, fontSize: 20 },
    };
    return (
        <div className={`score-ring score-${cls}`} style={sizeStyles[size]}>
            {score.toFixed(1)}
        </div>
    );
}
