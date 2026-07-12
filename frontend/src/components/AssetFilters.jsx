const STATUS_OPTIONS = [
  'AVAILABLE',
  'ALLOCATED',
  'RESERVED',
  'UNDER_MAINTENANCE',
  'LOST',
  'RETIRED',
  'DISPOSED',
]

function AssetFilters({ filters, onChange }) {
  const handleField = (field) => (event) => {
    onChange({ ...filters, [field]: event.target.value })
  }

  return (
    <div className="filters-bar">
      <input
        type="text"
        placeholder="Search by tag, name, or serial number"
        value={filters.search}
        onChange={handleField('search')}
        className="search-input"
      />

      <input
        type="number"
        placeholder="Category ID"
        value={filters.category_id}
        onChange={handleField('category_id')}
        className="filter-input"
      />

      <select value={filters.status} onChange={handleField('status')} className="filter-input">
        <option value="">All statuses</option>
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status.replaceAll('_', ' ')}
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Department ID"
        value={filters.department_id}
        onChange={handleField('department_id')}
        className="filter-input"
      />

      <input
        type="text"
        placeholder="Location"
        value={filters.location}
        onChange={handleField('location')}
        className="filter-input"
      />

      <select value={filters.is_bookable} onChange={handleField('is_bookable')} className="filter-input">
        <option value="">Bookable: any</option>
        <option value="true">Bookable: yes</option>
        <option value="false">Bookable: no</option>
      </select>
    </div>
  )
}

export default AssetFilters
