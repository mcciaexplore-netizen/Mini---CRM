import {query} from './postgres.mjs'
export async function getGoogleTokens(workspace,userId=workspace.user.id){
    return (await query('SELECT * FROM google_tokens WHERE organization_id=$1 AND user_id=$2',[workspace.organizationId,userId]))[0] || null
}
export async function saveGoogleTokens(workspace,tokens,userId=workspace.user.id){
    await query('INSERT INTO google_tokens(organization_id,user_id,access_token,refresh_token,expiry_date,email) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO UPDATE SET access_token=EXCLUDED.access_token,refresh_token=EXCLUDED.refresh_token,expiry_date=EXCLUDED.expiry_date,email=EXCLUDED.email WHERE google_tokens.organization_id=EXCLUDED.organization_id',
        [workspace.organizationId,userId,tokens.access_token,tokens.refresh_token,tokens.expiry_date,tokens.email])
}
export async function saveEventBinding(workspace,postId,eventId){
    await query('UPDATE scheduled_posts SET google_event_id=$1 WHERE id=$2 AND organization_id=$3',[eventId,postId,workspace.organizationId])
}
