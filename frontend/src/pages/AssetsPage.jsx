import { useEffect, useState } from 'react'
import { listAssets } from '../api/assets'
import AssetFilters from '../components/AssetFilters'
import AssetTable from '../components/AssetTable'
import AssetRegisterModal from '../components/AssetRegisterModal'
import AssetDetailDrawer from '../components/AssetDetailDrawer'

const EMPTY_FILTERS = {
  search: '',
  category_id: '',
  status: '',
  department_id: '',
  location: '',
  is_bookable: '',
}

function AssetsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [assets, setAssets] = useState([])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showRegister, setShowRegister] = useState(false)
  const [selectedAssetId, setSelectedAssetId] = useState(null)

  const refresh = () => {
    setLoading(true)
    setError(null)

    listAssets(filters)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(refresh, [filters])

  const handleCreated = () => {
    setShowRegister(false)
    refresh()
  }

  return (
    <div className="assets-page">
      <div className="assets-header">
        <h1>Asset Directory</h1>
        <button type="button" className="btn-primary" onClick={() => setShowRegister(true)}>
          Register Asset
        </button>
      </div>

      <AssetFilters filters={filters} onChange={setFilters} />

      {error && <p className="form-error">{error}</p>}
      {loading ? <p>Loading…</p> : <AssetTable assets={assets} onSelect={setSelectedAssetId} />}

      {showRegister && (
        <AssetRegisterModal onClose={() => setShowRegister(false)} onCreated={handleCreated} />
      )}

      {selectedAssetId && (
        <AssetDetailDrawer assetId={selectedAssetId} onClose={() => setSelectedAssetId(null)} />
      )}
    </div>
  )
}

export default AssetsPage
