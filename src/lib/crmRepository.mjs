import { insertStatement, updateStatement, requireRow } from './sqlStatements.mjs'
export const LEAD_SELECT="SELECT l.*, CASE WHEN p.id IS NULL THEN NULL ELSE jsonb_build_object('id',p.id,'full_name',p.full_name,'avatar_url',p.avatar_url) END AS assignee FROM leads l LEFT JOIN profiles p ON p.id=l.assignee_id"
export async function insertRecord(workspace,table,payload) {
    const statement=insertStatement(table,{...payload,organization_id:workspace.organizationId})
    return requireRow(await workspace.query(statement.text,statement.values))
}
export async function updateRecord(workspace,table,id,updates) {
    const statement=updateStatement(table,updates,id,workspace.organizationId)
    return requireRow(await workspace.query(statement.text,statement.values))
}
export async function getLead(workspace,id) {
    return requireRow(await workspace.query(LEAD_SELECT+' WHERE l.id=$1 AND l.organization_id=$2',[id,workspace.organizationId]))
}
