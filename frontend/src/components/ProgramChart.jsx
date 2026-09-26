import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#1a5c3a', '#1e6e45', '#228050', '#27925b', '#2ca466', '#38b673', '#4cc880']

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1e1e2d',
        color: '#fff',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '13px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        lineHeight: 1.5
      }}>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div>{payload[0].value} records ({payload[0].payload.percentage}%)</div>
      </div>
    )
  }
  return null
}

export default function ProgramChart({ data }) {
  return (
    <div className="chart-card" id="program-chart">
      <div className="chart-header">
        <div className="chart-title">Clean Records by Program</div>
        <div className="chart-legend">
          <span>
            <span className="chart-legend-dot primary" />
            Primary Tier
          </span>
          <span>
            <span className="chart-legend-dot secondary" />
            Secondary Tier
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 0, bottom: 0 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0edf5" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            width={140}
            tick={{ fontSize: 13, fill: '#64648a', fontWeight: 500 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(26, 92, 58, 0.04)' }} />
          <Bar dataKey="records" radius={[0, 6, 6, 0]} barSize={22}>
            {data.map((entry, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '8px' }}>
        {data.map((item, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', fontSize: '12px', color: '#64648a' }}>
            <span style={{ fontWeight: 600 }}>{item.records}</span>
            <span>({item.percentage}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}
