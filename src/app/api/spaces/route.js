import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {pickFields,RequestError} from '@/lib/access.mjs'
import {insertRecord,updateRecord} from '@/lib/crmRepository.mjs'
import {requireRow} from '@/lib/sqlStatements.mjs'
export const dynamic='force-dynamic'
const FIELDS=['name','description','color','emoji','template']
function validate(input){
    const body=pickFields(input,FIELDS)
    if('name' in body && (typeof body.name!=='string'||!body.name.trim()||body.name.length>120))throw new RequestError('Enter a space name of up to 120 characters.')
    return body
}
export async function GET(){try{
    const w=await requireWorkspace()
    return NextResponse.json({data:await w.query('SELECT * FROM spaces WHERE organization_id=$1 ORDER BY created_at',[w.organizationId])})
}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const body=validate(await request.json())
    if(!body.name)throw new RequestError('A name is required.')
    return NextResponse.json({data:await insertRecord(w,'spaces',{...body,created_by:w.user.id})},{status:201})
}catch(e){return routeError(e)}}
export async function PATCH(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const id=new URL(request.url).searchParams.get('id')
    return NextResponse.json({data:await updateRecord(w,'spaces',id,validate(await request.json()))})
}catch(e){return routeError(e)}}
export async function DELETE(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const id=new URL(request.url).searchParams.get('id')
    return NextResponse.json({data:requireRow(await w.query('DELETE FROM spaces WHERE id=$1 AND organization_id=$2 RETURNING id',[id,w.organizationId]))})
}catch(e){return routeError(e)}}
