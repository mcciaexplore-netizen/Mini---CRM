"use client"
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    BarChart3,
    Target,
    CalendarDays,
    PenTool,
    Mail,
    MessageSquare,
    Settings,
    ChevronDown,
    ChevronRight,
    Plus,
    Trash2,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { deleteSpace, getSpaces } from '../../lib/db';
import CreateSpaceModal from '../ui/CreateSpaceModal';

const NAV_ITEMS = [
    { name: 'Dashboard',        href: '/',         icon: BarChart3 },
    { name: 'Campaigns',        href: '/campaigns', icon: CalendarDays },
    { name: 'Content Studio',   href: '/content',  icon: PenTool },
    { name: 'Scheduler',        href: '/scheduler', icon: CalendarDays },
    { name: 'Email Builder',    href: '/email',    icon: Mail },
    { name: 'WhatsApp Crafter', href: '/whatsapp', icon: MessageSquare },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [leadsExpanded, setLeadsExpanded] = useState(true);
    const [spaces, setSpaces] = useState([]);
    const [createSpaceModalOpen, setCreateSpaceModalOpen] = useState(false);
    const [deletingSpaceId, setDeletingSpaceId] = useState(null);

    useEffect(() => {
        getSpaces().then(data => setSpaces(data || [])).catch(error => toast.error(error.message));
    }, []);

    const handleSpaceCreated = (newSpace) => {
        console.log('[Sidebar] Space created, updating list + navigating:', newSpace);
        // Optimistic: add space to sidebar list
        setSpaces(prev => [...prev, newSpace]);
        setCreateSpaceModalOpen(false);
        // Navigate to the new space
        router.push(`/leads?space=${newSpace.id}&view=board`);
    };

    const handleDeleteSpace = async (space) => {
        if (spaces.length <= 1) {
            toast.error('You need at least one space')
            return
        }

        const confirmed = window.confirm(`Delete "${space.name}"? All leads in this space will be deleted too.`)
        if (!confirmed) return

        setDeletingSpaceId(space.id)
        try {
            await deleteSpace(space.id)
            const remainingSpaces = spaces.filter((item) => item.id !== space.id)
            setSpaces(remainingSpaces)
            toast.success('Space deleted')

            if (pathname.startsWith('/leads') && window.location.search.includes(`space=${space.id}`)) {
                const nextSpace = remainingSpaces[0]
                if (nextSpace) {
                    router.push(`/leads?space=${nextSpace.id}&view=board`)
                } else {
                    router.push('/leads')
                }
            } else {
                router.refresh()
            }
        } catch (error) {
            console.error('[Sidebar] delete space error:', error)
            toast.error('Failed to delete space')
        } finally {
            setDeletingSpaceId(null)
        }
    }

    return (
        <>
            <aside className="w-[240px] flex-shrink-0 bg-secondary flex flex-col h-screen fixed lg:static z-50 transition-transform -translate-x-full lg:translate-x-0">
                {/* Logo */}
                <div className="flex h-16 shrink-0 items-center justify-center border-b border-[#1E4373]">
                    <h1 className="text-white font-bold text-xl tracking-tight">
                        ProMarketer<span className="text-accent">.</span>
                    </h1>
                </div>

                <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-8 space-y-2 custom-scrollbar">
                    {/* Dashboard */}
                    <Link
                        href="/"
                        className={clsx(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors relative',
                            pathname === '/'
                                ? 'bg-primary text-white'
                                : 'text-[#B3C5DF] hover:text-white hover:bg-[#1E4373]'
                        )}
                    >
                        {pathname === '/' && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-md -ml-2" />
                        )}
                        <BarChart3 className={clsx('h-5 w-5 shrink-0', pathname === '/' ? 'text-white' : 'text-[#B3C5DF] group-hover:text-white')} />
                        Dashboard
                    </Link>

                    {/* Leads + Spaces */}
                    <div>
                        <button
                            type="button"
                            onClick={() => setLeadsExpanded(!leadsExpanded)}
                            className={clsx(
                                'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors relative justify-between w-full',
                                pathname.startsWith('/leads')
                                    ? 'bg-primary text-white'
                                    : 'text-[#B3C5DF] hover:text-white hover:bg-[#1E4373]'
                            )}
                        >
                            <div className="flex gap-x-3 items-center">
                                <Target className={clsx('h-5 w-5 shrink-0', pathname.startsWith('/leads') ? 'text-white' : 'text-[#B3C5DF] group-hover:text-white')} />
                                Leads
                            </div>
                            {leadsExpanded
                                ? <ChevronDown className="w-4 h-4" />
                                : <ChevronRight className="w-4 h-4" />
                            }
                        </button>

                        {leadsExpanded && (
                            <div className="mt-1 ml-4 border-l border-[#1E4373]/50 pl-2 space-y-0.5">
                                <p className="text-[10px] uppercase font-bold text-[#8FA5C2] px-2 py-1 tracking-wider mt-2 mb-1">
                                    Spaces
                                </p>

                                {spaces.map((space) => {
                                    const dotColor = space.color || '#0176D3';
                                    return (
                                        <div
                                            key={space.id}
                                            className="group flex items-center gap-1 rounded-md hover:bg-[#1a3350] transition-colors"
                                        >
                                            <Link
                                                href={`/leads?space=${space.id}&view=board`}
                                                className="flex min-w-0 flex-1 gap-x-2 rounded-md p-1.5 text-[13px] leading-5 font-medium text-[#B3C5DF] hover:text-white transition-colors items-center"
                                            >
                                                <span
                                                    style={{
                                                        width: '8px',
                                                        height: '8px',
                                                        borderRadius: '50%',
                                                        backgroundColor: dotColor,
                                                        flexShrink: 0,
                                                        opacity: 0.9,
                                                    }}
                                                />
                                                <span className="truncate">{space.name}</span>
                                            </Link>

                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    event.preventDefault()
                                                    event.stopPropagation()
                                                    handleDeleteSpace(space)
                                                }}
                                                disabled={deletingSpaceId === space.id}
                                                className="mr-1 flex h-7 w-7 items-center justify-center rounded-md text-[#8FA5C2] opacity-0 transition hover:bg-[#24466d] hover:text-white group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-100"
                                                title={`Delete ${space.name}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}

                                {/* + New Space button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        console.log('[Sidebar] + New Space clicked');
                                        setCreateSpaceModalOpen(true);
                                    }}
                                    className="flex gap-x-2 rounded-md p-1.5 text-[12px] leading-5 font-medium text-[#94A3B8] hover:text-white hover:bg-[#1a3350] transition-colors items-center w-full mt-1 border border-dashed border-[#1E4373]"
                                >
                                    <Plus className="w-3 h-3 shrink-0" />
                                    New Space
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Other nav items */}
                    {NAV_ITEMS.slice(1).map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors relative',
                                    isActive ? 'bg-primary text-white' : 'text-[#B3C5DF] hover:text-white hover:bg-[#1E4373]'
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-md -ml-2" />
                                )}
                                <Icon className={clsx('h-5 w-5 shrink-0', isActive ? 'text-white' : 'text-[#B3C5DF] group-hover:text-white')} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Settings footer */}
                <div className="mt-auto px-4 py-4 border-t border-[#1E4373]">
                    <Link
                        href="/settings"
                        className={clsx(
                            'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors relative',
                            pathname.startsWith('/settings')
                                ? 'bg-primary text-white'
                                : 'text-[#B3C5DF] hover:text-white hover:bg-[#1E4373]'
                        )}
                    >
                        {pathname.startsWith('/settings') && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-l-md -ml-2" />
                        )}
                        <Settings className={clsx('h-5 w-5 shrink-0', pathname.startsWith('/settings') ? 'text-white' : 'text-[#B3C5DF] group-hover:text-white')} />
                        Settings
                    </Link>
                </div>
            </aside>

            {/* Create Space Modal */}
            {createSpaceModalOpen && (
                <CreateSpaceModal
                    onClose={() => setCreateSpaceModalOpen(false)}
                    onCreated={handleSpaceCreated}
                />
            )}
        </>
    );
}
