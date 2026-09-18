export class RequestError extends Error {
    constructor(message, status = 400) { super(message); this.status = status }
}
export function authorizeMembership(user,membership,allowedRoles=[]) {
    if(!user) throw new RequestError('Please sign in.',401)
    if(!membership || membership.is_active===false) throw new RequestError('Create a business or ask its owner for access.',403)
    if(allowedRoles.length && !allowedRoles.includes(membership.role)) throw new RequestError('You do not have permission to perform this action.',403)
    return {user,organizationId:membership.organization_id,role:membership.role}
}
export function requireSheetsAccess(workspace, configuredOrganizationId) {
    if (!configuredOrganizationId || workspace.organizationId !== configuredOrganizationId) throw new RequestError('Google Sheets is not configured for this business.', 403)
    if (!['owner', 'manager'].includes(workspace.role)) throw new RequestError('Only business managers can access Google Sheets.', 403)
}
export function pickFields(input, fields) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestError('Expected an object.')
    const unknown = Object.keys(input).filter(key => !fields.includes(key))
    if (unknown.length) throw new RequestError(`Unsupported fields: ${unknown.join(', ')}`)
    return Object.fromEntries(Object.entries(input).filter(([key]) => fields.includes(key)))
}
