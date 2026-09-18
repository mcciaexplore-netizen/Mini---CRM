"use client"
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLeads } from './context';
import BoardView from './views/BoardView';
import ListView from './views/ListView';
import SummaryView from './views/SummaryView';
import TimelineView from './views/TimelineView';
import GoalsView from './views/GoalsView';
import LeadDetailPanel from './components/LeadDetailPanel';
import { Star } from 'lucide-react';

const VIEWS = [
    { id: 'summary',  label: 'Summary' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'board',    label: 'Board' },
    { id: 'list',     label: 'List' },
    { id: 'goals',    label: 'Goals' },
];

function LeadsPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { activeSpace, isLoading, switchSpaceById } = useLeads();

    const spaceParam = searchParams.get('space');
    const viewParam  = searchParams.get('view');
    const [activeView, setActiveView] = useState(
        viewParam ||
        (typeof window !== 'undefined' ? localStorage.getItem('activeLeadView') : null) ||
        'board'
    );
    const [favorited, setFavorited] = useState(false);

    // Switch space when URL param changes
    useEffect(() => {
        if (spaceParam) {
            console.log('[LeadsPage] space param detected:', spaceParam);
            switchSpaceById(spaceParam);
        }
    }, [spaceParam, switchSpaceById]);

    // Persist active view to localStorage and URL (without losing the space param)
    useEffect(() => {
        localStorage.setItem('activeLeadView', activeView);
        const params = new URLSearchParams(searchParams.toString());
        params.set('view', activeView);
        router.replace(`/leads?${params.toString()}`);
    }, [activeView, router, searchParams]);

    return (
        <div className="h-full flex flex-col -m-6 p-6 space-y-4">

            {/* ── Page Header ── */}
            <div className="flex flex-col gap-0 border-b border-[#E2E8F0] pb-0">
                <div className="flex justify-between items-center pb-3">
                    <div>
                        {/* Breadcrumb */}
                        <p style={{
                            fontSize: '11px',
                            color: '#888',
                            letterSpacing: '1.5px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            marginBottom: '6px',
                        }}>
                            Projects / Spaces
                        </p>

                        {/* Space name + star */}
                        <div className="flex items-center gap-2">
                            <h1 style={{
                                fontSize: '28px',
                                fontWeight: 800,
                                color: '#0F172A',
                                lineHeight: 1.1,
                            }}>
                                {activeSpace}
                            </h1>
                            <button
                                type="button"
                                onClick={() => setFavorited(f => !f)}
                                className="transition-transform hover:scale-110 mt-0.5"
                                title={favorited ? 'Remove from favorites' : 'Add to favorites'}
                            >
                                <Star
                                    className="w-5 h-5"
                                    style={{
                                        fill: favorited ? '#FBBF24' : 'none',
                                        color: favorited ? '#FBBF24' : '#94A3B8',
                                        strokeWidth: 1.5,
                                    }}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Member avatars */}
                    <div className="flex items-center gap-3">
                        <div style={{ display: 'flex', marginRight: '8px' }}>
                            {[
                                { initial: 'P', bg: '#BFDBFE', color: '#1D4ED8' },
                                { initial: 'S', bg: '#C7D2FE', color: '#4338CA' },
                                { initial: 'A', bg: '#BBF7D0', color: '#15803D' },
                            ].map((m, i) => (
                                <div
                                    key={i}
                                    title={`Member ${m.initial}`}
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        backgroundColor: m.bg,
                                        color: m.color,
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '2px solid white',
                                        marginLeft: i === 0 ? '0' : '-8px',
                                        zIndex: 10 - i,
                                        position: 'relative',
                                        cursor: 'default',
                                    }}
                                >
                                    {m.initial}
                                </div>
                            ))}
                            <div
                                title="+2 more members"
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    backgroundColor: '#E2E8F0',
                                    color: '#475569',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid white',
                                    marginLeft: '-8px',
                                    zIndex: 7,
                                    position: 'relative',
                                    cursor: 'default',
                                }}
                            >
                                +2
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tab Navigation ── */}
                <nav style={{
                    display: 'flex',
                    gap: '0',
                    borderBottom: '1px solid #E2E8F0',
                }}>
                    {VIEWS.map(view => {
                        const isActive = activeView === view.id;
                        return (
                            <button
                                key={view.id}
                                type="button"
                                onClick={() => setActiveView(view.id)}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: isActive ? 600 : 400,
                                    color: isActive ? '#0176D3' : '#64748B',
                                    background: 'none',
                                    border: 'none',
                                    borderBottom: isActive ? '2px solid #0176D3' : '2px solid transparent',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease, border-color 0.15s ease',
                                    marginBottom: '-1px',
                                    whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#0176D3'; }}
                                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#64748B'; }}
                            >
                                {view.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ── Main View Area ── */}
            <div className="flex-1 relative overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : (
                    <>
                        {activeView === 'board'    && <BoardView />}
                        {activeView === 'list'     && <ListView />}
                        {activeView === 'summary'  && <SummaryView />}
                        {activeView === 'timeline' && <TimelineView />}
                        {activeView === 'goals'    && <GoalsView />}
                    </>
                )}
            </div>

            <LeadDetailPanel />
        </div>
    );
}

export default function LeadsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center p-20 h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        }>
            <LeadsPageContent />
        </Suspense>
    );
}
