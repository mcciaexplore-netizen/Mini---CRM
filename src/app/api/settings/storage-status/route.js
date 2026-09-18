import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
export const dynamic='force-dynamic'
export async function GET(){try{
    const w=await requireWorkspace()
    const [profile]=await w.query('SELECT campaign_storage_provider FROM business_profile WHERE organization_id=$1',[w.organizationId])
    const sheetsConfigured=Boolean(w.organizationId===process.env.GOOGLE_SHEETS_ORGANIZATION_ID&&['owner','manager'].includes(w.role)&&process.env.GOOGLE_SHEETS_ID&&process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL&&process.env.GOOGLE_PRIVATE_KEY)
    return NextResponse.json({success:true,data:{databaseConnected:true,sheetsConfigured,campaignStorageProvider:profile.campaign_storage_provider||'neon'}})
}catch(e){return routeError(e)}}
