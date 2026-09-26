export default function StatusBadge({ status }) {
  const variant = status === 'Verified' ? 'verified'
    : status === 'Pending' ? 'pending'
    : status === 'Flagged' ? 'flagged'
    : 'verified'

  return (
    <span className={`status-badge ${variant}`}>
      <span className="status-badge-dot" />
      {status}
    </span>
  )
}
