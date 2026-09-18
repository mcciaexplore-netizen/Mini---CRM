import { getAuth } from '@/lib/authServer'
import { routeError } from '@/lib/workspaceServer'
export const runtime='nodejs'
export const dynamic='force-dynamic'
async function handle(request) {
    try { return await getAuth().handler(request) }
    catch(error) { return routeError(error) }
}
export {handle as GET,handle as POST}
