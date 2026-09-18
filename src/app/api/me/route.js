import { NextResponse } from 'next/server'
import { requireWorkspace,routeError } from '@/lib/workspaceServer'
import { pickFields } from '@/lib/access.mjs'
import { updateStatement,requireRow } from '@/lib/sqlStatements.mjs'
export const dynamic='force-dynamic'
export async function GET(){
    try{
        const w=await requireWorkspace()
        const [profile]=await w.query('SELECT * FROM profiles WHERE id=$1',[w.user.id])
        return NextResponse.json({data:{...profile,role:w.role,organization_id:w.organizationId}})
    }catch(e){return routeError(e)}
}
export async function PATCH(request){
    try{
        const w=await requireWorkspace()
        const payload=pickFields(await request.json(),['full_name','avatar_url','department'])
        const statement=updateStatement('profiles',payload,w.user.id)
        return NextResponse.json({data:requireRow(await w.query(statement.text,statement.values))})
    }catch(e){return routeError(e)}
}
