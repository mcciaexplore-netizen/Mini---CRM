import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {requireRow} from '@/lib/sqlStatements.mjs'
export const dynamic='force-dynamic'
export async function GET(){try{const w=await requireWorkspace();return NextResponse.json({data:await w.query('SELECT * FROM notifications WHERE recipient_id=$1 AND organization_id=$2 ORDER BY created_at DESC LIMIT 20',[w.user.id,w.organizationId])})}catch(e){return routeError(e)}}
export async function PATCH(request){try{const w=await requireWorkspace();return NextResponse.json({data:requireRow(await w.query('UPDATE notifications SET is_read=true WHERE id=$1 AND recipient_id=$2 AND organization_id=$3 RETURNING id',[new URL(request.url).searchParams.get('id'),w.user.id,w.organizationId]))})}catch(e){return routeError(e)}}
