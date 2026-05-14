const pool = require('../config/postgres');
const { v4: uuidv4 } = require('uuid');

// Limpiar número — quita $, comas, > etc.
const cleanNum = (val) => {
  if (!val && val !== 0) return 0;
  const str = String(val).replace(/[$,>]/g, '').trim();
  return parseFloat(str) || 0;
};

// Normalizar ventas raw → norm_listings
const normalizeSales = async (batchId) => {
  const client = await pool.connect();
  try {
    // Obtener raw sales de este batch
    const raw = await client.query(
      'SELECT * FROM raw_sales WHERE batch_id = $1',
      [batchId]
    );

    if (raw.rows.length === 0) return 0;

    // Insertar normalizados
    const values = raw.rows.map(row => [
      row.identifier || '',
      row.title || '',
      row.category || 'Sin categoría',
      0, // price — no viene en este reporte
      cleanNum(row.units_ordered), // sales_per_day
      0, // conversion_rate
      0, // impressions
      0, // clicks
      0, // bsr
      cleanNum(row.ordered_product_sales),
      cleanNum(row.total_order_items),
      row.source || 'google_sheets',
      batchId,
    ]);

    for (const v of values) {
      await client.query(
        `INSERT INTO norm_listings
         (asin, title, category, price, sales_per_day, conversion_rate,
          impressions, clicks, bsr, ordered_product_sales, total_order_items,
          source, batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        v
      );
    }

    return values.length;
  } finally {
    client.release();
  }
};

// Normalizar keywords raw → norm_keywords
const normalizeKeywords = async (batchId) => {
  const client = await pool.connect();
  try {
    const raw = await client.query(
      'SELECT * FROM raw_keywords WHERE batch_id = $1',
      [batchId]
    );

    if (raw.rows.length === 0) return 0;

    for (const row of raw.rows) {
      const competing = cleanNum(row.competing_products);
      const trend = row.search_volume_trend > 10 ? 'up'
        : row.search_volume_trend < -10 ? 'down' : 'stable';

      await client.query(
        `INSERT INTO norm_keywords
         (keyword, category, search_volume, keyword_sales, competing_products,
          sponsored_asins, organic, cpc, relevance, trend, source, batch_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          row.keyword_phrase || '',
          row.category || '',
          cleanNum(row.search_volume),
          cleanNum(row.keyword_sales),
          competing,
          cleanNum(row.sponsored_asins),
          cleanNum(row.organic),
          0,
          0,
          trend,
          row.source || 'google_sheets',
          batchId,
        ]
      );
    }

    return raw.rows.length;
  } finally {
    client.release();
  }
};

module.exports = { normalizeSales, normalizeKeywords };