const { google } = require('googleapis');
const path = require('path');

const getSheetData = async (sheetId, range = 'A:I') => {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve(process.env.GOOGLE_CREDENTIALS_PATH),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  });

  return response.data.values;
};

module.exports = { getSheetData };