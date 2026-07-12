const STATUS_STYLES = {
  AVAILABLE: { background: 'rgba(34, 197, 94, 0.18)', color: '#4ade80' },
  ALLOCATED: { background: 'rgba(251, 146, 60, 0.18)', color: '#fb923c' },
  RESERVED: { background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
  UNDER_MAINTENANCE: { background: 'rgba(59, 130, 246, 0.18)', color: '#60a5fa' },
  LOST: { background: 'rgba(239, 68, 68, 0.18)', color: '#f87171' },
  RETIRED: { background: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8' },
  DISPOSED: { background: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8' },
}

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.RETIRED

  return (
    <span className="status-badge" style={style}>
      {status?.replaceAll('_', ' ')}
    </span>
  )
}

export default StatusBadge
