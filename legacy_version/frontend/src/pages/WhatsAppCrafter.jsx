import { useState } from 'react'
import { api } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { MessageCircle, Copy, Check } from 'lucide-react'

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={handle} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3">
      {copied ? <><Check size={13} className="text-green-500" /> Copied</> : <><Copy size={13} /> Copy</>}
    </button>
  )
}

const VARIANTS = [
  { key: 'formal', label: 'Formal', desc: 'Professional & respectful', color: 'bg-blue-50 border-blue-100' },
  { key: 'casual', label: 'Casual', desc: 'Friendly & conversational', color: 'bg-green-50 border-green-100' },
  { key: 'urgency', label: 'Urgency', desc: 'Creates FOMO', color: 'bg-orange-50 border-orange-100' },
]

const FORMATTING_TIPS = [
  { sym: '*text*', label: 'Bold — for key info' },
  { sym: '_text_', label: 'Italic — for softer emphasis' },
  { sym: '~text~', label: 'Strikethrough — show old price' },
  { sym: '```text```', label: 'Monospace — for codes/offers' },
]

export default function WhatsAppCrafter() {
  const [form, setForm] = useState({ message: '', audience: '', language: 'english' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.generateWhatsApp(form)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <MessageCircle className="text-green-500" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp Crafter</h1>
          <p className="text-sm text-gray-500">Write the perfect WhatsApp message in 3 tones</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1 space-y-4">
          <form onSubmit={handleGenerate} className="card p-5 space-y-4">
            <div>
              <label className="label">Offer / Message *</label>
              <textarea
                className="input min-h-28 resize-none"
                placeholder="e.g. Flat 20% off on all steel furniture this week. Buy 2 items and get free delivery."
                value={form.message}
                onChange={set('message')}
                required
              />
            </div>
            <div>
              <label className="label">Target Audience *</label>
              <input
                className="input"
                placeholder="e.g. Existing customers who bought last year"
                value={form.audience}
                onChange={set('audience')}
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
              {loading ? 'Crafting...' : 'Generate 3 Variations'}
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>

          {/* Formatting tips */}
          <div className="card p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">WhatsApp Formatting Tips</div>
            <div className="space-y-2">
              {FORMATTING_TIPS.map(({ sym, label }) => (
                <div key={sym} className="flex items-start gap-2 text-xs">
                  <code className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded font-mono shrink-0">{sym}</code>
                  <span className="text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading && <LoadingSpinner text="Crafting your messages..." />}

          {!loading && !result && (
            <div className="card p-8 text-center text-gray-400">
              <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p>Your 3 message variations will appear here.</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {VARIANTS.map(({ key, label, desc, color }) => {
                const text = result[key] || ''
                return (
                  <div key={key} className={`card p-4 border ${color}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-900">{label}</span>
                        <span className="text-xs text-gray-400 ml-2">{desc}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{text.length} chars</span>
                        <CopyButton text={text} />
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-white rounded-lg p-3 border border-gray-100">
                      {text}
                    </p>
                  </div>
                )
              })}

              {result.tips?.length > 0 && (
                <div className="card p-4 bg-yellow-50 border-yellow-100">
                  <div className="text-sm font-medium text-yellow-800 mb-2">💡 Tips for this message</div>
                  <ul className="space-y-1">
                    {result.tips.map((t, i) => (
                      <li key={i} className="text-xs text-yellow-700 flex gap-2">
                        <span>·</span> {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
