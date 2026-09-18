import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getOAuthClient } from '@/lib/googleCalendar'
import { requireWorkspace, routeError } from '@/lib/workspaceServer'
import { STATE_COOKIE, createOAuthState } from '@/lib/oauthState.mjs'
export const dynamic='force-dynamic'
const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/userinfo.email']
export async function GET() {
    try {
        const { user } = await requireWorkspace(['owner','manager','member'])
        const state = createOAuthState(user.id)
        cookies().set(STATE_COOKIE, state, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth/google', maxAge: 600 })
        const url = getOAuthClient().generateAuthUrl({ access_type: 'offline', prompt: 'consent', scope: SCOPES, state })
        return NextResponse.redirect(url)
    } catch (error) { return routeError(error) }
}
