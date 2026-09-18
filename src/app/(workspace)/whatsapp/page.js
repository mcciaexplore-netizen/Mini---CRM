"use client"
import { useState } from 'react';
import {
    MessageSquare,
    Wand2,
    Copy,
    Save,
    Users,
    CheckCheck,
    Clock,
    BookOpen
} from 'lucide-react';
import toast from 'react-hot-toast';

const MOCK_LIBRARY = [
    { id: 1, name: 'Diwali Offer', text: 'Hi {CustomerName}! 🎆 Celebrate Diwali with {ProductName}. Get flat {OfferAmount} off using code FESTIVE.', isSaved: true },
    { id: 2, name: 'Lead Follow-up', text: 'Hey {CustomerName}, checking in on our conversation about {ProductName}. Are you still looking to automate your workflow?', isSaved: true },
];

export default function WhatsAppCrafterPage() {
    const [tone, setTone] = useState('Friendly');
    const [goal, setGoal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedMsg, setGeneratedMsg] = useState(null);

    // Broadcast mode
    const [isBroadcastList, setIsBroadcastList] = useState(false);
    const [namesList, setNamesList] = useState('');

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success('Copied to clipboard');
        } catch {
            toast.error('Failed to copy message');
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!goal.trim()) return toast.error("Please enter a campaign goal");
        setIsGenerating(true);
        setGeneratedMsg('');

        try {
            const payload = {
                type: 'whatsapp',
                tone,
                campaignGoal: goal.trim(),
                broadcastMode: isBroadcastList,
                customerName: '{CustomerName}'
            };

            console.log('Sending to AI:', payload);

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                toast.error(data.error || 'Failed to generate message');
                return;
            }

            console.log('AI Response:', data.message);
            setGeneratedMsg(data.message);
            toast.success("WhatsApp message crafted!");
        } catch (error) {
            console.error('Generation error:', error);
            toast.error('Something went wrong. Check your API key in Settings.');
        } finally {
            setIsGenerating(false);
        }
    };

    const calculateReadTime = (text) => {
        const words = text.split(/\s+/).length;
        const mins = Math.ceil(words / 200); // avg 200 WPM
        return mins;
    };

    const renderHighlightedMessage = (text) => {
        // Regex to match {AnyWord}
        const parts = text.split(/(\{.*?\})/g);
        return parts.map((part, i) => {
            if (part.startsWith('{') && part.endsWith('}')) {
                return <span key={i} className="bg-primary/10 text-primary font-bold px-1 rounded mx-0.5">{part}</span>;
            }
            return <span key={i}>{part}</span>;
        });
    };

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#075E54] flex items-center gap-2">
                    <MessageSquare className="w-7 h-7" /> WhatsApp Crafter
                </h1>
                <p className="text-text-secondary mt-1">Design highly personalized, high-conversion WhatsApp messages.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column Controls */}
                <div className="lg:col-span-5 space-y-6">

                    <div className="card h-fit">
                        <div className="p-5 border-b border-[#E5E5E5] bg-gray-50/50 rounded-t-card">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-primary" /> AI Crafter
                            </h3>
                        </div>

                        <form className="p-5 space-y-5" onSubmit={handleGenerate}>
                            <div>
                                <label className="label-text">Select Tone</label>
                                <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                    {['Friendly', 'Professional', 'Urgent'].map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setTone(t)}
                                            className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${tone === t ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="label-text">Campaign Goal</label>
                                <textarea
                                    rows={3}
                                    className="input-field text-sm resize-none"
                                    placeholder="e.g. Trying to sell our new automation CRM package..."
                                    value={goal}
                                    onChange={e => setGoal(e.target.value)}
                                    required
                                />
                                <p className="text-xs text-text-secondary mt-2 italic">Pro tip: It will auto-insert variables like {'{CustomerName}'} for you.</p>
                            </div>

                            <div className="pt-2 border-t border-[#E5E5E5]">
                                <label className="flex items-center gap-2 cursor-pointer mb-3">
                                    <input type="checkbox" className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" checked={isBroadcastList} onChange={(e) => setIsBroadcastList(e.target.checked)} />
                                    <span className="text-sm font-semibold text-text-primary flex items-center gap-1.5"><Users className="w-4 h-4" /> Generate Broadcast List Planner</span>
                                </label>

                                {isBroadcastList && (
                                    <div className="bg-primary/5 p-3 rounded-md border border-primary/20 animate-in fade-in slide-in-from-top-2">
                                        <label className="label-text">Paste names (comma separated)</label>
                                        <textarea
                                            rows={2}
                                            className="input-field text-sm bg-white"
                                            placeholder="Rahul, Priya, Amit, Sarah"
                                            value={namesList}
                                            onChange={e => setNamesList(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>

                            <button type="submit" className="btn-primary w-full shadow-sm mt-4" disabled={isGenerating}>
                                {isGenerating ? "Crafting Message..." : "Craft Message"}
                            </button>
                        </form>
                    </div>

                    <div className="card p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-accent" /> Template Library
                        </h3>
                        <div className="space-y-3">
                            {MOCK_LIBRARY.map(lib => (
                                <div key={lib.id} className="p-3 border border-[#E5E5E5] rounded-xl hover:border-gray-300 transition-colors cursor-pointer" onClick={() => { setGeneratedMsg(lib.text); toast.success("Template loaded!"); }}>
                                    <div className="flex justify-between items-center mb-1">
                                        <h4 className="font-semibold text-sm text-text-primary">{lib.name}</h4>
                                        <span className="badge badge-success text-[10px] flex items-center gap-1"><Save className="w-3 h-3" /> Saved</span>
                                    </div>
                                    <p className="text-[11px] text-text-secondary line-clamp-2 leading-relaxed">{lib.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Preview window matching WhatsApp UI roughly */}
                <div className="lg:col-span-7 h-full flex flex-col">
                    <div className="card flex-1 bg-[#ECE5DD] relative overflow-hidden flex flex-col">

                        {/* WhatsApp Header Mock */}
                        <div className="bg-[#075E54] px-4 py-3 flex items-center text-white shrink-0 shadow-md z-10">
                            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3 shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold tracking-wide">Customer Preview</h3>
                                <p className="text-xs text-white/70">Online</p>
                            </div>
                        </div>

                        {/* Chat Canvas */}
                        <div className="flex-1 p-6 relative z-0 overflow-y-auto w-full custom-scrollbar flex flex-col">
                            {!generatedMsg && !isGenerating && (
                                <div className="bg-[#DCF8C6] self-center p-4 rounded-xl shadow-sm text-sm text-gray-800 text-center max-w-sm mt-10">
                                    Craft a message on the left or load a template from the library below to see it previewed here in WhatsApp style!
                                </div>
                            )}

                            {isGenerating && (
                                <div className="bg-[#DCF8C6] self-end p-4 rounded-xl rounded-tr-none shadow-sm text-sm text-gray-800 mb-4 max-w-sm relative">
                                    <div className="flex gap-1 animate-pulse px-4 py-2">
                                        <div className="w-2 h-2 bg-[#075E54]/50 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-[#075E54]/50 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-2 h-2 bg-[#075E54]/50 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                </div>
                            )}

                            {generatedMsg && !isGenerating && !isBroadcastList && (
                                <div className="bg-[#DCF8C6] self-end p-3 sm:p-4 rounded-xl rounded-tr-none shadow-sm text-[15px] sm:text-[16px] text-gray-800 mb-4 max-w-md relative whitespace-pre-wrap leading-relaxed border border-green-200">
                                    {renderHighlightedMessage(generatedMsg)}
                                    <div className="flex justify-end items-center gap-1 mt-1">
                                        <span className="text-[10px] sm:text-[11px] text-gray-500">10:42 AM</span>
                                        <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                                    </div>
                                </div>
                            )}

                            {generatedMsg && !isGenerating && isBroadcastList && namesList.split(',').filter(x => x.trim()).slice(0, 3).map((name, idx) => (
                                <div key={idx} className="bg-[#DCF8C6] self-end p-3 sm:p-4 rounded-xl rounded-tr-none shadow-sm text-[15px] sm:text-[16px] text-gray-800 mb-4 max-w-md relative whitespace-pre-wrap leading-relaxed border border-green-200 animate-in slide-in-from-bottom-2 fade-in">
                                    {renderHighlightedMessage(generatedMsg.replace('{CustomerName}', name.trim()))}
                                    <div className="flex justify-end items-center gap-1 mt-1">
                                        <span className="text-[10px] sm:text-[11px] text-gray-500">10:4{idx + 2} AM</span>
                                        <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))}

                            {isBroadcastList && namesList.split(',').filter(x => x.trim()).length > 3 && (
                                <p className="text-center text-xs font-semibold text-gray-500 bg-white/50 py-1 px-3 rounded-full self-center">
                                    + {namesList.split(',').filter(x => x.trim()).length - 3} more messages in broadcast queue
                                </p>
                            )}
                        </div>

                        {/* Action Bar */}
                        <div className="bg-[#F0F0F0] p-4 flex justify-between items-center text-sm border-t border-[#E5E5E5] shrink-0 z-10">
                            {generatedMsg ? (
                                <>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-1 text-gray-600 font-medium">
                                            <Clock className="w-4 h-4" /> <span>{calculateReadTime(generatedMsg)} min read</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-gray-600 font-medium hidden sm:flex">
                                            <MessageSquare className="w-4 h-4" /> <span>{generatedMsg.length} chars</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="btn-secondary !py-1.5 !px-3 font-semibold bg-white flex items-center gap-1.5">
                                            <Save className="w-4 h-4" /> Save to Library
                                        </button>
                                        <button className="btn-primary flex items-center gap-1.5 !py-1.5 !px-3" onClick={() => copyText(generatedMsg)}>
                                            <Copy className="w-4 h-4" /> Copy
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-gray-500 text-sm font-medium">Waiting for generated content...</div>
                            )}
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
}
