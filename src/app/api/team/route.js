import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
export const dynamic='force-dynamic'
export async function GET(){try{
    const w=await requireWorkspace()
    const data=await w.query('SELECT p.id,p.full_name,p.avatar_url FROM profiles p JOIN organization_members m ON m.user_id=p.id WHERE m.organization_id=$1 AND p.is_active=true ORDER BY p.full_name',[w.organizationId])
    return NextResponse.json({data})
}catch(e){return routeError(e)}}
