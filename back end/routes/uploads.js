const express = require('express');
const Upload = require('../models/Upload');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/uploads
router.get('/', auth, async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
    return res.json(uploads);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/uploads/all/listings — DEBE IR ANTES DE /:id
router.delete('/all/listings', auth, async (req, res) => {
  try {
    const l = await Listing.deleteMany({ userId: req.user.id });
    const u = await Upload.deleteMany({ userId: req.user.id, type: 'listings' });
    console.log(`Borrados: ${l.deletedCount} listings, ${u.deletedCount} uploads`);
    return res.json({ message: `Todos los listados eliminados.` });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/uploads/all/keywords — DEBE IR ANTES DE /:id
router.delete('/all/keywords', auth, async (req, res) => {
  try {
    const k = await Keyword.deleteMany({ userId: req.user.id });
    const u = await Upload.deleteMany({ userId: req.user.id, type: 'keywords' });
    console.log(`Borradas: ${k.deletedCount} keywords, ${u.deletedCount} uploads`);
    return res.json({ message: `Todas las keywords eliminadas.` });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/uploads/:id — VA AL FINAL
router.delete('/:id', auth, async (req, res) => {
  try {
    const upload = await Upload.findOne({ _id: req.params.id, userId: req.user.id });

    if (!upload) {
      return res.status(404).json({ message: 'Upload no encontrado.' });
    }

    if (upload.type === 'listings') {
      const deleted = await Listing.deleteMany({ uploadId: upload._id });
      console.log(`Listings eliminados: ${deleted.deletedCount}`);
    } else if (upload.type === 'keywords') {
      const deleted = await Keyword.deleteMany({ uploadId: upload._id });
      console.log(`Keywords eliminadas: ${deleted.deletedCount}`);
    }

    await Upload.findByIdAndDelete(upload._id);

    return res.json({
      message: `Reporte eliminado con ${upload.recordCount} registros.`,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

module.exports = router;