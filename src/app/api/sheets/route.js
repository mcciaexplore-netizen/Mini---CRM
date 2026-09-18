export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server';
import { GoogleSheetsService } from '@/lib/sheetsService';
import { requireWorkspace, routeError } from '@/lib/workspaceServer';
import { requireSheetsAccess } from '@/lib/access.mjs';

export async function GET(request) {
    try {
        const workspace = await requireWorkspace(['owner', 'manager']);
        requireSheetsAccess(workspace, process.env.GOOGLE_SHEETS_ORGANIZATION_ID);
        const { searchParams } = new URL(request.url);
        const sheetName = searchParams.get('sheet');

        if (!sheetName) {
            return NextResponse.json({ error: "Missing 'sheet' query param (e.g., ?sheet=Leads)" }, { status: 400 });
        }

        const sheetsService = new GoogleSheetsService();
        const rows = await sheetsService.getRows(sheetName);

        return NextResponse.json({ success: true, data: rows });
    } catch (error) {
        return routeError(error);
    }
}

export async function POST(request) {
    try {
        const workspace = await requireWorkspace(['owner', 'manager']);
        requireSheetsAccess(workspace, process.env.GOOGLE_SHEETS_ORGANIZATION_ID);
        const body = await request.json();
        const { sheetName, action, data, rowIndex } = body;

        if (!sheetName || !action || !data) {
            return NextResponse.json({ error: "Missing required body fields: sheetName, action, data" }, { status: 400 });
        }

        const sheetsService = new GoogleSheetsService();
        let result;

        if (action === 'append') {
            result = await sheetsService.appendRow(sheetName, data);
        } else if (action === 'update') {
            if (!rowIndex) throw new Error("Missing rowIndex for update action");
            result = await sheetsService.updateRow(sheetName, rowIndex, data);
        } else {
            throw new Error(`Invalid action parameter: ${action}. Use 'append' or 'update'.`);
        }

        return NextResponse.json({ success: true, result });
    } catch (error) {
        return routeError(error);
    }
}

export async function DELETE(request) {
    try {
        const workspace = await requireWorkspace(['owner', 'manager']);
        requireSheetsAccess(workspace, process.env.GOOGLE_SHEETS_ORGANIZATION_ID);
        const { searchParams } = new URL(request.url);
        const sheetName = searchParams.get('sheet');
        const rowIndex = searchParams.get('row');

        if (!sheetName || !rowIndex) {
            return NextResponse.json({ error: "Missing 'sheet' or 'row' params" }, { status: 400 });
        }

        const sheetsService = new GoogleSheetsService();
        const result = await sheetsService.deleteRow(sheetName, parseInt(rowIndex));

        return NextResponse.json({ success: true, result });
    } catch (error) {
        return routeError(error);
    }
}
