import { headers } from 'next/headers'
import { getSessionCookie } from 'better-auth/cookies'
import { createAppAuth } from './authCore.mjs'
import { getPool } from './postgres.mjs'
import { RequestError } from './access.mjs'
import { checkRequestOrigin } from './requestOrigin.mjs'
let auth
export function getAuth() {
    if (!auth) auth=createAppAuth(getPool())
    return auth
}
export async function getCurrentUser() {
    const requestHeaders=await headers()
    if(!getSessionCookie(requestHeaders)) return null
    try {
        const session=await getAuth().api.getSession({headers:requestHeaders})
        return session?.user || null
    } catch(error) {
        if (['ECONNREFUSED','ENOTFOUND','ETIMEDOUT','ECONNRESET','57P01','57P02','57P03'].includes(error.code) || error.code?.startsWith('08')) {
            throw new RequestError('The database is temporarily unavailable. Please try again.',503)
        }
        throw error
    }
}
export async function requireUser() {
    checkRequestOrigin(await headers(), process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    const user=await getCurrentUser()
    if(!user) throw new RequestError('Please sign in.',401)
    return user
}
