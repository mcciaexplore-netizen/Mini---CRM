"use client"
import { usePathname } from 'next/navigation';
import { Search, Bell, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { signOut } from '@/lib/db';

export default function Navbar() {
    const pathname = usePathname();

    const getBreadcrumbs = () => {
        if (pathname === '/') return [{ label: 'Dashboard', href: '/' }];

        const paths = pathname.split('/').filter(Boolean);
        const breadcrumbs = paths.map((p, i) => {
            const href = '/' + paths.slice(0, i + 1).join('/');
            return {
                label: p.charAt(0).toUpperCase() + p.slice(1).replace('-', ' '),
                href
            };
        });

        return breadcrumbs;
    };

    const breadcrumbs = getBreadcrumbs();

    return (
        <div className="flex flex-col bg-white">
            {/* Top Navbar */}
            <header className="h-16 flex items-center justify-between px-6 border-b border-[#E5E5E5]">

                {/* Search */}
                <div className="flex-1 flex px-4">
                    <div className="w-full max-w-lg relative">
                        <label htmlFor="search" className="sr-only">Search</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <Search className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                            </div>
                            <input
                                id="search"
                                className="input-field pl-10 bg-gray-50 focus:bg-white sm:text-sm"
                                placeholder="Search leads, campaigns, or posts..."
                                type="search"
                            />
                        </div>
                    </div>
                </div>

                {/* Right Icons */}
                <div className="flex items-center gap-x-6">
                    <button className="text-text-secondary hover:text-text-primary relative transition-colors">
                        <span className="sr-only">View notifications</span>
                        <Bell className="h-5 w-5" aria-hidden="true" />
                        <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-error ring-2 ring-white"></span>
                    </button>

                    <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" aria-hidden="true" />

                    <div className="relative">
                        <button
                            onClick={async () => { await signOut(); window.location.assign("/login"); }}
                            className="flex items-center gap-x-2 text-sm font-semibold leading-6 text-text-primary focus:outline-none"
                        >
                            <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                                AC
                            </div>
                            <span className="hidden lg:block text-sm text-text-primary">Sign out</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Breadcrumbs */}
            <div className="border-b border-[#E5E5E5] px-6 py-3 shrink-0">
                <nav className="flex" aria-label="Breadcrumb">
                    <ol role="list" className="flex items-center space-x-2 text-sm">
                        {breadcrumbs.map((crumb, i) => (
                            <li key={crumb.href} className="flex flex-row items-center space-x-2">
                                {i > 0 && <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
                                <div className="flex items-center">
                                    <Link
                                        href={crumb.href}
                                        className={`font-medium ${i === breadcrumbs.length - 1 ? 'text-primary' : 'text-text-secondary hover:text-text-primary'} transition-colors`}
                                    >
                                        {crumb.label}
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ol>
                </nav>
            </div>
        </div>
    );
}
