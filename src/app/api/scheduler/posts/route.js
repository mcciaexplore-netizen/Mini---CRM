import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {pickFields,RequestError} from '@/lib/access.mjs'
import {insertRecord,updateRecord} from '@/lib/crmRepository.mjs'
import {requireRow} from '@/lib/sqlStatements.mjs'
export const dynamic='force-dynamic'
function payload(input){
    const body=pickFields(input,['platforms','caption','image_url','scheduled_at','status','campaign_id'])
    if('caption'in body&&(typeof body.caption!=='string'||!body.caption.trim()))throw new RequestError('Caption is required.')
    if('platforms'in body&&(!Array.isArray(body.platforms)||!body.platforms.length||!body.platforms.every(x=>['Instagram','LinkedIn','Facebook','Twitter','WhatsApp','Email'].includes(x))))throw new RequestError('Choose a supported platform.')
    if('status'in body&&!['Draft','Scheduled','Published'].includes(body.status))throw new RequestError('Choose a valid status.')
    return body
}
export async function GET(){try{const w=await requireWorkspace();return NextResponse.json({data:await w.query("SELECT s.*,jsonb_build_object('id',p.id,'full_name',p.full_name) AS created_by FROM scheduled_posts s LEFT JOIN profiles p ON p.id=s.created_by WHERE s.organization_id=$1 ORDER BY s.scheduled_at",[w.organizationId])})}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const body=payload(await request.json())
    if(!body.caption||!body.platforms)throw new RequestError('Caption and platforms are required.')
    return NextResponse.json({data:await insertRecord(w,'scheduled_posts',{...body,created_by:w.user.id})},{status:201})
}catch(e){return routeError(e)}}
export async function PATCH(request){try{const w=await requireWorkspace(['owner','manager','member']);return NextResponse.json({data:await updateRecord(w,'scheduled_posts',new URL(request.url).searchParams.get('id'),payload(await request.json()))})}catch(e){return routeError(e)}}
export async function DELETE(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const id=new URL(request.url).searchParams.get('id')
    const [post]=await w.query('SELECT google_event_id FROM scheduled_posts WHERE id=$1 AND organization_id=$2',[id,w.organizationId])
    if(post?.google_event_id)throw new RequestError('Remove the linked calendar event before deleting this post.',409)
    return NextResponse.json({data:requireRow(await w.query('DELETE FROM scheduled_posts WHERE id=$1 AND organization_id=$2 RETURNING id',[id,w.organizationId]))})
}catch(e){return routeError(e)}}
