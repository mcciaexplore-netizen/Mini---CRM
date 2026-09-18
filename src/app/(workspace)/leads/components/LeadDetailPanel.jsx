"use client"
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useLeads, STATUS_COLUMNS } from '../context'
import { getActivities, getTeamMembers, logActivity } from '@/lib/db'
function LeadEditor({ lead }) {
    const { setSelectedLead, saveLead } = useLeads()
    const [form, setForm] = useState(() => ({
        name: lead.name || '', company: lead.company || '', email: lead.email || '', phone: lead.phone || '',
        source: lead.source || '', status: lead.status, deal_value: lead.deal_value ?? 0,
        next_followup: lead.next_followup || '', last_contact: lead.last_contact || '', assignee_id: lead.assignee_id || ''
    }))
    const [activities, setActivities] = useState([])
    const [members, setMembers] = useState([])
    const [description, setDescription] = useState('')
    const [type, setType] = useState('Note')
    const [saving, setSaving] = useState(false)
    const [logging, setLogging] = useState(false)
    const [loadError, setLoadError] = useState('')
    useEffect(() => {
        let cancelled = false
        Promise.all([getActivities(lead.id), getTeamMembers()]).then(([rows, team]) => {
            if (!cancelled) { setActivities(rows || []); setMembers(team || []) }
        }).catch(error => { if (!cancelled) setLoadError(error.message) })
        return () => { cancelled = true }
    }, [lead.id])
    async function save(event) {
        event.preventDefault(); setSaving(true)
        try {
            await saveLead(lead.id, form)
            toast.success('Lead saved')
            getActivities(lead.id).then(setActivities).catch(error => setLoadError(error.message))
        } catch (error) { toast.error(error.message) }
        finally { setSaving(false) }
    }
    async function addActivity(event) {
        event.preventDefault(); setLogging(true)
        try {
            const saved = await logActivity({ lead_id: lead.id, type, description })
            setActivities(rows => [saved, ...rows]); setDescription(''); toast.success('Activity saved')
        } catch (error) { toast.error(error.message) }
        finally { setLogging(false) }
    }
    const field = (key, value) => setForm(current => ({ ...current, [key]: value }))
    return <><div className="fixed inset-0 bg-black/40 z-[100]" onClick={() => setSelectedLead(null)} />
        <section role="dialog" aria-modal="true" aria-labelledby="lead-title" className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white shadow-xl z-[110] flex flex-col">
            <header className="p-5 border-b flex items-center justify-between"><div><p className="text-xs text-gray-500">{lead.lead_code}</p><h2 id="lead-title" className="text-xl font-bold">{lead.name}</h2></div>
                <button aria-label="Close lead" onClick={() => setSelectedLead(null)} className="p-2"><X /></button></header>
            <div className="overflow-y-auto p-5 space-y-8">
                <form onSubmit={save} className="grid grid-cols-2 gap-4">
                    {[['name','Name','text'],['company','Company','text'],['email','Email','email'],['phone','Phone','tel'],['source','Source','text'],['deal_value','Deal value (INR)','number'],['next_followup','Next follow-up','date'],['last_contact','Last contacted','date']].map(([key,label,inputType]) =>
                        <label key={key} className="text-sm font-medium">{label}<input required={key === 'name'} min={key === 'deal_value' ? 0 : undefined} step={key === 'deal_value' ? '0.01' : undefined} maxLength={key === 'name' ? 200 : undefined} type={inputType} className="input-field mt-1" value={form[key]} onChange={event => field(key,event.target.value)} /></label>)}
                    <label className="text-sm font-medium">Stage<select className="input-field mt-1" value={form.status} onChange={event => field('status',event.target.value)}>{STATUS_COLUMNS.map(status => <option key={status}>{status}</option>)}</select></label>
                    <label className="text-sm font-medium">Owner<select className="input-field mt-1" value={form.assignee_id} onChange={event => field('assignee_id',event.target.value)}><option value="">Unassigned</option>{members.map(member => <option key={member.id} value={member.id}>{member.full_name || 'Team member'}</option>)}</select></label>
                    <button disabled={saving} className="btn-primary col-span-2 justify-center">{saving ? 'Saving…' : 'Save changes'}</button>
                </form>
                <section><h3 className="font-bold mb-3">Notes and activities</h3>
                    <form onSubmit={addActivity} className="space-y-3">
                        <label className="sr-only" htmlFor="activity-type">Activity type</label><select id="activity-type" className="input-field" value={type} onChange={event => setType(event.target.value)}>{['Note','Call','Meeting','Email','WhatsApp'].map(item => <option key={item}>{item}</option>)}</select>
                        <label className="sr-only" htmlFor="activity-description">Activity description</label><textarea id="activity-description" required maxLength={5000} className="input-field" rows={3} placeholder="Record the conversation or next step…" value={description} onChange={event => setDescription(event.target.value)} />
                        <button disabled={logging} className="btn-secondary">{logging ? 'Saving…' : 'Save activity'}</button>
                    </form>
                    {loadError && <p role="alert" className="text-red-700 mt-3">{loadError}</p>}
                    <ul className="mt-5 space-y-3">{activities.map(activity => <li key={activity.id} className="border rounded-lg p-3"><p className="text-xs text-gray-500">{activity.type} · {activity.logged_by?.full_name || 'Team member'} · {new Date(activity.logged_at).toLocaleString()}</p><p className="mt-1 text-sm whitespace-pre-wrap">{activity.description}</p></li>)}</ul>
                    {!loadError && !activities.length && <p className="text-sm text-gray-500 mt-4">No activity recorded yet.</p>}
                </section>
            </div>
        </section></>
}
export default function LeadDetailPanel() {
    const { selectedLead } = useLeads()
    return selectedLead ? <LeadEditor key={selectedLead.id} lead={selectedLead} /> : null
}
