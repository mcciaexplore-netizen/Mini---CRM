"use client"
import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { createSpace } from '../../lib/db';
import toast from 'react-hot-toast';

const PRESET_COLORS = [
    '#3B82F6', '#22C55E', '#F59E0B', '#F43F5E',
    '#8B5CF6', '#F97316', '#10B981', '#0176D3',
];

export default function CreateSpaceModal({ onClose, onCreated }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [color, setColor] = useState('#0176D3');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        console.log('[CreateSpaceModal] Submit clicked', { name, description, color });
        if (!name.trim()) {
            toast.error('Space name is required');
            return;
        }
        setLoading(true);
        try {
            console.log('[CreateSpaceModal] Calling createSpace...');
            const space = await createSpace({
                name: name.trim(),
                description: description.trim() || null,
                color,
            });
            console.log('[CreateSpaceModal] Space created:', space);
            if (space) {
                toast.success('Space created!');
                onCreated(space);
            } else {
                console.error('[CreateSpaceModal] createSpace returned null/undefined');
                toast.error('Failed to create space — check console');
            }
        } catch (err) {
            console.error('[CreateSpaceModal] Error:', err);
            toast.error('Failed to create space');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-[440px] mx-4 z-10">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-[#0F172A]">Create New Space</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    {/* Space Name */}
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                            Space Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            autoFocus
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Q1 Sales Pipeline"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent"
                            style={{ '--tw-ring-color': color }}
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-1.5">
                            Description{' '}
                            <span className="text-gray-400 font-normal">(optional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="What is this space for?"
                            rows={2}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0F172A] placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent resize-none"
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-[#0F172A] mb-2.5">
                            Color
                        </label>
                        <div className="flex items-center gap-3">
                            {PRESET_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    title={c}
                                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 focus:outline-none"
                                    style={{
                                        backgroundColor: c,
                                        boxShadow: color === c
                                            ? `0 0 0 3px white, 0 0 0 5px ${c}`
                                            : 'none',
                                    }}
                                >
                                    {color === c && (
                                        <Check className="w-4 h-4 text-white" strokeWidth={3} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-[#475569] hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !name.trim()}
                        className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: '#0176D3' }}
                    >
                        {loading ? 'Creating...' : 'Create Space'}
                    </button>
                </div>
            </div>
        </div>
    );
}
