export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getWorkspaceAiKeys, routeError } from '@/lib/workspaceServer'
export async function GET() {
    try {
        const { gemini, openai, grok, activeProvider } = await getWorkspaceAiKeys()
        return NextResponse.json({ success: true, data: { configured: Boolean(gemini || openai || grok), hasGemini: Boolean(gemini), hasOpenAI: Boolean(openai), hasGrok: Boolean(grok), activeProvider, source: 'business' } })
    } catch (error) { return routeError(error) }
}
