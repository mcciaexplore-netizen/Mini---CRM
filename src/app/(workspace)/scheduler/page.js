"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import {
    CalendarDays,
    CalendarRange,
    Check,
    ChevronLeft,
    ChevronRight,
    Facebook,
    Image as ImageIcon,
    Instagram,
    Linkedin,
    List,
    Loader2,
    Pencil,
    Plus,
    Trash2,
    Twitter,
    Wand2,
    X
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
    createScheduledPost,
    deleteScheduledPost,
    getCurrentProfile,
    getGoogleCalendarStatus,
    getScheduledPosts,
    updateScheduledPost
} from '@/lib/db'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const weekdayLabels = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const platformColors = {
    Instagram: '#E1306C',
    LinkedIn: '#0A66C2',
    Facebook: '#1877F2',
    Twitter: '#1DA1F2',
    WhatsApp: '#25D366'
}
const statusClasses = {
    Draft: 'bg-slate-100 text-slate-700',
    Scheduled: 'bg-blue-100 text-[#0176D3]',
    Published: 'bg-emerald-100 text-emerald-700'
}
const characterLimits = {
    Instagram: 2200,
    LinkedIn: 3000,
    Twitter: 280,
    Facebook: 63206,
    WhatsApp: 65536
}
const platformOrder = ['Instagram', 'LinkedIn', 'Facebook', 'Twitter', 'WhatsApp']

const createTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour += 1) {
        for (let minute = 0; minute < 60; minute += 30) {
            options.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)
        }
    }
    return options
}

const timeOptions = createTimeOptions()

const getTodayDateString = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const getNextAvailableTimeSlot = () => {
    const now = new Date()
    const slot = new Date(now)
    slot.setSeconds(0, 0)
    const roundedMinutes = now.getMinutes() <= 30 ? 30 : 60
    slot.setMinutes(roundedMinutes)
    if (roundedMinutes === 60) {
        slot.setHours(slot.getHours() + 1, 0, 0, 0)
    }
    return `${String(slot.getHours()).padStart(2, '0')}:${String(slot.getMinutes()).padStart(2, '0')}`
}

const formatTime = (value) => {
    if (!value) return ''
    const [hours, minutes] = value.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getKolkataPartsFromInstant = (value) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    })

    const parts = Object.fromEntries(formatter.formatToParts(value).map((part) => [part.type, part.value]))
    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hours: Number(parts.hour),
        minutes: Number(parts.minute),
        seconds: Number(parts.second)
    }
}

const parseScheduledAtParts = (value) => {
    if (!value) {
        const now = new Date()
        return {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            day: now.getDate(),
            hours: now.getHours(),
            minutes: now.getMinutes(),
            seconds: now.getSeconds()
        }
    }

    if (value instanceof Date) {
        return {
            year: value.getFullYear(),
            month: value.getMonth() + 1,
            day: value.getDate(),
            hours: value.getHours(),
            minutes: value.getMinutes(),
            seconds: value.getSeconds()
        }
    }

    const raw = String(value).trim()
    const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/)
    if (localMatch) {
        return {
            year: Number(localMatch[1]),
            month: Number(localMatch[2]),
            day: Number(localMatch[3]),
            hours: Number(localMatch[4]),
            minutes: Number(localMatch[5]),
            seconds: Number(localMatch[6] || '0')
        }
    }

    const instantMatch = raw.match(/Z$|[+-]\d{2}:\d{2}$/)
    if (instantMatch) {
        return getKolkataPartsFromInstant(new Date(raw))
    }

    const normalized = raw.replace(' ', 'T')
    return parseScheduledAtParts(`${normalized}:00`)
}

const parseScheduledAt = (value) => {
    const parts = parseScheduledAtParts(value)
    return new Date(parts.year, parts.month - 1, parts.day, parts.hours, parts.minutes, parts.seconds, 0)
}

const toDateInputValue = (date) => {
    const value = parseScheduledAt(date)
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

const toTimeInputValue = (date) => {
    const value = parseScheduledAt(date)
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
}

const buildScheduledAt = (dateString, timeString) => {
    return `${dateString}T${timeString}:00+05:30`
}

const getPlatformIcon = (platform, className = 'w-4 h-4', color) => {
    const style = color ? { color } : undefined
    if (platform === 'Instagram') return <Instagram className={className} style={style} />
    if (platform === 'LinkedIn') return <Linkedin className={className} style={style} />
    if (platform === 'Facebook') return <Facebook className={className} style={style} />
    if (platform === 'Twitter') return <Twitter className={className} style={style} />
    if (platform === 'WhatsApp') return <span className={className} style={style}>💬</span>
    return null
}

const normalizePost = (post) => ({
    ...post,
    platforms: Array.isArray(post.platforms) ? post.platforms : [],
    status: post.status || 'Scheduled'
})

const getInitialFormState = (date = new Date()) => ({
    id: null,
    platforms: [],
    caption: '',
    date: toDateInputValue(date),
    time: getNextAvailableTimeSlot(),
    image_url: '',
    status: 'Scheduled'
})

export default function SchedulerPage() {
    const handledQueryRef = useRef(false)
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState('calendar')
    const [posts, setPosts] = useState([])
    const [currentUser, setCurrentUser] = useState(null)
    const [googleStatus, setGoogleStatus] = useState({ connected: false, autoSync: true, email: null })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isSyncingPost, setIsSyncingPost] = useState(false)
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false)
    const [isPanelOpen, setIsPanelOpen] = useState(false)
    const [expandedDays, setExpandedDays] = useState({})
    const [sortBy, setSortBy] = useState('date')
    const [form, setForm] = useState(getInitialFormState())

    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`

    const loadSchedulerData = useCallback(async () => {
        setIsLoading(true)
        try {
            const [scheduledPosts, profile, googleCalendarStatus] = await Promise.all([
                getScheduledPosts(),
                getCurrentProfile(),
                getGoogleCalendarStatus()
            ])
            setPosts((scheduledPosts || []).map(normalizePost))
            setCurrentUser(profile)
            setGoogleStatus(googleCalendarStatus)
        } catch (error) {
            toast.error(error.message || 'Failed to load scheduler')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSchedulerData()
    }, [loadSchedulerData])

    useEffect(() => {
        if (handledQueryRef.current) return
        if (typeof window === 'undefined') return

        const params = new URLSearchParams(window.location.search)
        const connected = params.get('connected')
        const googleError = params.get('google_error')

        if (connected === 'true') {
            handledQueryRef.current = true
            toast.success('Google Calendar connected!')
            loadSchedulerData()
            window.history.replaceState({}, '', '/scheduler')
        } else if (googleError) {
            handledQueryRef.current = true
            toast.error(`Google Calendar connection failed: ${googleError}`)
            window.history.replaceState({}, '', '/scheduler')
        }
    }, [loadSchedulerData])

    const openCreatePanel = (date = new Date()) => {
        const initial = getInitialFormState(date)
        initial.time = getNextAvailableTimeSlot()
        setForm(initial)
        setIsPanelOpen(true)
    }

    const openEditPanel = (post) => {
        setForm({
            id: post.id,
            platforms: post.platforms || [],
            caption: post.caption || '',
            date: toDateInputValue(post.scheduled_at),
            time: toTimeInputValue(post.scheduled_at),
            image_url: post.image_url || '',
            status: post.status || 'Scheduled'
        })
        setIsPanelOpen(true)
    }

    const currentMonthPosts = posts.filter((post) => {
        const scheduledAt = parseScheduledAt(post.scheduled_at)
        return scheduledAt.getMonth() === currentMonth && scheduledAt.getFullYear() === currentYear
    })

    const firstDayOffset = new Date(currentYear, currentMonth, 1).getDay()
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    const totalCells = Math.ceil((firstDayOffset + totalDaysInMonth) / 7) * 7
    const calendarCells = Array.from({ length: totalCells }, (_, index) => {
        const dayNumber = index - firstDayOffset + 1
        if (dayNumber < 1 || dayNumber > totalDaysInMonth) return null
        const date = new Date(currentYear, currentMonth, dayNumber)
        const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
        const datePosts = currentMonthPosts.filter((post) => {
            const scheduledAt = parseScheduledAt(post.scheduled_at)
            return scheduledAt.getDate() === dayNumber
        })
        return { date, dayNumber, dateKey, posts: datePosts }
    })

    const sortedPosts = [...posts].sort((a, b) => {
        if (sortBy === 'status') return a.status.localeCompare(b.status)
        if (sortBy === 'platform') return (a.platforms?.[0] || '').localeCompare(b.platforms?.[0] || '')
        return parseScheduledAt(a.scheduled_at) - parseScheduledAt(b.scheduled_at)
    })

    const handleFieldChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const togglePlatform = (platform) => {
        setForm((current) => ({
            ...current,
            platforms: current.platforms.includes(platform)
                ? current.platforms.filter((item) => item !== platform)
                : [...current.platforms, platform]
        }))
    }

    const syncPostToGoogle = async (postId, { force = true } = {}) => {
        try {
            setIsSyncingPost(true)
            const response = await fetch('/api/scheduler/sync-calendar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(force ? { 'x-force-sync': '1' } : {})
                },
                body: JSON.stringify({ postId })
            })
            const result = await response.json()
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to sync post')
            }
            toast.success('📅 Synced to Google Calendar')
            await loadSchedulerData()
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSyncingPost(false)
        }
    }

    const handleSave = async (event) => {
        if (event) event.preventDefault()
        if (form.platforms.length === 0) {
            toast.error('Select at least one platform')
            return
        }
        if (!form.caption.trim()) {
            toast.error('Caption is required')
            return
        }

        setIsSaving(true)
        try {
            const payload = {
                platforms: form.platforms,
                caption: form.caption.trim(),
                image_url: form.image_url.trim() || null,
                scheduled_at: buildScheduledAt(form.date, form.time),
                status: form.status
            }

            const savedPost = form.id
                ? await updateScheduledPost(form.id, payload)
                : await createScheduledPost(payload)

            toast.success(form.id ? 'Post updated' : 'Post scheduled')
            setIsPanelOpen(false)
            setForm(getInitialFormState())
            await loadSchedulerData()

            if (googleStatus.autoSync !== false) {
                await syncPostToGoogle(savedPost.id, { force: false })
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save post')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (post) => {
        if (!currentUser || !['owner', 'manager'].includes(currentUser.role)) {
            toast.error('Only manager or owner can delete posts')
            return
        }

        setIsSaving(true)
        try {
            if (post.google_event_id) {
                const response = await fetch(`/api/scheduler/sync-calendar?postId=${post.id}`, { method: 'DELETE' })
                if (!response.ok) { const result = await response.json(); throw new Error(result.error || 'Could not delete the calendar event.'); }
            }
            await deleteScheduledPost(post.id)
            toast.success('Post deleted')
            setIsPanelOpen(false)
            await loadSchedulerData()
        } catch (error) {
            toast.error(error.message || 'Failed to delete post')
        } finally {
            setIsSaving(false)
        }
    }

    const handleGenerateCaption = async () => {
        if (form.platforms.length === 0) {
            toast.error('Pick a platform before generating')
            return
        }

        setIsGeneratingCaption(true)
        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: form.platforms[0],
                    topic: form.caption.trim()
                })
            })
            const result = await response.json()
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to generate caption')
            }
            setForm((current) => ({ ...current, caption: result.caption }))
            toast.success('Caption generated')
        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsGeneratingCaption(false)
        }
    }

    const toggleDayExpansion = (dateKey) => {
        setExpandedDays((current) => ({ ...current, [dateKey]: !current[dateKey] }))
    }

    const isValidImageUrl = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)$/i.test(form.image_url.trim())
    const overLimitPlatforms = form.platforms.filter((platform) => form.caption.length > (characterLimits[platform] || Infinity))
    const nearingLimitPlatforms = form.platforms.filter((platform) => {
        const limit = characterLimits[platform] || Infinity
        return form.caption.length >= limit * 0.9 && form.caption.length < limit
    })

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <h1 className="text-[28px] font-extrabold tracking-tight text-text-primary">Content Scheduler</h1>
                    <p className="mt-1 text-text-secondary">Plan and schedule your social media content</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {googleStatus.connected ? (
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                            <Check className="h-4 w-4" />
                            Google Calendar Connected
                        </div>
                    ) : (
                        <a href="/api/auth/google" className="btn-secondary !border-slate-300 !px-4 !py-2 text-sm">
                            <CalendarRange className="h-4 w-4" />
                            Connect Google Calendar
                        </a>
                    )}

                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                        <button
                            className={`rounded-lg px-3 py-2 ${view === 'calendar' ? 'bg-[#0176D3] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setView('calendar')}
                        >
                            <CalendarDays className="h-4 w-4" />
                        </button>
                        <button
                            className={`rounded-lg px-3 py-2 ${view === 'list' ? 'bg-[#0176D3] text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            onClick={() => setView('list')}
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>

                    <button className="btn-primary !rounded-xl !bg-[#0176D3]" onClick={() => openCreatePanel(new Date())}>
                        <Plus className="h-4 w-4" />
                        Schedule Post
                    </button>
                </div>
            </div>

            {view === 'calendar' ? (
                <div className="card overflow-hidden border-slate-200">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <button
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                                onClick={() => setCurrentDate(new Date(currentYear, currentMonth - 1, 1))}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <h2 className="min-w-[180px] text-center text-lg font-bold">
                                {monthNames[currentMonth]} {currentYear}
                            </h2>
                            <button
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                                onClick={() => setCurrentDate(new Date(currentYear, currentMonth + 1, 1))}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>

                        <button className="btn-secondary !border-slate-300 !px-4 !py-2 text-sm" onClick={() => setCurrentDate(new Date())}>
                            Today
                        </button>
                    </div>

                    <div className="grid grid-cols-7 border-b-2 border-slate-200 bg-slate-50">
                        {weekdayLabels.map((day) => (
                            <div key={day} className="py-3 text-center text-[11px] font-bold tracking-[1px] text-slate-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {isLoading ? (
                        <div className="flex min-h-[520px] items-center justify-center bg-white">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 bg-white">
                            {calendarCells.map((cell, index) => {
                                if (!cell) {
                                    return <div key={`empty-${index}`} className="min-h-[140px] border-b border-r border-slate-200 bg-slate-50" />
                                }

                                const isToday = cell.dateKey === todayKey
                                const isPast = cell.date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                                const shouldExpand = expandedDays[cell.dateKey]
                                const visiblePosts = shouldExpand || cell.posts.length <= 3 ? cell.posts : cell.posts.slice(0, 2)
                                const hiddenCount = cell.posts.length > 3 && !shouldExpand ? cell.posts.length - 2 : 0

                                return (
                                    <div
                                        key={cell.dateKey}
                                        className={`group relative min-h-[140px] border-b border-r border-slate-200 p-2 transition ${isToday ? 'bg-[#EFF6FF]' : isPast ? 'bg-[#FAFAFA]' : 'bg-white hover:bg-[#F8FAFC]'}`}
                                        onClick={() => openCreatePanel(cell.date)}
                                    >
                                        <button
                                            className="absolute right-2 top-2 hidden rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 shadow-sm transition group-hover:block"
                                            onClick={(event) => {
                                                event.stopPropagation()
                                                openCreatePanel(cell.date)
                                            }}
                                        >
                                            + Add
                                        </button>

                                        <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-[#0176D3] text-white' : isPast ? 'text-slate-300' : 'text-slate-700'}`}>
                                            {cell.dayNumber}
                                        </div>

                                        <div className="space-y-1.5">
                                            {visiblePosts.map((post) => {
                                                const color = platformColors[post.platforms?.[0]] || '#64748B'
                                                const preview = (post.caption || '').trim() || 'Untitled post'
                                                const truncated = preview.length > 20 ? `${preview.slice(0, 20)}...` : preview
                                                const extraCount = Math.max((post.platforms?.length || 1) - 1, 0)
                                                return (
                                                    <button
                                                        key={post.id}
                                                        className="flex h-[22px] w-full items-center gap-1 rounded px-1.5 text-left text-[11px] font-semibold text-white transition hover:brightness-95"
                                                        style={{ backgroundColor: color, opacity: isPast ? 0.7 : 1 }}
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            openEditPanel(post)
                                                        }}
                                                        title={post.caption}
                                                    >
                                                        <span className="shrink-0">
                                                            {getPlatformIcon(post.platforms?.[0], 'h-3 w-3', '#FFFFFF')}
                                                        </span>
                                                        {extraCount > 0 && <span className="shrink-0">+{extraCount}</span>}
                                                        <span className="shrink-0">{formatTime(toTimeInputValue(post.scheduled_at))}</span>
                                                        <span className="truncate">{truncated}</span>
                                                    </button>
                                                )
                                            })}

                                            {hiddenCount > 0 && (
                                                <button
                                                    className="flex h-[22px] w-full items-center rounded bg-slate-200 px-1.5 text-[11px] font-semibold text-slate-600"
                                                    onClick={(event) => {
                                                        event.stopPropagation()
                                                        toggleDayExpansion(cell.dateKey)
                                                    }}
                                                >
                                                    +{hiddenCount} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="card overflow-hidden border-slate-200">
                    <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="text-lg font-bold">Scheduled Posts</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[1px] text-slate-400">Sort by</span>
                            <select className="input-field !w-auto !py-2 text-sm" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                                <option value="date">Date</option>
                                <option value="status">Status</option>
                                <option value="platform">Platform</option>
                            </select>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="flex min-h-[320px] items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : sortedPosts.length === 0 ? (
                        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 bg-white px-6 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#0176D3]">
                                <CalendarDays className="h-8 w-8" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">No posts scheduled yet</h3>
                                <p className="mt-1 text-sm text-text-secondary">Create your first scheduled post to start populating the calendar.</p>
                            </div>
                            <button className="btn-primary !bg-[#0176D3]" onClick={() => openCreatePanel(new Date())}>
                                <Plus className="h-4 w-4" />
                                Schedule Post
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200">
                                <thead className="bg-white">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Platform(s)</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Caption preview</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Scheduled Date</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Time</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold uppercase tracking-[1px] text-slate-400">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {sortedPosts.map((post) => (
                                        <tr key={post.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {post.platforms.map((platform) => (
                                                        <span
                                                            key={`${post.id}-${platform}`}
                                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                                                            style={{ backgroundColor: platformColors[platform] }}
                                                        >
                                                            {getPlatformIcon(platform, 'h-3.5 w-3.5', '#FFFFFF')}
                                                            {platform}
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="max-w-sm px-6 py-4 text-sm text-text-secondary" title={post.caption}>
                                                {post.caption?.length > 40 ? `${post.caption.slice(0, 40)}...` : post.caption}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-primary">
                                                {new Date(post.scheduled_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-text-primary">
                                                {parseScheduledAt(post.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[post.status] || statusClasses.Scheduled}`}>
                                                    {post.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => openEditPanel(post)}>
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                    {currentUser && ['owner', 'manager'].includes(currentUser.role) && (
                                                        <button className="rounded-lg p-2 text-red-500 transition hover:bg-red-50" onClick={() => handleDelete(post)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button className="rounded-lg p-2 text-[#0176D3] transition hover:bg-blue-50" onClick={() => syncPostToGoogle(post.id)}>
                                                        <CalendarRange className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-[480px] transform border-l border-slate-200 bg-white shadow-2xl transition duration-300 ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="flex h-full flex-col">
                    <div className="border-b border-slate-200 px-5 py-4">
                        <div className="flex items-start justify-between gap-3">
                            <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-2">
                                    {(form.platforms.length ? form.platforms : platformOrder.slice(0, 1)).map((platform) => (
                                        <span
                                            key={platform}
                                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                                            style={{ backgroundColor: platformColors[platform] }}
                                        >
                                            {getPlatformIcon(platform, 'h-3.5 w-3.5', '#FFFFFF')}
                                            {platform}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[form.status] || statusClasses.Scheduled}`}>
                                        {form.status}
                                    </span>
                                    <button
                                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                        onClick={() => form.id && syncPostToGoogle(form.id)}
                                        disabled={!form.id || isSyncingPost || !googleStatus.connected}
                                        type="button"
                                    >
                                        {isSyncingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarRange className="h-4 w-4" />}
                                        Sync to Google Calendar
                                    </button>
                                </div>
                            </div>

                            <button className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100" onClick={() => setIsPanelOpen(false)} type="button">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                    </div>

                    <form id="scheduler-post-form" className="flex-1 space-y-6 overflow-y-auto px-5 py-5" onSubmit={handleSave}>
                        <div>
                            <label className="label-text">Platforms</label>
                            <div className="flex flex-wrap gap-2">
                                {platformOrder.map((platform) => {
                                    const selected = form.platforms.includes(platform)
                                    return (
                                        <button
                                            key={platform}
                                            type="button"
                                            className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition ${selected ? 'text-white' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                            style={selected ? { backgroundColor: platformColors[platform], borderColor: platformColors[platform] } : undefined}
                                            onClick={() => togglePlatform(platform)}
                                        >
                                            {getPlatformIcon(platform, 'h-4 w-4', selected ? '#FFFFFF' : platformColors[platform])}
                                            {platform}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <label className="label-text !mb-0">Caption</label>
                                <button
                                    type="button"
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                                    onClick={handleGenerateCaption}
                                    disabled={isGeneratingCaption}
                                >
                                    {isGeneratingCaption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                                    AI Generate
                                </button>
                            </div>
                            <textarea
                                rows={6}
                                className="input-field resize-none text-sm leading-relaxed"
                                value={form.caption}
                                onChange={(event) => handleFieldChange('caption', event.target.value)}
                                placeholder="Write your post caption..."
                            />
                            <div className="mt-3 space-y-2">
                                {form.platforms.map((platform) => {
                                    const limit = characterLimits[platform]
                                    const ratio = limit ? form.caption.length / limit : 0
                                    const colorClass = ratio >= 1 ? 'text-red-600' : ratio >= 0.9 ? 'text-yellow-600' : 'text-slate-500'
                                    return (
                                        <div key={platform} className={`flex items-center justify-between text-xs font-semibold ${colorClass}`}>
                                            <span>{platform}</span>
                                            <span>{form.caption.length} / {limit}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            {overLimitPlatforms.length > 0 && (
                                <p className="mt-2 text-xs font-semibold text-red-600">
                                    Caption is over the limit for {overLimitPlatforms.join(', ')}.
                                </p>
                            )}
                            {overLimitPlatforms.length === 0 && nearingLimitPlatforms.length > 0 && (
                                <p className="mt-2 text-xs font-semibold text-yellow-600">
                                    Approaching the limit for {nearingLimitPlatforms.join(', ')}.
                                </p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-text">Date</label>
                                <input
                                    type="date"
                                    className="input-field text-sm"
                                    min={getTodayDateString()}
                                    value={form.date}
                                    onChange={(event) => handleFieldChange('date', event.target.value)}
                                />
                            </div>
                            <div>
                                <label className="label-text">Time</label>
                                <select className="input-field text-sm" value={form.time} onChange={(event) => handleFieldChange('time', event.target.value)}>
                                    {timeOptions.map((option) => (
                                        <option key={option} value={option}>{formatTime(option)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label-text">Image / Video URL</label>
                            <input
                                type="url"
                                className="input-field text-sm"
                                value={form.image_url}
                                onChange={(event) => handleFieldChange('image_url', event.target.value)}
                                placeholder="https://example.com/asset.jpg"
                            />
                            {isValidImageUrl && (
                                <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img alt="Preview" className="h-40 w-full object-cover" src={form.image_url} />
                                </div>
                            )}
                            {!isValidImageUrl && form.image_url.trim() && (
                                <div className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                                    <ImageIcon className="h-4 w-4" />
                                    Preview available for direct image URLs only.
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="label-text">Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['Draft', 'Scheduled', 'Published'].map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${form.status === status ? statusClasses[status] : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        onClick={() => handleFieldChange('status', status)}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </form>

                    <div className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                        {form.id && currentUser && ['owner', 'manager'].includes(currentUser.role) ? (
                            <button
                                className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                                onClick={() => handleDelete(posts.find((post) => post.id === form.id) || form)}
                                type="button"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </button>
                        ) : (
                            <div />
                        )}

                        <div className="flex items-center gap-3">
                            <button className="btn-secondary !border-slate-300 !px-4 !py-2 text-sm" onClick={() => setIsPanelOpen(false)} type="button">
                                Cancel
                            </button>
                            <button className="btn-primary !bg-[#0176D3] !px-4 !py-2 text-sm" disabled={isSaving || overLimitPlatforms.length > 0} type="submit" form="scheduler-post-form">
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {isPanelOpen && (
                <button
                    className="fixed inset-0 z-40 bg-slate-900/20"
                    onClick={() => setIsPanelOpen(false)}
                    type="button"
                />
            )}
        </div>
    )
}
