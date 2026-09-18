import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/authServer'
export const dynamic='force-dynamic'
export default async function OnboardingLayout({children}) {
    if(!await getCurrentUser()) redirect('/login')
    return children
}
