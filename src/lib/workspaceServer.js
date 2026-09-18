import { NextResponse } from 'next/server'
import { requireUser } from './authServer'
import { query, queryAsUser } from './postgres.mjs'
import { authorizeMembership } from './access.mjs'
export async function requireWorkspace(allowedRoles=[]) {
    const user=await requireUser()
    const [membership]=await query('SELECT m.organization_id,m.role,p.is_active FROM organization_members m JOIN profiles p ON p.id=m.user_id WHERE m.user_id=$1',[user.id])
    const workspace=authorizeMembership(user,membership,allowedRoles)
    return {...workspace,query:(text,values)=>queryAsUser(user.id,text,values)}
}
export function routeError(error) {
    const databaseStatus={'23503':400,'23514':400,'22P02':400,'23505':409,'42501':403}
    const status=error.status || databaseStatus[error.code] || 500
    if(status>=500) console.error('[api]',error.code || error.message)
    const message=error.status ? error.message : status===403 ? 'You do not have permission to perform this action.' : status===409 ? 'This record already exists.' : status===400 ? 'Some fields are invalid or refer to an unavailable record.' : 'Unable to complete this request.'
    return NextResponse.json({success:false,error:message},{status})
}
export async function getWorkspaceAiKeys() {
    const workspace=await requireWorkspace(['owner','manager','member'])
    const [profile]=await workspace.query('SELECT * FROM business_profile WHERE organization_id=$1',[workspace.organizationId])
    const [keys]=await query('SELECT gemini_api_key,openai_api_key,grok_api_key FROM organization_secrets WHERE organization_id=$1',[workspace.organizationId])
    return {gemini:keys?.gemini_api_key || null,openai:keys?.openai_api_key || null,grok:keys?.grok_api_key || null,activeProvider:profile.active_ai_provider,profile,source:'neon',workspace}
}
