import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { Mail, Download, Copy, Check } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="btn-secondary flex items-center gap-1.5 text-sm">
      {copied ? <><Check size={14} className="text-green-500" /> Copied</> : <><Copy size={14} /> Copy HTML</>}
    </button>
  )
}

const EMAIL_TYPES = [
  'Product Launch',
  'Festival Sale Offer',
  'Newsletter',
  'Payment Reminder',
  'Event Invite',
  'B2B Outreach',
  'Welcome Email',
  'Thank You Email',
]

function AiGenerator() {
  const [form, setForm] = useState({
    email_type: EMAIL_TYPES[0],
    brand_name: '',
    brand_color: '#6366f1',
    key_message: '',
    language: 'english',
  })
  const [loading, setLoading] = useState(false)
  const [html, setHtml] = useState('')
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.generateEmail(form)
      setHtml(data.html)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.email_type.replace(/\s+/g, '_')}_email.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <form onSubmit={handleGenerate} className="card p-5 space-y-4">
        <div>
          <label className="label">Email Type</label>
          <select className="select" value={form.email_type} onChange={set('email_type')}>
            {EMAIL_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Brand Name *</label>
          <input className="input" placeholder="e.g. Sharma Steel" value={form.brand_name} onChange={set('brand_name')} required />
        </div>
        <div>
          <label className="label">Brand Color</label>
          <div className="flex gap-2 items-center">
            <input type="color" className="h-10 w-16 rounded cursor-pointer border border-gray-200" value={form.brand_color} onChange={set('brand_color')} />
            <input className="input font-mono" placeholder="#6366f1" value={form.brand_color} onChange={set('brand_color')} />
          </div>
        </div>
        <div>
          <label className="label">Key Message *</label>
          <textarea
            className="input min-h-28 resize-none"
            placeholder="e.g. Diwali offer: 20% off on all products until Oct 25. Use code DIWALI20 at checkout."
            value={form.key_message}
            onChange={set('key_message')}
            required
          />
        </div>
        <div>
          <label className="label">Language</label>
          <select className="select" value={form.language} onChange={set('language')}>
            <option value="english">English</option>
            <option value="hindi">Hindi</option>
            <option value="marathi">Marathi</option>
          </select>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? 'Generating...' : 'Generate Email'}
        </button>
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </form>

      <div>
        {loading && <LoadingSpinner text="Designing your email..." />}

        {!loading && !html && (
          <div className="card p-8 text-center text-gray-400 h-full flex flex-col items-center justify-center">
            <Mail size={40} className="mb-3 opacity-30" />
            <p>Your email preview will appear here.</p>
          </div>
        )}

        {html && (
          <div className="card overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <span className="text-sm text-gray-600 font-medium">Preview</span>
              <div className="flex gap-2">
                <CopyButton text={html} />
                <button onClick={handleDownload} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
            <iframe
              srcDoc={html}
              title="Email Preview"
              className="w-full min-h-96"
              style={{ height: '500px' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function TemplateLibrary() {
  const [templates, setTemplates] = useState([])
  const [selected, setSelected] = useState(null)
  const [templateData, setTemplateData] = useState(null)

  useEffect(() => {
    api.listTemplates().then(setTemplates).catch(() => {})
  }, [])

  const handleSelect = async (id) => {
    setSelected(id)
    const data = await api.getTemplate(id)
    setTemplateData(data)
  }

  const handleDownload = () => {
    if (!templateData) return
    const blob = new Blob([templateData.html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${templateData.name}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div>
        <div className="text-sm font-medium text-gray-600 mb-3">Choose a template</div>
        <div className="space-y-2">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => handleSelect(t.id)}
              className={`w-full text-left card px-4 py-3 transition-colors ${
                selected === t.id ? 'border-brand-400 bg-brand-50' : 'hover:border-gray-300'
              }`}
            >
              <div className="text-sm font-medium text-gray-900">{t.name}</div>
              <div className="text-xs text-gray-400 mt-0.5 truncate">{t.subject}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {!templateData && (
          <div className="card p-8 text-center text-gray-400 flex flex-col items-center justify-center" style={{ minHeight: 300 }}>
            <Mail size={40} className="mb-3 opacity-30" />
            <p>Select a template to preview it here.</p>
          </div>
        )}
        {templateData && (
          <div className="card overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <div className="text-sm font-medium text-gray-900">{templateData.name}</div>
                <div className="text-xs text-gray-400">Subject: {templateData.subject}</div>
              </div>
              <div className="flex gap-2">
                <CopyButton text={templateData.html} />
                <button onClick={handleDownload} className="btn-secondary flex items-center gap-1.5 text-sm">
                  <Download size={14} /> Download
                </button>
              </div>
            </div>
            <iframe
              srcDoc={templateData.html}
              title="Template Preview"
              className="w-full"
              style={{ height: '500px' }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default function EmailBuilder() {
  const [tab, setTab] = useState('ai')

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="text-emerald-500" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Builder</h1>
          <p className="text-sm text-gray-500">AI-generated or pre-built responsive email templates</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[['ai', 'AI Generator'], ['templates', 'Template Library']].map(([id, label]) => (
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

      {tab === 'ai' ? <AiGenerator /> : <TemplateLibrary />}
    </div>
  )
}
