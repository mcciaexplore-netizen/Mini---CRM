import { RequestError, pickFields } from './access.mjs'
const TABLE_FIELDS={
    profiles:['full_name','avatar_url','department'],
    spaces:['name','description','color','emoji','template','organization_id','created_by'],
    leads:['name','company','phone','email','website','source','status','deal_value','next_followup','last_contact','assignee_id','tags','space_id','position','organization_id','created_by'],
    activities:['lead_id','type','description','organization_id','logged_by'],
    scheduled_posts:['platforms','caption','image_url','scheduled_at','status','campaign_id','organization_id','created_by'],
    campaigns:['name','business_type','product','target_customer','budget_range','goal','duration','language','platforms','tone','industry','key_dates','calendar_data','status','organization_id','created_by'],
    business_profile:['business_name','industry','website','city','state','gst_number','logo_url','primary_color','whatsapp_number','active_ai_provider','google_calendar_auto_sync','campaign_storage_provider','updated_at']
}
function entries(table,input) {
    if(!TABLE_FIELDS[table]) throw new RequestError('Unknown resource.')
    const selected=pickFields(input,TABLE_FIELDS[table])
    if(!Object.keys(selected).length) throw new RequestError('No changes supplied.')
    return Object.entries(selected).map(([key,value])=>[key,key==='calendar_data'?JSON.stringify(value):value])
}
export function insertStatement(table,input) {
    const fields=entries(table,input)
    return {text:'INSERT INTO '+table+' ('+fields.map(([key])=>key).join(',')+') VALUES ('+fields.map((_,i)=>'$'+(i+1)).join(',')+') RETURNING *',values:fields.map(([,value])=>value)}
}
export function updateStatement(table,input,id,organizationId) {
    const fields=entries(table,input)
    const values=fields.map(([,value])=>value)
    values.push(id)
    let text='UPDATE '+table+' SET '+fields.map(([key],i)=>key+'=$'+(i+1)).join(',')+' WHERE id=$'+values.length
    if(organizationId){values.push(organizationId);text+=' AND organization_id=$'+values.length}
    return {text:text+' RETURNING *',values}
}
export function requireRow(rows) {
    if(!rows?.[0]) throw new RequestError('Record not found or access denied.',404)
    return rows[0]
}
