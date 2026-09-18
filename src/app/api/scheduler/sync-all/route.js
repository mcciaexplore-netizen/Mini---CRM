import {NextResponse} from 'next/server'
import {createCalendarEvent,updateCalendarEvent,refreshTokenIfNeeded} from '@/lib/googleCalendar'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {getGoogleTokens,saveGoogleTokens,saveEventBinding} from '@/lib/calendarRepository.mjs'
import {RequestError} from '@/lib/access.mjs'
export async function POST(){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const [tokens,posts]=await Promise.all([getGoogleTokens(w),w.query("SELECT * FROM scheduled_posts WHERE organization_id=$1 AND created_by=$2 AND status='Scheduled' ORDER BY scheduled_at",[w.organizationId,w.user.id])])
    if(!tokens?.access_token&&!tokens?.refresh_token)throw new RequestError('Connect Google Calendar first.')
    const fresh=await refreshTokenIfNeeded(tokens,t=>saveGoogleTokens(w,t))
    const results=[]
    for(const post of posts){
        const eventId=post.google_event_id?await updateCalendarEvent(fresh,post.google_event_id,post):await createCalendarEvent(fresh,post)
        await saveEventBinding(w,post.id,eventId);results.push({postId:post.id,eventId})
    }
    return NextResponse.json({success:true,results})
}catch(e){return routeError(e)}}
