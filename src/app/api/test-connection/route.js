import { NextResponse } from 'next/server';
import { requireWorkspace, routeError } from '@/lib/workspaceServer';

export async function POST(request) {
    try { await requireWorkspace(['owner', 'manager']); } catch (error) { return routeError(error); }
    const { provider, key } = await request.json();
    if (typeof key !== 'string' || !key.trim() || key.length > 4096) {
        return NextResponse.json({ success: false, error: 'No API key provided' }, { status: 400 });
    }

    try {
        if (provider === 'gemini') {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}&pageSize=1`,
                { method: 'GET' }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
            const model = data?.models?.[0]?.displayName || 'gemini-1.5-pro';
            return NextResponse.json({ success: true, message: `Connected — queried ${model}` });
        }

        if (provider === 'openai') {
            const res = await fetch('https://api.openai.com/v1/models?limit=1', {
                method: 'GET',
                headers: { Authorization: `Bearer ${key.trim()}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`);
            const model = data?.data?.[0]?.id || 'gpt-4o';
            return NextResponse.json({ success: true, message: `Connected — found model ${model}` });
        }

        if (provider === 'grok') {
            const res = await fetch('https://api.x.ai/v1/chat/completions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${key.trim()}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'grok-4-latest', messages: [{ role: 'user', content: 'hi' }], max_tokens: 1 })
            });
            const data = await res.json();
            console.log('[test-connection] grok raw response:', JSON.stringify(data));
            if (!res.ok) {
                const errMsg = data?.error?.message || data?.error || data?.message || JSON.stringify(data) || `HTTP ${res.status}`;
                throw new Error(typeof errMsg === 'string' ? errMsg : JSON.stringify(errMsg));
            }
            const model = data?.model || 'grok-2-latest';
            return NextResponse.json({ success: true, message: `Connected — using ${model}` });
        }

        return NextResponse.json({ success: false, error: 'Unknown provider' }, { status: 400 });
    } catch (err) {
        console.error(`[test-connection] ${provider} error:`, err.message);
        return NextResponse.json({ success: false, error: err.message }, { status: 200 });
    }
}
