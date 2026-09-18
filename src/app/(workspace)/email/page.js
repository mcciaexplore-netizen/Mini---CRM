"use client"
import { useState } from 'react';
import {
    Mail,
    LayoutTemplate,
    Wand2,
    Save,
    Copy,
    Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

const TEMPLATES = [
    { id: 1, name: 'Welcome Email', desc: 'Onboard new signups effectively.', type: 'Onboarding' },
    { id: 2, name: 'Promotion / Offer', desc: 'Convert warm leads with a discount.', type: 'Sales' },
    { id: 3, name: 'Follow-up', desc: 'Re-engage someone after a meeting.', type: 'CRM' },
    { id: 4, name: 'Newsletter', desc: 'Weekly roundup of articles and news.', type: 'Content' },
    { id: 5, name: 'Festival Offer', desc: 'Diwali/Holi specific templates.', type: 'Seasonal' },
    { id: 6, name: 'Re-engagement', desc: 'Win back cold inactive leads.', type: 'Retention' },
];

export default function EmailBuilderPage() {
    const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]);
    const [goal, setGoal] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [subjectLines, setSubjectLines] = useState([]);
    const [emailBody, setEmailBody] = useState('');

    const handleGenerateSubjects = (e) => {
        e.preventDefault();
        if (!goal) return toast.error("Please enter a campaign goal");

        setIsGenerating(true);
        setTimeout(() => {
            setSubjectLines([
                { text: "🚀 Unlock 50% more ROI with our new framework", tip: "High open-rate: Uses emojis and specific numbers." },
                { text: "Your exclusive invitation to scale faster", tip: "Curiosity gap: 'exclusive invitation' drives clicks." },
                { text: "Question about your Q4 strategy?", tip: "Question format: Feels personal and requires an answer." },
                { text: "[Name], we tailored this automation just for you", tip: "Personalization: Includes recipient's name." },
                { text: "Last chance to claim your enterprise discount", tip: "Urgency: Creates FOMO (Fear Of Missing Out)." }
            ]);
            setEmailBody(`Hi {First Name},\n\nI noticed you're exploring ways to improve your team's efficiency this quarter. As the founder of an agency myself, I know how easily hours slip away into manual tasks.\n\nThat's why I wanted to personally invite you to see our new AI automation suite. We've helped companies like yours save 20+ hours a week.\n\nWould you be open to a quick 10-minute chat this Thursday?\n\nBest,\nYour Name\nCompany`);
            setIsGenerating(false);
            toast.success("AI Subject lines and draft generated!");
        }, 1500);
    };

    const copyText = (text) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
    }

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Email Builder</h1>
                <p className="text-text-secondary mt-1">Design high-converting emails and subject lines powered by AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                {/* Left Column Controls */}
                <div className="lg:col-span-4 space-y-6">

                    <div className="card p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <LayoutTemplate className="w-5 h-5 text-accent" /> Template Library
                        </h3>
                        <div className="grid grid-cols-1 gap-3">
                            {TEMPLATES.map((tmpl) => (
                                <div
                                    key={tmpl.id}
                                    onClick={() => { setSelectedTemplate(tmpl); toast.success(`Loaded ${tmpl.name} template context.`); }}
                                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedTemplate.id === tmpl.id ? 'border-primary bg-primary/5' : 'border-[#E5E5E5] hover:border-gray-300'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className={`font-bold text-sm ${selectedTemplate.id === tmpl.id ? 'text-primary' : 'text-text-primary'}`}>{tmpl.name}</h4>
                                        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider bg-white px-1.5 py-0.5 rounded border border-gray-200">{tmpl.type}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary line-clamp-2">{tmpl.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card p-5">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-primary" /> Subject Line Generator
                        </h3>
                        <form onSubmit={handleGenerateSubjects}>
                            <label className="label-text">Campaign Goal</label>
                            <textarea
                                rows={3}
                                className="input-field text-sm resize-none mb-4"
                                placeholder={`e.g. Trying to ${selectedTemplate.desc.toLowerCase()}`}
                                value={goal}
                                onChange={e => setGoal(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn-primary w-full" disabled={isGenerating}>
                                {isGenerating ? "Analyzing..." : "Generate Variants & Draft"}
                            </button>
                        </form>
                    </div>

                </div>

                {/* Right Column: Results & Editor */}
                <div className="lg:col-span-8 flex flex-col gap-6">

                    {/* Subject Line Results */}
                    <div className="card p-6 min-h-[150px] bg-white">
                        <h3 className="font-bold text-lg border-b border-[#E5E5E5] pb-3 mb-4 flex items-center justify-between">
                            <span>AI Subject Line Suggestions</span>
                            {subjectLines.length > 0 && <span className="badge badge-success text-[10px]">Optimized for Open-rates</span>}
                        </h3>

                        {subjectLines.length === 0 ? (
                            <div className="text-center py-6 text-text-secondary text-sm">
                                Run the generator to see AI suggested subject lines here.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {subjectLines.map((sub, i) => (
                                    <div key={i} className="flex flex-col gap-1 p-3 border border-[#E5E5E5] rounded-xl hover:border-primary/50 transition-colors group bg-gray-50/50">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-text-primary text-sm flex-1 pr-4">{sub.text}</span>
                                            <button className="text-text-secondary hover:text-primary transition-colors shrink-0" onClick={() => copyText(sub.text)}>
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Lightbulb className="w-3.5 h-3.5 text-accent" />
                                            <span className="text-[11px] font-medium text-text-secondary">{sub.tip}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Draft Editor */}
                    <div className="card h-full flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-[#E5E5E5] bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg flex items-center gap-2"><Mail className="w-5 h-5 text-text-secondary" /> Email Body Draft</h3>
                            <div className="flex gap-2">
                                <button className="btn-secondary !py-1.5 !px-3 text-sm bg-white" onClick={() => copyText(emailBody)}>
                                    <Copy className="w-4 h-4 mr-1" /> Copy
                                </button>
                                <button className="btn-primary !py-1.5 !px-3 text-sm">
                                    <Save className="w-4 h-4 mr-1" /> Save Draft to Sheets
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 p-0">
                            <textarea
                                className="w-full h-[400px] p-6 focus:outline-none resize-none text-sm text-text-primary leading-relaxed font-sans placeholder:text-gray-300"
                                placeholder="Your generated email copy will appear here..."
                                value={emailBody}
                                onChange={e => setEmailBody(e.target.value)}
                            />
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// Temporary icon to avoid undefined error
function Lightbulb(props) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.9 1.2 1.5 1.5 2.5" />
            <path d="M9 18h6" />
            <path d="M10 22h4" />
        </svg>
    );
}
