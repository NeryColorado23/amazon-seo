const mongoose = require('mongoose');

const ppcSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
  identifier: { type: String, default: '' },
  title: { type: String, default: '' },
  category: { type: String, default: '' },
  adSpend: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  orders: { type: Number, default: 0 },
  acos: { type: Number, default: 0 },
  cpc: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  roas: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('PPC', ppcSchema);