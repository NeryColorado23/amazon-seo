const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema({
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
  asin: { type: String, default: '' },
  title: { type: String, default: '' },
  category: { type: String, default: 'Sin categoría' },
  price: { type: Number, default: 0 },
  salesPerDay: { type: Number, default: 0 },
  conversionRate: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  bsr: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  orderedProductSales: { type: Number, default: 0 },
  totalOrderItems: { type: Number, default: 0 },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Listing', listingSchema);