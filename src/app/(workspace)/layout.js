import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/authServer'
import { query } from '@/lib/postgres.mjs'
export const dynamic='force-dynamic'
export default async function WorkspaceLayout({children}) {
    const user=await getCurrentUser()
    if(!user) redirect('/login')
    const [member]=await query('SELECT m.organization_id FROM organization_members m JOIN profiles p ON p.id=m.user_id WHERE m.user_id=$1 AND p.is_active=true',[user.id])
    if(!member) redirect('/onboarding')
    return children
}
