"use client"
import React, { useState } from 'react';
import { useLeads } from '../context';
import { MoreVertical, ArrowUpDown, Download, Trash2, Edit3, UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';

function StatusBadge({ status }) {
    const styles = {
        'NEW': 'bg-[#E8F4FD] text-[#0176D3]',
        'CONTACTED': 'bg-[#FFF3CD] text-[#856404]',
        'INTERESTED': 'bg-[#D4EDDA] text-[#155724]',
        'NEGOTIATING': 'bg-[#FFF0E6] text-[#CC4400]',
        'WON': 'bg-[#D4EDDA] text-[#0D5723]',
        'LOST': 'bg-[#F8D7DA] text-[#721C24]'
    };
    return (
        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-[11px] font-bold ${styles[status] || 'bg-gray-100'}`}>
            {status}
        </span>
    );
}

const EMPTY_FORM = { name: '', company: '', phone: '', email: '', source: '', status: 'NEW', deal_value: '' };

function AddLeadPanel({ onClose }) {
    const { addLead } = useLeads();
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        console.log('[AddLeadPanel] Save clicked', form);
        if (!form.name.trim()) {
            toast.error('Name is required');
            return;
        }
        setSaving(true);
        try {
            const saved = await addLead({ ...form, deal_value: Number(form.deal_value) || 0 });
            if (saved) onClose();
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 z-10">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-[#0F172A]">Add New Lead</h2>
                    <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="px-5 py-4 grid grid-cols-2 gap-3">
                    {[
                        { label: 'Name *',    key: 'name',      type: 'text',   span: 2 },
                        { label: 'Phone',   key: 'phone',     type: 'tel',    span: 1 },
                        { label: 'Email',     key: 'email',     type: 'email',  span: 1 },
                        { label: 'Company',   key: 'company',   type: 'text',   span: 1 },
                        { label: 'Deal Value',key: 'deal_value',type: 'number', span: 1 },
                        { label: 'Source',    key: 'source',    type: 'text',   span: 2 },
                    ].map(f => (
                        <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
                            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{f.label}</label>
                            <input
                                type={f.type}
                                value={form[f.key]}
                                autoFocus={f.key === 'name'}
                                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                                onKeyDown={e => e.key === 'Enter' && handleSave()}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0176D3] focus:border-transparent"
                            />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-100">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-gray-100 rounded-lg">Cancel</button>
                    <button type="button" onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#0176D3' }}>
                        {saving ? 'Saving...' : 'Add Lead'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function ListView() {
    const { leads, setSelectedLead, deleteLead } = useLeads();
    const [selectedRows, setSelectedRows] = useState([]);
    const [showAddLead, setShowAddLead] = useState(false);

    const toggleRow = (id) => {
        if (selectedRows.includes(id)) setSelectedRows(selectedRows.filter(r => r !== id));
        else setSelectedRows([...selectedRows, id]);
    };

    const toggleAll = (e) => {
        if (e.target.checked) setSelectedRows(leads.map(l => l.id));
        else setSelectedRows([]);
    };

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border border-[#E5E5E5] shadow-sm overflow-hidden select-text relative">

            {/* Static toolbar: Add Lead */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5E5] bg-white shrink-0">
                <span className="text-sm text-[#5E6C84] font-medium">{leads.length} leads</span>
                <button
                    type="button"
                    onClick={() => { console.log('[ListView] + Add Lead clicked'); setShowAddLead(true); }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-white px-3 py-1.5 rounded-lg transition-colors"
                    style={{ backgroundColor: '#0176D3' }}
                >
                    <UserPlus className="w-4 h-4" /> Add Lead
                </button>
            </div>

            {showAddLead && <AddLeadPanel onClose={() => setShowAddLead(false)} />}

            {/* Toolbar */}
            {selectedRows.length > 0 && (
                <div className="absolute top-0 left-0 right-0 h-[48px] z-20 bg-[#F5F8FF] border-b border-[#E5E5E5] px-4 flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">{selectedRows.length} leads selected</span>
                    <div className="flex items-center gap-3">
                        <button className="text-sm font-semibold text-[#5E6C84] hover:text-primary flex items-center gap-1.5"><Download className="w-4 h-4" /> Export CSV</button>
                        <button className="text-sm font-semibold text-[#5E6C84] hover:text-warning flex items-center gap-1.5"><Edit3 className="w-4 h-4" /> Change Status</button>
                        <button className="text-sm font-semibold text-error hover:text-red-700 flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Delete</button>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[1000px] w-full" style={{ display: 'table', tableLayout: 'fixed' }}>

                    {/* HEADER Row using CSS Grid inside table header structural approach to guarantee exact sizing */}
                    <div className="sticky top-0 z-10 bg-white border-b-2 border-[#E5E5E5] group">
                        <div
                            className="grid px-4 py-3"
                            style={{ gridTemplateColumns: '40px 2fr 2fr 1fr 1fr 1fr 1fr 80px' }}
                        >
                            <div className="flex items-center">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary" checked={selectedRows.length === leads.length && leads.length > 0} onChange={toggleAll} />
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase cursor-pointer hover:text-primary"><ArrowUpDown className="w-3 h-3" /> Lead / Company</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase">Contact Info</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase">Source</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase cursor-pointer hover:text-primary"><ArrowUpDown className="w-3 h-3" /> Status</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase cursor-pointer hover:text-primary"><ArrowUpDown className="w-3 h-3" /> Next Follow-up</div>
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#666] tracking-[1px] uppercase cursor-pointer hover:text-primary"><ArrowUpDown className="w-3 h-3" /> Deal Value</div>
                            <div className="flex items-center justify-end text-[11px] font-semibold text-[#666] tracking-[1px] uppercase">Actions</div>
                        </div>
                    </div>

                    {/* BODY Rows */}
                    <div className="flex flex-col">
                        {leads.map(lead => (
                            <div
                                key={lead.id}
                                onClick={() => setSelectedLead(lead)}
                                className={`
                    grid px-4 py-3.5 border-b border-[#E5E5E5] hover:bg-[#F5F8FF] transition-colors cursor-pointer group
                    ${selectedRows.includes(lead.id) ? 'bg-[#F5F8FF]' : 'bg-white'}
                 `}
                                style={{ gridTemplateColumns: '40px 2fr 2fr 1fr 1fr 1fr 1fr 80px' }}
                            >
                                <div className="flex items-center" onClick={(e) => { e.stopPropagation(); toggleRow(lead.id); }}>
                                    <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary" checked={selectedRows.includes(lead.id)} readOnly />
                                </div>

                                <div className="flex flex-col justify-center pr-4 truncate">
                                    <span className="text-[14px] font-semibold text-[#181818] truncate">{lead.name}</span>
                                    <span className="text-[13px] text-[#5E6C84] mt-0.5 truncate">{lead.company}</span>
                                </div>

                                <div className="flex flex-col justify-center pr-4 truncate">
                                    <span className="text-[13px] text-[#181818] truncate">{lead.email}</span>
                                    <span className="text-[13px] text-[#5E6C84] mt-0.5 truncate">{lead.phone}</span>
                                </div>

                                <div className="flex items-center">
                                    <span className="text-[12px] px-2 py-0.5 bg-gray-100 text-[#444] rounded border border-gray-200">{lead.source}</span>
                                </div>

                                <div className="flex items-center">
                                    <StatusBadge status={lead.status} />
                                </div>

                                <div className="flex flex-col justify-center pr-2">
                                    <span className="text-[13px] font-medium text-[#181818]">{lead.next_followup || '—'}</span>
                                </div>

                                <div className="flex items-center">
                                    <span className="text-[14px] font-semibold text-[#181818]">₹{Number(lead.deal_value || 0).toLocaleString()}</span>
                                </div>

                                <div className="flex items-center justify-end">
                                    <button className="p-1.5 text-gray-400 hover:text-primary rounded hover:bg-white border border-transparent hover:border-gray-200 shadow-sm opacity-0 group-hover:opacity-100 transition-all mr-1" onClick={(e) => { e.stopPropagation(); deleteLead(lead.id); }}>
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 text-[#5E6C84] hover:text-[#181818] rounded hover:bg-gray-100">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {leads.length === 0 && (
                            <div className="p-10 text-center text-text-secondary">
                                No leads found. Create some in the Board view!
                            </div>
                        )}
                    </div>

                </div>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-[#E5E5E5] px-4 py-3 bg-white flex justify-between items-center text-sm text-[#5E6C84]">
                <span>Showing 1 to {leads.length} of {leads.length} leads</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 border border-gray-200 rounded text-gray-400 bg-gray-50 cursor-not-allowed">Previous</button>
                    <button className="px-3 py-1 border border-primary text-primary bg-primary/5 rounded font-medium cursor-not-allowed">Next</button>
                </div>
            </div>

        </div>
    );
}
