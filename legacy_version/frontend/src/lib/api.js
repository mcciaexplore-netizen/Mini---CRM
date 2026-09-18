const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.detail || `Request failed: ${res.status}`)
  }
  return data
}

export const api = {
  // API Keys
  listKeys: () => request('/keys/'),
  addKey: (body) => request('/keys/', { method: 'POST', body: JSON.stringify(body) }),
  toggleKey: (id) => request(`/keys/${id}/toggle`, { method: 'PATCH' }),
  deleteKey: (id) => request(`/keys/${id}`, { method: 'DELETE' }),
  updatePriority: (id, priority) => request(`/keys/${id}/priority?priority=${priority}`, { method: 'PATCH' }),

  // Settings / Profile
  getProfile: () => request('/settings/profile'),
  updateProfile: (body) => request('/settings/profile', { method: 'PATCH', body: JSON.stringify(body) }),

  // Campaign
  generateCampaign: (body) => request('/campaign/generate', { method: 'POST', body: JSON.stringify(body) }),
  listCampaigns: () => request('/campaign/'),
  getCampaign: (id) => request(`/campaign/${id}`),
  deleteCampaign: (id) => request(`/campaign/${id}`, { method: 'DELETE' }),

  // Content Studio
  generatePost: (body) => request('/content/post/generate', { method: 'POST', body: JSON.stringify(body) }),
  generateHashtags: (body) => request('/content/hashtags/generate', { method: 'POST', body: JSON.stringify(body) }),
  listDrafts: () => request('/content/drafts'),

  // Email Builder
  generateEmail: (body) => request('/email/generate', { method: 'POST', body: JSON.stringify(body) }),
  listTemplates: () => request('/email/templates'),
  getTemplate: (id) => request(`/email/templates/${id}`),

  // WhatsApp
  generateWhatsApp: (body) => request('/whatsapp/generate', { method: 'POST', body: JSON.stringify(body) }),
}
