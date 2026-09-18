"use client"
import React, { useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useLeads, STATUS_COLUMNS } from '../context';
import { COLUMN_COLORS, SOURCE_COLORS } from '@/lib/constants';
import { Plus, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Source Badge ────────────────────────────────────────────────────────────
function SourceBadge({ source }) {
    const colors = SOURCE_COLORS[source] || { bg: '#F1F5F9', text: '#475569' };
    return (
        <span
            style={{ backgroundColor: colors.bg, color: colors.text }}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
        >
            {source}
        </span>
    );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────
function KanbanCard({ lead, index, isJustDropped, onSelect }) {
    const cc = COLUMN_COLORS[lead.status] || COLUMN_COLORS.NEW;
    const initial = lead.assignee?.full_name?.[0]?.toUpperCase() || '?';

    return (
        <Draggable draggableId={String(lead.id)} index={index}>
            {(provided, snapshot) => {
                // Append rotation/scale to dnd's own transform during drag
                const baseTransform = provided.draggableProps.style?.transform || '';
                const activeTransform = snapshot.isDragging
                    ? `${baseTransform} rotate(2deg) scale(1.02)`
                    : baseTransform;

                return (
                    <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => { if (!snapshot.isDragging) onSelect(lead); }}
                        className={isJustDropped ? 'card-drop-anim' : ''}
                        style={{
                            ...provided.draggableProps.style,
                            transform: activeTransform,
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${cc.border}`,
                            boxShadow: snapshot.isDragging
                                ? '0 16px 40px rgba(0,0,0,0.2)'
                                : '0 1px 4px rgba(0,0,0,0.08)',
                            padding: '14px 16px',
                            marginBottom: '8px',
                            cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                            opacity: snapshot.isDragging ? 0.95 : 1,
                            transition: snapshot.isDragging
                                ? 'none'
                                : 'box-shadow 0.15s ease, transform 0.15s ease',
                            userSelect: 'none',
                        }}
                    >
                        {/* Row 1: Lead name */}
                        <div style={{
                            fontWeight: 700,
                            fontSize: '15px',
                            color: '#111',
                            lineHeight: 1.3,
                            marginBottom: '4px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                        }}>
                            {lead.name}
                        </div>

                        {/* Row 2: Company */}
                        {lead.company && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '12px',
                                color: '#666',
                                marginBottom: '10px',
                                overflow: 'hidden',
                            }}>
                                <Building2 style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                                    {lead.company}
                                </span>
                            </div>
                        )}

                        {/* Row 3: Source + Deal value */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '8px',
                        }}>
                            {lead.source
                                ? <SourceBadge source={lead.source} />
                                : <span />
                            }
                            {lead.deal_value > 0 && (
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#0176D3' }}>
                                    ₹{Number(lead.deal_value).toLocaleString()}
                                </span>
                            )}
                        </div>

                        {/* Row 4: Lead code + assignee avatar + status dot */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                borderRadius: '99px',
                                padding: '2px 8px',
                            }}>
                                {lead.lead_code || '—'}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {lead.assignee && (
                                    <div
                                        title={lead.assignee.full_name}
                                        style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            backgroundColor: cc.border,
                                            color: 'white',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        {initial}
                                    </div>
                                )}
                                <div
                                    title={lead.status}
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        backgroundColor: cc.border,
                                        flexShrink: 0,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                );
            }}
        </Draggable>
    );
}

// ─── Quick Add Form ──────────────────────────────────────────────────────────
function QuickAddForm({ status, onAdd, onCancel }) {
    const [form, setForm] = useState({ name: '', company: '' });
    const cc = COLUMN_COLORS[status] || COLUMN_COLORS.NEW;

    const handleSave = async () => {
        console.log('[QuickAddForm] Save clicked', { ...form, status });
        if (!form.name.trim()) {
            toast.error('Lead name is required');
            return;
        }
        const saved = await onAdd({ ...form, status });
        if (saved) setForm({ name: '', company: '' });
    };

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            border: `1px solid ${cc.border}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            padding: '12px',
            marginBottom: '4px',
        }}>
            <input
                autoFocus
                type="text"
                placeholder="Lead name *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') onCancel();
                }}
                style={{
                    width: '100%',
                    border: `1px solid ${cc.border}`,
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    outline: 'none',
                    marginBottom: '8px',
                    boxSizing: 'border-box',
                }}
            />
            <input
                type="text"
                placeholder="Company (optional)"
                value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })}
                onKeyDown={e => e.key === 'Escape' && onCancel()}
                style={{
                    width: '100%',
                    border: '1px solid #E2E8F0',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '13px',
                    outline: 'none',
                    marginBottom: '10px',
                    boxSizing: 'border-box',
                }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    type="button"
                    onClick={handleSave}
                    style={{
                        flex: 1,
                        backgroundColor: cc.border,
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 0',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Save
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        backgroundColor: '#F1F5F9',
                        color: '#64748B',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: 'pointer',
                    }}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
}

// ─── Board View ──────────────────────────────────────────────────────────────
export default function BoardView() {
    const { leads, updateLeadStatus, setSelectedLead, addLead } = useLeads();
    const [addingToCol, setAddingToCol] = useState(null);
    const [droppedCardId, setDroppedCardId] = useState(null);
    const dropTimerRef = useRef(null);

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const { source, destination, draggableId } = result;
        console.log('[BoardView] onDragEnd', {
            from: source.droppableId,
            to: destination.droppableId,
            id: draggableId,
        });
        if (source.droppableId !== destination.droppableId) {
            updateLeadStatus(draggableId, destination.droppableId);
            // Trigger drop animation
            setDroppedCardId(draggableId);
            if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
            dropTimerRef.current = setTimeout(() => setDroppedCardId(null), 300);
        }
    };

    const handleQuickAdd = async (leadData) => {
        console.log('[BoardView] handleQuickAdd', leadData);
        const saved = await addLead(leadData);
        if (saved) setAddingToCol(null);
        return saved;
    };

    return (
        <>
            {/* Drop animation keyframes */}
            <style>{`
                @keyframes cardDrop {
                    0%   { transform: scale(1.03); box-shadow: 0 8px 24px rgba(0,0,0,0.2); }
                    100% { transform: scale(1);    box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
                }
                .card-drop-anim {
                    animation: cardDrop 0.25s ease forwards;
                }
            `}</style>

            <div
                className="custom-scrollbar"
                style={{
                    background: '#F1F5F9',
                    padding: '24px',
                    display: 'flex',
                    gap: '16px',
                    height: '100%',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    alignItems: 'flex-start',
                    userSelect: 'none',
                    paddingBottom: '32px',
                }}
            >
                <DragDropContext onDragEnd={onDragEnd}>
                    {STATUS_COLUMNS.map((col) => {
                        const colLeads = leads.filter(l => l.status === col);
                        const cc = COLUMN_COLORS[col] || COLUMN_COLORS.NEW;

                        return (
                            <div
                                key={col}
                                style={{
                                    minWidth: '280px',
                                    maxWidth: '320px',
                                    flexShrink: 0,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    maxHeight: 'calc(100vh - 200px)',
                                }}
                            >
                                {/* ── Column Header ── */}
                                <div style={{
                                    borderRadius: '8px 8px 0 0',
                                    padding: '12px 16px',
                                    background: cc.headerBg,
                                    borderTop: `3px solid ${cc.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    flexShrink: 0,
                                }}>
                                    <span style={{ fontSize: '15px' }}>{cc.icon}</span>
                                    <h3 style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        color: cc.text,
                                        letterSpacing: '0.8px',
                                        textTransform: 'uppercase',
                                        flex: 1,
                                    }}>
                                        {col}
                                    </h3>
                                    <span style={{
                                        backgroundColor: cc.badge,
                                        color: cc.text,
                                        borderRadius: '99px',
                                        padding: '2px 8px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                    }}>
                                        {colLeads.length}
                                    </span>
                                </div>

                                {/* ── Column Body (droppable + create btn) ── */}
                                <div style={{
                                    background: cc.colBg,
                                    border: `1px solid ${cc.border}33`,
                                    borderTop: 'none',
                                    borderRadius: '0 0 8px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: 1,
                                    overflow: 'hidden',
                                    padding: '8px',
                                    gap: '0',
                                }}>
                                    <Droppable droppableId={col}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.droppableProps}
                                                className="custom-scrollbar"
                                                style={{
                                                    flex: 1,
                                                    overflowY: 'auto',
                                                    minHeight: '80px',
                                                    borderRadius: '6px',
                                                    background: snapshot.isDraggingOver
                                                        ? `${cc.badge}80`
                                                        : 'transparent',
                                                    transition: 'background 0.15s ease',
                                                    padding: snapshot.isDraggingOver ? '4px' : '0',
                                                }}
                                            >
                                                {colLeads.map((lead, index) => (
                                                    <KanbanCard
                                                        key={lead.id}
                                                        lead={lead}
                                                        index={index}
                                                        isJustDropped={droppedCardId === String(lead.id)}
                                                        onSelect={setSelectedLead}
                                                    />
                                                ))}
                                                {provided.placeholder}

                                                {/* Empty state */}
                                                {colLeads.length === 0 && !snapshot.isDraggingOver && addingToCol !== col && (
                                                    <div style={{
                                                        background: `${cc.badge}4D`,
                                                        border: `2px dashed ${cc.border}66`,
                                                        borderRadius: '8px',
                                                        padding: '32px 16px',
                                                        textAlign: 'center',
                                                        margin: '4px 0',
                                                    }}>
                                                        <div style={{ fontSize: '24px', marginBottom: '8px' }}>{cc.icon}</div>
                                                        <p style={{ color: cc.text, fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>
                                                            Drop leads here
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>

                                    {/* ── Create / Quick-add ── */}
                                    <div style={{ flexShrink: 0, marginTop: '6px' }}>
                                        {addingToCol === col ? (
                                            <QuickAddForm
                                                status={col}
                                                onAdd={handleQuickAdd}
                                                onCancel={() => setAddingToCol(null)}
                                            />
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    console.log('[BoardView] + Create clicked for column:', col);
                                                    setAddingToCol(col);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    padding: '8px',
                                                    border: `1px dashed ${cc.border}99`,
                                                    borderRadius: '6px',
                                                    backgroundColor: 'transparent',
                                                    color: cc.border,
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={e => { e.currentTarget.style.background = cc.badge; }}
                                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <Plus style={{ width: '14px', height: '14px' }} />
                                                Create
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </DragDropContext>
            </div>
        </>
    );
}
