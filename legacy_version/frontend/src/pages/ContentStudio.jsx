import { useState } from 'react'
import { api } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { PenSquare, Copy, Check, Hash } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handleCopy} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
      {copied ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy</>}
    </button>
  )
}

function PostGenerator() {
  const [form, setForm] = useState({
    platform: 'Instagram',
    tone: 'casual',
    language: 'english',
    description: '',
    brand_name: '',
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.generatePost(form)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <form onSubmit={handleGenerate} className="card p-5 space-y-4">
          <div>
            <label className="label">Platform</label>
            <select className="select" value={form.platform} onChange={set('platform')}>
              {['Instagram', 'LinkedIn', 'WhatsApp', 'Facebook'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Brand Name (optional)</label>
            <input className="input" placeholder="e.g. Sharma Steel" value={form.brand_name} onChange={set('brand_name')} />
          </div>
          <div>
            <label className="label">Tone</label>
            <select className="select" value={form.tone} onChange={set('tone')}>
              <option value="casual">Casual</option>
              <option value="professional">Professional</option>
              <option value="festive">Festive</option>
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select className="select" value={form.language} onChange={set('language')}>
              <option value="english">English</option>
              <option value="hindi">Hindi</option>
              <option value="marathi">Marathi</option>
            </select>
          </div>
          <div>
            <label className="label">What to communicate *</label>
            <textarea
              className="input min-h-24 resize-none"
              placeholder="e.g. New collection of modular wardrobes launched. Special 15% off for first 50 customers."
              value={form.description}
              onChange={set('description')}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Generating...' : 'Generate 3 Variations'}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </div>

      <div className="lg:col-span-2">
        {loading && <LoadingSpinner text="Writing your posts..." />}

        {!loading && !result && (
          <div className="card p-8 text-center text-gray-400">
            <PenSquare size={40} className="mx-auto mb-3 opacity-30" />
            <p>Generate 3 ready-to-use caption variations with hashtags.</p>
          </div>
        )}

        {result?.variations && (
          <div className="space-y-4">
            {result.variations.map((v, i) => (
              <div key={i} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    Variation {i + 1}
                  </span>
                  <CopyButton text={`${v.caption}\n\n${v.hashtags}`} />
                </div>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">{v.caption}</p>
                {v.hashtags && (
                  <p className="mt-2 text-xs text-blue-500 break-all">{v.hashtags}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HashtagTool() {
  const [form, setForm] = useState({ niche: '', platform: 'Instagram', location: 'Maharashtra, India' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.generateHashtags(form)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const allHashtags = result
    ? [...(result.broad || []), ...(result.niche || []), ...(result.local || [])].map(h => `#${h}`).join(' ')
    : ''

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <form onSubmit={handleGenerate} className="card p-5 space-y-4">
          <div>
            <label className="label">Business Niche *</label>
            <input className="input" placeholder="e.g. Steel furniture, Textile, Bakery" value={form.niche} onChange={set('niche')} required />
          </div>
          <div>
            <label className="label">Platform</label>
            <select className="select" value={form.platform} onChange={set('platform')}>
              {['Instagram', 'LinkedIn', 'Facebook'].map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Maharashtra, India" value={form.location} onChange={set('location')} />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Hashtags'}
          </button>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </form>
      </div>

      <div className="lg:col-span-2">
        {loading && <LoadingSpinner text="Finding the best hashtags..." />}

        {!loading && !result && (
          <div className="card p-8 text-center text-gray-400">
            <Hash size={40} className="mx-auto mb-3 opacity-30" />
            <p>Get hashtags grouped by broad, niche, and local categories.</p>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <CopyButton text={allHashtags} />
            </div>
            {[['broad', 'Broad', 'bg-gray-100 text-gray-700'],
              ['niche', 'Niche', 'bg-brand-50 text-brand-700'],
              ['local', 'Local', 'bg-green-50 text-green-700']].map(([key, label, cls]) => (
              result[key]?.length > 0 && (
                <div key={key} className="card p-4">
                  <div className="text-sm font-medium text-gray-600 mb-2">{label}</div>
                  <div className="flex flex-wrap gap-2">
                    {result[key].map((h, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-full ${cls}`}>#{h}</span>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ContentStudio() {
  const [tab, setTab] = useState('post')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <PenSquare className="text-blue-500" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Studio</h1>
          <p className="text-sm text-gray-500">Generate posts and hashtags for any platform</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[['post', 'Post Generator'], ['hashtags', 'Hashtag Tool']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'post' ? <PostGenerator /> : <HashtagTool />}
    </div>
  )
}
