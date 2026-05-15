const mongoose = require('mongoose');

const costInventorySchema = new mongoose.Schema({
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
  identifier: { type: String, default: '' },
  title: { type: String, default: '' },
  category: { type: String, default: '' },
  cogs: { type: Number, default: 0 },
  salePrice: { type: Number, default: 0 },
  margin: { type: Number, default: 0 },
  marginPct: { type: Number, default: 0 },
  fbaStock: { type: Number, default: 0 },
  reorderPoint: { type: Number, default: 0 },
  stockStatus: { type: String, default: 'ok' },
  leadTimeDays: { type: Number, default: 0 },
  supplier: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('CostInventory', costInventorySchema);