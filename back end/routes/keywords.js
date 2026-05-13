const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const Keyword = require('../models/Keyword');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// POST /api/keywords/upload — Subir Excel de keywords
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

    const keywords = rawData.map((row) => ({
      userId: req.user.id,
      keyword: row['Keyword'] || row['keyword'] || row['Keyword Phrase'] || '',
      searchVolume: parseInt(row['Search Volume'] || row['Volume'] || row['Volumen'] || 0),
      competitorCount: parseInt(row['Competing Products'] || row['Competitors'] || row['Competidores'] || 0),
      cpc: parseFloat(row['CPC'] || row['Suggested PPC Bid'] || 0),
      relevance: parseInt(row['Relevance'] || row['Relevancia'] || row['Cerebro IQ Score'] || 0),
      trend: row['Trend'] || row['Search Volume Trend'] || 'stable',
    }));

    const result = await Keyword.insertMany(keywords);

    res.status(201).json({
      message: `${result.length} keywords cargadas exitosamente.`,
      count: result.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al procesar el archivo', error: error.message });
  }
});

// GET /api/keywords — Obtener keywords con filtros
router.get('/', auth, async (req, res) => {
  try {
    const { minVolume, maxCompetitors, sortBy, order, limit } = req.query;

    let query = { userId: req.user.id };

    if (minVolume) query.searchVolume = { $gte: parseInt(minVolume) };
    if (maxCompetitors) query.competitorCount = { $lte: parseInt(maxCompetitors) };

    let sortOption = {};
    if (sortBy) {
      sortOption[sortBy] = order === 'asc' ? 1 : -1;
    } else {
      sortOption.searchVolume = -1;
    }

    const queryLimit = parseInt(limit) || 500;
    const keywords = await Keyword.find(query).sort(sortOption).limit(queryLimit);

    res.json(keywords);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/keywords/top — Top keywords por volumen
router.get('/top', auth, async (req, res) => {
  try {
    const topCount = parseInt(req.query.count) || 20;

    const topKeywords = await Keyword.find({ userId: req.user.id })
      .sort({ searchVolume: -1 })
      .limit(topCount);

    res.json(topKeywords);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/keywords/opportunities — Keywords de alta oportunidad (alto volumen + baja competencia)
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

    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/keywords — Borrar todas las keywords del usuario
router.delete('/', auth, async (req, res) => {
  try {
    const result = await Keyword.deleteMany({ userId: req.user.id });
    res.json({ message: `${result.deletedCount} keywords eliminadas.` });
  } catch (error) {
    res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;
