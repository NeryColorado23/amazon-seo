const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  author: String,
  rating: Number,
  title: String,
  body: String,
  date: String,
  verified: Boolean,
});

const listingDraftSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, default: 'Borrador sin título' },
  category: { type: String, default: '' },
  title: { type: String, default: '' },
  bullet1: { type: String, default: '' },
  bullet2: { type: String, default: '' },
  bullet3: { type: String, default: '' },
  bullet4: { type: String, default: '' },
  bullet5: { type: String, default: '' },
  description: { type: String, default: '' },
  searchTerms: { type: String, default: '' },
  keywordsUsed: [{ type: String }],
  images: [{ type: String }], // base64 strings en orden
  reviews: [reviewSchema],
  avgRating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  savedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ListingDraft', listingDraftSchema);