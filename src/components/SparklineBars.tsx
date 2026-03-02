

interface SparklineBarsProps {
    values: number[];
    min?: number;
    max?: number;
    height?: number;
    color?: string;
    invertColor?: boolean; // true = lower is better (e.g. overconfidence)
}

export default function SparklineBars({ values, min, max, height = 24, color = 'var(--accent)', invertColor = false }: SparklineBarsProps) {
    if (values.length === 0) return null;

    const lo = min ?? Math.min(...values);
    const hi = max ?? Math.max(...values);
    const range = hi - lo || 1;

    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
            {values.map((v, i) => {
                const norm = Math.max(0, Math.min(1, (v - lo) / range));
                const barH = Math.max(2, norm * height);
                const isLast = i === values.length - 1;
                const barColor = invertColor
                    ? (v <= lo + range * 0.33 ? 'var(--success)' : v >= lo + range * 0.66 ? 'var(--danger)' : 'var(--warning)')
                    : (v >= lo + range * 0.66 ? 'var(--success)' : v <= lo + range * 0.33 ? 'var(--danger)' : 'var(--warning)');

                return (
                    <div
                        key={i}
                        style={{
                            flex: 1,
                            height: barH,
                            borderRadius: 2,
                            background: isLast ? barColor : color,
                            opacity: isLast ? 1 : 0.4 + (i / values.length) * 0.4,
                            minWidth: 3,
                            transition: 'height 0.3s ease',
                        }}
                        title={`${v.toFixed(2)}`}
                    />
                );
            })}
        </div>
    );
}
