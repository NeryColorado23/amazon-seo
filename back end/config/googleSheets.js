const { google } = require('googleapis');

const getSheetData = async (sheetId, range = 'A:I') => {
  let credentials;

  try {
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } else {
      const path = require('path');
      const fs = require('fs');
      const filePath = path.resolve('./google-credentials.json');
      credentials = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    throw new Error(`Error cargando credenciales Google: ${err.message}`);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
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