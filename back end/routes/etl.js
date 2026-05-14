const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/postgres');
const { normalizeSales, normalizeKeywords } = require('../etl/normalize');
const { syncListingsToMongo, syncKeywordsToMongo } = require('../etl/syncToMongo');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/etl/upload-sales — subir Excel de ventas a Supabase
router.post('/upload-sales', auth, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  const batchId = uuidv4();

  try {
    if (!req.file) return res.status(400).json({ message: 'No se envió archivo.' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) return res.status(400).json({ message: 'Archivo vacío.' });

    // Log inicio
    await client.query(
      `INSERT INTO sync_log (batch_id, type, source, records_raw, status)
       VALUES ($1, 'listings', 'excel_upload', $2, 'processing')`,
      [batchId, rawData.length]
    );

    // Insertar raw data en Supabase
    for (const row of rawData) {
      await client.query(
        `INSERT INTO raw_sales
         (batch_id, source, identifier, category, title, units_ordered,
          ordered_product_sales, total_order_items)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          batchId,
          'excel_upload',
          row['Identifier'] || row['ASIN'] || row['asin'] || '',
          row['Category'] || row['Categoria'] || 'Sin categoría',
          row['Title'] || row['Titulo'] || '',
          parseInt(row['Units Ordered'] || row['Sales/Day'] || 0),
          parseFloat(String(row['Ordered Product Sales'] || '0').replace(/[$,]/g, '')) || 0,
          parseInt(row['Total Order Items'] || 0),
        ]
      );
    }

    // Normalizar
    const normalized = await normalizeSales(batchId);

    // Sync a MongoDB
    const synced = await syncListingsToMongo(batchId, req.user.id);

    // Log finalizado
    await client.query(
      `UPDATE sync_log
       SET status='completed', records_normalized=$1, records_synced=$2, finished_at=NOW()
       WHERE batch_id=$3`,
      [normalized, synced, batchId]
    );

    return res.json({
      message: `✅ ${rawData.length} registros cargados → ${normalized} normalizados → ${synced} sincronizados a MongoDB`,
      batchId,
      stats: { raw: rawData.length, normalized, synced },
    });

  } catch (error) {
    await client.query(
      `UPDATE sync_log SET status='error', error_message=$1, finished_at=NOW() WHERE batch_id=$2`,
      [error.message, batchId]
    );
    return res.status(500).json({ message: 'Error en ETL', error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/etl/upload-keywords — subir Excel de keywords a Supabase
router.post('/upload-keywords', auth, upload.single('file'), async (req, res) => {
  const client = await pool.connect();
  const batchId = uuidv4();

  try {
    if (!req.file) return res.status(400).json({ message: 'No se envió archivo.' });

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) return res.status(400).json({ message: 'Archivo vacío.' });

    await client.query(
      `INSERT INTO sync_log (batch_id, type, source, records_raw, status)
       VALUES ($1, 'keywords', 'excel_upload', $2, 'processing')`,
      [batchId, rawData.length]
    );

    for (const row of rawData) {
      await client.query(
        `INSERT INTO raw_keywords
         (batch_id, source, keyword_phrase, category, keyword_sales,
          search_volume, search_volume_trend, sponsored_asins, competing_products, organic)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [
          batchId,
          'excel_upload',
          row['Keyword Phrase'] || row['Keyword'] || '',
          row['Category'] || row['Categoria'] || '',
          parseInt(row['Keyword Sales'] || 0),
          parseInt(String(row['Search Volume'] || '0').replace(/[,]/g, '')) || 0,
          parseInt(row['Search Volume Trend'] || 0),
          parseInt(row['Sponsored ASINs'] || 0),
          String(row['Competing Products'] || '0'),
          parseInt(row['Organic'] || 0),
        ]
      );
    }

    const normalized = await normalizeKeywords(batchId);
    const synced = await syncKeywordsToMongo(batchId, req.user.id);

    await client.query(
      `UPDATE sync_log
       SET status='completed', records_normalized=$1, records_synced=$2, finished_at=NOW()
       WHERE batch_id=$3`,
      [normalized, synced, batchId]
    );

    return res.json({
      message: `✅ ${rawData.length} keywords cargadas → ${normalized} normalizadas → ${synced} sincronizadas a MongoDB`,
      batchId,
      stats: { raw: rawData.length, normalized, synced },
    });

  } catch (error) {
    await client.query(
      `UPDATE sync_log SET status='error', error_message=$1, finished_at=NOW() WHERE batch_id=$2`,
      [error.message, batchId]
    );
    return res.status(500).json({ message: 'Error en ETL', error: error.message });
  } finally {
    client.release();
  }
});

// GET /api/etl/logs — historial de sincronizaciones
router.get('/logs', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 50'
    );
    return res.json(result.rows);
  } finally {
    client.release();
  }
});

module.exports = router;