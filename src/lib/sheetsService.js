import { google } from 'googleapis';

export class GoogleSheetsService {
    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;

        // Format private key properly if it comes from env with literal \n
        const privateKey = process.env.GOOGLE_PRIVATE_KEY
            ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;

        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: privateKey,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }

    async ensureSheetExists(sheetName) {
        if (!this.spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ID");

        const spreadsheet = await this.sheets.spreadsheets.get({
            spreadsheetId: this.spreadsheetId,
        });

        const exists = (spreadsheet.data.sheets || []).some(
            (sheet) => sheet.properties?.title === sheetName
        );

        if (exists) return;

        await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.spreadsheetId,
            requestBody: {
                requests: [
                    {
                        addSheet: {
                            properties: { title: sheetName }
                        }
                    }
                ]
            }
        });
    }

    /**
     * Reads all rows from a specific sheet/tab.
     * Assumes row 1 contains headers.
     * Returns an array of objects mapped by header names.
     * @param {string} range e.g., "Leads" or "Leads!A:Z"
     */
    async getRows(range) {
        if (!this.spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ID");

        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: this.spreadsheetId,
                range: range,
            });

            const rows = response.data.values;
            if (!rows || rows.length === 0) return [];

            const headers = rows[0];
            const data = rows.slice(1).map((row, index) => {
                const obj = { _rowIndex: index + 2 }; // 1-indexed basis + 1 for header offset
                headers.forEach((header, i) => {
                    obj[header] = row[i] || ''; // Map column values to headers
                });
                return obj;
            });

            return data;
        } catch (error) {
            console.error(`Error reading ${range}: `, error);
            throw error;
        }
    }

    /**
     * Appends a new row to the sheet.
     * @param {string} range e.g., "Leads"
     * @param {Array<string>} values e.g., ["John", "Acme", "New"]
     */
    async appendRow(range, values) {
        if (!this.spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ID");

        try {
            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                insertDataOption: 'INSERT_ROWS',
                requestBody: {
                    values: [values],
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Error appending to ${range}: `, error);
            throw error;
        }
    }

    /**
     * Updates an exact row via absolute range.
     * @param {string} sheetName e.g., "Leads"
     * @param {number} rowIndex e.g., 2
     * @param {Array<string>} values New complete array matching header columns
     */
    async updateRow(sheetName, rowIndex, values) {
        if (!this.spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ID");

        try {
            const range = `${sheetName}!A${rowIndex}`;

            const response = await this.sheets.spreadsheets.values.update({
                spreadsheetId: this.spreadsheetId,
                range: range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values: [values],
                },
            });
            return response.data;
        } catch (error) {
            console.error(`Error updating row ${rowIndex} on ${sheetName}: `, error);
            throw error;
        }
    }

    /**
     * Clears a row (Soft delete approach via range clearing)
     * Note: The Google Sheets API via 'values.clear' doesn't shift cells up, 
     * it just empties them. For a true row deletion, batchUpdate is required.
     */
    async deleteRow(sheetName, rowIndex) {
        if (!this.spreadsheetId) throw new Error("Missing GOOGLE_SHEETS_ID");

        try {
            const range = `${sheetName}!A${rowIndex}:Z${rowIndex}`;
            const response = await this.sheets.spreadsheets.values.clear({
                spreadsheetId: this.spreadsheetId,
                range: range,
            });
            return response.data;
        } catch (error) {
            console.error(`Error deleting row ${rowIndex} on ${sheetName}: `, error);
            throw error;
        }
    }
}
