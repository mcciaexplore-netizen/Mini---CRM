import {NextResponse} from 'next/server'
import {cookies} from 'next/headers'
import {google} from 'googleapis'
import {getOAuthClient} from '@/lib/googleCalendar'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {getGoogleTokens,saveGoogleTokens} from '@/lib/calendarRepository.mjs'
import {STATE_COOKIE,validOAuthState} from '@/lib/oauthState.mjs'
import {RequestError} from '@/lib/access.mjs'
export const dynamic='force-dynamic'
export async function GET(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const url=new URL(request.url)
    const redirectBase=process.env.NEXT_PUBLIC_APP_URL||url.origin
    const expected=cookies().get(STATE_COOKIE)?.value
    cookies().set(STATE_COOKIE,'',{path:'/api/auth/google',maxAge:0})
    if(!validOAuthState(url.searchParams.get('state'),expected,w.user.id))throw new RequestError('Invalid or expired Google connection request.')
    if(url.searchParams.get('error'))return NextResponse.redirect(new URL('/scheduler?google_error=connection_cancelled',redirectBase))
    const code=url.searchParams.get('code')
    if(!code)throw new RequestError('Missing authorization code.')
    const oauth=getOAuthClient()
    const {tokens}=await oauth.getToken(code)
    oauth.setCredentials(tokens)
    const {data:googleProfile}=await google.oauth2({version:'v2',auth:oauth}).userinfo.get()
    const existing=await getGoogleTokens(w)
    if(existing?.email&&existing.email!==googleProfile.email)throw new RequestError('Reconnect the same Google account to preserve existing event links.',409)
    await saveGoogleTokens(w,{...tokens,refresh_token:tokens.refresh_token||existing?.refresh_token||null,email:googleProfile.email})
    return NextResponse.redirect(new URL('/scheduler?connected=true',redirectBase))
}catch(e){return routeError(e)}}
