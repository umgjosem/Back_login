// ===============================
// Importación de módulos y modelos
// ===============================
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');             // Para encriptar contraseñas y validarlas
const jwt = require('jsonwebtoken');            // Para generar y verificar JWT
const { User, Cliente } = require('../models'); // Modelos Sequelize (User y Cliente)
const { sendRegistrationEmail } = require('../utils/notifications'); // Función para enviar emails

// ===============================
// Documentación Swagger: Grupo de rutas Auth
// ===============================
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Endpoints de autenticación (registro y login)
 */

// ===============================
// Ruta: Registro de usuario
// ===============================
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
 *         description: Usuario y cliente registrados correctamente
 *       400:
 *         description: Datos faltantes o correo ya registrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/register', async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, password } = req.body;
    
    // 1. Validación de campos obligatorios
    if (!nombre || !apellido || !telefono || !email || !password) {
      return res.status(400).json({ message: 'Faltan campos obligatorios.' });
    }

    // 2. Verificar si el usuario ya existe
    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'El correo ya está registrado.' });

    // 3. Encriptar contraseña
    const hash = await bcrypt.hash(password, 10);

    // 4. Crear usuario en la base de datos
    const newUser = await User.create({ 
      nombre, 
      apellido, 
      telefono, 
      email, 
      passwordHash: hash 
    });

    // 5. Enviar correo de bienvenida
    await sendRegistrationEmail(email, nombre);

    // 6. Crear cliente en la misma base de datos (ya no se usa API externa)
    const nuevoCliente = await Cliente.create({ nombre });

    // 7. Respuesta exitosa
    return res.json({
      ok: true,
      message: 'Usuario y cliente registrados correctamente.',
      user: { id: newUser.id, email: newUser.email, nombre: newUser.nombre },
      cliente: nuevoCliente
    });

  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error al registrar usuario y cliente.' });
  }
});

// ===============================
// Ruta: Login de usuario
// ===============================
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
 *         description: Login exitoso, devuelve JWT y nombre del usuario
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

    // 1. Validar datos de entrada
    if (!email || !password) return res.status(400).json({ message: 'Faltan datos' });

    // 2. Buscar usuario por email
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(401).json({ message: 'Credenciales inválidas' });

    // 3. Comparar contraseñas
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Credenciales inválidas' });

    // 4. Generar JWT
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Responder con token y nombre del usuario
    res.json({ 
      ok: true, 
      token,
      nombre: user.nombre  // 👈 aquí devolvemos el nombre del usuario
    });

  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ error: 'Error en login' });
  }
});

// ===============================
// Exportar router
// ===============================
module.exports = router;
