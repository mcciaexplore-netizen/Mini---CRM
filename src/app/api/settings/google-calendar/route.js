import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {getGoogleTokens} from '@/lib/calendarRepository.mjs'
export const dynamic='force-dynamic'
export async function GET(){try{
    const tokens=await getGoogleTokens(await requireWorkspace())
    return NextResponse.json({data:{connected:Boolean(tokens?.access_token||tokens?.refresh_token),email:tokens?.email||null,expiryDate:tokens?.expiry_date||null}})
}catch(e){return routeError(e)}}
