const express = require('express');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/postgres');
const { getSheetData } = require('../config/googleSheets');
const { normalizePPC } = require('../etl/normalize');
const { syncPPCToMongo } = require('../etl/syncToMongo');
const PPC = require('../models/PPC');
const Upload = require('../models/Upload');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/ppc/sync-sheets — leer Google Sheets y sincronizar
router.post('/sync-sheets', auth, async (req, res) => {
  const client = await pool.connect();
  const batchId = uuidv4();

  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const rows = await getSheetData(sheetId);

    if (!rows || rows.length < 2) {
      return res.status(400).json({ message: 'El Google Sheet está vacío.' });
    }

    // Primera fila son headers, desde la 2da son datos
    const headers = rows[0];
    const dataRows = rows.slice(1);

    console.log(`Google Sheets: ${dataRows.length} filas encontradas`);

    await client.query(
      `INSERT INTO sync_log (batch_id, type, source, records_raw, status)
       VALUES ($1, 'ppc', 'google_sheets', $2, 'processing')`,
      [batchId, dataRows.length]
    );

    // Insertar en raw_ppc
    const CHUNK = 100;
    for (let i = 0; i < dataRows.length; i += CHUNK) {
      const chunk = dataRows.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, idx) => {
        const b = idx * 11;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11})`;
      }).join(',');

      const flat = chunk.flatMap(row => [
        batchId,
        'google_sheets',
        String(row[0] || '').trim(),  // Identifier
        String(row[1] || '').trim(),  // Title
        String(row[2] || '').trim(),  // Category
        parseFloat(row[3]) || 0,      // Ad Spend
        parseInt(row[4]) || 0,        // Impressions
        parseInt(row[5]) || 0,        // Clicks
        parseInt(row[6]) || 0,        // Orders
        parseFloat(row[7]) || 0,      // ACOS
        parseFloat(row[8]) || 0,      // CPC
      ]);

      await client.query(
        `INSERT INTO raw_ppc
         (batch_id, source, identifier, title, category, ad_spend,
          impressions, clicks, orders, acos, cpc)
         VALUES ${placeholders}`,
        flat
      );
    }

    const normalized = await normalizePPC(batchId);
    const synced = await syncPPCToMongo(batchId, req.user.id);

    await client.query(
      `UPDATE sync_log
       SET status='completed', records_normalized=$1, records_synced=$2, finished_at=NOW()
       WHERE batch_id=$3`,
      [normalized, synced, batchId]
    );

    return res.json({
      message: `✅ ${dataRows.length} filas de Google Sheets → ${normalized} normalizadas → ${synced} sincronizadas a MongoDB`,
      batchId,
      stats: { raw: dataRows.length, normalized, synced },
    });

  } catch (error) {
    console.error('PPC Sheets error:', error.message);
    await client.query(
      `UPDATE sync_log SET status='error', error_message=$1, finished_at=NOW() WHERE batch_id=$2`,
      [error.message, batchId]
    ).catch(() => {});
    return res.status(500).json({ message: 'Error sincronizando Google Sheets', error: error.message });
  } finally {
    client.release();
  }
});

// GET /api/ppc — obtener datos PPC
router.get('/', auth, async (req, res) => {
  try {
    const { category, sortBy, order } = req.query;
    let query = { userId: req.user.id };
    if (category) query.category = category;
    let sortOption = {};
    sortOption[sortBy || 'adSpend'] = order === 'asc' ? 1 : -1;
    const data = await PPC.find(query).sort(sortOption);
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/ppc/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const match = { userId: new mongoose.Types.ObjectId(req.user.id) };

    const stats = await PPC.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalAdSpend: { $sum: '$adSpend' },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalOrders: { $sum: '$orders' },
          avgAcos: { $avg: '$acos' },
          avgCpc: { $avg: '$cpc' },
          avgCtr: { $avg: '$ctr' },
          avgRoas: { $avg: '$roas' },
        },
      },
    ]);

    const byCategory = await PPC.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalAdSpend: { $sum: '$adSpend' },
          totalOrders: { $sum: '$orders' },
          avgAcos: { $avg: '$acos' },
          avgRoas: { $avg: '$roas' },
          totalProducts: { $sum: 1 },
        },
      },
      { $sort: { totalAdSpend: -1 } },
    ]);

    return res.json({ totals: stats[0] || {}, byCategory });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// DELETE /api/ppc/all
router.delete('/all', auth, async (req, res) => {
  try {
    await PPC.deleteMany({ userId: req.user.id });
    return res.json({ message: 'Datos PPC eliminados.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;