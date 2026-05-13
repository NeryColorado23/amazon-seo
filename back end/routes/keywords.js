const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Keyword = require('../models/Keyword');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/keywords/upload
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

    const keywords = rawData.map((row) => ({
      userId: req.user.id,
      keyword: row['Keyword Phrase'] || row['Keyword'] || row['keyword'] || '',
      searchVolume: cleanNumber(row['Search Volume'] || row['Volume'] || row['Volumen'] || 0),
      competitorCount: cleanNumber(row['Competing Products'] || row['Competitors'] || row['Competidores'] || 0),
      cpc: cleanNumber(row['CPC'] || row['Suggested PPC Bid'] || 0),
      relevance: cleanNumber(row['Cerebro IQ Score'] || row['Relevance'] || row['Relevancia'] || 0),
      trend: row['Trend'] || row['Search Volume Trend'] || 'stable',
      keywordSales: cleanNumber(row['Keyword Sales'] || 0),
      sponsoredAsins: cleanNumber(row['Sponsored ASINs'] || 0),
      organic: cleanNumber(row['Organic'] || 0),
      category: row['Category'] || row['Categoria'] || '',
    }));

    const result = await Keyword.insertMany(keywords);

    return res.status(201).json({
      message: `${result.length} keywords cargadas exitosamente.`,
      count: result.length,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error al procesar el archivo', error: error.message });
  }
});

// GET /api/keywords
router.get('/', auth, async (req, res) => {
  try {
    const { minVolume, maxCompetitors, sortBy, order, limit } = req.query;

    let query = { userId: req.user.id };
    if (minVolume) query.searchVolume = { $gte: parseFloat(minVolume) };
    if (maxCompetitors) query.competitorCount = { $lte: parseFloat(maxCompetitors) };

    let sortOption = {};
    sortOption[sortBy || 'searchVolume'] = order === 'asc' ? 1 : -1;

    const keywords = await Keyword.find(query).sort(sortOption).limit(parseInt(limit) || 500);
    return res.json(keywords);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/keywords/top
router.get('/top', auth, async (req, res) => {
  try {
    const topCount = parseInt(req.query.count) || 20;
    const topKeywords = await Keyword.find({ userId: req.user.id })
      .sort({ searchVolume: -1 })
      .limit(topCount);
    return res.json(topKeywords);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/keywords/opportunities
router.get('/opportunities', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');

    const opportunities = await Keyword.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $addFields: {
          opportunityScore: {
            $cond: {
              if: { $gt: ['$competitorCount', 0] },
              then: { $divide: ['$searchVolume', '$competitorCount'] },
              else: '$searchVolume',
            },
          },
        },
      },
      { $sort: { opportunityScore: -1 } },
      { $limit: 20 },
    ]);

    return res.json(opportunities);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/keywords
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Keyword.deleteMany({ userId: req.user.id });
    return res.json({ message: `${result.deletedCount} keywords eliminadas.` });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;