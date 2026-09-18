import { randomBytes, timingSafeEqual } from 'node:crypto'
export const STATE_COOKIE = 'google_calendar_state'
export const createOAuthState = (userId) => userId + '.' + randomBytes(32).toString('hex')
export function validOAuthState(state, cookie, userId) {
    if (typeof state !== 'string' || typeof cookie !== 'string' || !state.startsWith(userId + '.') || state.length !== cookie.length) return false
    const stateBytes = Buffer.from(state)
    const cookieBytes = Buffer.from(cookie)
    return stateBytes.length === cookieBytes.length && timingSafeEqual(stateBytes, cookieBytes)
}
