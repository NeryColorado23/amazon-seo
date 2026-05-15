const pool = require('../config/postgres');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
const CostInventory = require('../models/CostInventory');
const Upload = require('../models/Upload');

const syncListingsToMongo = async (batchId, userId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM norm_listings WHERE batch_id = $1 AND synced_to_mongo = FALSE',
      [batchId]
    );
    if (result.rows.length === 0) return 0;

    const uploadRecord = new Upload({
      userId,
      type: 'listings',
      fileName: `Warehouse sync - ${new Date().toLocaleDateString('es-GT')}`,
      recordCount: result.rows.length,
    });
    await uploadRecord.save();

    const listings = result.rows.map(row => ({
      userId,
      uploadId: uploadRecord._id,
      asin: row.asin,
      title: row.title,
      category: row.category,
      price: row.price,
      salesPerDay: row.sales_per_day,
      conversionRate: row.conversion_rate,
      impressions: row.impressions,
      clicks: row.clicks,
      bsr: row.bsr,
      orderedProductSales: row.ordered_product_sales,
      totalOrderItems: row.total_order_items,
    }));

    await Listing.insertMany(listings);

    await client.query(
      'UPDATE norm_listings SET synced_to_mongo = TRUE WHERE batch_id = $1',
      [batchId]
    );
    return listings.length;
  } finally {
    client.release();
  }
};

const syncKeywordsToMongo = async (batchId, userId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM norm_keywords WHERE batch_id = $1 AND synced_to_mongo = FALSE',
      [batchId]
    );
    if (result.rows.length === 0) return 0;

    const uploadRecord = new Upload({
      userId,
      type: 'keywords',
      fileName: `Warehouse sync - ${new Date().toLocaleDateString('es-GT')}`,
      recordCount: result.rows.length,
    });
    await uploadRecord.save();

    const CHUNK = 500;
    const rows = result.rows;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK);
      const keywords = chunk.map(row => ({
        userId,
        uploadId: uploadRecord._id,
        keyword: row.keyword,
        category: row.category,
        searchVolume: row.search_volume,
        keywordSales: row.keyword_sales,
        competitorCount: row.competing_products,
        sponsoredAsins: row.sponsored_asins,
        organic: row.organic,
        cpc: row.cpc,
        relevance: row.relevance,
        trend: row.trend,
      }));
      await Keyword.insertMany(keywords);
    }

    await client.query(
      'UPDATE norm_keywords SET synced_to_mongo = TRUE WHERE batch_id = $1',
      [batchId]
    );
    return rows.length;
  } finally {
    client.release();
  }
};

const syncCostsToMongo = async (batchId, userId) => {
  const client = await pool.connect();
  try {
    console.log('Buscando costs con batch_id:', batchId);

    const result = await client.query(
      `SELECT * FROM norm_costs WHERE batch_id = $1 AND synced_to_mongo = false`,
      [batchId]
    );

    console.log('Costs encontrados en Supabase:', result.rows.length);

    if (result.rows.length === 0) return 0;

    const uploadRecord = new Upload({
      userId,
      type: 'costs',
      fileName: `Warehouse sync costs - ${new Date().toLocaleDateString('es-GT')}`,
      recordCount: result.rows.length,
    });
    await uploadRecord.save();

    const costs = result.rows.map(row => {
      console.log('Row sample:', JSON.stringify(row).slice(0, 100));
      return {
        userId,
        uploadId: uploadRecord._id,
        identifier: row.identifier || '',
        title: row.title || '',
        category: row.category || '',
        cogs: parseFloat(row.cogs) || 0,
        salePrice: parseFloat(row.sale_price) || 0,
        margin: parseFloat(row.margin) || 0,
        marginPct: parseFloat(row.margin_pct) || 0,
        fbaStock: parseInt(row.fba_stock) || 0,
        reorderPoint: parseInt(row.reorder_point) || 0,
        stockStatus: row.stock_status || 'out',
        leadTimeDays: parseInt(row.lead_time_days) || 0,
        supplier: row.supplier || '',
      };
    });

    console.log('Primer cost a insertar:', JSON.stringify(costs[0]));

    await CostInventory.insertMany(costs);

    await client.query(
      `UPDATE norm_costs SET synced_to_mongo = true WHERE batch_id = $1`,
      [batchId]
    );

    console.log('Sync costs completado:', costs.length);
    return costs.length;
  } finally {
    client.release();
  }
};

module.exports = { syncListingsToMongo, syncKeywordsToMongo, syncCostsToMongo };