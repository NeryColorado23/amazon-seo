const pool = require('../config/postgres');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
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

    // Insertar en chunks para no sobrecargar MongoDB
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

module.exports = { syncListingsToMongo, syncKeywordsToMongo };