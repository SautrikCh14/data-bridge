export default function MetricCard({ label, value, description, variant, icon }) {
  return (
    <div className={`metric-card ${variant}`} id={`metric-${variant}`}>
      <div className="metric-card-header">
        <span className="metric-card-label">{label}</span>
        <div className={`metric-card-icon ${variant}`}>
          {icon}
        </div>
      </div>
      <div className="metric-card-value">{value}</div>
      {description && <div className="metric-card-desc">{description}</div>}
    </div>
  )
}
