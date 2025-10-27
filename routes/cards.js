// ===============================
// Dependencias y configuración
// ===============================
const express = require('express');
const router = express.Router();
const { Card, User } = require('../models'); // Importamos modelos
const auth = require('../middlewares/auth'); // Middleware para validar JWT

/**
 * @swagger
 * tags:
 *   name: Cards
 *   description: Endpoints para manejo de tarjetas de usuario
 */

// ===============================
// POST /cards/add
// Agregar una nueva tarjeta para el usuario autenticado
// ===============================
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
    // Extraemos datos del body
    const { token, last4, expMonth, expYear, brand } = req.body;

    // Validamos campos obligatorios
    if (!token || !last4) {
      return res.status(400).json({ message: 'token y last4 son requeridos' });
    }

    // Obtenemos el ID del usuario desde el JWT
    const userId = req.user.id;

    // Verificamos que el usuario exista
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    // Si es la primera tarjeta del usuario → la marcamos como default
    const isDefault = !(await Card.findOne({ where: { userId } }));

    // Creamos la tarjeta en BD
    const card = await Card.create({ 
      userId, token, last4, expMonth, expYear, brand, isDefault 
    });

    // Excluimos el campo "token" en la respuesta por seguridad
    const { token: _, ...cardData } = card.toJSON();

    res.json({ ok: true, card: cardData });
  } catch (err) {
    console.error('Error agregando tarjeta:', err);
    res.status(500).json({ error: 'No se pudo agregar tarjeta' });
  }
});

// ===============================
// GET /cards
// Listar todas las tarjetas del usuario autenticado
// ===============================
/**
 * @swagger
 * /cards:
 *   get:
 *     summary: Listar tarjetas del usuario autenticado
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tarjetas
 *       401:
 *         description: No autenticado
 *       500:
 *         description: Error interno
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Buscamos todas las tarjetas de este usuario
    // Excluimos el campo "token" para no exponerlo
    const cards = await Card.findAll({
      where: { userId },
      attributes: { exclude: ['token'] }
    });

    res.json({ ok: true, cards });
  } catch (err) {
    console.error('Error listando tarjetas:', err);
    res.status(500).json({ error: 'No se pudieron obtener las tarjetas' });
  }
});

// ===============================
// DELETE /cards/:id
// Eliminar una tarjeta específica por ID
// ===============================
/**
 * @swagger
 * /cards/{id}:
 *   delete:
 *     summary: Eliminar tarjeta por ID
 *     tags: [Cards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID de la tarjeta
 *     responses:
 *       200:
 *         description: Tarjeta eliminada correctamente
 *       404:
 *         description: Tarjeta no encontrada
 *       500:
 *         description: Error interno
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;   // Usuario autenticado
    const cardId = req.params.id; // ID de la tarjeta desde la URL

    // Buscamos tarjeta que coincida con el id y que sea del usuario
    const card = await Card.findOne({ where: { id: cardId, userId } });

    // Si no existe → error 404
    if (!card) {
      return res.status(404).json({ message: 'Tarjeta no encontrada' });
    }

    // Eliminamos la tarjeta
    await card.destroy();

    res.json({ ok: true, message: 'Tarjeta eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando tarjeta:', err);
    res.status(500).json({ error: 'No se pudo eliminar la tarjeta' });
  }
});

// ===============================
// Exportamos el router
// ===============================
module.exports = router;
