"use client"
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import toast from 'react-hot-toast'
import { getLeads, getSpaces, moveLeadOnBoard, createLead, updateLead, deleteLead as dbDeleteLead } from '@/lib/db'
import { LEAD_STATUSES } from '@/lib/leadFields.mjs'
const LeadsContext = createContext()
export const STATUS_COLUMNS = LEAD_STATUSES
export function LeadsProvider({ children }) {
    const [leads, setLeads] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeSpace, setActiveSpace] = useState('Lead Pipeline')
    const [currentSpaceId, setCurrentSpaceId] = useState(null)
    const [selectedLead, setSelectedLead] = useState(null)
    const requestVersion = useRef(0)
    const currentSpaceRef = useRef(null)
    currentSpaceRef.current = currentSpaceId
    useEffect(() => {
        let cancelled = false
        getSpaces().then(spaces => {
            if (cancelled) return
            const requested = new URLSearchParams(window.location.search).get('space')
            const first = spaces.find(s => s.id === requested) || spaces[0]
            if (first) { setCurrentSpaceId(first.id); setActiveSpace(first.name) }
            else setIsLoading(false)
        }).catch(error => { if (!cancelled) { toast.error(error.message); setIsLoading(false) } })
        return () => { cancelled = true }
    }, [])
    const refresh = useCallback(async () => {
        if (!currentSpaceId) return
        const version = ++requestVersion.current
        try {
            const rows = await getLeads(currentSpaceId)
            if (version === requestVersion.current && currentSpaceRef.current === currentSpaceId) setLeads(rows || [])
        } catch (error) { toast.error(error.message) }
        finally { if (version === requestVersion.current) setIsLoading(false) }
    }, [currentSpaceId])
    useEffect(() => {
        if (!currentSpaceId) return
        setLeads([]); setSelectedLead(null); setIsLoading(true); refresh()
        const refreshVisible = () => { if (document.visibilityState === 'visible') refresh() }
        const interval = setInterval(refreshVisible, 30000)
        window.addEventListener('focus', refreshVisible)
        return () => { clearInterval(interval); window.removeEventListener('focus', refreshVisible) }
    }, [currentSpaceId, refresh])
    const switchSpaceById = useCallback(async id => {
        if (!id || id === currentSpaceId) return
        try {
            const spaces = await getSpaces()
            const space = spaces.find(item => item.id === id)
            if (!space) throw new Error('Space not found or access denied.')
            setCurrentSpaceId(id); setActiveSpace(space.name)
        } catch (error) { toast.error(error.message) }
    }, [currentSpaceId])
    const updateLeadStatus = async (id, status) => {
        try { await moveLeadOnBoard(id, status, 0); await refresh(); toast.success('Lead stage updated'); return true }
        catch (error) { toast.error(error.message); return false }
    }
    const addLead = async input => {
        try {
            if (!currentSpaceId) throw new Error('Select a space first.')
            await createLead({ ...input, space_id: currentSpaceId, status: input.status || 'NEW', deal_value: input.deal_value || 0, next_followup: input.next_followup || null })
            await refresh(); toast.success('Lead added'); return true
        } catch (error) { toast.error(error.message); return false }
    }
    const saveLead = async (id, updates) => {
        const saved = await updateLead(id, updates)
        setLeads(rows => rows.map(row => row.id === id ? saved : row))
        setSelectedLead(saved)
        return saved
    }
    const deleteLead = async id => {
        try {
            await dbDeleteLead(id)
            setLeads(rows => rows.filter(row => row.id !== id)); setSelectedLead(current => current?.id === id ? null : current)
            toast.success('Lead deleted'); return true
        } catch (error) { toast.error(error.message); return false }
    }
    return <LeadsContext.Provider value={{ leads, isLoading, activeSpace, setActiveSpace, currentSpaceId, switchSpaceById, selectedLead, setSelectedLead, updateLeadStatus, addLead, saveLead, deleteLead }}>{children}</LeadsContext.Provider>
}
export const useLeads = () => useContext(LeadsContext)
