import { NextResponse } from 'next/server'
import { requireWorkspace, routeError } from '@/lib/workspaceServer'
import { requireSheetsAccess, RequestError } from '@/lib/access.mjs'
import { GoogleSheetsService } from '@/lib/sheetsService'
import { insertRecord } from '@/lib/crmRepository.mjs'

const SHEETS_HEADERS = [
    'id',
    'name',
    'business_type',
    'goal',
    'budget_range',
    'platforms',
    'tone',
    'key_dates',
    'calendar_data',
    'storage_provider',
    'created_by',
    'created_at'
]

const buildSheetsRow = (campaign, providerLabel) => ([
    campaign.id,
    campaign.name || '',
    campaign.business_type || '',
    campaign.goal || '',
    campaign.budget_range || '',
    (campaign.platforms || []).join(', '),
    campaign.tone || '',
    campaign.key_dates || '',
    JSON.stringify(campaign.calendar_data || []),
    providerLabel,
    campaign.created_by || '',
    campaign.created_at || new Date().toISOString()
])

const ensureCampaignSheet = async (service) => {
    await service.ensureSheetExists('Campaigns')
    const rows = await service.getRows('Campaigns').catch(() => [])
    if (rows.length > 0) return
    await service.appendRow('Campaigns!A1', SHEETS_HEADERS)
}

export async function POST(request) {
    try {
        const workspace = await requireWorkspace(['owner', 'manager', 'member'])
        const { user } = workspace
        const body = await request.json()
        const {
            name,
            business_type,
            goal,
            budget_range,
            tone,
            key_dates,
            platforms,
            calendar_data,
            provider
        } = body

        const providerToUse = provider || 'neon'
        if (!['neon','sheets','both'].includes(providerToUse)) throw new RequestError('Invalid storage provider.')
        if (providerToUse !== 'neon') requireSheetsAccess(workspace, process.env.GOOGLE_SHEETS_ORGANIZATION_ID)
        const campaignPayload = {
            name,
            business_type,
            goal,
            budget_range,
            tone,
            key_dates,
            platforms,
            calendar_data,
            organization_id: workspace.organizationId,
            created_by: user.id
        }

        let databaseCampaign = null
        let sheetsSaved = false

        if (providerToUse === 'neon' || providerToUse === 'both') {
            databaseCampaign = await insertRecord(workspace,'campaigns',campaignPayload)
        }

        if (providerToUse === 'sheets' || providerToUse === 'both') {
            const sheetsConfigured = Boolean(
                process.env.GOOGLE_SHEETS_ID &&
                process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
                process.env.GOOGLE_PRIVATE_KEY
            )

            if (!sheetsConfigured) {
                throw new Error('Google Sheets is not configured on the server')
            }

            const sheetsService = new GoogleSheetsService()
            await ensureCampaignSheet(sheetsService)

            const syntheticCampaign = databaseCampaign || {
                id: crypto.randomUUID(),
                ...campaignPayload,
                created_at: new Date().toISOString()
            }

            await sheetsService.appendRow('Campaigns', buildSheetsRow(syntheticCampaign, providerToUse))
            sheetsSaved = true
        }

        return NextResponse.json({
            success: true,
            data: {
                campaign: databaseCampaign,
                sheetsSaved,
                provider: providerToUse
            }
        })
    } catch (error) {
        return routeError(error)
    }
}
