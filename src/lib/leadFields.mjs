export const LEAD_STATUSES = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATING', 'WON', 'LOST']
const FIELDS = ['name', 'company', 'phone', 'email', 'website', 'source', 'status', 'deal_value', 'next_followup', 'last_contact', 'assignee_id', 'tags', 'space_id', 'position']
export function leadPayload(input, partial = false) {
    const result = Object.fromEntries(Object.entries(input).filter(([key]) => FIELDS.includes(key)))
    if (!partial || 'name' in result) {
        if (typeof result.name !== 'string' || !result.name.trim() || result.name.trim().length > 200) throw new Error('Enter a lead name of up to 200 characters.')
        result.name = result.name.trim()
    }
    if ('deal_value' in result) {
        result.deal_value = Number(result.deal_value)
        if (!Number.isFinite(result.deal_value) || result.deal_value < 0) throw new Error('Deal value must be a positive number or zero.')
    }
    if ('status' in result && !LEAD_STATUSES.includes(result.status)) throw new Error('Choose a valid lead stage.')
    for (const field of ['email', 'phone', 'company', 'website', 'source']) {
        if (field in result) {
            if (typeof result[field] !== 'string' && result[field] !== null) throw new Error('Invalid contact information.')
            result[field] = result[field]?.trim() || null
        }
    }
    if (result.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email)) throw new Error('Enter a valid email address.')
    for (const field of ['next_followup','last_contact','assignee_id']) if (result[field] === '') result[field] = null
    return result
}
