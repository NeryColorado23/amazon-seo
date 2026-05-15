const express = require('express');
const CostInventory = require('../models/CostInventory');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/costs
router.get('/', auth, async (req, res) => {
  try {
    const { category, stockStatus, uploadId, sortBy, order } = req.query;
    let query = { userId: req.user.id };

    if (category) query.category = category;
    if (stockStatus) query.stockStatus = stockStatus;
    if (uploadId) query.uploadId = uploadId;

    let sortOption = {};
    sortOption[sortBy || 'fbaStock'] = order === 'asc' ? 1 : -1;

    const costs = await CostInventory.find(query).sort(sortOption);
    return res.json(costs);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/costs/categories
router.get('/categories', auth, async (req, res) => {
  try {
    const categories = await CostInventory.distinct('category', { userId: req.user.id });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// GET /api/costs/stats
router.get('/stats', auth, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const match = { userId: new mongoose.Types.ObjectId(req.user.id) };

    const stats = await CostInventory.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgCogs: { $avg: '$cogs' },
          avgMarginPct: { $avg: '$marginPct' },
          totalFbaStock: { $sum: '$fbaStock' },
          lowStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'low'] }, 1, 0] } },
          outStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'out'] }, 1, 0] } },
          okStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'ok'] }, 1, 0] } },
        },
      },
    ]);

    const byCategory = await CostInventory.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$category',
          totalProducts: { $sum: 1 },
          avgCogs: { $avg: '$cogs' },
          avgMarginPct: { $avg: '$marginPct' },
          totalStock: { $sum: '$fbaStock' },
          lowStock: { $sum: { $cond: [{ $eq: ['$stockStatus', 'low'] }, 1, 0] } },
        },
      },
      { $sort: { totalProducts: -1 } },
    ]);

    return res.json({ totals: stats[0] || {}, byCategory });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

module.exports = router;