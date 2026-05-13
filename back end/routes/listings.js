const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/listings/upload — Subir Excel de listings
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se envió ningún archivo.' });
    }

    // Leer el Excel
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'El archivo está vacío.' });
    }

    // Mapear columnas del Excel al modelo
    const listings = rawData.map((row) => ({
      userId: req.user.id,
      asin: row['ASIN'] || row['asin'] || '',
      title: row['Title'] || row['Titulo'] || row['title'] || '',
      category: row['Category'] || row['Categoria'] || row['category'] || 'Sin categoría',
      price: parseFloat(row['Price'] || row['Precio'] || 0),
      salesPerDay: parseInt(row['Sales/Day'] || row['Ventas/Dia'] || row['SalesPerDay'] || 0),
      conversionRate: parseFloat(row['Conversion Rate'] || row['ConversionRate'] || row['CR'] || 0),
      impressions: parseInt(row['Impressions'] || row['Impresiones'] || 0),
      clicks: parseInt(row['Clicks'] || row['Clics'] || 0),
      bsr: parseInt(row['BSR'] || row['Rank'] || 0),
      ctr: parseFloat(row['CTR'] || 0),
    }));

    // Insertar en la base de datos
    const result = await Listing.insertMany(listings);

    res.status(201).json({
      message: `${result.length} listados cargados exitosamente.`,
      count: result.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar el archivo', error: error.message });
  }
});

// GET /api/listings — Obtener listings con filtros
router.get('/', auth, async (req, res) => {
  try {
    const { category, minSales, minConversion, sortBy, order } = req.query;

    let query = { userId: req.user.id };

    // Filtros opcionales
    if (category) query.category = category;
    if (minSales) query.salesPerDay = { $gte: parseInt(minSales) };
    if (minConversion) query.conversionRate = { $gte: parseFloat(minConversion) };

    // Ordenamiento
    let sortOption = {};
    if (sortBy) {
      sortOption[sortBy] = order === 'asc' ? 1 : -1;
    } else {
      sortOption.uploadedAt = -1; // Más recientes primero
    }

    const listings = await Listing.find(query).sort(sortOption);
    res.json(listings);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/listings/categories — Obtener lista de categorías únicas
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await Listing.distinct('category', { userId: req.user.id });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/listings/stats — Métricas agregadas para el dashboard
router.get('/stats', auth, async (req, res) => {
  try {
    const { category } = req.query;
    let match = { userId: req.user.id };
    if (category) match.category = category;

    // Necesitamos convertir userId a ObjectId para aggregate
    const mongoose = require('mongoose');
    match.userId = new mongoose.Types.ObjectId(req.user.id);

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
        },
      },
      { $sort: { avgSalesPerDay: -1 } },
    ]);

    // Totales generales
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
        },
      },
    ]);

    res.json({
      byCategory: stats,
      totals: totals[0] || {},
    });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/listings — Borrar todos los listings del usuario
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Listing.deleteMany({ userId: req.user.id });
    res.json({ message: `${result.deletedCount} listados eliminados.` });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
