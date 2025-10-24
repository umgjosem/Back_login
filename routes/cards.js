const express = require('express');
const router = express.Router();
const { Card, User } = require('../models');
const auth = require('../middlewares/auth');

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Endpoints para manejo de tarjetas de usuario
 */

/**
 * @swagger
 * /cards/add:
 *   post:
 *     summary: Agregar tarjeta de pago
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *               last4:
 *                 type: string
 *               expMonth:
 *                 type: integer
 *               expYear:
 *                 type: integer
 *               brand:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tarjeta agregada correctamente
 *       400:
 *         description: Datos faltantes
 *       404:
 *         description: Usuario no encontrado
 *       500:
 *         description: Error interno
 */
router.post('/add', auth, async (req, res) => {
  try {
    const { token, last4, expMonth, expYear, brand } = req.body;
    if (!token || !last4) return res.status(400).json({ message: 'token y last4 son requeridos' });

    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Determinar si la tarjeta es default
    const isDefault = !(await Card.findOne({ where: { userId } }));
    const card = await Card.create({ userId, token, last4, expMonth, expYear, brand, isDefault });
    res.json({ ok: true, card });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo agregar tarjeta' });
  }
});

module.exports = router;
