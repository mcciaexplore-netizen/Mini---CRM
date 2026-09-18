"use client"
import React from 'react';
import { useLeads } from '../context';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

export default function SummaryView() {
    const { leads, activeSpace } = useLeads();

    // Metrics calculate
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.status === 'WON').length;
    const pipelineValue = leads.reduce((acc, curr) => acc + Number(curr.deal_value || 0), 0);
    const avgDealSize = totalLeads ? Math.round(pipelineValue / totalLeads) : 0;

    // Chart 1: Status Donut
    const statusCounts = leads.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {});

    const statusColors = {
        'NEW': '#0176D3',
        'CONTACTED': '#FFC107',
        'INTERESTED': '#28A745',
        'NEGOTIATING': '#FD7E14',
        'WON': '#2E844A',
        'LOST': '#DC3545'
    };

    const statusData = Object.keys(statusCounts).map(k => ({
        name: k, value: statusCounts[k], color: statusColors[k] || '#CCC'
    }));

    // Chart 2: Source Bar
    const sourceCounts = leads.reduce((acc, l) => {
        acc[l.source] = (acc[l.source] || 0) + 1;
        return acc;
    }, {});
    const sourceData = Object.keys(sourceCounts).map(k => ({
        name: k, Leads: sourceCounts[k]
    }));

    // Actual lead creation counts for the last four calendar weeks.
    const timelineData = Array.from({ length: 4 }, (_, i) => {
        const end = new Date(); end.setHours(23,59,59,999); end.setDate(end.getDate() - (3-i)*7);
        const start = new Date(end); start.setDate(start.getDate()-6); start.setHours(0,0,0,0);
        return { week: start.toLocaleDateString([], { month:'short',day:'numeric' }), added: leads.filter(lead => new Date(lead.created_at) >= start && new Date(lead.created_at) <= end).length };
    });

    const topLeads = [...leads].sort((a, b) => Number(b.deal_value || 0) - Number(a.deal_value || 0)).slice(0, 5);

    return (
        <div className="h-full overflow-y-auto custom-scrollbar p-1 pb-10 space-y-6">

            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Leads', val: totalLeads },
                    { label: 'Won leads', val: wonLeads },
                    { label: 'Pipeline Value', val: `₹${pipelineValue.toLocaleString()}` },
                    { label: 'Avg. Deal Size', val: `₹${avgDealSize.toLocaleString()}` },
                ].map(kpi => (
                    <div key={kpi.label} className="bg-white rounded-lg border border-[#E5E5E5] p-5 shadow-sm">
                        <p className="text-sm font-semibold text-[#5E6C84] mb-1">{kpi.label}</p>
                        <h3 className="text-2xl font-bold text-[#172B4D]">{kpi.val}</h3>
                    </div>
                ))}
            </div>

            {/* 3 Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Donut Chart */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 shadow-sm flex flex-col items-center">
                    <h3 className="font-bold text-sm text-[#172B4D] mb-4 self-start">Leads by Status</h3>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                    {statusData.map((e, i) => <Cell key={i} fill={e.color} stroke="none" />)}
                                </Pie>
                                <Tooltip wrapperClassName="!text-xs !font-sans !rounded-md !shadow-lg !border-gray-200" />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 shadow-sm">
                    <h3 className="font-bold text-sm text-[#172B4D] mb-4">Leads by Source</h3>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sourceData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E5E5" />
                                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                                <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={80} />
                                <Tooltip cursor={{ fill: '#F5F8FF' }} wrapperClassName="!text-xs !font-sans !rounded-md !shadow-lg !border-gray-200" />
                                <Bar dataKey="Leads" fill="#0176D3" radius={[0, 4, 4, 0]} maxBarSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Line Chart */}
                <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 shadow-sm">
                    <h3 className="font-bold text-sm text-[#172B4D] mb-4">Pipeline Over Time (Current Month)</h3>
                    <div className="w-full h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5E5" />
                                <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} dy={10} />
                                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip wrapperClassName="!text-xs !font-sans !rounded-md !shadow-lg !border-gray-200" />
                                <Line type="monotone" dataKey="added" stroke="#06A59A" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Top Leads Table */}
            <div className="bg-white rounded-lg border border-[#E5E5E5] shadow-sm overflow-hidden mt-6">
                <div className="bg-[#F4F5F7] px-5 py-3 border-b border-[#E5E5E5]">
                    <h3 className="font-bold text-sm text-[#172B4D]">Top 5 High-Value Leads</h3>
                </div>
                <div className="divide-y divide-[#E5E5E5]">
                    {topLeads.map((l, i) => (
                        <div key={l.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-800">{i + 1}</div>
                                <div>
                                    <p className="text-[13px] font-bold text-[#172B4D]">{l.name || 'Unnamed Lead'}</p>
                                    <p className="text-[11px] font-medium text-[#5E6C84]">{l.company || 'No Company'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[14px] font-bold text-[#172B4D]">₹{Number(l.deal_value || 0).toLocaleString()}</p>
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-[#5E6C84]">{l.status}</span>
                            </div>
                        </div>
                    ))}
                    {topLeads.length === 0 && <div className="p-8 text-center text-sm text-gray-400">No leads with value found.</div>}
                </div>
            </div>

        </div>
    );
}
