const express = require('express');
const Upload = require('../models/Upload');
const Listing = require('../models/Listing');
const Keyword = require('../models/Keyword');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/uploads — historial de uploads del usuario
router.get('/', auth, async (req, res) => {
  try {
    const uploads = await Upload.find({ userId: req.user.id })
      .sort({ uploadedAt: -1 });
    return res.json(uploads);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// DELETE /api/uploads/:id — borrar un upload y sus datos
router.delete('/:id', auth, async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload no encontrado.' });
    }

    // Borrar datos asociados según el tipo
    if (upload.type === 'listings') {
      await Listing.deleteMany({ uploadId: upload._id });
    } else if (upload.type === 'keywords') {
      await Keyword.deleteMany({ uploadId: upload._id });
    }

    await Upload.findByIdAndDelete(upload._id);

    return res.json({
      message: `Reporte eliminado junto con sus ${upload.recordCount} registros.`,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

module.exports = router;