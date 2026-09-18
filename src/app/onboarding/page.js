"use client"
import { useState } from 'react'
import { signOut } from '@/lib/db'
export default function OnboardingPage() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    async function create(event) {
        event.preventDefault(); setBusy(true); setError('')
        try {
            const response = await fetch('/api/workspace', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: new FormData(event.currentTarget).get('name') }) })
            const result = await response.json()
            if (!response.ok) throw new Error(result.error)
            window.location.assign('/')
        } catch (error) { setError(error.message) }
        finally { setBusy(false) }
    }
    return <div className="w-full max-w-md bg-white p-8 rounded-xl border shadow-sm">
        <h1 className="text-2xl font-bold">Set up your business</h1>
        <p className="text-gray-600 my-4">Your customers and sales pipeline will belong to this business. If you are joining an existing team, ask its owner to arrange access before creating a new business.</p>
        <form onSubmit={create} className="space-y-4">
            <label className="block">Business name<input name="name" className="input-field mt-1" required maxLength={120} /></label>
            <button disabled={busy} className="btn-primary">{busy ? 'Creating…' : 'Create business'}</button>
        </form>
        {error && <p role="alert" className="text-red-700 mt-4">{error}</p>}
        <button className="mt-6 text-sm underline" onClick={async () => { await signOut(); window.location.assign('/login') }}>Sign out</button>
    </div>
}
