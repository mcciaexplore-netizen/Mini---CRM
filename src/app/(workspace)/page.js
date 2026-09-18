"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  ChevronRight,
  Instagram,
  Linkedin,
  MessageSquare,
  MoreVertical,
  Plus,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { getCurrentProfile, getDashboard } from '@/lib/db'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  NEW: '#DBEAFE',
  CONTACTED: '#E5E7EB',
  INTERESTED: '#DCFCE7',
  NEGOTIATING: '#FEF3C7',
  WON: '#BBF7D0',
  LOST: '#FECACA',
}

const PLATFORM_META = {
  Instagram: { icon: Instagram, color: 'text-pink-600' },
  LinkedIn: { icon: Linkedin, color: 'text-blue-700' },
  WhatsApp: { icon: MessageSquare, color: 'text-green-600' },
}

const formatRelativeLabel = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

const formatActionDate = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unscheduled'

  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const StatusBadge = ({ status }) => {
  const styles = {
    NEW: 'badge-primary',
    INTERESTED: 'badge-success',
    NEGOTIATING: 'badge-warning',
    CONTACTED: 'bg-gray-100 text-gray-800',
    WON: 'bg-green-100 text-green-800',
    LOST: 'bg-red-100 text-red-800',
  }

  return (
    <span className={`badge ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  )
}

export default function Dashboard() {
  const [userName, setUserName] = useState('there')
  const [campaigns, setCampaigns] = useState([])
  const [leads, setLeads] = useState([])
  const [scheduledPosts, setScheduledPosts] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [profile, data] = await Promise.all([getCurrentProfile(), getDashboard()])
        if (!mounted) return
        setUserName(profile?.full_name?.split(' ')[0] || 'there')
        setCampaigns(data.campaigns); setLeads(data.leads); setScheduledPosts(data.posts)
      } catch (error) { if (mounted) toast.error(error.message) }
      finally { if (mounted) setIsLoading(false) }
    }
    load()
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const interval = setInterval(refresh, 30000)
    window.addEventListener('focus', refresh)
    return () => { mounted = false; clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [])

  const dashboardData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const activeCampaigns = campaigns.filter((campaign) => campaign.status !== 'completed').length
    const completedCampaigns = campaigns.filter((campaign) => campaign.status === 'completed').length

    const leadsThisMonth = leads.filter((lead) => {
      const createdAt = new Date(lead.created_at)
      return createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear
    }).length

    const previousMonthLeads = leads.filter((lead) => {
      const createdAt = new Date(lead.created_at)
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return createdAt.getMonth() === previousMonth && createdAt.getFullYear() === previousYear
    }).length

    const upcomingPosts = scheduledPosts.filter((post) => {
      const scheduledAt = new Date(post.scheduled_at)
      return !Number.isNaN(scheduledAt.getTime()) && scheduledAt >= now && post.status !== 'Published'
    })

    const scheduledThisMonth = scheduledPosts.filter((post) => {
      const scheduledAt = new Date(post.scheduled_at)
      return scheduledAt.getMonth() === currentMonth && scheduledAt.getFullYear() === currentYear
    }).length

    const previousMonthPosts = scheduledPosts.filter((post) => {
      const scheduledAt = new Date(post.scheduled_at)
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear
      return scheduledAt.getMonth() === previousMonth && scheduledAt.getFullYear() === previousYear
    }).length

    const leadsByStatus = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'WON', 'LOST']
      .map((status) => ({
        name: status,
        value: leads.filter((lead) => lead.status === status).length,
        color: STATUS_COLORS[status] || '#E5E7EB',
      }))
      .filter((entry) => entry.value > 0)

    const recentLeads = leads.slice(0, 5)

    const upcomingActions = [
      ...upcomingPosts.slice(0, 4).map((post) => ({
        id: post.id,
        date: formatActionDate(post.scheduled_at),
        sortAt: new Date(post.scheduled_at).getTime(),
        title: post.caption || 'Untitled post',
        platform: Array.isArray(post.platforms) ? post.platforms.join(' + ') : 'Social',
        type: 'Scheduled Post',
      })),
      ...leads
        .filter((lead) => lead.next_followup)
        .sort((a, b) => new Date(a.next_followup) - new Date(b.next_followup))
        .slice(0, 3)
        .map((lead) => ({
          id: `followup-${lead.id}`,
          date: formatActionDate(lead.next_followup),
          sortAt: new Date(lead.next_followup).getTime(),
          title: `Follow up with ${lead.name}`,
          platform: lead.company || 'Lead',
          type: 'Sales Follow-up',
        })),
    ]
      .sort((a, b) => a.sortAt - b.sortAt)
      .slice(0, 5)

    const contentDue = upcomingPosts.slice(0, 4).map((post) => {
      const firstPlatform = Array.isArray(post.platforms) ? post.platforms[0] : 'WhatsApp'
      const meta = PLATFORM_META[firstPlatform] || { icon: CalendarDays, color: 'text-primary' }

      return {
        id: post.id,
        date: new Date(post.scheduled_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        platform: firstPlatform,
        caption: post.caption || 'Untitled scheduled post',
        icon: meta.icon,
        color: meta.color,
      }
    })

    const leadsTrend = previousMonthLeads === 0
      ? leadsThisMonth > 0 ? 100 : 0
      : Math.round(((leadsThisMonth - previousMonthLeads) / previousMonthLeads) * 100)

    const postsTrend = previousMonthPosts === 0
      ? scheduledThisMonth > 0 ? 100 : 0
      : Math.round(((scheduledThisMonth - previousMonthPosts) / previousMonthPosts) * 100)

    return {
      kpis: [
        {
          name: 'Active Campaigns',
          value: String(activeCampaigns),
          trend: completedCampaigns ? `${completedCampaigns} completed` : 'Live now',
          isUp: true,
          icon: Target,
          color: 'text-primary',
          bg: 'bg-[#e6f2fb]',
          comparisonLabel: 'current workspace',
        },
        {
          name: 'Leads This Month',
          value: String(leadsThisMonth),
          trend: `${leadsTrend >= 0 ? '+' : ''}${leadsTrend}%`,
          isUp: leadsTrend >= 0,
          icon: TrendingUp,
          color: 'text-success',
          bg: 'bg-[#e5f4ea]',
          comparisonLabel: 'vs last month',
        },
        {
          name: 'Posts Scheduled',
          value: String(upcomingPosts.length),
          trend: `${postsTrend >= 0 ? '+' : ''}${postsTrend}%`,
          isUp: postsTrend >= 0,
          icon: CalendarDays,
          color: 'text-warning',
          bg: 'bg-[#fef5e1]',
          comparisonLabel: 'vs last month',
        },
      ],
      upcomingActions,
      recentLeads,
      contentDue,
      leadsByStatus,
    }
  }, [campaigns, leads, scheduledPosts])

  return (
    <div className="space-y-6">
      <div className="pb-4">
        <h2 className="text-2xl font-bold tracking-tight text-text-primary">
          Good morning, {userName} 👋
        </h2>
        <p className="text-text-secondary mt-1">Here is your real-time marketing snapshot for today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dashboardData.kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.name} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-secondary">{kpi.name}</p>
                  <p className="text-3xl font-bold text-text-primary mt-2">
                    {isLoading ? '...' : kpi.value}
                  </p>
                </div>
                <div className={`p-3 rounded-full ${kpi.bg}`}>
                  <Icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm">
                {kpi.isUp ? (
                  <TrendingUp className="w-4 h-4 text-success mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-warning mr-1" />
                )}
                <span className={kpi.isUp ? 'text-success font-medium' : 'text-warning font-medium'}>
                  {kpi.trend}
                </span>
                <span className="text-text-secondary ml-2">{kpi.comparisonLabel}</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card flex flex-col">
          <div className="p-5 border-b border-[#E5E5E5] flex justify-between items-center">
            <h3 className="font-bold text-lg">Upcoming Campaign Actions</h3>
            <Link href="/scheduler" className="text-sm text-primary hover:text-primary-hover font-medium">View Calendar</Link>
          </div>
          <div className="p-5 flex-1">
            {dashboardData.upcomingActions.length ? (
              <div className="space-y-6">
                {dashboardData.upcomingActions.map((action, idx) => (
                  <div key={action.id} className="relative pl-6">
                    {idx !== dashboardData.upcomingActions.length - 1 && (
                      <div className="absolute top-6 left-[11px] bottom-[-24px] w-px bg-gray-200" />
                    )}
                    <div className="absolute top-1.5 left-0 w-[22px] h-[22px] rounded-full bg-white border-2 border-primary z-10" />
                    <div>
                      <span className="text-xs font-semibold text-primary uppercase tracking-wider">{action.date}</span>
                      <p className="font-semibold text-text-primary mt-1">{action.title}</p>
                      <p className="text-sm text-text-secondary mt-0.5">{action.type} • {action.platform}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-text-secondary">No upcoming actions yet. Schedule a post or add a follow-up to see it here.</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 card flex flex-col">
          <div className="p-5 border-b border-[#E5E5E5]">
            <h3 className="font-bold text-lg">Quick Actions</h3>
          </div>
          <div className="p-5 grid grid-cols-1 gap-3">
            <Link href="/leads" className="btn-primary w-full shadow-sm">
              <Plus className="w-4 h-4" /> Add New Lead
            </Link>
            <Link href="/scheduler" className="btn-secondary w-full">
              <CalendarDays className="w-4 h-4" /> Schedule Post
            </Link>
            <Link href="/campaigns" className="btn-secondary w-full">
              <Target className="w-4 h-4" /> New Campaign
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card">
          <div className="p-5 border-b border-[#E5E5E5] flex justify-between items-center">
            <h3 className="font-bold text-lg">Recent Leads</h3>
            <Link href="/leads" className="text-sm flex items-center text-primary hover:text-primary-hover font-medium">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Name / Company</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Last Activity</th>
                  <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {dashboardData.recentLeads.length ? dashboardData.recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-text-primary">{lead.name}</div>
                      <div className="text-sm text-text-secondary">{lead.company || 'No company added'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                      {formatRelativeLabel(lead.updated_at || lead.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-gray-400 hover:text-text-primary">
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-sm text-text-secondary">
                      No leads yet. Add your first lead to make the dashboard come alive.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-4 card">
          <div className="p-5 border-b border-[#E5E5E5] flex justify-between items-center">
            <h3 className="font-bold text-lg">Content Due</h3>
          </div>
          <div className="p-5">
            {dashboardData.contentDue.length ? (
              <ul className="space-y-4">
                {dashboardData.contentDue.map((item) => {
                  const PlatformIcon = item.icon
                  return (
                    <li key={item.id} className="flex gap-4">
                      <div className="shrink-0 mt-1">
                        <PlatformIcon className={`w-5 h-5 ${item.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary line-clamp-2">{item.caption}</p>
                        <p className="text-xs text-text-secondary mt-1">{item.platform} • Due {item.date}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="text-sm text-text-secondary">No upcoming content due. Scheduled posts will appear here automatically.</div>
            )}
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Link href="/scheduler" className="text-sm flex items-center text-primary justify-center font-medium">
                Open Content Calendar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-1">
          <div className="p-5 border-b border-[#E5E5E5]">
            <h3 className="font-bold text-lg">Leads by Status</h3>
          </div>
          <div className="p-5 h-[300px]">
            {dashboardData.leadsByStatus.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardData.leadsByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {dashboardData.leadsByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-text-secondary">
                Lead status distribution will show once you have lead data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
