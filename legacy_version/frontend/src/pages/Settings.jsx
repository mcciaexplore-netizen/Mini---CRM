import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { Trash2, ToggleLeft, ToggleRight, Plus, Key, User } from 'lucide-react'

const PROVIDERS = ['gemini', 'groq', 'mistral', 'cohere', 'openai']

const PROVIDER_INFO = {
  gemini: { label: 'Google Gemini', free: 'Free tier available', link: 'https://aistudio.google.com/app/apikey' },
  groq: { label: 'Groq', free: 'Free tier available', link: 'https://console.groq.com/keys' },
  mistral: { label: 'Mistral AI', free: 'Free trial', link: 'https://console.mistral.ai/api-keys/' },
  cohere: { label: 'Cohere', free: 'Free trial', link: 'https://dashboard.cohere.com/api-keys' },
  openai: { label: 'OpenAI', free: 'Paid', link: 'https://platform.openai.com/api-keys' },
}

function ApiKeyManager() {
  const [keys, setKeys] = useState([])
  const [form, setForm] = useState({ provider: 'gemini', api_key: '', label: '' })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const load = () => api.listKeys().then(setKeys).catch(() => {})

  useEffect(() => { load() }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setAdding(true)
    try {
      await api.addKey(form)
      setForm({ provider: 'gemini', api_key: '', label: '' })
      load()
    } catch (err) {
      setError(err.message)
    } finally {
      setAdding(false)
    }
  }

  const handleToggle = async (id) => {
    await api.toggleKey(id)
    load()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this API key?')) return
    await api.deleteKey(id)
    load()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Key size={18} className="text-brand-500" />
        <h2 className="font-semibold text-gray-900">API Keys</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        Add your own free API keys. The app rotates between them automatically and skips rate-limited keys.
      </p>

      {/* Add form */}
      <form onSubmit={handleAdd} className="card p-4 mb-5 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Provider</label>
            <select
              className="select"
              value={form.provider}
              onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}
            >
              {PROVIDERS.map(p => (
                <option key={p} value={p}>{PROVIDER_INFO[p].label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">
              API Key
              <a
                href={PROVIDER_INFO[form.provider]?.link}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-brand-500 text-xs font-normal"
              >
                Get free key ↗
              </a>
            </label>
            <input
              className="input font-mono text-xs"
              type="password"
              placeholder="Paste your API key"
              value={form.api_key}
              onChange={(e) => setForm(f => ({ ...f, api_key: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="label">Label (optional)</label>
            <input
              className="input"
              placeholder="e.g. My Gemini Key"
              value={form.label}
              onChange={(e) => setForm(f => ({ ...f, label: e.target.value }))}
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={adding}>
          <Plus size={16} /> {adding ? 'Adding...' : 'Add Key'}
        </button>
      </form>

      {/* Keys list */}
      <div className="space-y-2">
        {keys.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-6">No API keys added yet.</div>
        )}
        {keys.map((k) => (
          <div key={k.id} className="card px-4 py-3 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {PROVIDER_INFO[k.provider]?.label || k.provider}
                </span>
                {k.label && <span className="text-xs text-gray-400">· {k.label}</span>}
                {!k.is_active && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Paused</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {k.calls_today} calls today · {k.calls_month} this month
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleToggle(k.id)}
                className="text-gray-400 hover:text-brand-500 transition-colors"
                title={k.is_active ? 'Pause key' : 'Activate key'}
              >
                {k.is_active ? <ToggleRight size={22} className="text-brand-500" /> : <ToggleLeft size={22} />}
              </button>
              <button
                onClick={() => handleDelete(k.id)}
                className="text-gray-300 hover:text-red-400 transition-colors"
                title="Delete key"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BusinessProfileForm() {
  const [profile, setProfile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {})
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.updateProfile(profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return <div className="text-sm text-gray-400">Loading...</div>

  const field = (key) => ({
    value: profile[key] || '',
    onChange: (e) => setProfile(p => ({ ...p, [key]: e.target.value })),
  })

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <User size={18} className="text-brand-500" />
        <h2 className="font-semibold text-gray-900">Business Profile</h2>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        This info is used to pre-personalize every content generation request.
      </p>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Business Name</label>
            <input className="input" placeholder="e.g. Sharma Steel" {...field('name')} />
          </div>
          <div>
            <label className="label">Industry</label>
            <input className="input" placeholder="e.g. Steel Furniture, Textile, Food" {...field('industry')} />
          </div>
          <div>
            <label className="label">Target Audience</label>
            <input className="input" placeholder="e.g. Home buyers in Pune aged 25-45" {...field('target_audience')} />
          </div>
          <div>
            <label className="label">Brand Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" className="h-10 w-16 rounded cursor-pointer border border-gray-200" {...field('brand_color')} />
              <input className="input" placeholder="#6366f1" {...field('brand_color')} />
            </div>
          </div>
          <div>
            <label className="label">Default Language</label>
            <select className="select" {...field('default_language')}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
            </select>
          </div>
          <div>
            <label className="label">Default Tone</label>
            <select className="select" {...field('default_tone')}>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="festive">Festive</option>
            </select>
          </div>
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}

export default function Settings() {
  const [tab, setTab] = useState('keys')

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[['keys', 'API Keys'], ['profile', 'Business Profile']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'keys' ? <ApiKeyManager /> : <BusinessProfileForm />}
      </div>
    </div>
  )
}
