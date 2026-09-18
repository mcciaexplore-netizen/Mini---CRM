import { NextResponse } from 'next/server'
import { getWorkspaceAiKeys, routeError } from '@/lib/workspaceServer'


const PLATFORM_CONTENT_TYPES = {
    Instagram: ['Reel', 'Carousel', 'Story', 'Static Post'],
    LinkedIn: ['Thought Leadership', 'Case Study', 'Poll', 'Company Update'],
    WhatsApp: ['Broadcast', 'Follow-up', 'Consultation Invite', 'Offer Reminder'],
    Email: ['Newsletter', 'Offer Email', 'Follow-up Email', 'Educational Drip'],
    'Google Ads': ['Search Campaign', 'Retargeting', 'Offer Ad', 'Lead Form Ad'],
    Facebook: ['Image Post', 'Video Post', 'Event Promo', 'Community Post']
}

const getApiKeys = getWorkspaceAiKeys

const safeParseJson = (value) => {
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

const extractJsonBlock = (value) => {
    if (!value) return null
    const direct = safeParseJson(value)
    if (direct) return direct

    const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i)
    if (fencedMatch?.[1]) {
        return safeParseJson(fencedMatch[1].trim())
    }

    const firstBrace = value.indexOf('{')
    const lastBrace = value.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return safeParseJson(value.slice(firstBrace, lastBrace + 1))
    }

    return null
}

const buildCampaignPrompt = ({ form, platforms, profile }) => {
    const platformRules = platforms
        .map((platform) => `- ${platform}: use only these content types when relevant: ${(PLATFORM_CONTENT_TYPES[platform] || ['Post']).join(', ')}`)
        .join('\n')

    const businessContext = [
        profile?.business_name ? `Business Name: ${profile.business_name}` : null,
        profile?.industry ? `Business Profile Industry: ${profile.industry}` : null,
        profile?.city ? `City: ${profile.city}` : null,
    ].filter(Boolean).join('\n')

    return `You are a senior growth strategist and content planner for Indian SMBs and startups.

Create a realistic 4-week multi-channel campaign calendar for this business.

${businessContext ? `${businessContext}\n` : ''}Campaign Inputs:
- Industry: ${form.industry}
- Goal: ${form.goal}
- Tone: ${form.tone}
- Budget Range: ${form.budgetRange}
- Key Dates: ${form.keyDates || 'None provided'}
- Platforms: ${platforms.join(', ')}

Platform content rules:
${platformRules}

Return ONLY valid JSON in this exact shape:
{
  "campaignName": "string",
  "summary": "string",
  "weeks": [
    {
      "week": 1,
      "focus": "string",
      "days": [
        { "day": "Mon", "platform": "Instagram", "type": "Reel", "content": "string" },
        { "day": "Tue", "platform": null, "type": null, "content": null }
      ]
    }
  ]
}

Hard requirements:
- Exactly 4 weeks
- Exactly 7 day objects in each week, ordered Mon to Sun
- Use null for platform/type/content on rest days
- Each content line should be concrete, actionable, and specific to the campaign goal
- Avoid generic filler like "post something engaging"
- Spread work sensibly across the selected platforms
- If budget is organic-only, keep paid activity light or absent
- Mention real hooks/offers/themes derived from the goal
- Summary should be 2-3 sentences max
- campaignName should be short and useful

The final calendar must feel like a strategist actually planned it for this exact business, goal, and budget.`
}

const validateCampaignCalendar = (payload, platforms) => {
    if (!payload || typeof payload !== 'object') return false
    if (!Array.isArray(payload.weeks) || payload.weeks.length !== 4) return false

    const validDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    return payload.weeks.every((week, index) => (
        week?.week === index + 1 &&
        Array.isArray(week.days) &&
        week.days.length === 7 &&
        week.days.every((day, dayIndex) => {
            if (day?.day !== validDays[dayIndex]) return false
            if (day.platform === null) return day.type === null && day.content === null
            return platforms.includes(day.platform) && typeof day.type === 'string' && typeof day.content === 'string'
        })
    ))
}

const normalizeCalendar = (payload) => ({
    campaignName: payload.campaignName || 'AI Campaign Plan',
    summary: payload.summary || '',
    weeks: payload.weeks.map((week) => ({
        week: week.week,
        focus: week.focus || '',
        days: week.days.map((day) => ({
            day: day.day,
            platform: day.platform || null,
            type: day.type || null,
            content: day.content || null
        }))
    }))
})

const callGemini = async (apiKey, prompt) => {
    const models = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']
    let lastError = null

    for (const model of models) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': apiKey
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [{
                            text: 'You are a precise campaign planning assistant. Always respond with valid JSON only when requested.'
                        }]
                    },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.8,
                        topK: 32,
                        topP: 0.95,
                        maxOutputTokens: 1800
                    }
                })
            }
        )

        if (!response.ok) {
            const err = await response.json()
            lastError = err.error?.message || response.statusText
            continue
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text.trim()
        lastError = 'Gemini returned empty response'
    }

    throw new Error(lastError || 'Gemini generation failed')
}

const callOpenAI = async (apiKey, prompt) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: 'You are a precise campaign planning assistant. When asked for JSON, respond with valid JSON only.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.8,
            max_tokens: 1800
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error?.message || response.statusText)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content?.trim() || ''
}

export async function POST(request) {
    try {
        const body = await request.json()
        const { form, platforms } = body

        if (!form?.industry || !form?.goal || !Array.isArray(platforms) || !platforms.length) {
            return NextResponse.json({ success: false, error: 'Missing campaign inputs' }, { status: 400 })
        }

        const { gemini, openai, activeProvider, profile } = await getApiKeys()
        console.log('[api/campaigns/generate] key lookup:', {
            activeProvider,
            hasGemini: Boolean(gemini),
            hasOpenAI: Boolean(openai),
            profileId: profile?.id || null,
        })

        const providerOrder = activeProvider === 'openai'
            ? [
                { id: 'openai', key: openai, fn: callOpenAI },
                { id: 'gemini', key: gemini, fn: callGemini }
            ]
            : [
                { id: 'gemini', key: gemini, fn: callGemini },
                { id: 'openai', key: openai, fn: callOpenAI }
            ]

        const prompt = buildCampaignPrompt({ form, platforms, profile })

        for (const provider of providerOrder) {
            if (!provider.key) continue

            try {
                const raw = await provider.fn(provider.key, prompt)
                const parsed = extractJsonBlock(raw)

                if (!validateCampaignCalendar(parsed, platforms)) {
                    throw new Error('Model returned invalid campaign JSON')
                }

                return NextResponse.json({
                    success: true,
                    data: {
                        ...normalizeCalendar(parsed),
                        provider: provider.id
                    }
                })
            } catch (error) {
                console.error(`[api/campaigns/generate] ${provider.id} failed:`, error.message)
            }
        }

        return NextResponse.json(
            { success: false, error: 'No API key configured. Please add Gemini or OpenAI key in Settings.' },
            { status: 400 }
        )
    } catch (error) {
        return routeError(error)
    }
}
