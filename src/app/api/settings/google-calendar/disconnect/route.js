import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {query} from '@/lib/postgres.mjs'
export async function POST(){try{
    const w=await requireWorkspace(['owner','manager','member'])
    await query('UPDATE google_tokens SET access_token=NULL,refresh_token=NULL,expiry_date=NULL WHERE organization_id=$1 AND user_id=$2',[w.organizationId,w.user.id])
    // Keep trusted event bindings so reconnecting does not create duplicate events.
    return NextResponse.json({success:true})
}catch(e){return routeError(e)}}
