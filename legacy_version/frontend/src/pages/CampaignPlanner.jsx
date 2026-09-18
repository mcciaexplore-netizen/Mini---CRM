import { useState } from 'react'
import { api } from '../lib/api'
import LoadingSpinner from '../components/LoadingSpinner'
import { Download, CalendarRange } from 'lucide-react'

const GOALS = ['Brand Awareness', 'Lead Generation', 'More Sales', 'Customer Retention']
const BUDGETS = ['Under ₹5,000/month', '₹5,000–₹15,000/month', '₹15,000–₹50,000/month', '₹50,000+/month']

export default function CampaignPlanner() {
  const [form, setForm] = useState({
    business_type: '',
    product: '',
    customer: '',
    budget_range: BUDGETS[0],
    goal: GOALS[0],
    duration_days: 30,
    language: 'english',
    campaign_name: '',
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
      const data = await api.generateCampaign(form)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result) return
    const blob = new Blob([JSON.stringify(result.calendar, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.campaign_name || 'campaign'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CalendarRange className="text-violet-500" size={26} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Planner</h1>
          <p className="text-sm text-gray-500">AI-generated week-by-week marketing calendar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-1">
          <form onSubmit={handleGenerate} className="card p-5 space-y-4">
            <div>
              <label className="label">Campaign Name (optional)</label>
              <input className="input" placeholder="e.g. Diwali 2025 Campaign" value={form.campaign_name} onChange={set('campaign_name')} />
            </div>
            <div>
              <label className="label">Business Type *</label>
              <input className="input" placeholder="e.g. Steel Furniture Shop" value={form.business_type} onChange={set('business_type')} required />
            </div>
            <div>
              <label className="label">Product / Service *</label>
              <input className="input" placeholder="e.g. Modular wardrobes, office chairs" value={form.product} onChange={set('product')} required />
            </div>
            <div>
              <label className="label">Target Customer *</label>
              <input className="input" placeholder="e.g. Home buyers in Pune aged 25-45" value={form.customer} onChange={set('customer')} required />
            </div>
            <div>
              <label className="label">Budget Range</label>
              <select className="select" value={form.budget_range} onChange={set('budget_range')}>
                {BUDGETS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Goal</label>
              <select className="select" value={form.goal} onChange={set('goal')}>
                {GOALS.map(g => <option key={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <select className="select" value={form.duration_days} onChange={set('duration_days')}>
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
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
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Generating...' : 'Generate Campaign Plan'}
            </button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {loading && <LoadingSpinner text="Building your campaign calendar..." />}

          {!loading && !result && (
            <div className="card p-8 text-center text-gray-400">
              <CalendarRange size={40} className="mx-auto mb-3 opacity-30" />
              <p>Fill in the form and click Generate to see your campaign calendar here.</p>
            </div>
          )}

          {result && (
            <div>
              {/* Festivals */}
              {result.festivals?.length > 0 && (
                <div className="card p-4 mb-4 bg-orange-50 border-orange-100">
                  <div className="text-sm font-medium text-orange-700 mb-2">🎉 Festivals in this period</div>
                  <div className="flex flex-wrap gap-2">
                    {result.festivals.map((f, i) => (
                      <span key={i} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        {f.name} ({f.date})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900">Campaign Calendar</h2>
                <button onClick={handleDownload} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download size={15} /> Download JSON
                </button>
              </div>

              <div className="space-y-3">
                {result.calendar.map((week, i) => (
                  <div key={i} className="card p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-semibold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                          Week {week.week}
                        </span>
                        {week.dates && (
                          <span className="ml-2 text-xs text-gray-400">{week.dates}</span>
                        )}
                      </div>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full shrink-0">
                        {week.platform}
                      </span>
                    </div>
                    <div className="font-medium text-gray-900">{week.theme}</div>
                    <div className="text-sm text-gray-600 mt-1">Hook: {week.hook}</div>
                    {week.festival_tie_in && week.festival_tie_in !== 'None' && (
                      <div className="text-xs text-orange-600 mt-1">🎉 {week.festival_tie_in}</div>
                    )}
                    {week.content_ideas && (
                      <ul className="mt-2 space-y-1">
                        {week.content_ideas.map((idea, j) => (
                          <li key={j} className="text-xs text-gray-500 flex gap-1.5">
                            <span className="text-gray-300">·</span> {idea}
                          </li>
                        ))}
                      </ul>
                    )}
                    {week.cta && (
                      <div className="mt-2 text-xs font-medium text-brand-600">CTA: {week.cta}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
