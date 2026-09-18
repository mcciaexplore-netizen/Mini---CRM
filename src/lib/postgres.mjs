import pg from 'pg'
import { queryWithIdentity } from './databaseIdentity.mjs'
import { RequestError } from './access.mjs'
const { Pool, types } = pg
// Preserve calendar dates as YYYY-MM-DD rather than timezone-shifted Date objects.
types.setTypeParser(1082, value => value)
let pool
export function getPool() {
    if (!process.env.DATABASE_URL) throw new RequestError('Neon DATABASE_URL is not configured.',503)
    if (!pool) {
        pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 })
        pool.on('error', error => console.error('[postgres]', error.code || 'connection error'))
    }
    return pool
}
export async function query(text, values = []) { return (await getPool().query(text,values)).rows }
export async function queryAsUser(userId, text, values = []) {
    return queryWithIdentity(getPool(), userId, text, values)
}
