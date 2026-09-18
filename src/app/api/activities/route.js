import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {pickFields,RequestError} from '@/lib/access.mjs'
import {insertRecord} from '@/lib/crmRepository.mjs'
export const dynamic='force-dynamic'
const SELECT="SELECT a.*,jsonb_build_object('full_name',p.full_name,'avatar_url',p.avatar_url) AS logged_by FROM activities a LEFT JOIN profiles p ON p.id=a.logged_by"
export async function GET(request){try{
    const w=await requireWorkspace()
    const leadId=new URL(request.url).searchParams.get('leadId')
    return NextResponse.json({data:await w.query(SELECT+' WHERE a.organization_id=$1 AND a.lead_id=$2 ORDER BY a.logged_at DESC',[w.organizationId,leadId])})
}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const body=pickFields(await request.json(),['lead_id','type','description'])
    if(!['Note','Call','Meeting','Email','WhatsApp'].includes(body.type)||typeof body.description!=='string'||!body.description.trim()||body.description.length>5000)throw new RequestError('Enter a valid activity of up to 5000 characters.')
    const saved=await insertRecord(w,'activities',{...body,description:body.description.trim(),logged_by:w.user.id})
    return NextResponse.json({data:(await w.query(SELECT+' WHERE a.id=$1',[saved.id]))[0]},{status:201})
}catch(e){return routeError(e)}}
