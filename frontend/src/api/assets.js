const BASE_URL = '/api/v1/assets'

async function parseResponse(response) {
  const isJson = response.headers.get('content-type')?.includes('application/json')
  const body = isJson ? await response.json() : null

  if (!response.ok) {
    const message = body?.detail || `Request failed with status ${response.status}`
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message))
  }

  return body
}

export function listAssets(filters = {}) {
  const params = new URLSearchParams()

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '' && value !== null && value !== undefined) {
      params.set(key, value)
    }
  })

  const query = params.toString()

  return fetch(`${BASE_URL}${query ? `?${query}` : ''}`).then(parseResponse)
}

export function getAsset(id) {
  return fetch(`${BASE_URL}/${id}`).then(parseResponse)
}

export function createAsset(payload) {
  return fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(parseResponse)
}

export function updateAsset(id, payload) {
  return fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(parseResponse)
}
