"use client"
import { useState, useEffect, useRef } from 'react';
import {
    Building,
    Key,
    Link as LinkIcon,
    Upload,
    CheckCircle2,
    RefreshCw,
    CalendarRange,
    Loader2,
    Database,
    Table2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getGoogleCalendarStatus, getBusinessProfile, updateBusinessProfile } from '@/lib/db';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('profile');
    const [profile, setProfile] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [logoUrl, setLogoUrl] = useState(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const profileFormRef = useRef(null);
    const fileInputRef = useRef(null);
    const [apiKeys, setApiKeys] = useState({ gemini: '', openai: '', grok: '' });
    const [configuredKeys, setConfiguredKeys] = useState({});
    const [apiStatuses, setApiStatuses] = useState({ gemini: 'idle', openai: 'idle', grok: 'idle' }); // idle | testing | success | error
    const [apiMessages, setApiMessages] = useState({ gemini: '', openai: '', grok: '' });
    const [savingKey, setSavingKey] = useState({ gemini: false, openai: false, grok: false });
    const [activeProvider, setActiveProvider] = useState('gemini');
    const [switchingProvider, setSwitchingProvider] = useState(false);
    const [googleCalendar, setGoogleCalendar] = useState({ connected: false, autoSync: true, email: null });
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isSavingAutoSync, setIsSavingAutoSync] = useState(false);

    useEffect(() => {
        Promise.all([
            getBusinessProfile(),
            getGoogleCalendarStatus(),
            fetch('/api/settings/ai-status').then(r => r.json()),
        ]).then(([profileData, googleStatus, aiStatus]) => {
            setConfiguredKeys({ gemini: aiStatus?.data?.hasGemini, openai: aiStatus?.data?.hasOpenAI, grok: aiStatus?.data?.hasGrok });
            setProfile(profileData);
            if (profileData?.logo_url) setLogoUrl(profileData.logo_url);
            if (profileData) {
                setApiKeys({
                    gemini: profileData.gemini_api_key || '',
                    openai: profileData.openai_api_key || '',
                    grok: profileData.grok_api_key || '',
                });
                if (profileData.active_ai_provider) setActiveProvider(profileData.active_ai_provider);
            }
            setGoogleCalendar(googleStatus);
        }).catch(error => toast.error(error.message));
    }, []);

    const handleTestKey = async (provider) => {
        const key = apiKeys[provider];
        if (!key?.trim()) { toast.error('Enter an API key first'); return; }
        setApiStatuses(prev => ({ ...prev, [provider]: 'testing' }));
        setApiMessages(prev => ({ ...prev, [provider]: '' }));
        console.log(`[handleTestKey] testing ${provider}`);
        try {
            const res = await fetch('/api/test-connection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ provider, key }),
            });
            const result = await res.json();
            if (result.success) {
                setApiStatuses(prev => ({ ...prev, [provider]: 'success' }));
                setApiMessages(prev => ({ ...prev, [provider]: result.message }));
            } else {
                setApiStatuses(prev => ({ ...prev, [provider]: 'error' }));
                setApiMessages(prev => ({ ...prev, [provider]: result.error }));
            }
        } catch (err) {
            setApiStatuses(prev => ({ ...prev, [provider]: 'error' }));
            setApiMessages(prev => ({ ...prev, [provider]: err.message }));
        }
    };

    const handleSaveKey = async (provider) => {
        const key = apiKeys[provider];
        if (!key?.trim()) { toast.error('Enter a replacement API key first'); return; }
        setSavingKey(prev => ({ ...prev, [provider]: true }));
        const fieldMap = { gemini: 'gemini_api_key', openai: 'openai_api_key', grok: 'grok_api_key' };
        console.log(`[handleSaveKey] saving ${provider}`);
        try {
            await updateBusinessProfile({ [fieldMap[provider]]: key });
            setConfiguredKeys(current => ({ ...current, [provider]: true }));
            setApiKeys(current => ({ ...current, [provider]: '' }));
            toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} API key saved!`);
        } catch (err) {
            console.error(`[handleSaveKey] error:`, err);
            toast.error('Failed to save key: ' + (err?.message || 'unknown error'));
        } finally {
            setSavingKey(prev => ({ ...prev, [provider]: false }));
        }
    };

    const handleSwitchProvider = async (provider) => {
        if (provider === activeProvider) return;
        setSwitchingProvider(true);
        console.log(`[handleSwitchProvider] switching to ${provider}`);
        try {
            await updateBusinessProfile({ active_ai_provider: provider });
            setActiveProvider(provider);
            toast.success(`Active AI provider switched to ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);
        } catch (err) {
            toast.error('Failed to switch provider: ' + (err?.message || 'unknown error'));
        } finally {
            setSwitchingProvider(false);
        }
    };

    const handleProfileSave = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        const form = profileFormRef.current;
        const updates = {
            business_name: form.business_name.value,
            industry: form.industry.value,
            website: form.website.value,
            city: form.city.value,
            gst_number: form.gst_number.value,
            primary_color: form.primary_color.value,
        };
        if (logoUrl) updates.logo_url = logoUrl;
        console.log('[handleProfileSave] updates:', updates);
        try {
            const saved = await updateBusinessProfile(updates);
            setProfile(saved);
            toast.success('Business profile saved!');
        } catch (err) {
            console.error('[handleProfileSave] error:', err);
            toast.error('Failed to save profile: ' + (err?.message || 'unknown error'));
        } finally {
            setSavingProfile(false);
        }
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
        setLogoUploading(true);
        console.log('[handleLogoUpload] uploading:', file.name, file.type);
        try {
            const body = new FormData();
            body.set('file', file);
            const response = await fetch('/api/profile/logo', { method: 'POST', body });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error);
            setLogoUrl(result.data.url);
            toast.success('Logo saved.');
        } catch (err) {
            console.error('[handleLogoUpload] error:', err);
            toast.error('Logo upload failed: ' + (err?.message || 'unknown error'));
        } finally {
            setLogoUploading(false);
            e.target.value = '';
        }
    };

    const refreshGoogleCalendarStatus = async () => {
        const [profileData, googleStatus] = await Promise.all([
            getBusinessProfile(),
            getGoogleCalendarStatus(),
        ]);
        setProfile(profileData);
        setGoogleCalendar(googleStatus);
    };

    const handleToggleAutoSync = async () => {
        setIsSavingAutoSync(true);
        try {
            await updateBusinessProfile({ google_calendar_auto_sync: !googleCalendar.autoSync });
            await refreshGoogleCalendarStatus();
            toast.success(`Auto-sync ${googleCalendar.autoSync ? 'disabled' : 'enabled'}`);
        } catch {
            toast.error('Failed to update auto-sync');
        } finally {
            setIsSavingAutoSync(false);
        }
    };

    const handleSyncAllPosts = async () => {
        setIsSyncingAll(true);
        try {
            const response = await fetch('/api/scheduler/sync-all', { method: 'POST' });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to sync scheduled posts');
            }
            toast.success('All scheduled posts synced to Google Calendar');
            await refreshGoogleCalendarStatus();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsSyncingAll(false);
        }
    };

    const handleDisconnectGoogle = async () => {
        setIsDisconnecting(true);
        try {
            const response = await fetch('/api/settings/google-calendar/disconnect', { method: 'POST' });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Failed to disconnect Google Calendar');
            }
            toast.success('Google Calendar disconnected');
            await refreshGoogleCalendarStatus();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsDisconnecting(false);
        }
    };

    const TABS = [
        { id: 'profile', label: 'Business Profile', icon: Building },
        { id: 'apikeys', label: 'API Keys', icon: Key },
        { id: 'integrations', label: 'Integrations', icon: LinkIcon }
    ];

    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">Settings</h1>
                <p className="text-text-secondary mt-1">Manage your workspace, API keys, and external integrations.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* Navigation Sidebar (3 cols) */}
                <div className="lg:col-span-3">
                    <nav className="flex flex-col space-y-1" aria-label="Tabs">
                        {TABS.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                    flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors
                    ${activeTab === tab.id
                                            ? 'bg-primary text-white'
                                            : 'text-text-secondary hover:bg-gray-100/50 hover:text-text-primary'
                                        }
                  `}
                                >
                                    <Icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Setting Content Area (9 cols) */}
                <div className="lg:col-span-9 card">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="p-5 border-b border-[#E5E5E5] bg-gray-50/50">
                                <h3 className="font-bold text-lg">Business Profile</h3>
                                <p className="text-sm text-text-secondary mt-1">This information is used across all generated campaigns and PDF reports.</p>
                            </div>
                            <form ref={profileFormRef} key={profile?.id || 'new'} className="p-5 sm:p-6" onSubmit={handleProfileSave}>
                                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                <div className="flex items-center gap-6 mb-8 border-b border-gray-100 pb-8">
                                    <div
                                        className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-primary transition-colors cursor-pointer"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {logoUrl
                                            ? <img src={logoUrl} alt="Company logo" className="w-full h-full object-cover" />
                                            : <Building className="w-8 h-8 text-gray-400" />
                                        }
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {logoUploading
                                                ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                : <Upload className="w-6 h-6 text-white" />
                                            }
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-sm text-text-primary mb-1">Company Logo</h4>
                                        <p className="text-xs text-text-secondary max-w-sm mb-3 shadow-none leading-relaxed">PNG, JPEG or WebP, up to 512 KB. Recommended 512×512 pixels.</p>
                                        <button type="button" className="btn-secondary !py-1 !px-3 text-xs bg-white" onClick={() => fileInputRef.current?.click()} disabled={logoUploading}>
                                            {logoUploading ? 'Uploading...' : 'Upload new image'}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                                    <div className="sm:col-span-2">
                                        <label className="label-text">Business Name</label>
                                        <input name="business_name" type="text" className="input-field max-w-lg" defaultValue={profile?.business_name || ''} required />
                                    </div>

                                    <div>
                                        <label className="label-text">Industry</label>
                                        <input name="industry" type="text" className="input-field" defaultValue={profile?.industry || ''} />
                                    </div>

                                    <div>
                                        <label className="label-text">Website URL</label>
                                        <input name="website" type="url" className="input-field" defaultValue={profile?.website || ''} />
                                    </div>

                                    <div>
                                        <label className="label-text">City / State</label>
                                        <input name="city" type="text" className="input-field" defaultValue={profile?.city || ''} />
                                    </div>

                                    <div>
                                        <label className="label-text">GST Number (Optional)</label>
                                        <input name="gst_number" type="text" className="input-field" defaultValue={profile?.gst_number || ''} />
                                    </div>

                                    <div className="sm:col-span-2 pt-4 border-t border-gray-100">
                                        <label className="label-text">Primary Brand Color</label>
                                        <div className="flex items-center gap-3">
                                            <input name="primary_color" type="color" className="p-0 border-0 w-10 h-10 rounded cursor-pointer mt-1" defaultValue={profile?.primary_color || '#0176D3'} />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-[#E5E5E5] flex justify-end">
                                    <button type="submit" disabled={savingProfile} className={`btn-primary ${savingProfile ? 'opacity-70 cursor-not-allowed' : ''}`}>
                                        {savingProfile ? 'Saving...' : 'Save Profile'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* API KEYS TAB */}
                    {activeTab === 'apikeys' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="p-5 border-b border-[#E5E5E5] bg-gray-50/50">
                                <h3 className="font-bold text-lg">AI Providers</h3>
                                <p className="text-sm text-text-secondary mt-1">Add your API keys and choose which provider powers content generation.</p>
                            </div>

                            <div className="p-5 sm:p-6 space-y-6">

                                {/* Active Provider Selector */}
                                <div className="rounded-xl border border-slate-200 p-4">
                                    <p className="font-semibold text-sm text-text-primary mb-1">Active AI Provider</p>
                                    <p className="text-xs text-text-secondary mb-3">Switch between providers when credits run out or for different use cases.</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'gemini', label: 'Google Gemini', color: 'text-blue-600' },
                                            { id: 'openai', label: 'OpenAI', color: 'text-emerald-600' },
                                            { id: 'grok', label: 'xAI Grok', color: 'text-purple-600' },
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => handleSwitchProvider(p.id)}
                                                disabled={switchingProvider}
                                                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition flex flex-col items-center gap-1 ${activeProvider === p.id ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 text-slate-600 hover:border-slate-300'} disabled:opacity-50`}
                                            >
                                                {activeProvider === p.id && <span className="w-2 h-2 rounded-full bg-primary" />}
                                                {p.label}
                                                {activeProvider === p.id && <span className="text-[10px] font-bold uppercase text-primary">Active</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Provider cards */}
                                {[
                                    {
                                        id: 'gemini',
                                        name: 'Google Gemini API',
                                        placeholder: 'AIza...',
                                        desc: 'Powers Competitor Analysis, CRM Insights, and Content generation.',
                                        docsLabel: 'aistudio.google.com',
                                    },
                                    {
                                        id: 'openai',
                                        name: 'OpenAI API',
                                        placeholder: 'sk-...',
                                        desc: 'Use GPT-4o and other OpenAI models as your generation engine.',
                                        docsLabel: 'platform.openai.com',
                                    },
                                    {
                                        id: 'grok',
                                        name: 'xAI Grok API',
                                        placeholder: 'xai-...',
                                        desc: "xAI's Grok models — great alternative when other credits run dry.",
                                        docsLabel: 'console.x.ai',
                                    },
                                ].map(provider => {
                                    const status = apiStatuses[provider.id];
                                    const msg = apiMessages[provider.id];
                                    const isSaving = savingKey[provider.id];
                                    const isTesting = status === 'testing';
                                    const isActive = activeProvider === provider.id;
                                    return (
                                        <div key={provider.id} className={`border rounded-xl p-5 transition-colors ${isActive ? 'border-primary/40 bg-primary/[0.02]' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-text-primary">{provider.name}</h4>
                                                    {isActive && <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Active</span>}
                                                    {status === 'success' && <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Verified</span>}
                                                    {status === 'error' && <span className="bg-red-100 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase">Failed</span>}
                                                </div>
                                            </div>
                                            <p className="text-sm text-text-secondary mb-4 max-w-xl">{provider.desc}</p>
                                            <div className="flex gap-3 items-center flex-wrap">
                                                <input
                                                    type="password"
                                                    placeholder={configuredKeys[provider.id] ? 'Key saved. Enter a replacement to change it.' : provider.placeholder}
                                                    className="input-field font-mono text-sm max-w-xs"
                                                    value={apiKeys[provider.id]}
                                                    onChange={e => setApiKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                                                />
                                                <button type="button" className="btn-secondary !py-2 bg-white" onClick={() => handleTestKey(provider.id)} disabled={isTesting || isSaving}>
                                                    {isTesting ? <RefreshCw className="w-4 h-4 animate-spin text-primary" /> : 'Test'}
                                                </button>
                                                <button type="button" className="btn-primary !py-2" onClick={() => handleSaveKey(provider.id)} disabled={isSaving || isTesting}>
                                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                                                </button>
                                            </div>
                                            {msg && (
                                                <p className={`text-sm mt-3 flex items-center gap-1.5 ${status === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                                                    {status === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <span className="w-4 h-4 shrink-0 text-lg leading-none">✕</span>}
                                                    {msg}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                            </div>
                        </div>
                    )}

                    {/* INTEGRATIONS TAB */}
                    {activeTab === 'integrations' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="p-5 border-b border-[#E5E5E5] bg-gray-50/50">
                                <h3 className="font-bold text-lg">App Integrations</h3>
                                <p className="text-sm text-text-secondary mt-1">Connect your workspace with external platforms.</p>
                            </div>

                            <div className="p-5 sm:p-6 space-y-4">

                                <div className="border border-[#E5E5E5] bg-white rounded-xl p-5 space-y-5">
                                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                                <CalendarRange className="w-6 h-6 text-[#0176D3]" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-text-primary">Google Calendar</h4>
                                                    <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${googleCalendar.connected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        <span className={`h-2 w-2 rounded-full ${googleCalendar.connected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                                        {googleCalendar.connected ? 'Connected' : 'Disconnected'}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-text-secondary mt-1">
                                                    {googleCalendar.connected
                                                        ? `Connected account: ${googleCalendar.email || 'Google account'}`
                                                        : 'Connect Google Calendar so your team gets event reminders for scheduled posts.'}
                                                </p>
                                            </div>
                                        </div>

                                        {googleCalendar.connected ? (
                                            <button className="btn-secondary !py-2 bg-white border-gray-300" onClick={handleDisconnectGoogle} disabled={isDisconnecting}>
                                                {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                                Disconnect
                                            </button>
                                        ) : (
                                            <a href="/api/auth/google" className="btn-primary !py-2">
                                                <CalendarRange className="w-4 h-4" />
                                                Connect
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                                        <div>
                                            <p className="font-semibold text-sm text-text-primary">Auto-sync new posts</p>
                                            <p className="text-xs text-text-secondary mt-1">Default ON. Saves your preference to the business profile.</p>
                                        </div>
                                        <button
                                            type="button"
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${googleCalendar.autoSync ? 'bg-primary' : 'bg-slate-300'} ${isSavingAutoSync ? 'opacity-60' : ''}`}
                                            onClick={handleToggleAutoSync}
                                            disabled={isSavingAutoSync}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${googleCalendar.autoSync ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        <button className="btn-primary !py-2" onClick={handleSyncAllPosts} disabled={!googleCalendar.connected || isSyncingAll}>
                                            {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            Sync all posts
                                        </button>
                                    </div>
                                </div>

                                <div className="border border-[#E5E5E5] bg-white rounded-xl p-5 space-y-5">
                                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-lg shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                                <Database className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-text-primary">Neon Database</h4>
                                                <p className="text-sm text-text-secondary mt-1">Primary workspace database for campaigns, leads, scheduler posts, and settings.</p>
                                            </div>
                                        </div>
                                        <span className="btn-secondary !py-2 bg-white border-gray-300">
                                            <CheckCircle2 className="w-4 h-4 text-green-600" /> Connected
                                        </span>
                                    </div>

                                </div>

                                {/* WhatsApp */}
                                <div className="border border-gray-200 bg-white rounded-xl p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 opacity-75">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                            <div className="w-6 h-6 rounded-full border-2 border-[#128C7E] flex items-center justify-center">
                                                <div className="w-2 h-2 bg-[#128C7E] rotate-45"></div>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-text-primary flex items-center gap-2">WhatsApp Cloud API <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Coming Soon</span></h4>
                                            <p className="text-sm text-text-secondary mt-1 max-w-md">Automate message sending directly from your ProMarketer workflows.</p>
                                        </div>
                                    </div>
                                    <button className="btn-primary !py-2 bg-gray-100 text-gray-500 border-none cursor-not-allowed">
                                        Connect API
                                    </button>
                                </div>

                                {/* Meta Ads */}
                                <div className="border border-gray-200 bg-white rounded-xl p-5 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4 opacity-75">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-lg shadow-sm border border-gray-200 flex items-center justify-center shrink-0">
                                            <div className="w-6 h-4 bg-[#0668E1] rounded-sm"></div>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-text-primary flex items-center gap-2">Meta Ads Manager <span className="bg-blue-100 text-blue-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Coming Soon</span></h4>
                                            <p className="text-sm text-text-secondary mt-1 max-w-md">Sync generated ad copies straight to Business Manager.</p>
                                        </div>
                                    </div>
                                    <button className="btn-primary !py-2 bg-gray-100 text-gray-500 border-none cursor-not-allowed">
                                        Connect OAuth
                                    </button>
                                </div>

                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
