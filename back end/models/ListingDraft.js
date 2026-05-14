const mongoose = require('mongoose');

const listingDraftSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
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
  savedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ListingDraft', listingDraftSchema);