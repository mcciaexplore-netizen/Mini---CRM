import {NextResponse} from 'next/server'
import {createCalendarEvent,deleteCalendarEvent,refreshTokenIfNeeded,updateCalendarEvent} from '@/lib/googleCalendar'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {getGoogleTokens,saveGoogleTokens,saveEventBinding} from '@/lib/calendarRepository.mjs'
import {RequestError} from '@/lib/access.mjs'
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const {postId}=await request.json()
    if(!postId)throw new RequestError('Missing postId.')
    const [[post],tokens,[profile]]=await Promise.all([
        w.query('SELECT * FROM scheduled_posts WHERE id=$1 AND organization_id=$2 AND created_by=$3',[postId,w.organizationId,w.user.id]),
        getGoogleTokens(w),
        w.query('SELECT google_calendar_auto_sync FROM business_profile WHERE organization_id=$1',[w.organizationId])
    ])
    if(!post)throw new RequestError('Only the post creator can sync it to their Google Calendar.',403)
    if(!tokens?.access_token&&!tokens?.refresh_token)throw new RequestError('Connect Google Calendar first.')
    if(profile?.google_calendar_auto_sync===false&&!request.headers.get('x-force-sync'))throw new RequestError('Auto-sync is disabled.',409)
    const fresh=await refreshTokenIfNeeded(tokens,t=>saveGoogleTokens(w,t))
    const eventId=post.google_event_id?await updateCalendarEvent(fresh,post.google_event_id,post):await createCalendarEvent(fresh,post)
    await saveEventBinding(w,post.id,eventId)
    return NextResponse.json({success:true,eventId})
}catch(e){return routeError(e)}}
export async function DELETE(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const postId=new URL(request.url).searchParams.get('postId')
    if(!postId)throw new RequestError('Missing postId.')
    const [post]=await w.query('SELECT id,created_by,google_event_id FROM scheduled_posts WHERE id=$1 AND organization_id=$2',[postId,w.organizationId])
    if(!post)throw new RequestError('Post not found.',404)
    if(post.google_event_id){
        const tokens=await getGoogleTokens(w,post.created_by)
        if(!tokens?.access_token&&!tokens?.refresh_token)throw new RequestError('Ask the post creator to reconnect Google Calendar before deleting this synced post.',409)
        const fresh=await refreshTokenIfNeeded(tokens,t=>saveGoogleTokens(w,t,post.created_by))
        try{await deleteCalendarEvent(fresh,post.google_event_id)}catch(e){if(![404,410].includes(Number(e.code)))throw e}
        await saveEventBinding(w,post.id,null)
    }
    return NextResponse.json({success:true})
}catch(e){return routeError(e)}}
