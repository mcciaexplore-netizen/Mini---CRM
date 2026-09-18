import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarRange,
  PenSquare,
  Mail,
  MessageCircle,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/campaign', icon: CalendarRange, label: 'Campaign Planner' },
  { to: '/content', icon: PenSquare, label: 'Content Studio' },
  { to: '/email', icon: Mail, label: 'Email Builder' },
  { to: '/whatsapp', icon: MessageCircle, label: 'WhatsApp Crafter' },
]

export default function Sidebar() {
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-2xl">📣</span>
          <div>
            <div className="font-bold text-gray-900 text-lg leading-tight">ProMarketer</div>
            <div className="text-xs text-gray-400">Marketing Assistant</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-50 text-brand-600'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
          }
        >
          <Settings size={18} />
          Settings
        </NavLink>
        <div className="mt-3 px-3 text-xs text-gray-400">v1.0.0 · Free &amp; Open Source</div>
      </div>
    </aside>
  )
}
