import { NextResponse } from 'next/server'
import { getWorkspaceAiKeys, routeError } from '@/lib/workspaceServer'

const STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'for', 'from', 'have', 'helping', 'in', 'into', 'is', 'it',
    'its', 'of', 'on', 'or', 'our', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'we',
    'were', 'with', 'your', 'you', 'new', 'day', 'days', 'business'
])

const extractCampaignAnchors = (campaignGoal) => {
    const normalized = campaignGoal.toLowerCase().replace(/[^a-z0-9\s']/g, ' ')
    const words = normalized
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length >= 4 && !STOP_WORDS.has(word))

    return [...new Set(words)].slice(0, 8)
}

const normalizeMessage = (message) => message
    .replace(/^["'\s]+|["'\s]+$/g, '')
    .replace(/\r\n/g, '\n')
    .trim()

const safeParseJson = (value) => {
    try {
        return JSON.parse(value)
    } catch {
        return null
    }
}

const buildFallbackBrief = (campaignGoal, anchors) => ({
    coreOffer: campaignGoal,
    targetAudience: anchors.slice(0, 3).join(', ') || 'prospective customers',
    mainBenefit: 'clear business value and a practical next step',
    callToAction: 'Reply to this message to book a quick consultation',
    mustMention: anchors.slice(0, 5),
    objective: 'Generate a WhatsApp message grounded in the exact campaign goal'
})

const parseJsonLoose = (value) => {
    if (!value) return null
    const direct = safeParseJson(value)
    if (direct) return direct

    const fencedMatch = value.match(/```json\s*([\s\S]*?)```/i)
    if (fencedMatch?.[1]) return safeParseJson(fencedMatch[1].trim())

    const firstBrace = value.indexOf('{')
    const lastBrace = value.lastIndexOf('}')
    if (firstBrace >= 0 && lastBrace > firstBrace) {
        return safeParseJson(value.slice(firstBrace, lastBrace + 1))
    }

    return null
}

const isGenericWhatsAppMessage = (message, anchors) => {
    const normalized = message.toLowerCase().trim()
    const startsGeneric = /^(dear|hello|hi|greetings)\s+\{customername\}/.test(normalized)
    const genericPhrases = [
        'hope you are having a productive week',
        'we are excited',
        'hope you are doing well',
        'trust you are doing well'
    ]
    const containsGenericPhrase = genericPhrases.some((phrase) => normalized.includes(phrase))
    const matchingAnchors = anchors.filter((anchor) => normalized.includes(anchor.toLowerCase()))
    return startsGeneric || containsGenericPhrase || matchingAnchors.length < Math.min(2, anchors.length)
}

const buildCampaignBriefPrompt = ({ campaignGoal, businessName, industry, city, anchors }) => {
    const brandContext = [
        businessName ? `Business/Brand Name: ${businessName}` : null,
        industry ? `Industry: ${industry}` : null,
        city ? `City/Market: ${city}` : null
    ].filter(Boolean).join('\n')

    return `You are extracting a marketing brief from a user's campaign goal for a WhatsApp marketing message.

${brandContext ? `${brandContext}\n` : ''}Campaign Goal:
${campaignGoal}

Likely campaign keywords:
${anchors.join(', ') || 'none provided'}

Return ONLY valid JSON with this exact shape:
{
  "coreOffer": "string",
  "targetAudience": "string",
  "mainBenefit": "string",
  "callToAction": "string",
  "mustMention": ["string", "string"],
  "objective": "string"
}

Rules:
- Be specific, not generic
- Use real names and organizations from the goal when present
- Keep each field concise
- "mustMention" should include the exact campaign-specific terms that should appear in the final WhatsApp message`
}

const buildWhatsAppPrompt = ({ tone, campaignGoal, broadcastMode, businessName, industry, city, brief }) => {
    const toneInstructions = {
        Friendly: `Use warm, conversational language.
Use 1-2 relevant emojis. Feel like a friend texting.
Avoid corporate language.`,
        Professional: `Use clear, business-appropriate language.
Minimal emojis (max 1).
Concise and credible tone.
Sound like a trusted business advisor, not a formal letter.`,
        Urgent: `Create strong urgency without being pushy.
Use time-sensitive language (limited time, expires soon, last chance).
Use urgency emojis sparingly (for example: ⏰ 🔥).
Short punchy sentences.`
    }

    const broadcastNote = broadcastMode
        ? `This is for a broadcast list. Use personalization variables:
{CustomerName} for the recipient's name,
{ProductName} for the product/service name,
{OfferAmount} for discount or offer value.
Make it feel personal despite being a broadcast.`
        : `This is a direct 1-on-1 message.
Use {CustomerName} to personalize.
Make it feel like a genuine individual message.`

    const brandContext = [
        businessName ? `Business/Brand Name: ${businessName}` : null,
        industry ? `Industry: ${industry}` : null,
        city ? `City/Market: ${city}` : null
    ].filter(Boolean).join('\n')

    return `You are an expert WhatsApp marketing copywriter for Indian businesses.
You write messages that sound human, specific, and high-conversion.
You NEVER write like a generic email template.

${brandContext ? `${brandContext}\n` : ''}Campaign Goal: ${campaignGoal}

Extracted Brief:
- Objective: ${brief.objective}
- Core Offer: ${brief.coreOffer}
- Target Audience: ${brief.targetAudience}
- Main Benefit: ${brief.mainBenefit}
- CTA: ${brief.callToAction}
- Must Mention: ${(brief.mustMention || []).join(', ')}

Tone: ${tone}
Tone Instructions:
${toneInstructions[tone] || toneInstructions.Friendly}

Message Type:
${broadcastNote}

Your job:
1. Read the campaign goal carefully.
2. Identify the actual business offer, audience, and CTA from it.
3. Write a WhatsApp message that clearly mentions the real initiative or offer from the goal.
4. Make the message sound natural for WhatsApp, not like a brochure or email.

Write ONE complete WhatsApp message that:
- Directly addresses the campaign goal above
- Is between 70-140 words
- Has a clear call-to-action at the end
- Uses {CustomerName} at least once for personalization
- Only uses {ProductName} and {OfferAmount} if they are relevant
- Feels authentic and NOT like a generic template
- Is written specifically for the campaign goal provided
- Includes the real names/details from the campaign goal when available
- Sounds like something a founder, consultant, or business growth partner would send on WhatsApp

IMPORTANT: Generate a unique message based on the campaign goal: "${campaignGoal}".
Do NOT return a generic template.
Do NOT start with "Dear {CustomerName}".
Do NOT start with "Hello {CustomerName}".
Do NOT start with "Hi {CustomerName}" unless it is followed immediately by a concrete offer in the same sentence.
Do NOT say "We are excited" unless the campaign goal truly sounds celebratory.
Do NOT write in stiff corporate language.
If the goal mentions a program, organization, or audience like "Applied AI", "MSMEs", "AI adoption", or "MCCIA", include those details naturally.
The CTA should feel practical, for example: book a free consultation, reply to this message, or schedule a quick call.
The message must contain at least 3 concrete campaign details from the brief or campaign goal.
Avoid filler greetings and get to the point quickly.

Return ONLY the WhatsApp message text.`
}

const buildWhatsAppRetryPrompt = ({ originalPrompt, firstDraft, anchors }) => `Your previous output was too generic and did not use the campaign details strongly enough.

Original instructions:
${originalPrompt}

Previous draft:
${firstDraft}

Rewrite it now so that it:
- clearly mentions at least 2 of these campaign-specific details: ${anchors.join(', ')}
- does NOT start with Dear/Hello/Hi/Greetings
- does NOT use generic lines like "Hope you're having a productive week"
- feels like a real WhatsApp outreach message, not an email
- ends with a practical CTA

Return ONLY the improved WhatsApp message text.`

const buildCaptionPrompt = ({ platform, tone, topic, variations }) => `You are a senior social media copywriter for Indian brands.

Write ${variations} distinct ${platform} caption variations for this brief:
- Topic: ${topic}
- Tone: ${tone}

Rules:
- Return ONLY valid JSON
- Use this exact shape:
{
  "captions": ["caption 1", "caption 2"]
}
- Each caption should feel different, not lightly reworded
- Each caption should be platform-appropriate for ${platform}
- Include a CTA where useful
- Add hashtags only if they truly fit
- Avoid generic filler like "unlock your potential" unless the topic actually calls for it
`

const buildHashtagPrompt = ({ platform, topic, count }) => `You are a social media strategist.

Create ${count} relevant hashtags for:
- Platform: ${platform}
- Topic: ${topic}

Rules:
- Return ONLY valid JSON
- Use this exact shape:
{
  "hashtags": ["#one", "#two"]
}
- Mix broad, niche, and intent-based hashtags
- No duplicates
- Keep them relevant to the user's topic`

const buildIdeaPrompt = ({ platform, topic, audience, count }) => `You are a content strategist.

Generate ${count} strong post ideas for:
- Platform: ${platform}
- Topic: ${topic}
- Target audience: ${audience}

Rules:
- Return ONLY valid JSON
- Use this exact shape:
{
  "ideas": [
    { "title": "string", "hook": "string" }
  ]
}
- Make each idea distinct
- Keep them practical and specific to the audience
- Avoid vague generic ideas`

const buildAdPrompt = ({ platform, product, usp, audience }) => `You are an expert paid ads copywriter.

Create ad copy for:
- Platform: ${platform}
- Product/Service: ${product}
- USP: ${usp}
- Target audience: ${audience}

Rules:
- Return ONLY valid JSON
- Use this exact shape:
{
  "headline": "string",
  "primaryText": "string",
  "description": "string"
}
- Make it conversion-focused
- Keep headline punchy
- Keep the copy specific to the product, USP, and audience`

const buildBlogPrompt = ({ topic, keyword, level }) => `You are a content strategist and SEO writer.

Create a blog outline for:
- Topic: ${topic}
- Target SEO keyword: ${keyword}
- Audience level: ${level}

Rules:
- Return markdown only
- Include one H1, 3-5 H2s, and relevant H3s
- Make the outline specific to the topic and keyword
- Include actionable angles, not generic headings`

const callGemini = async (apiKey, prompt) => {
    const candidateModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash']
    let lastError = null

    for (const model of candidateModels) {
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
                            text: 'You are an expert conversion copywriter for WhatsApp campaigns in India. Write specific, natural, persuasive WhatsApp messages and avoid generic corporate phrasing.'
                        }]
                    },
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.95,
                        topK: 40,
                        topP: 0.95,
                        maxOutputTokens: 400
                    },
                    safetySettings: [
                        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                    ]
                })
            }
        )

        if (!response.ok) {
            const err = await response.json()
            lastError = `Gemini error (${model}): ${err.error?.message || response.statusText}`
            continue
        }

        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (!text) {
            lastError = `Gemini error (${model}): empty response`
            continue
        }

        return text.trim()
    }

    throw new Error(lastError || 'Gemini failed for all candidate models')
}

const callGrok = async (apiKey, prompt) => {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'grok-4-latest',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert WhatsApp marketing copywriter for Indian businesses. You write specific, natural, high-conversion WhatsApp messages and avoid generic email-style intros.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.95,
            max_tokens: 400
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`Grok error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('Grok returned empty response')
    return text.trim()
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
                    content: 'You are an expert WhatsApp marketing copywriter for Indian businesses. You write specific, natural, high-conversion WhatsApp messages and avoid generic email-style intros.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.95,
            max_tokens: 400
        })
    })

    if (!response.ok) {
        const err = await response.json()
        throw new Error(`OpenAI error: ${err.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content
    if (!text) throw new Error('OpenAI returned empty response')
    return text.trim()
}

const getProviders = ({ gemini, openai, grok, activeProvider }) => {
    const allProviders = {
        gemini: { id: 'gemini', key: gemini, fn: callGemini },
        openai: { id: 'openai', key: openai, fn: callOpenAI },
        grok: { id: 'grok', key: grok, fn: callGrok }
    }
    const fallbackOrder = ['gemini', 'openai', 'grok'].filter((provider) => provider !== activeProvider)
    return [activeProvider, ...fallbackOrder].map((provider) => allProviders[provider]).filter(Boolean)
}

const generateWithProviders = async (providers, prompt, parser = null) => {
    const providerErrors = []

    for (const provider of providers) {
        if (!provider.key) continue

        try {
            const raw = await provider.fn(provider.key, prompt)
            const output = parser ? parser(raw) : raw
            if (!output) throw new Error('Model returned empty or invalid response')
            return { output, provider: provider.id }
        } catch (error) {
            const message = `${provider.id}: ${error.message}`
            console.error(`[api/generate] ${message}`)
            providerErrors.push(message)
        }
    }

    throw new Error(providerErrors.length ? providerErrors.join(' | ') : 'No API key configured. Please add Gemini or OpenAI key in Settings.')
}

const generateWhatsAppMessage = async ({ provider, prompt, anchors }) => {
    const firstDraft = normalizeMessage(await provider.fn(provider.key, prompt))

    if (
        !anchors.length ||
        (!isGenericWhatsAppMessage(firstDraft, anchors) && firstDraft.length >= 180 && firstDraft.split(/\s+/).length >= 35)
    ) {
        return firstDraft
    }

    console.log(`[api/generate] ${provider.id} draft too generic, retrying with anchors:`, anchors)
    const retryPrompt = buildWhatsAppRetryPrompt({
        originalPrompt: prompt,
        firstDraft,
        anchors
    })

    return normalizeMessage(await provider.fn(provider.key, retryPrompt))
}

const extractCampaignBrief = async ({ provider, campaignGoal, businessName, industry, city, anchors }) => {
    const prompt = buildCampaignBriefPrompt({ campaignGoal, businessName, industry, city, anchors })
    const raw = await provider.fn(provider.key, prompt)
    const parsed = safeParseJson(raw)

    if (!parsed || typeof parsed !== 'object') {
        console.error(`[api/generate] ${provider.id} brief parse failed, using fallback brief`)
        return buildFallbackBrief(campaignGoal, anchors)
    }

    return {
        coreOffer: parsed.coreOffer || campaignGoal,
        targetAudience: parsed.targetAudience || 'prospective customers',
        mainBenefit: parsed.mainBenefit || 'clear business value',
        callToAction: parsed.callToAction || 'Reply to this message to book a quick consultation',
        mustMention: Array.isArray(parsed.mustMention) ? parsed.mustMention.filter(Boolean).slice(0, 6) : anchors.slice(0, 6),
        objective: parsed.objective || 'Generate a specific WhatsApp message'
    }
}

const normalizeProvider = (provider) => {
    if (provider === 'openai') return 'openai'
    if (provider === 'grok') return 'grok'
    return 'gemini'
}

const getApiKeys = getWorkspaceAiKeys

export async function POST(request) {
    try {
        const body = await request.json()
        const {
            type,
            tone = 'Friendly',
            campaignGoal = '',
            broadcastMode = false,
            platform = 'Instagram',
            topic = ''
        } = body

        console.log('[api/generate] incoming payload:', {
            type,
            tone,
            campaignGoal,
            broadcastMode,
            platform,
            topic
        })

        const { gemini, openai, grok, activeProvider, source, profile } = await getApiKeys()
        console.log('[api/generate] key source + provider:', { source, activeProvider, hasGemini: Boolean(gemini), hasOpenAI: Boolean(openai), hasGrok: Boolean(grok) })

        const providers = getProviders({ gemini, openai, grok, activeProvider })

        if (type === 'whatsapp') {
            if (!campaignGoal.trim()) {
                return NextResponse.json({ error: 'Campaign goal is required.' }, { status: 400 })
            }

            const trimmedGoal = campaignGoal.trim()
            const anchors = extractCampaignAnchors(trimmedGoal)
            console.log('[api/generate] whatsapp anchors:', anchors)

            const providerErrors = []

            for (const provider of providers) {
                if (!provider.key) continue
                try {
                    const brief = await extractCampaignBrief({
                        provider,
                        campaignGoal: trimmedGoal,
                        businessName: profile?.business_name || null,
                        industry: profile?.industry || null,
                        city: profile?.city || null,
                        anchors
                    })
                    console.log(`[api/generate] ${provider.id} extracted brief:`, brief)

                    const prompt = buildWhatsAppPrompt({
                        tone,
                        campaignGoal: trimmedGoal,
                        broadcastMode,
                        businessName: profile?.business_name || null,
                        industry: profile?.industry || null,
                        city: profile?.city || null,
                        brief
                    })

                    const message = await generateWhatsAppMessage({ provider, prompt, anchors })
                    return NextResponse.json({ message, provider: provider.id, keySource: source })
                } catch (providerError) {
                    const msg = `${provider.id}: ${providerError.message}`
                    console.error(`[api/generate] ${msg}`)
                    providerErrors.push(msg)
                }
            }

            const errDetail = providerErrors.length
                ? providerErrors.join(' | ')
                : `No keys found — Gemini: ${Boolean(gemini)}, OpenAI: ${Boolean(openai)}, Grok: ${Boolean(grok)}`
            return NextResponse.json({ error: errDetail }, { status: 400 })
        }

        if (type === 'content_captions') {
            const promptText = topic.trim()
            if (!promptText) {
                return NextResponse.json({ error: 'Topic / prompt is required.' }, { status: 400 })
            }

            const prompt = buildCaptionPrompt({
                platform,
                tone,
                topic: promptText,
                variations: body.variations || 3
            })

            const { output, provider } = await generateWithProviders(providers, prompt, (raw) => {
                const parsed = parseJsonLoose(raw)
                return Array.isArray(parsed?.captions) ? parsed.captions : null
            })

            return NextResponse.json({ success: true, type, data: output, provider })
        }

        if (type === 'content_hashtags') {
            const promptText = topic.trim()
            if (!promptText) {
                return NextResponse.json({ error: 'Topic / prompt is required.' }, { status: 400 })
            }

            const { output, provider } = await generateWithProviders(
                providers,
                buildHashtagPrompt({ platform, topic: promptText, count: body.count || 15 }),
                (raw) => {
                    const parsed = parseJsonLoose(raw)
                    return Array.isArray(parsed?.hashtags) ? parsed.hashtags : null
                }
            )

            return NextResponse.json({ success: true, type, data: output, provider })
        }

        if (type === 'content_ideas') {
            const promptText = topic.trim()
            if (!promptText) {
                return NextResponse.json({ error: 'Topic is required.' }, { status: 400 })
            }

            const { output, provider } = await generateWithProviders(
                providers,
                buildIdeaPrompt({
                    platform,
                    topic: promptText,
                    audience: body.audience?.trim() || 'general audience',
                    count: body.count || 5
                }),
                (raw) => {
                    const parsed = parseJsonLoose(raw)
                    return Array.isArray(parsed?.ideas) ? parsed.ideas : null
                }
            )

            return NextResponse.json({ success: true, type, data: output, provider })
        }

        if (type === 'content_adcopy') {
            if (!body.product?.trim() || !body.usp?.trim() || !body.audience?.trim()) {
                return NextResponse.json({ error: 'Product, USP, and target audience are required.' }, { status: 400 })
            }

            const { output, provider } = await generateWithProviders(
                providers,
                buildAdPrompt({
                    platform,
                    product: body.product.trim(),
                    usp: body.usp.trim(),
                    audience: body.audience.trim()
                }),
                (raw) => {
                    const parsed = parseJsonLoose(raw)
                    return parsed?.headline && parsed?.primaryText && parsed?.description ? parsed : null
                }
            )

            return NextResponse.json({ success: true, type, data: output, provider })
        }

        if (type === 'content_blog') {
            if (!body.blogTopic?.trim() || !body.keyword?.trim()) {
                return NextResponse.json({ error: 'Blog topic and target keyword are required.' }, { status: 400 })
            }

            const { output, provider } = await generateWithProviders(
                providers,
                buildBlogPrompt({
                    topic: body.blogTopic.trim(),
                    keyword: body.keyword.trim(),
                    level: body.level || 'Intermediate'
                })
            )

            return NextResponse.json({ success: true, type, data: output, provider })
        }

        return NextResponse.json({ error: 'Unsupported generate type.' }, { status: 400 })
    } catch (error) {
        console.error('[api/generate] error:', error)
        return routeError(error)
    }
}
