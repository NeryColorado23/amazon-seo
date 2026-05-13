const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/listings/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo.' });
    }

    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'El archivo está vacío.' });
    }

    const cleanNumber = (val) => {
      if (!val) return 0;
      return parseFloat(String(val).replace(/[$,>]/g, '')) || 0;
    };

    const listings = rawData.map((row) => ({
      userId: req.user.id,
      asin: row['Identifier'] || row['ASIN'] || row['asin'] || '',
      title: row['Title'] || row['Titulo'] || row['title'] || '',
      category: row['Category'] || row['Categoria'] || row['category'] || 'Sin categoría',
      price: cleanNumber(row['Price'] || row['Precio'] || 0),
      salesPerDay: cleanNumber(row['Units Ordered'] || row['Sales/Day'] || row['Ventas/Dia'] || 0),
      conversionRate: cleanNumber(row['Conversion Rate'] || row['ConversionRate'] || row['CR'] || 0),
      impressions: cleanNumber(row['Impressions'] || row['Impresiones'] || 0),
      clicks: cleanNumber(row['Clicks'] || row['Clics'] || 0),
      bsr: cleanNumber(row['BSR'] || row['Rank'] || 0),
      ctr: cleanNumber(row['CTR'] || 0),
      orderedProductSales: cleanNumber(row['Ordered Product Sales'] || 0),
      totalOrderItems: cleanNumber(row['Total Order Items'] || 0),
    }));

    const result = await Listing.insertMany(listings);

    return res.status(201).json({
      message: `${result.length} listados cargados exitosamente.`,
      count: result.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al procesar el archivo', error: error.message });
  }
});

// GET /api/listings
router.get('/', auth, async (req, res) => {
  try {
    const { category, minSales, minConversion, sortBy, order } = req.query;

    let query = { userId: req.user.id };

    if (category) query.category = category;
    if (minSales) query.salesPerDay = { $gte: parseFloat(minSales) };
    if (minConversion) query.conversionRate = { $gte: parseFloat(minConversion) };

    let sortOption = {};
    if (sortBy) {
      sortOption[sortBy] = order === 'asc' ? 1 : -1;
    } else {
      sortOption.salesPerDay = -1;
    }

    const listings = await Listing.find(query).sort(sortOption);
    return res.json(listings);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/listings/categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Listing.distinct('category', { userId: req.user.id });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/listings/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const { category } = req.query;

    let match = { userId: new mongoose.Types.ObjectId(req.user.id) };
    if (category) match.category = category;

    const stats = await Listing.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalListings: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgSalesPerDay: { $avg: '$salesPerDay' },
          avgConversionRate: { $avg: '$conversionRate' },
          avgBSR: { $avg: '$bsr' },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalOrderedProductSales: { $sum: '$orderedProductSales' },
          totalUnitsOrdered: { $sum: '$salesPerDay' },
        },
      },
      { $sort: { totalUnitsOrdered: -1 } },
    ]);

    const totals = await Listing.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalListings: { $sum: 1 },
          avgPrice: { $avg: '$price' },
          avgSalesPerDay: { $avg: '$salesPerDay' },
          avgConversionRate: { $avg: '$conversionRate' },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          totalOrderedProductSales: { $sum: '$orderedProductSales' },
          totalUnitsOrdered: { $sum: '$salesPerDay' },
        },
      },
    ]);

    return res.json({
      byCategory: stats,
      totals: totals[0] || {},
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/listings
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Listing.deleteMany({ userId: req.user.id });
    return res.json({ message: `${result.deletedCount} listados eliminados.` });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;