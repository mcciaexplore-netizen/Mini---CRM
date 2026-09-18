import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {requireUser} from '@/lib/authServer'
import {queryAsUser} from '@/lib/postgres.mjs'
import {pickFields,RequestError} from '@/lib/access.mjs'
export const dynamic='force-dynamic'
export async function GET(){try{const w=await requireWorkspace();return NextResponse.json({data:{email:w.user.email,organizationId:w.organizationId,role:w.role}})}catch(e){return routeError(e)}}
export async function POST(request){try{
    const user=await requireUser()
    const {name}=pickFields(await request.json(),['name'])
    if(typeof name!=='string'||!name.trim()||name.length>120)throw new RequestError('Enter a business name of up to 120 characters.')
    const [row]=await queryAsUser(user.id,'SELECT create_business($1) AS id',[name.trim()])
    return NextResponse.json({data:{organizationId:row.id}},{status:201})
}catch(e){return routeError(e)}}
