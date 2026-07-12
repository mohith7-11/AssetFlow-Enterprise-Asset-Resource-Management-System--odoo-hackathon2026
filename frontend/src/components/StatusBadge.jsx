const STATUS_STYLES = {
  AVAILABLE: { background: 'rgba(21, 128, 61, 0.12)', color: '#15803d' },
  ALLOCATED: { background: 'rgba(194, 65, 12, 0.12)', color: '#c2410c' },
  RESERVED: { background: 'rgba(29, 78, 216, 0.12)', color: '#1d4ed8' },
  UNDER_MAINTENANCE: { background: 'rgba(126, 34, 206, 0.12)', color: '#7e22ce' },
  LOST: { background: 'rgba(185, 28, 28, 0.12)', color: '#b91c1c' },
  RETIRED: { background: 'rgba(71, 85, 105, 0.12)', color: '#475569' },
  DISPOSED: { background: 'rgba(71, 85, 105, 0.12)', color: '#475569' },
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
