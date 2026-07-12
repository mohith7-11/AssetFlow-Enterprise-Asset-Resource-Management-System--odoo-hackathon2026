import StatusBadge from './StatusBadge'

function AssetTable({ assets, onSelect }) {
  if (assets.length === 0) {
    return <p className="empty-state">No assets match the current filters.</p>
  }

  return (
    <table className="asset-table">
      <thead>
        <tr>
          <th>Asset Tag</th>
          <th>Name</th>
          <th>Category</th>
          <th>Status</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        {assets.map((asset) => (
          <tr key={asset.id} onClick={() => onSelect(asset.id)} className="asset-row">
            <td>{asset.asset_tag}</td>
            <td>{asset.name}</td>
            <td>{asset.category?.name ?? '—'}</td>
            <td>
              <StatusBadge status={asset.status} />
            </td>
            <td>{asset.location ?? '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default AssetTable
