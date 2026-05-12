import { scoreColorVar } from '@/lib/score'

type ScoreCellProps = {
  score: number | null
  trend?: number[]
}

export function ScoreCell({ score, trend }: ScoreCellProps) {
  const color = scoreColorVar(score)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          borderLeft: `2px solid ${color}`,
          paddingLeft: 6,
          fontFamily: 'ui-monospace, monospace',
          fontSize: 13,
          fontWeight: 500,
          color,
          lineHeight: 1,
          minWidth: 28,
        }}
      >
        {score ?? '—'}
      </div>
      {trend && trend.length >= 2 && <Sparkline values={trend} color={color} />}
    </div>
  )
}

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 40
  const H = 16
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible', flexShrink: 0 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  )
}
