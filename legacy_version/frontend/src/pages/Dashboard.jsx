import { Link } from 'react-router-dom'
import { CalendarRange, PenSquare, Mail, MessageCircle, ArrowRight } from 'lucide-react'

const modules = [
  {
    to: '/campaign',
    icon: CalendarRange,
    color: 'bg-violet-500',
    light: 'bg-violet-50',
    title: 'Campaign Planner',
    description: 'Get a week-by-week marketing calendar with Indian festival tie-ins.',
  },
  {
    to: '/content',
    icon: PenSquare,
    color: 'bg-blue-500',
    light: 'bg-blue-50',
    title: 'Content Studio',
    description: 'Generate social media captions, hashtags, and post ideas.',
  },
  {
    to: '/email',
    icon: Mail,
    color: 'bg-emerald-500',
    light: 'bg-emerald-50',
    title: 'Email Builder',
    description: 'Create responsive HTML emails with AI or pick from templates.',
  },
  {
    to: '/whatsapp',
    icon: MessageCircle,
    color: 'bg-green-500',
    light: 'bg-green-50',
    title: 'WhatsApp Crafter',
    description: 'Craft WhatsApp messages in 3 tones: formal, casual, urgency.',
  },
]

export default function Dashboard() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome to ProMarketer</h1>
        <p className="mt-2 text-gray-500 text-lg">
          Your free, AI-powered marketing assistant. No subscription. No cloud lock-in.
        </p>
      </div>

      {/* Setup banner */}
      <div className="mb-8 card p-5 border-brand-200 bg-brand-50 flex items-center justify-between gap-4">
        <div>
          <div className="font-semibold text-brand-700">Get started in 2 minutes</div>
          <div className="text-sm text-brand-600 mt-0.5">
            Add a free API key (Gemini is recommended) and fill in your business profile.
          </div>
        </div>
        <Link to="/settings" className="btn-primary flex items-center gap-2 shrink-0">
          Open Settings <ArrowRight size={16} />
        </Link>
      </div>

      {/* Module cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {modules.map(({ to, icon: Icon, color, light, title, description }) => (
          <Link
            key={to}
            to={to}
            className="card p-6 hover:shadow-md transition-shadow group flex flex-col gap-4"
          >
            <div className={`w-12 h-12 rounded-xl ${light} flex items-center justify-center`}>
              <Icon className={`${color.replace('bg-', 'text-')}`} size={24} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">
                {title}
              </div>
              <div className="text-sm text-gray-500 mt-1">{description}</div>
            </div>
            <div className="flex items-center text-sm font-medium text-brand-600 gap-1">
              Open <ArrowRight size={14} />
            </div>
          </Link>
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center text-xs text-gray-400">
        ProMarketer is free and open source · Built for Indian MSMEs by MCCIA
      </div>
    </div>
  )
}
