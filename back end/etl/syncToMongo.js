const pool = require('../config/postgres');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
const Upload = require('../models/Upload');

// Sincronizar norm_listings → MongoDB
const syncListingsToMongo = async (batchId, userId) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      'SELECT * FROM norm_listings WHERE batch_id = $1 AND synced_to_mongo = FALSE',
      [batchId]
    );

    if (result.rows.length === 0) return 0;

    // Crear registro de upload en MongoDB
    const uploadRecord = new Upload({
      userId,
      type: 'listings',
      fileName: `Sync desde Supabase - ${new Date().toLocaleDateString('es-GT')}`,
      recordCount: result.rows.length,
    });
    await uploadRecord.save();

    // Insertar listings en MongoDB
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

    // Marcar como sincronizados en Supabase
    await client.query(
      'UPDATE norm_listings SET synced_to_mongo = TRUE WHERE batch_id = $1',
      [batchId]
    );

    return listings.length;
  } finally {
    client.release();
  }
};

// Sincronizar norm_keywords → MongoDB
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
      fileName: `Sync desde Supabase - ${new Date().toLocaleDateString('es-GT')}`,
      recordCount: result.rows.length,
    });
    await uploadRecord.save();

    const keywords = result.rows.map(row => ({
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

    await client.query(
      'UPDATE norm_keywords SET synced_to_mongo = TRUE WHERE batch_id = $1',
      [batchId]
    );

    return keywords.length;
  } finally {
    client.release();
  }
};

module.exports = { syncListingsToMongo, syncKeywordsToMongo };