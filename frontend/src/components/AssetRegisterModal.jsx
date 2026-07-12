import { useState } from 'react'
import { createAsset } from '../api/assets'

const CONDITION_OPTIONS = ['EXCELLENT', 'GOOD', 'FAIR', 'DAMAGED']

const EMPTY_FORM = {
  name: '',
  category_id: '',
  serial_number: '',
  acquisition_date: '',
  acquisition_cost: '',
  condition: 'GOOD',
  location: '',
  is_bookable: false,
  department_id: '',
}

function toPayload(form) {
  const payload = {
    name: form.name,
    category_id: Number(form.category_id),
    condition: form.condition,
    is_bookable: form.is_bookable,
  }

  if (form.serial_number) payload.serial_number = form.serial_number
  if (form.acquisition_date) payload.acquisition_date = form.acquisition_date
  if (form.acquisition_cost) payload.acquisition_cost = form.acquisition_cost
  if (form.location) payload.location = form.location
  if (form.department_id) payload.department_id = Number(form.department_id)

  return payload
}

function AssetRegisterModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const handleField = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const created = await createAsset(toPayload(form))
      onCreated(created)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <h2>Register Asset</h2>

        <form onSubmit={handleSubmit} className="asset-form">
          <label>
            Name *
            <input type="text" value={form.name} onChange={handleField('name')} required />
          </label>

          <label>
            Category ID *
            <input type="number" value={form.category_id} onChange={handleField('category_id')} required />
          </label>

          <label>
            Serial Number
            <input type="text" value={form.serial_number} onChange={handleField('serial_number')} />
          </label>

          <label>
            Acquisition Date
            <input type="date" value={form.acquisition_date} onChange={handleField('acquisition_date')} />
          </label>

          <label>
            Acquisition Cost
            <input type="number" step="0.01" value={form.acquisition_cost} onChange={handleField('acquisition_cost')} />
          </label>

          <label>
            Condition
            <select value={form.condition} onChange={handleField('condition')}>
              {CONDITION_OPTIONS.map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
          </label>

          <label>
            Location
            <input type="text" value={form.location} onChange={handleField('location')} />
          </label>

          <label>
            Department ID
            <input type="number" value={form.department_id} onChange={handleField('department_id')} />
          </label>

          <label className="checkbox-label">
            <input type="checkbox" checked={form.is_bookable} onChange={handleField('is_bookable')} />
            Bookable
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Registering…' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AssetRegisterModal
