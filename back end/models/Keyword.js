const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  uploadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    default: null,
  },
  keyword: { type: String, required: true, trim: true },
  searchVolume: { type: Number, default: 0 },
  competitorCount: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  relevance: { type: Number, default: 0 },
  trend: { type: String, default: 'stable' },
  keywordSales: { type: Number, default: 0 },
  sponsoredAsins: { type: Number, default: 0 },
  organic: { type: Number, default: 0 },
  category: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Keyword', keywordSchema);