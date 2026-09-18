import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {leadPayload} from '@/lib/leadFields.mjs'
import {insertRecord,updateRecord,getLead,LEAD_SELECT} from '@/lib/crmRepository.mjs'
import {requireRow} from '@/lib/sqlStatements.mjs'
import {pickFields,RequestError} from '@/lib/access.mjs'
export const dynamic='force-dynamic'
const FIELDS=['name','company','phone','email','website','source','status','deal_value','next_followup','last_contact','assignee_id','tags','space_id','position']
function payload(body,partial=false){
    try{return leadPayload(pickFields(body,FIELDS),partial)}catch(e){throw new RequestError(e.message)}
}
export async function GET(request){try{
    const w=await requireWorkspace()
    const spaceId=new URL(request.url).searchParams.get('spaceId')
    return NextResponse.json({data:await w.query(LEAD_SELECT+' WHERE l.organization_id=$1'+(spaceId?' AND l.space_id=$2':'')+' ORDER BY l.position,l.created_at',spaceId?[w.organizationId,spaceId]:[w.organizationId])})
}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const saved=await insertRecord(w,'leads',{...payload(await request.json()),created_by:w.user.id})
    return NextResponse.json({data:await getLead(w,saved.id)},{status:201})
}catch(e){return routeError(e)}}
export async function PATCH(request){try{
    const w=await requireWorkspace(['owner','manager','member'])
    const id=new URL(request.url).searchParams.get('id')
    await updateRecord(w,'leads',id,payload(await request.json(),true))
    return NextResponse.json({data:await getLead(w,id)})
}catch(e){return routeError(e)}}
export async function DELETE(request){try{
    const w=await requireWorkspace(['owner','manager'])
    return NextResponse.json({data:requireRow(await w.query('DELETE FROM leads WHERE id=$1 AND organization_id=$2 RETURNING id',[new URL(request.url).searchParams.get('id'),w.organizationId]))})
}catch(e){return routeError(e)}}
