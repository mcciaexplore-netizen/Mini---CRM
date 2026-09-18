import { NextResponse } from 'next/server'
export function middleware(request) {
    const path=request.nextUrl.pathname
    // This check is only a fast redirect; every protected layout/handler verifies the session.
    const publicAuth=path.startsWith('/api/auth/') && !path.startsWith('/api/auth/google')
    if(path==='/login' || publicAuth) return NextResponse.next()
    if(!request.cookies.get('better-auth.session_token') && !request.cookies.get('__Secure-better-auth.session_token')) {
        if(path.startsWith('/api/')) return NextResponse.json({error:'Please sign in.'},{status:401})
        return NextResponse.redirect(new URL('/login',request.url))
    }
    if(path.startsWith('/api/') && !['GET','HEAD','OPTIONS'].includes(request.method)) {
        const origin=request.headers.get('origin')
        if(origin && origin!==new URL(process.env.BETTER_AUTH_URL || request.url).origin) return NextResponse.json({error:'Invalid request origin.'},{status:403})
    }
    return NextResponse.next()
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2)$).*)']}
