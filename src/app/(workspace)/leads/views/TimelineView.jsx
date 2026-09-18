"use client"
import React, { useMemo } from 'react';
import { useLeads } from '../context';
import { eachDayOfInterval, format, differenceInDays, isSameMonth } from 'date-fns';
import { Calendar, AlertCircle } from 'lucide-react';

export default function TimelineView() {
    const { leads, setSelectedLead } = useLeads();

    // Create timeline dates array (curr month)
    const daysInMonth = useMemo(() => {
        const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const end = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
        return eachDayOfInterval({ start, end });
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'NEW': return 'bg-[#0176D3] hover:bg-[#015CBA]';
            case 'CONTACTED': return 'bg-[#FFC107] hover:bg-[#E0A800]';
            case 'INTERESTED': return 'bg-[#28A745] hover:bg-[#218838]';
            case 'NEGOTIATING': return 'bg-[#FD7E14] hover:bg-[#E37112]';
            case 'WON': return 'bg-[#2E844A] hover:bg-[#236838]';
            case 'LOST': return 'bg-[#DC3545] hover:bg-[#C82333]';
            default: return 'bg-[#5E6C84] hover:bg-[#42526E]';
        }
    };

    const currentMonth = new Date().getMonth();

    return (
        <div className="h-full flex flex-col bg-white rounded-lg border border-[#E5E5E5] shadow-sm overflow-hidden select-none">

            <div className="p-4 border-b border-[#E5E5E5] bg-[#F4F5F7] flex justify-between items-center">
                <h3 className="font-bold text-sm text-[#172B4D] flex items-center gap-2"><Calendar className="w-4 h-4 text-primary" /> Project Schedule — {format(new Date(), 'MMMM yyyy')}</h3>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar relative flex">

                {/* Y Axis sidebar (fixed) */}
                <div className="w-[200px] shrink-0 border-r border-[#E5E5E5] bg-white sticky left-0 z-20 flex flex-col shadow-[2px_0_5px_rgba(0,0,0,0.02)]">
                    <div className="h-[40px] border-b text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider p-3 bg-gray-50 flex items-center sticky top-0 z-30">
                        Lead
                    </div>
                    {leads.map(lead => (
                        <div key={lead.id} className="h-[50px] border-b px-3 flex flex-col justify-center truncate group cursor-pointer hover:bg-gray-50" onClick={() => setSelectedLead(lead)}>
                            <span className="text-[13px] font-semibold text-[#172B4D] truncate group-hover:text-primary transition-colors">{lead.name}</span>
                            <span className="text-[11px] text-[#5E6C84] truncate">{lead.status}</span>
                        </div>
                    ))}
                </div>

                {/* X Axis Grid (scrollable) */}
                <div className="flex-1 flex flex-col min-w-[800px]">

                    {/* Dates Header */}
                    <div className="h-[40px] bg-gray-50 flex border-b sticky top-0 z-10 w-full" style={{ minWidth: `${daysInMonth.length * 40}px` }}>
                        {daysInMonth.map((date, i) => (
                            <div key={i} className="flex-1 min-w-[40px] border-r border-dashed border-[#DFE1E6] flex flex-col justify-center items-center text-[#5E6C84]">
                                <span className="text-[10px] uppercase font-semibold leading-none mb-0.5">{format(date, 'E')[0]}</span>
                                <span className={`text-[12px] font-bold leading-none ${format(date, 'd') === format(new Date(), 'd') ? 'bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center -mb-0.5' : ''}`}>{format(date, 'd')}</span>
                            </div>
                        ))}
                    </div>

                    {/* Grid Body */}
                    <div className="flex flex-col relative" style={{ minWidth: `${daysInMonth.length * 40}px` }}>

                        {/* Background dashed lines */}
                        <div className="absolute inset-0 flex pointer-events-none">
                            {daysInMonth.map((_, i) => (
                                <div key={i} className="flex-1 min-w-[40px] border-r border-dashed border-[#DFE1E6]" />
                            ))}
                        </div>

                        {/* Lead Rows with Gantt Bars */}
                        {leads.map((lead, index) => {

                            const parseFallback = (dStr) => dStr ? new Date(dStr) : new Date();
                            const start = parseFallback(lead.lastContact);
                            let end = parseFallback(lead.next_followup);

                            if (end < start) end = new Date(start.getTime() + 86400000 * 3); // Fix mock data issues automatically

                            // Filter logic: Render only if bar touches current month
                            let renderStartStr = start;
                            let renderEndStr = end;

                            // Math logic to place the absolute visual bar
                            const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                            const daysFromStartOfMonth = differenceInDays(start, firstOfMonth);
                            const durationDays = differenceInDays(end, start) + 1; // inclusive 

                            // Ignore calculations if it's wildly not this month
                            const isVisible = isSameMonth(start, firstOfMonth) || isSameMonth(end, firstOfMonth);

                            return (
                                <div key={lead.id} className="h-[50px] border-b border-transparent relative z-10" onClick={() => setSelectedLead(lead)}>
                                    {isVisible && (
                                        <div
                                            className={`absolute top-[10px] h-[30px] rounded shadow-sm text-[11px] text-white font-bold flex items-center px-2 cursor-pointer transition-transform hover:scale-[1.01] ${getStatusColor(lead.status)}`}
                                            style={{
                                                left: `${Math.max(0, daysFromStartOfMonth * 40)}px`,
                                                width: `${Math.max(40, durationDays * 40)}px`,
                                                maxWidth: `calc(100% - ${Math.max(0, daysFromStartOfMonth * 40)}px)` // Crop if overflows
                                            }}
                                            title={`From ${format(start, 'MMM d')} to ${format(end, 'MMM d')} - ${lead.status}`}
                                        >
                                            {lead.name}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

            </div>

            {/* Footer Legend */}
            <div className="h-[40px] bg-white border-t border-[#E5E5E5] px-4 flex items-center gap-6 text-[11px] font-semibold text-[#5E6C84]">
                <span className="flex gap-2 items-center"><div className="w-2.5 h-2.5 rounded-full bg-[#0176D3]"></div> New</span>
                <span className="flex gap-2 items-center"><div className="w-2.5 h-2.5 rounded-full bg-[#FFC107]"></div> Contacted</span>
                <span className="flex gap-2 items-center"><div className="w-2.5 h-2.5 rounded-full bg-[#28A745]"></div> Interested</span>
                <span className="flex gap-2 items-center"><div className="w-2.5 h-2.5 rounded-full bg-[#FD7E14]"></div> Negotiating</span>
            </div>

        </div>
    );
}
