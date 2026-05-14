const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, company, securityQuestion, securityAnswer } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'El email ya está registrado.' });
    }

    const user = new User({
      name, email, password, company,
      securityQuestion: securityQuestion || '',
      securityAnswer: securityAnswer || '',
    });
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email, company: user.company },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Credenciales incorrectas.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, company: user.company },
    });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// POST /api/auth/get-question — obtener pregunta secreta del usuario
router.post('/get-question', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con ese email.' });
    }
    if (!user.securityQuestion) {
      return res.status(400).json({ message: 'Esta cuenta no tiene pregunta de seguridad configurada.' });
    }

    return res.json({ question: user.securityQuestion });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

// POST /api/auth/reset-password — resetear contraseña con respuesta secreta
router.post('/reset-password', async (req, res) => {
  try {
    const { email, securityAnswer, newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No existe una cuenta con ese email.' });
    }

    const isMatch = await user.compareAnswer(securityAnswer);
    if (!isMatch) {
      return res.status(400).json({ message: 'Respuesta incorrecta.' });
    }

    user.password = newPassword;
    await user.save();

    return res.json({ message: '✅ Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -securityAnswer');
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: 'Error del servidor' });
  }
});

module.exports = router;