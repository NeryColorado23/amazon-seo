const express = require('express');
const ListingDraft = require('../models/ListingDraft');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/drafts
router.get('/', auth, async (req, res) => {
  try {
    const drafts = await ListingDraft.find({ userId: req.user.id })
      .sort({ savedAt: -1 });
    return res.json(drafts);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/drafts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const draft = await ListingDraft.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!draft) return res.status(404).json({ message: 'Borrador no encontrado.' });
    return res.json(draft);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/drafts
router.post('/', auth, async (req, res) => {
  try {
    const {
      name, category, title,
      bullet1, bullet2, bullet3, bullet4, bullet5,
      description, searchTerms, keywordsUsed,
    } = req.body;

    const draft = new ListingDraft({
      userId: req.user.id,
      name: name || `Borrador ${new Date().toLocaleDateString('es-GT')}`,
      category, title,
      bullet1, bullet2, bullet3, bullet4, bullet5,
      description, searchTerms,
      keywordsUsed: keywordsUsed || [],
    });

    await draft.save();
    return res.status(201).json(draft);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// PUT /api/drafts/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const draft = await ListingDraft.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, savedAt: new Date() },
      { new: true }
    );
    if (!draft) return res.status(404).json({ message: 'Borrador no encontrado.' });
    return res.json(draft);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/drafts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await ListingDraft.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    return res.json({ message: 'Borrador eliminado.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;