const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Payment, Card, Invoice } = require('../models');
const { simulateCharge, chargeWithStripe } = require('../utils/charges');
const { generateInvoicePDF, sendEmailWithAttachment, sendSms } = require('../utils/notifications');
const auth = require('../middlewares/auth');

const API_BASE = process.env.API_ORIGEN_BASE;

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Endpoints para cerrar tickets y realizar cobros
 */

/**
 * @swagger
 * /payments/close-ticket:
 *   post:
 *     summary: Cerrar ticket y cobrar al usuario
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ticketId:
 *                 type: string
 *               cardId:
 *                 type: integer
 *               cardToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pago exitoso y factura generada
 *       400:
 *         description: Datos faltantes o no hay tarjeta
 *       402:
 *         description: Cobro fallido
 *       500:
 *         description: Error interno
 */
router.post('/close-ticket', auth, async (req, res) => {
  try {
    const { ticketId, cardId, cardToken } = req.body;
    if (!ticketId) return res.status(400).json({ message: 'ticketId requerido' });

    // Obtener ticket de API externa
    const ticketResp = await axios.get(`${API_BASE}/tickets/${ticketId}`);
    const ticket = ticketResp.data.data;

    // Calcular monto a cobrar según horas de estadía
    const entry = new Date(ticket.hora_ingreso);
    const now = new Date();
    const minutes = Math.ceil((now - entry) / 60000);
    const hours = Math.ceil(minutes / 60);
    const amount = (hours * parseFloat(ticket.tarifa.monto_por_hora)).toFixed(2);

    // Obtener tarjeta a cobrar
    let card;
    if (cardToken) {
      card = { token: cardToken, last4: '0000' };
    } else if (cardId) {
      card = await Card.findByPk(cardId);
      if (!card) return res.status(404).json({ message: 'Card no encontrada' });
    } else {
      if (ticket.cliente && ticket.cliente.id_cliente) {
        card = await Card.findOne({ where: { userId: ticket.cliente.id_cliente, isDefault: true }});
      }
      if (!card) return res.status(400).json({ message: 'No hay tarjeta disponible. Enviar cardToken o cardId.' });
    }

    // Realizar cobro (Stripe o simulado)
    let chargeResult;
    if (process.env.STRIPE_SECRET && process.env.STRIPE_SECRET !== '') {
      chargeResult = await chargeWithStripe(card.token, amount, { ticketId });
    } else {
      chargeResult = await simulateCharge(card.token, amount, { ticketId });
    }

    // Guardar payment
    const payment = await Payment.create({
      ticketIdOrigen: String(ticket.id_ticket || ticketId),
      userId: ticket.cliente ? ticket.cliente.id_cliente : null,
      cardToken: card.token,
      amount,
      status: chargeResult.success ? 'Succeeded' : 'Failed',
      providerResponse: chargeResult
    });

    if (!chargeResult.success) {
      return res.status(402).json({ message: 'Cobro fallido', chargeResult, payment });
    }

    // Generar PDF de factura
    const pdfPath = await generateInvoicePDF({ ticket, payment });
    await Invoice.create({ paymentId: payment.id, ticketIdOrigen: payment.ticketIdOrigen, pdfPath });

    // Notificar por email y SMS
    if (ticket.cliente && ticket.cliente.nombre) {
      try {
        await sendEmailWithAttachment({
          to: ticket.cliente.email || null,
          subject: `Factura Ticket ${payment.ticketIdOrigen}`,
          text: `Se cargó Q${amount} por su estadía.`,
          attachments: [{ filename: `invoice-${payment.id}.pdf`, path: pdfPath }]
        });
      } catch(e) {}
      if (ticket.cliente.telefono) {
        await sendSms(ticket.cliente.telefono, `Pago exitoso Q${amount} - Ticket ${payment.ticketIdOrigen}`);
      }
    }

    // Actualizar ticket en API externa
    await axios.put(`${API_BASE}/tickets/${ticketId}`, {
      estado: 'Cerrado',
      monto_total: String(amount),
      horas_estadia: String(hours.toFixed(2))
    }).catch(err => {
      console.warn('No se pudo actualizar ticket en API origen:', err.response?.data || err.message);
    });

    return res.json({ ok: true, payment, pdfPath });
  } catch (err) {
    console.error('Error close-ticket', err.response?.data || err.message || err);
    return res.status(500).json({ error: 'Error interno', details: err.message });
  }
});

module.exports = router;
