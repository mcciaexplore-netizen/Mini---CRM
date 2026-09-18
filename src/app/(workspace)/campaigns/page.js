"use client"
import { useEffect, useState } from 'react';
import {
    Wand2,
    Calendar,
    Download,
    FileText,
    Instagram,
    Linkedin,
    Mail,
    Facebook,
    MessageSquare,
    Globe,
    Database,
    Loader2,
    Table2,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignPlannerPage() {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [calendarData, setCalendarData] = useState(null);
    const [platforms, setPlatforms] = useState([]);
    const [storageStatus, setStorageStatus] = useState({
        databaseConnected: true,
        sheetsConfigured: false,
        campaignStorageProvider: 'neon'
    });
    const [aiStatus, setAiStatus] = useState({
        configured: false,
        hasGemini: false,
        hasOpenAI: false,
        activeProvider: 'gemini',
        source: 'none'
    });
    const [form, setForm] = useState({
        industry: '',
        goal: '',
        tone: 'Professional',
        budgetRange: '₹0 (Organic only)',
        keyDates: ''
    });

    useEffect(() => {
        fetch('/api/settings/storage-status')
            .then((response) => response.json())
            .then((result) => {
                if (result.success) setStorageStatus(result.data);
            })
            .catch(() => null);

        fetch('/api/settings/ai-status')
            .then((response) => response.json())
            .then((result) => {
                if (result.success) setAiStatus(result.data);
            })
            .catch(() => null);
    }, []);

    const handlePlatformToggle = (val) => {
        if (platforms.includes(val)) setPlatforms(platforms.filter(p => p !== val));
        else setPlatforms([...platforms, val]);
    };

    const handleFieldChange = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const saveCampaign = async (providerOverride) => {
        if (!calendarData) {
            toast.error('Generate a campaign first');
            return;
        }

        const provider = providerOverride || storageStatus.campaignStorageProvider || 'neon';
        if ((provider === 'sheets' || provider === 'both') && !storageStatus.sheetsConfigured) {
            toast.error('Google Sheets is not configured in server environment variables');
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch('/api/campaigns/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: `${form.industry} Campaign`,
                    business_type: form.industry,
                    goal: form.goal,
                    budget_range: form.budgetRange,
                    tone: form.tone,
                    key_dates: form.keyDates,
                    platforms,
                    calendar_data: calendarData,
                    provider
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to save campaign');
            }

            const label = provider === 'both'
                ? 'Neon and Google Sheets'
                : provider === 'sheets'
                    ? 'Google Sheets'
                    : 'Neon';

            toast.success(`Campaign saved to ${label}`);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (platforms.length === 0) return toast.error("Please select at least one platform");

        setIsGenerating(true);
        setCalendarData(null);

        try {
            const response = await fetch('/api/campaigns/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    form,
                    platforms
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to generate campaign');
            }

            setCalendarData(result.data);
            toast.success(`Campaign calendar generated with ${result.data.provider}`);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const getPlatformStyle = (platform) => {
        switch (platform) {
            case 'Instagram': return 'bg-pink-50 border-pink-200 text-pink-700';
            case 'LinkedIn': return 'bg-blue-50 border-blue-200 text-blue-700';
            case 'WhatsApp': return 'bg-green-50 border-green-200 text-green-700';
            case 'Email': return 'bg-orange-50 border-orange-200 text-orange-700';
            case 'Google Ads': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
            case 'Facebook': return 'bg-sky-50 border-sky-200 text-sky-700';
            default: return 'bg-gray-50 border-gray-200 text-gray-500';
        }
    };

    const getPlatformIcon = (platform) => {
        switch (platform) {
            case 'Instagram': return <Instagram className="w-3 h-3" />;
            case 'LinkedIn': return <Linkedin className="w-3 h-3" />;
            case 'WhatsApp': return <MessageSquare className="w-3 h-3" />;
            case 'Email': return <Mail className="w-3 h-3" />;
            case 'Google Ads': return <Globe className="w-3 h-3" />;
            case 'Facebook': return <Facebook className="w-3 h-3" />;
            default: return null;
        }
    };

    const storageLabel = storageStatus.campaignStorageProvider === 'both'
        ? 'Neon + Google Sheets'
        : storageStatus.campaignStorageProvider === 'sheets'
            ? 'Google Sheets'
            : 'Neon';

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Campaign Planner</h1>
                <p className="text-text-secondary mt-1">Generate a structured multi-platform marketing calendar in seconds.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                <div className="lg:col-span-4 card h-fit">
                    <div className="p-5 border-b border-[#E5E5E5] bg-gray-50/50 rounded-t-card">
                        <h3 className="font-bold text-lg flex items-center gap-2">
                            <Wand2 className="w-5 h-5 text-primary" /> Campaign Parameters
                        </h3>
                    </div>
                    <form className="p-5 space-y-5" onSubmit={handleGenerate}>

                        <div>
                            <label className="label-text">Industry</label>
                            <select className="input-field" required value={form.industry} onChange={(e) => handleFieldChange('industry', e.target.value)}>
                                <option value="">Select industry...</option>
                                <option>Retail</option>
                                <option>SaaS</option>
                                <option>F&B</option>
                                <option>Real Estate</option>
                                <option>Healthcare</option>
                                <option>Education</option>
                                <option>Manufacturing</option>
                                <option>Other</option>
                            </select>
                        </div>

                        <div>
                            <label className="label-text">Target Platforms <span className="text-error">*</span></label>
                            <div className="grid grid-cols-2 gap-2">
                                {['Instagram', 'LinkedIn', 'WhatsApp', 'Email', 'Google Ads', 'Facebook'].map(p => (
                                    <label key={p} className={`flex items-center gap-2 p-2 border rounded-md cursor-pointer transition-colors text-sm ${platforms.includes(p) ? 'border-primary bg-primary/5 text-primary font-semibold' : 'border-[#E5E5E5] text-text-secondary hover:border-gray-300'}`}>
                                        <input type="checkbox" className="hidden" checked={platforms.includes(p)} onChange={() => handlePlatformToggle(p)} />
                                        {p}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="label-text">Campaign Goal</label>
                            <textarea rows={2} className="input-field resize-none text-sm" placeholder="e.g. Launching our new premium tier targeting executives..." required value={form.goal} onChange={(e) => handleFieldChange('goal', e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label-text">Tone</label>
                                <select className="input-field text-sm" value={form.tone} onChange={(e) => handleFieldChange('tone', e.target.value)}>
                                    <option>Professional</option>
                                    <option>Friendly</option>
                                    <option>Urgent</option>
                                    <option>Inspirational</option>
                                    <option>Informational</option>
                                </select>
                            </div>
                            <div>
                                <label className="label-text">Budget Range</label>
                                <select className="input-field text-sm" value={form.budgetRange} onChange={(e) => handleFieldChange('budgetRange', e.target.value)}>
                                    <option>₹0 (Organic only)</option>
                                    <option>₹10k - 50k</option>
                                    <option>₹50k - 1L</option>
                                    <option>₹1L - 3L</option>
                                    <option>₹5L+ / month</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="label-text text-accent">Key Dates / Festivals</label>
                            <input type="text" className="input-field text-sm" placeholder="e.g. Diwali offer ending Oct 30..." value={form.keyDates} onChange={(e) => handleFieldChange('keyDates', e.target.value)} />
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                            <div className="flex items-center gap-2 font-semibold text-text-primary">
                                {storageStatus.campaignStorageProvider === 'sheets' ? <Table2 className="w-4 h-4 text-green-600" /> : <Database className="w-4 h-4 text-primary" />}
                                Saving destination: {storageLabel}
                            </div>
                            <p className="mt-1 text-text-secondary">Change this in Settings → Integrations.</p>
                        </div>

                        <div className={`rounded-xl border px-4 py-3 text-sm ${aiStatus.configured ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                            <div className="flex items-center gap-2 font-semibold text-text-primary">
                                {aiStatus.configured ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <AlertCircle className="w-4 h-4 text-amber-600" />
                                )}
                                AI generation {aiStatus.configured ? 'connected' : 'not detected'}
                            </div>
                            <p className="mt-1 text-text-secondary">
                                Active provider: <span className="font-medium text-text-primary">{aiStatus.activeProvider}</span> · Source: <span className="font-medium text-text-primary">{aiStatus.source}</span>
                            </p>
                            <p className="mt-1 text-text-secondary">
                                Gemini: {aiStatus.hasGemini ? 'Yes' : 'No'} · OpenAI: {aiStatus.hasOpenAI ? 'Yes' : 'No'}
                            </p>
                        </div>

                        <button type="submit" className="btn-primary w-full shadow-sm mt-4" disabled={isGenerating}>
                            {isGenerating ? (
                                <>
                                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                    Generating Strategy...
                                </>
                            ) : "Generate Calendar"}
                        </button>

                    </form>
                </div>

                <div className="lg:col-span-8 flex flex-col gap-6">

                    <div className="card min-h-[400px] flex flex-col items-center justify-center bg-gray-50/30 p-6 relative overflow-hidden">

                        {!calendarData && !isGenerating && (
                            <div className="text-center max-w-sm">
                                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                                    <Calendar className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="font-bold text-lg text-text-primary mb-2">No Campaign Data</h3>
                                <p className="text-sm text-text-secondary">Fill out the parameters on the left to instantly generate a tailored 4-week marketing grid.</p>
                            </div>
                        )}

                        {isGenerating && (
                            <div className="text-center">
                                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4 shadow-sm" />
                                <p className="font-semibold text-text-primary animate-pulse">Running AI Strategy Engine...</p>
                                <p className="text-sm text-text-secondary mt-1">Cross-referencing platforms and budget...</p>
                            </div>
                        )}

                        {calendarData && (
                            <div className="w-full h-full animate-in fade-in zoom-in duration-300">
                                <div className="flex justify-between items-end mb-6 gap-3 flex-wrap">
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight text-text-primary">{calendarData.campaignName || 'Your Marketing Calendar'}</h2>
                                        <p className="text-sm text-text-secondary mt-1">{calendarData.summary || 'Review your generated strategy below.'}</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button className="btn-secondary !py-2 !px-3 font-semibold text-sm bg-white" onClick={() => saveCampaign('sheets')} disabled={isSaving || !storageStatus.sheetsConfigured}>
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Save to Sheets
                                        </button>
                                        <button className="btn-primary !py-2 !px-3 font-semibold text-sm" onClick={() => saveCampaign()} disabled={isSaving}>
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />} Save Campaign
                                        </button>
                                        <button className="btn-secondary !py-2 !px-3 font-semibold text-sm bg-white" onClick={() => toast.success('PDF export coming soon')}>
                                            <FileText className="w-4 h-4" /> Export PDF
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    {calendarData.weeks?.map((weekData) => (
                                        <div key={weekData.week} className="w-full">
                                            <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
                                                <h4 className="font-bold text-lg flex items-center gap-2">
                                                    <span className="bg-primary text-white text-xs px-2 py-0.5 rounded uppercase tracking-wide">Week {weekData.week}</span>
                                                </h4>
                                                {weekData.focus && (
                                                    <p className="text-sm text-text-secondary">{weekData.focus}</p>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-7 gap-3">
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Mon</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Tue</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Wed</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Thu</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Fri</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Sat</div>
                                                <div className="col-span-1 text-center font-semibold text-xs text-text-secondary uppercase">Sun</div>

                                                {weekData.days.map((dayObj, i) => (
                                                    <div key={i} className={`p-2 rounded border shadow-sm min-h-[140px] flex flex-col ${dayObj.platform ? 'bg-white border-gray-200' : 'bg-transparent border-dashed border-gray-200'}`}>
                                                        {dayObj.platform ? (
                                                            <>
                                                                <div className={`mb-2 inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getPlatformStyle(dayObj.platform)}`}>
                                                                    {getPlatformIcon(dayObj.platform)} {dayObj.platform}
                                                                </div>
                                                                <div className="text-[11px] font-semibold text-text-primary mb-1 pl-1">
                                                                    {dayObj.type}
                                                                </div>
                                                                <div className="text-xs text-text-secondary pl-1 leading-snug line-clamp-4">
                                                                    {dayObj.content}
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="h-full flex items-center justify-center font-medium text-gray-300 text-xs text-center border-dashed">No post</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>

                </div>

            </div>
        </div>
    );
}
