const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { sendRegistrationEmail } = require('../utils/notifications');
const axios = require('axios');

const API_BASE = process.env.API_ORIGEN_BASE;

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación (registro y login)
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               telefono:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Usuario registrado correctamente
 *       400:
 *         description: Datos faltantes o correo ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, password } = req.body;
    
    // Validación de campos obligatorios
    if (!nombre || !apellido || !telefono || !email || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    // Verificar si el usuario ya existe
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'El correo ya está registrado.' });

    // Encriptar la contraseña
    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({ nombre, apellido, telefono, email, passwordHash: hash });

    // Enviar correo de bienvenida
    await sendRegistrationEmail(email, nombre);

    // Crear cliente en API externa
    await axios.post(`${API_BASE}/clientes`, {
      nombre,
      apellido,
      telefono
    }).catch(err => {
      console.warn('Warning: no se pudo crear cliente en API origen:', err.response?.data || err.message);
    });

    return res.json({ ok: true, message: 'Usuario registrado correctamente.', user: { id: newUser.id, email: newUser.email } });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario.' });
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login de usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso, devuelve JWT
 *       400:
 *         description: Datos faltantes
 *       401:
 *         description: Credenciales inválidas
 *       500:
 *         description: Error interno del servidor
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Faltan datos' });

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    // Generar JWT
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
    res.json({ ok: true, token });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Error en login' });
  }
});

module.exports = router;
