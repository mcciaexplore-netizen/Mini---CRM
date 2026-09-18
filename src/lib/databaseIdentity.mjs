import { RequestError } from './access.mjs'

export async function queryWithIdentity(pool, userId, text, values = []) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '')) {
        throw new RequestError('Please sign in.', 401)
    }
    const client = await pool.connect()
    try {
        await client.query('BEGIN')
        await client.query("SELECT set_config('app.user_id',$1,true)", [userId])
        await client.query('SET LOCAL ROLE promarketer_app')
        const result = await client.query(text, values)
        await client.query('COMMIT')
        return result.rows
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}
