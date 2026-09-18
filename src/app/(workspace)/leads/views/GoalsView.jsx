"use client"
import React, { useState } from 'react';
import { useLeads } from '../context';
import { Target, TrendingUp, DollarSign, Plus, CheckCircle2, AlertTriangle, PlayCircle } from 'lucide-react';

const INITIAL_GOALS = [
    { id: 1, name: 'Monthly Lead Target', type: 'leads', target: 50, current: 42, icon: Target, color: 'bg-blue-500' },
    { id: 2, name: 'Conversion Rate Target', type: 'percent', target: 20, current: 18, icon: TrendingUp, color: 'bg-indigo-500' },
    { id: 3, name: 'Revenue Pipeline Target', type: 'currency', target: 1000000, current: 750000, icon: DollarSign, color: 'bg-green-500' },
];

export default function GoalsView() {
    const { leads } = useLeads(); // can be used for dynamic math if needed
    const [goals, setGoals] = useState(INITIAL_GOALS);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newGoal, setNewGoal] = useState({ name: '', target: '', type: 'leads' });

    const calculateStatus = (current, target) => {
        const pct = (current / target) * 100;
        if (pct >= 100) return { label: 'Achieved', style: 'bg-[#E3FCEF] text-[#006644] drop-shadow-sm', icon: CheckCircle2 };
        if (pct >= 75) return { label: 'On Track', style: 'bg-[#DEEBFF] text-[#0747A6]', icon: PlayCircle };
        return { label: 'At Risk', style: 'bg-[#FFEBE6] text-[#BF2600]', icon: AlertTriangle };
    };

    const handleAddGoal = (e) => {
        e.preventDefault();
        if (newGoal.name && newGoal.target) {
            setGoals([...goals, {
                id: Date.now(),
                name: newGoal.name,
                type: newGoal.type,
                target: Number(newGoal.target),
                current: 0,
                icon: Target,
                color: 'bg-gray-500'
            }]);
            setIsModalOpen(false);
            setNewGoal({ name: '', target: '', type: 'leads' });
        }
    };

    return (
        <div className="h-full flex flex-col p-2 space-y-6 overflow-hidden">

            <div className="flex justify-between items-center px-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight text-[#172B4D]">Team Goals Tracker</h2>
                    <p className="text-sm text-[#5E6C84] mt-1">Monitor pace against critical performance indicators.</p>
                </div>
                <button className="btn-primary !py-2 !px-4 shadow-sm" onClick={() => setIsModalOpen(true)}>
                    <Plus className="w-5 h-5 mr-1" /> Add Goal
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.map(goal => {
                        const Icon = goal.icon;
                        const status = calculateStatus(goal.current, goal.target);
                        const pct = Math.min(100, Math.round((goal.current / goal.target) * 100));

                        const formatVal = (val) => {
                            if (goal.type === 'currency') return `₹${val.toLocaleString()}`;
                            if (goal.type === 'percent') return `${val}%`;
                            return val.toLocaleString();
                        };

                        return (
                            <div key={goal.id} className="bg-white rounded-lg border border-[#DFE1E6] p-6 shadow-[0_1px_3px_rgba(9,30,66,0.05)] flex flex-col hover:shadow-[0_2px_5px_rgba(9,30,66,0.1)] transition-shadow cursor-default">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4 items-center">
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white ${goal.color}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[16px] text-[#172B4D]">{goal.name}</h3>
                                            <p className="text-[13px] font-semibold text-[#5E6C84] mt-0.5" title="Saves to Google Sheets tab 'Goals'">Mapped metric</p>
                                        </div>
                                    </div>
                                    <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[12px] font-bold ${status.style}`}>
                                        <status.icon className="w-3.5 h-3.5" /> {status.label}
                                    </div>
                                </div>

                                <div className="flex justify-between items-end mb-2">
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-[28px] font-bold tracking-tight text-[#172B4D] leading-none">{formatVal(goal.current)}</span>
                                        <span className="text-[14px] font-semibold text-[#5E6C84]">/ {formatVal(goal.target)}</span>
                                    </div>
                                    <span className="text-[16px] font-bold text-[#172B4D]">{pct}%</span>
                                </div>

                                {/* Progress Bar Container */}
                                <div className="w-full bg-[#EBECF0] rounded-full h-3 overflow-hidden shadow-inner">
                                    <div
                                        className={`h-full rounded-full transition-all duration-1000 ease-out relative ${goal.color}`}
                                        style={{ width: `${pct}%` }}
                                    >
                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-[#091E42]/50 z-50 flex items-center justify-center animate-in fade-in">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 slide-in-from-bottom-2">
                        <h3 className="text-lg font-bold text-[#172B4D] mb-4">Create New Goal</h3>
                        <form onSubmit={handleAddGoal} className="space-y-4">
                            <div>
                                <label className="text-[12px] font-bold text-[#5E6C84] uppercase tracking-wide mb-1.5 block">Goal Name</label>
                                <input type="text" className="w-full p-2 border-2 border-[#DFE1E6] rounded text-[#172B4D] text-sm focus:border-primary focus:outline-none" required value={newGoal.name} onChange={e => setNewGoal({ ...newGoal, name: e.target.value })} placeholder="e.g. Q4 Signups" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[12px] font-bold text-[#5E6C84] uppercase tracking-wide mb-1.5 block">Target Value</label>
                                    <input type="number" className="w-full p-2 border-2 border-[#DFE1E6] rounded text-[#172B4D] text-sm focus:border-primary focus:outline-none" required value={newGoal.target} onChange={e => setNewGoal({ ...newGoal, target: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-[12px] font-bold text-[#5E6C84] uppercase tracking-wide mb-1.5 block">Metric Type</label>
                                    <select className="w-full p-2 border-2 border-[#DFE1E6] rounded text-[#172B4D] text-sm focus:border-primary focus:outline-none bg-white" value={newGoal.type} onChange={e => setNewGoal({ ...newGoal, type: e.target.value })}>
                                        <option value="leads">Count (#)</option>
                                        <option value="percent">Percent (%)</option>
                                        <option value="currency">Currency (₹)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-3 border-t border-[#DFE1E6] mt-6">
                                <button type="button" className="px-4 py-2 rounded text-[14px] font-semibold text-[#5E6C84] hover:bg-[#EBECF0] transition-colors" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" className="px-4 py-2 rounded text-[14px] font-semibold text-white bg-primary hover:bg-[#015CBA] transition-colors shadow-sm cursor-pointer">Save Goal</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
