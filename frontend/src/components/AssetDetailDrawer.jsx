import { useEffect, useState } from 'react'
import { getAsset } from '../api/assets'
import StatusBadge from './StatusBadge'

function AssetDetailDrawer({ assetId, onClose }) {
  const [asset, setAsset] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setAsset(null)
    setError(null)

    getAsset(assetId)
      .then((data) => {
        if (!cancelled) setAsset(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })

    return () => {
      cancelled = true
    }
  }, [assetId])

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-header">
          <h2>Asset Details</h2>
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        {error && <p className="form-error">{error}</p>}

        {!error && !asset && <p>Loading…</p>}

        {asset && (
          <dl className="detail-list">
            <dt>Asset Tag</dt>
            <dd>{asset.asset_tag}</dd>

            <dt>Name</dt>
            <dd>{asset.name}</dd>

            <dt>Status</dt>
            <dd>
              <StatusBadge status={asset.status} />
            </dd>

            <dt>Condition</dt>
            <dd>{asset.condition}</dd>

            <dt>Category</dt>
            <dd>{asset.category?.name ?? '—'}</dd>

            <dt>Department</dt>
            <dd>{asset.department?.name ?? '—'}</dd>

            <dt>Created By</dt>
            <dd>{asset.creator?.name ?? '—'}</dd>

            <dt>Serial Number</dt>
            <dd>{asset.serial_number ?? '—'}</dd>

            <dt>Location</dt>
            <dd>{asset.location ?? '—'}</dd>

            <dt>Bookable</dt>
            <dd>{asset.is_bookable ? 'Yes' : 'No'}</dd>

            <dt>Acquisition Date</dt>
            <dd>{asset.acquisition_date ?? '—'}</dd>

            <dt>Acquisition Cost</dt>
            <dd>{asset.acquisition_cost ?? '—'}</dd>

            <dt>Created At</dt>
            <dd>{new Date(asset.created_at).toLocaleString()}</dd>

            <dt>Updated At</dt>
            <dd>{new Date(asset.updated_at).toLocaleString()}</dd>
          </dl>
        )}
      </div>
    </div>
  )
}

export default AssetDetailDrawer
