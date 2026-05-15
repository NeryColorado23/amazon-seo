const pool = require('../config/postgres');

const cleanNum = (val) => {
  if (!val && val !== 0) return 0;
  const str = String(val).replace(/[$,>]/g, '').trim();
  return parseFloat(str) || 0;
};

const normalizeSales = async (batchId) => {
  const client = await pool.connect();
  try {
    const raw = await client.query(
      'SELECT * FROM raw_sales WHERE batch_id = $1',
      [batchId]
    );
    if (raw.rows.length === 0) return 0;

    // INSERT multi-row
    const CHUNK = 100;
    const rows = raw.rows;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, idx) => {
        const b = idx * 13;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12},$${b+13})`;
      }).join(',');

      const flat = chunk.flatMap(row => [
        row.identifier || '',
        row.title || '',
        row.category || 'Sin categoría',
        0,
        cleanNum(row.units_ordered),
        0, 0, 0, 0,
        cleanNum(row.ordered_product_sales),
        cleanNum(row.total_order_items),
        row.source || 'excel_upload',
        batchId,
      ]);

      await client.query(
        `INSERT INTO norm_listings
         (asin, title, category, price, sales_per_day, conversion_rate,
          impressions, clicks, bsr, ordered_product_sales, total_order_items,
          source, batch_id)
         VALUES ${placeholders}`,
        flat
      );
    }
    return rows.length;
  } finally {
    client.release();
  }
};

const normalizeKeywords = async (batchId) => {
  const client = await pool.connect();
  try {
    const raw = await client.query(
      'SELECT * FROM raw_keywords WHERE batch_id = $1',
      [batchId]
    );
    if (raw.rows.length === 0) return 0;

    const CHUNK = 200;
    const rows = raw.rows;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const placeholders = chunk.map((_, idx) => {
        const b = idx * 12;
        return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7},$${b+8},$${b+9},$${b+10},$${b+11},$${b+12})`;
      }).join(',');

      const flat = chunk.flatMap(row => {
        const trend = row.search_volume_trend > 10 ? 'up'
          : row.search_volume_trend < -10 ? 'down' : 'stable';
        return [
          row.keyword_phrase || '',
          row.category || '',
          cleanNum(row.search_volume),
          cleanNum(row.keyword_sales),
          cleanNum(row.competing_products),
          cleanNum(row.sponsored_asins),
          cleanNum(row.organic),
          0, 0,
          trend,
          row.source || 'excel_upload',
          batchId,
        ];
      });

      await client.query(
        `INSERT INTO norm_keywords
         (keyword, category, search_volume, keyword_sales, competing_products,
          sponsored_asins, organic, cpc, relevance, trend, source, batch_id)
         VALUES ${placeholders}`,
        flat
      );
    }
    return rows.length;
  } finally {
    client.release();
  }
};

module.exports = { normalizeSales, normalizeKeywords };