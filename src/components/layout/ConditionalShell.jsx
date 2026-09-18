"use client"
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
export default function ConditionalShell({ children }) {
    const pathname = usePathname()
    if (pathname === '/login' || pathname === '/onboarding') {
        return <main className="w-full min-h-screen flex items-center justify-center p-4 overflow-y-auto">{children}</main>
    }
    return <><Sidebar /><div className="flex flex-col flex-1 min-w-0"><Navbar /><main className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-[1200px] mx-auto px-4 py-8 lg:px-8">{children}</div>
    </main></div></>
}
