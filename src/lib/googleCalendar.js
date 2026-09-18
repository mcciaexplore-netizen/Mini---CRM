import { google } from 'googleapis'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

const platformEmojis = {
    Instagram: '📸',
    LinkedIn: '💼',
    Facebook: '👥',
    Twitter: '🐦',
    WhatsApp: '💬'
}

const getGoogleColorId = (platform) => ({
    Instagram: '6',
    LinkedIn: '1',
    Facebook: '9',
    Twitter: '7',
    WhatsApp: '2'
})[platform] || '8'

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

const toGoogleCalendarDateTime = (date) => {
    const value = parseScheduledAtParts(date)
    const year = value.year
    const month = String(value.month).padStart(2, '0')
    const day = String(value.day).padStart(2, '0')
    const hours = String(value.hours).padStart(2, '0')
    const minutes = String(value.minutes).padStart(2, '0')
    const seconds = String(value.seconds).padStart(2, '0')

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`
}

const buildEvent = (post) => {
    const startParts = parseScheduledAtParts(post.scheduled_at)
    const startTime = new Date(startParts.year, startParts.month - 1, startParts.day, startParts.hours, startParts.minutes, startParts.seconds, 0)
    const endTime = new Date(startTime.getTime() + 30 * 60000)
    const emoji = (post.platforms || []).map((platform) => platformEmojis[platform] || '📢').join('')

    return {
        summary: `${emoji} ${(post.platforms || []).join(' + ')} Post`,
        description: `Caption: ${post.caption || ''}\n\nStatus: ${post.status || 'Scheduled'}\n\nManage in ProMarketer: ${APP_URL}/scheduler`,
        start: { dateTime: toGoogleCalendarDateTime(startTime), timeZone: 'Asia/Kolkata' },
        end: { dateTime: toGoogleCalendarDateTime(endTime), timeZone: 'Asia/Kolkata' },
        colorId: getGoogleColorId(post.platforms?.[0]),
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'email', minutes: 60 },
                { method: 'popup', minutes: 30 }
            ]
        }
    }
}

export const getOAuthClient = () => new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
)

export const getCalendarClient = (tokens) => {
    const auth = getOAuthClient()
    auth.setCredentials(tokens)
    return google.calendar({ version: 'v3', auth })
}

export const createCalendarEvent = async (tokens, post) => {
    const calendar = getCalendarClient(tokens)
    const { data } = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: buildEvent(post)
    })
    return data.id
}

export const updateCalendarEvent = async (tokens, googleEventId, post) => {
    const calendar = getCalendarClient(tokens)
    const { data } = await calendar.events.update({
        calendarId: 'primary',
        eventId: googleEventId,
        requestBody: buildEvent(post)
    })
    return data.id
}

export const deleteCalendarEvent = async (tokens, googleEventId) => {
    const calendar = getCalendarClient(tokens)
    await calendar.events.delete({ calendarId: 'primary', eventId: googleEventId })
}

export const refreshTokenIfNeeded = async (tokens, persistTokens) => {
    if (tokens?.access_token && Date.now() < (tokens.expiry_date || 0) - 60000) return tokens
    if (!tokens?.refresh_token) {
        throw new Error('Google Calendar token is missing a refresh token. Please reconnect Google Calendar.')
    }

    const auth = getOAuthClient()
    auth.setCredentials(tokens)
    const { credentials } = await auth.refreshAccessToken()
    const nextTokens = {
        ...tokens,
        access_token: credentials.access_token || tokens.access_token,
        expiry_date: credentials.expiry_date || tokens.expiry_date,
        refresh_token: credentials.refresh_token || tokens.refresh_token
    }

    if (typeof persistTokens !== 'function') throw new Error('A token persistence callback is required.')
    await persistTokens(nextTokens)
    return nextTokens
}
