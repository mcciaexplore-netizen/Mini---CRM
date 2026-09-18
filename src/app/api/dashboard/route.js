import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
export const dynamic='force-dynamic'
export async function GET(){try{
    const w=await requireWorkspace()
    const [campaigns,leads,posts]=await Promise.all([
        w.query('SELECT * FROM campaigns WHERE organization_id=$1 ORDER BY created_at DESC',[w.organizationId]),
        w.query('SELECT * FROM leads WHERE organization_id=$1 ORDER BY created_at DESC',[w.organizationId]),
        w.query('SELECT * FROM scheduled_posts WHERE organization_id=$1 ORDER BY scheduled_at',[w.organizationId])
    ])
    return NextResponse.json({data:{campaigns,leads,posts}})
}catch(e){return routeError(e)}}
