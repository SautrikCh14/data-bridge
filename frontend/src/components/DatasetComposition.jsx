import { useState, useMemo } from 'react'

const BAR_COLORS = [
  '#1a5c3a',
  '#0e7c86',
  '#3482c8',
  '#d97b0e',
  '#9b59b6',
  '#e74c3c',
  '#2ca466',
  '#16a085',
  '#2980b9',
  '#f39c12'
]

function getFileIcon(fileName) {
  const ext = fileName.split('.').pop().toLowerCase()
  if (ext === 'csv') return 'CSV'
  if (ext === 'xls' || ext === 'xlsx') return 'XLS'
  return 'FILE'
}

export default function DatasetComposition({ data, totalRecords: propTotal }) {
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const sorted = useMemo(() => {
    if (!data || data.length === 0) return []
    return [...data].sort((a, b) => b.recordCount - a.recordCount)
  }, [data])

  const totalRecords = useMemo(() => {
    if (propTotal) return propTotal
    return sorted.reduce((sum, item) => sum + item.recordCount, 0)
  }, [sorted, propTotal])

  const items = useMemo(() => {
    return sorted.map((item, i) => ({
      ...item,
      percentage: totalRecords > 0
        ? parseFloat(((item.recordCount / totalRecords) * 100).toFixed(1))
        : 0,
      color: BAR_COLORS[i % BAR_COLORS.length]
    }))
  }, [sorted, totalRecords])

  if (!data || data.length === 0) {
    return (
      <div className="card" id="dataset-composition">
        <div className="dashboard-section-header">
          <div>
            <div className="dashboard-section-title">Dataset Composition</div>
            <div className="dashboard-section-subtitle">Source contribution to clean dataset</div>
          </div>
        </div>
        <div className="composition-empty">
          No composition data available.
        </div>
      </div>
    )
  }

  const handleMouseMove = (e, index) => {
    const rect = e.currentTarget.closest('.composition-bars').getBoundingClientRect()
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setHoveredIndex(index)
  }

  return (
    <div className="card" id="dataset-composition">
      <div className="dashboard-section-header">
        <div>
          <div className="dashboard-section-title">Dataset Composition</div>
          <div className="dashboard-section-subtitle">Source contribution to clean dataset</div>
        </div>
        <div className="dashboard-section-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, verticalAlign: 'middle', marginRight: 4 }}>
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          {items.length} source file{items.length !== 1 ? 's' : ''} &bull; {totalRecords.toLocaleString()} total records
        </div>
      </div>

      <div className="composition-bars" style={{ position: 'relative' }}>
        {items.map((item, index) => {
          const isHovered = hoveredIndex === index
          const barWidth = Math.max(item.percentage, 2)
          const showLabel = item.percentage > 12

          return (
            <div
              key={item.fileName}
              className={`composition-bar-row ${isHovered ? 'hovered' : ''}`}
              onMouseEnter={(e) => handleMouseMove(e, index)}
              onMouseMove={(e) => handleMouseMove(e, index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="composition-bar-label-side">
                <span className="composition-file-badge" style={{ background: item.color + '18', color: item.color }}>
                  {getFileIcon(item.fileName)}
                </span>
                <span className="composition-file-name" title={item.fileName}>
                  {item.fileName}
                </span>
              </div>
              <div className="composition-bar-track">
                <div
                  className="composition-bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)`,
                    transform: isHovered ? 'scaleY(1.15)' : 'scaleY(1)',
                    boxShadow: isHovered ? `0 2px 12px ${item.color}40` : 'none'
                  }}
                >
                  {showLabel && (
                    <span className="composition-bar-inner-label">{item.fileName}</span>
                  )}
                </div>
                <span className="composition-bar-value">
                  {item.recordCount.toLocaleString()} <span className="composition-bar-pct">({item.percentage}%)</span>
                </span>
              </div>
            </div>
          )
        })}

        {hoveredIndex !== null && items[hoveredIndex] && (
          <div
            className="composition-tooltip"
            style={{
              left: Math.min(tooltipPos.x + 12, 280),
              top: tooltipPos.y - 70
            }}
          >
            <div className="composition-tooltip-dot" style={{ background: items[hoveredIndex].color }} />
            <div>
              <div className="composition-tooltip-file">{items[hoveredIndex].fileName}</div>
              <div className="composition-tooltip-records">{items[hoveredIndex].recordCount.toLocaleString()} records</div>
              <div className="composition-tooltip-pct">{items[hoveredIndex].percentage}% of total</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
