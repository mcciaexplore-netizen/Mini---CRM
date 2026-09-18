import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {query} from '@/lib/postgres.mjs'
import {RequestError} from '@/lib/access.mjs'
import {detectLogoType} from '@/lib/logoValidation.mjs'
import {readLimitedBody} from '@/lib/limitedBody.mjs'
export const dynamic='force-dynamic'
export async function GET(){try{
    const w=await requireWorkspace()
    const [logo]=await query('SELECT content,mime_type FROM business_logos WHERE organization_id=$1',[w.organizationId])
    if(!logo)throw new RequestError('Logo not found.',404)
    return new Response(new Uint8Array(logo.content),{headers:{'Content-Type':logo.mime_type,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}})
}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const body=await readLimitedBody(request,530000)
    const form=await new Response(body,{headers:{'Content-Type':request.headers.get('content-type')||''}}).formData()
    const file=form.get('file')
    if(!file||typeof file.arrayBuffer!=='function'||file.size>524288)throw new RequestError('Choose an image no larger than 512 KB.')
    const buffer=Buffer.from(await file.arrayBuffer()),type=detectLogoType(buffer)
    await query("WITH logo AS (INSERT INTO business_logos(organization_id,mime_type,content) VALUES($1,$2,$3) ON CONFLICT(organization_id) DO UPDATE SET mime_type=EXCLUDED.mime_type,content=EXCLUDED.content,updated_at=now()) UPDATE business_profile SET logo_url='/api/profile/logo',updated_at=now() WHERE organization_id=$1",[w.organizationId,type,buffer])
    return NextResponse.json({data:{url:'/api/profile/logo?v='+Date.now()}})
}catch(e){return routeError(e)}}
