import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend
} from 'recharts'

function fmt(ts) {
  const d = new Date(ts)
  return `${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,14,30,0.97)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontSize: 11,
    }}>
      <div style={{ color: '#7b8eab', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value?.toFixed(2)} kPa</strong>
        </div>
      ))}
    </div>
  )
}

export default function PressureChart({ history, targetPressure }) {
  const data = history.map(h => ({
    time: fmt(h.timestamp),
    '입력압': h.inputPressure,
    '출력압': h.outputPressure,
  }))

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis
          dataKey="time"
          tick={{ fill: '#4a5568', fontSize: 9 }}
          interval={5}
          tickLine={false}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
        />
        <YAxis
          tick={{ fill: '#4a5568', fontSize: 9 }}
          tickLine={false}
          axisLine={false}
          domain={['auto', 'auto']}
          tickFormatter={v => v.toFixed(1)}
        />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine
          y={targetPressure}
          stroke="rgba(255,255,255,0.2)"
          strokeDasharray="4 4"
          label={{ value: `목표 ${targetPressure}`, fill: '#4a5568', fontSize: 9, position: 'insideTopRight' }}
        />
        <Line
          type="monotone" dataKey="입력압"
          stroke="#3182F6" strokeWidth={1.5}
          dot={false} isAnimationActive={false}
        />
        <Line
          type="monotone" dataKey="출력압"
          stroke="#00C851" strokeWidth={2}
          dot={false} isAnimationActive={false}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#7b8eab', paddingTop: 4 }}
          iconSize={8}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
