const express = require('express');
const ListingDraft = require('../models/ListingDraft');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/drafts
router.get('/', auth, async (req, res) => {
  try {
    const drafts = await ListingDraft.find({ userId: req.user.id })
      .select('-images')
      .sort({ savedAt: -1 });
    return res.json(drafts);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/drafts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const draft = await ListingDraft.findOne({ _id: req.params.id, userId: req.user.id });
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
      description, searchTerms, keywordsUsed, images, reviews, avgRating, totalReviews
    } = req.body;

    const draft = new ListingDraft({
      userId: req.user.id,
      name: name || `Borrador ${new Date().toLocaleDateString('es-GT')}`,
      category, title, bullet1, bullet2, bullet3, bullet4, bullet5,
      description, searchTerms,
      keywordsUsed: keywordsUsed || [],
      images: images || [],
      reviews: reviews || [],
      avgRating: avgRating || 0,
      totalReviews: totalReviews || 0,
    });

    await draft.save();
    const response = draft.toObject();
    delete response.images;
    return res.status(201).json(response);
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
    ).select('-images');
    if (!draft) return res.status(404).json({ message: 'Borrador no encontrado.' });
    return res.json(draft);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/drafts/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await ListingDraft.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    return res.json({ message: 'Borrador eliminado.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/drafts/generate-reviews — reviews fijos sin IA
router.post('/generate-reviews', auth, async (req, res) => {
  try {
    const { title, category } = req.body;

    const productName = title
      ? title.split('–')[0].split('-')[0].trim().slice(0, 40)
      : category || 'this product';

    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    const templates = [
      { author: 'Sarah M.',    rating: 5, title: 'Absolutely love these!',         body: `I bought ${productName} and I couldn't be happier. The quality is outstanding and exactly as described. Will definitely buy again!`, verified: true },
      { author: 'James T.',    rating: 5, title: 'Great product, fast shipping',    body: `${productName} exceeded my expectations. Very well made and sturdy. My whole family loves it. Highly recommend to anyone looking for quality.`, verified: true },
      { author: 'Linda R.',    rating: 4, title: 'Very good quality',               body: `Really happy with my purchase. ${productName} works great and looks exactly like the pictures. Shipping was fast. Only minor issue is the packaging could be better.`, verified: true },
      { author: 'Michael B.',  rating: 4, title: 'Good value for money',            body: `Solid product overall. I've been using it daily and it holds up well. ${productName} is worth every penny. Would recommend to friends and family.`, verified: true },
      { author: 'Jennifer K.', rating: 5, title: 'Perfect! Exceeded expectations',  body: `This is exactly what I was looking for. ${productName} is high quality, well-designed and very practical. Already ordered a second one as a gift.`, verified: true },
      { author: 'Robert H.',   rating: 3, title: 'Decent but could be better',      body: `The product is okay for the price. ${productName} does what it's supposed to do but I expected a bit more based on the description. Not bad overall though.`, verified: false },
      { author: 'Amanda C.',   rating: 5, title: 'Best purchase this month!',       body: `Wow, I am so impressed with the quality of ${productName}. It's exactly as shown in the photos and works perfectly. Customer service was also very helpful.`, verified: true },
      { author: 'David W.',    rating: 4, title: 'Happy with my purchase',          body: `Good quality product. ${productName} arrived quickly and in perfect condition. It's well made and durable. Very satisfied with this purchase.`, verified: true },
    ];

    const reviews = templates.map((t, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (i * 12 + Math.floor(Math.random() * 10)));
      return {
        ...t,
        date: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      };
    });

    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = parseFloat((total / reviews.length).toFixed(1));
    const totalReviews = Math.floor(Math.random() * 800) + 150;

    return res.json({ reviews, avgRating, totalReviews });
  } catch (error) {
    return res.status(500).json({ message: 'Error generando reviews', error: error.message });
  }
});

module.exports = router;