import {NextResponse} from 'next/server'
import {requireWorkspace,routeError} from '@/lib/workspaceServer'
import {query} from '@/lib/postgres.mjs'
import {pickFields,RequestError} from '@/lib/access.mjs'
import {updateRecord} from '@/lib/crmRepository.mjs'
export const dynamic='force-dynamic'
const FIELDS=['business_name','industry','website','city','state','gst_number','logo_url','primary_color','whatsapp_number','active_ai_provider','google_calendar_auto_sync','campaign_storage_provider']
const KEYS=['gemini_api_key','openai_api_key','grok_api_key']
export async function GET(){try{const w=await requireWorkspace();return NextResponse.json({data:(await w.query('SELECT * FROM business_profile WHERE organization_id=$1',[w.organizationId]))[0]})}catch(e){return routeError(e)}}
export async function POST(request){try{
    const w=await requireWorkspace(['owner','manager'])
    const body=pickFields(await request.json(),[...FIELDS,...KEYS])
    if(!Object.keys(body).length)throw new RequestError('No changes supplied.')
    const keys=Object.keys(body).filter(key=>KEYS.includes(key))
    if(keys.length && keys.length!==Object.keys(body).length)throw new RequestError('Save credentials separately from business settings.')
    if(keys.length){
        for(const key of keys)if(typeof body[key]!=='string'||!body[key].trim()||body[key].length>4096)throw new RequestError('Enter a valid replacement API key.')
        // Identifier list comes from KEYS, never arbitrary request keys.
        await query('INSERT INTO organization_secrets(organization_id,'+keys.join(',')+') VALUES($1,'+keys.map((_,i)=>'$'+(i+2)).join(',')+') ON CONFLICT(organization_id) DO UPDATE SET '+keys.map(key=>key+'=EXCLUDED.'+key).join(','),[w.organizationId,...keys.map(key=>body[key].trim())])
    }else{
        const [profile]=await w.query('SELECT id FROM business_profile WHERE organization_id=$1',[w.organizationId])
        await updateRecord(w,'business_profile',profile.id,{...body,updated_at:new Date().toISOString()})
    }
    return NextResponse.json({data:(await w.query('SELECT * FROM business_profile WHERE organization_id=$1',[w.organizationId]))[0]})
}catch(e){return routeError(e)}}
