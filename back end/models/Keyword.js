const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  keyword: {
    type: String,
    required: true,
    trim: true,
  },
  searchVolume: {
    type: Number,
    default: 0,
  },
  competitorCount: {
    type: Number,
    default: 0,
  },
  cpc: {
    type: Number,
    default: 0,
  },
  relevance: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  trend: {
    type: String,
    enum: ['up', 'down', 'stable'],
    default: 'stable',
  },
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Keyword', keywordSchema);
