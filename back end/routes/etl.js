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

const cleanInt = (val) => {
  if (!val && val !== 0) return 0;
  return parseInt(String(val).replace(/[$,>]/g, '').trim()) || 0;
};

const cleanFloat = (val) => {
  if (!val && val !== 0) return 0;
  return parseFloat(String(val).replace(/[$,>]/g, '').trim()) || 0;
};

// Insertar en batches de N filas
const insertBatch = async (client, query, allValues, batchSize = 100) => {
  for (let i = 0; i < allValues.length; i += batchSize) {
    const chunk = allValues.slice(i, i + batchSize);
    for (const vals of chunk) {
      await client.query(query, vals);
    }
  }
};

// POST /api/etl/upload-sales
router.post('/upload-sales', auth, upload.single('file'), async (req, res) => {
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
       VALUES ($1, 'listings', 'excel_upload', $2, 'processing')`,
      [batchId, rawData.length]
    );

    // Preparar todos los valores
    const allValues = rawData.map(row => [
      batchId, 'excel_upload',
      String(row['Identifier'] || row['ASIN'] || row['asin'] || '').trim(),
      String(row['Category'] || row['Categoria'] || 'Sin categoría').trim(),
      String(row['Title'] || row['Titulo'] || '').trim(),
      cleanInt(row['Units Ordered'] || row['Sales/Day'] || 0),
      cleanFloat(row['Ordered Product Sales'] || 0),
      cleanInt(row['Total Order Items'] || 0),
    ]);

    const query = `INSERT INTO raw_sales
      (batch_id, source, identifier, category, title,
       units_ordered, ordered_product_sales, total_order_items)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`;

    await insertBatch(client, query, allValues);

    const normalized = await normalizeSales(batchId);
    const synced = await syncListingsToMongo(batchId, req.user.id);

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
    console.error('ETL Sales error:', error.message);
    await client.query(
      `UPDATE sync_log SET status='error', error_message=$1, finished_at=NOW() WHERE batch_id=$2`,
      [error.message, batchId]
    ).catch(() => {});
    return res.status(500).json({ message: 'Error en ETL', error: error.message });
  } finally {
    client.release();
  }
});

// POST /api/etl/upload-keywords
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

    // Preparar valores en memoria
    const allValues = rawData.map(row => [
      batchId, 'excel_upload',
      String(row['Keyword Phrase'] || row['Keyword'] || '').trim(),
      String(row['Category'] || row['Categoria'] || '').trim(),
      cleanInt(row['Keyword Sales']),
      cleanInt(row['Search Volume']),
      cleanInt(row['Search Volume Trend']),
      cleanInt(row['Sponsored ASINs']),
      String(row['Competing Products'] || '0').replace(/[>]/g, '').trim(),
      cleanInt(row['Organic']),
    ]);

    // Usar INSERT multi-row para máxima velocidad
    const CHUNK = 200;
    for (let i = 0; i < allValues.length; i += CHUNK) {
      const chunk = allValues.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, idx) => {
        const base = idx * 10;
        return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9},$${base+10})`;
      }).join(',');

      const flat = chunk.flat();

      await client.query(
        `INSERT INTO raw_keywords
         (batch_id, source, keyword_phrase, category, keyword_sales,
          search_volume, search_volume_trend, sponsored_asins, competing_products, organic)
         VALUES ${placeholders}`,
        flat
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
    console.error('ETL Keywords error:', error.message);
    await client.query(
      `UPDATE sync_log SET status='error', error_message=$1, finished_at=NOW() WHERE batch_id=$2`,
      [error.message, batchId]
    ).catch(() => {});
    return res.status(500).json({ message: 'Error en ETL', error: error.message });
  } finally {
    client.release();
  }
});

// GET /api/etl/logs
router.get('/logs', auth, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM sync_log ORDER BY started_at DESC LIMIT 50'
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  } finally {
    client.release();
  }
});

module.exports = router;