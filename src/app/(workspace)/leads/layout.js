"use client"
import { LeadsProvider } from './context';

export default function LeadsLayout({ children }) {
    return (
        <LeadsProvider>
            {children}
        </LeadsProvider>
    );
}
