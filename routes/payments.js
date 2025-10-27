// routes/payments.js
// ===============================
// Pagos: cerrar ticket y cobrar usando SOLO el monto_total del ticket
// ===============================

const express = require('express');
const router = express.Router();

// Modelos locales registrados en models/index.js
// ¡OJO!: Usa los nombres EXACTOS exportados en tu index.js (mayúsculas/minúsculas)
const { Payment, Card, Invoice, Ticket, Cliente } = require('../models');

// Utilidades de cobro (Stripe/simulado) y notificaciones/PDF
const { simulateCharge, chargeWithStripe } = require('../utils/charges');
const { generateInvoicePDF, sendEmailWithAttachment, sendSms } = require('../utils/notifications');

// Middleware de autenticación (JWT Bearer)
const auth = require('../middlewares/auth');


/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Endpoints para cerrar tickets y realizar cobros
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CloseTicketRequest:
 *       type: object
 *       properties:
 *         ticketId:
 *           type: integer
 *           example: 5
 *         cardId:
 *           type: integer
 *           example: 1
 *         cardToken:
 *           type: string
 *           example: tok_simulado_abc123
 *       required:
 *         - ticketId
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /payments/close-ticket:
 *   post:
 *     summary: Cerrar ticket y cobrar al usuario
 *     description: >
 *       Toma el **monto_total** ya calculado por la base de datos en el ticket y
 *       realiza el cobro (Stripe o simulado). Registra el Payment, genera la factura (PDF)
 *       y notifica por email/SMS si hay datos disponibles en el cliente.
 *       **No** modifica el estado del espacio. Solo marca el ticket como `Finalizado`.
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CloseTicketRequest'
 *           examples:
 *             conToken:
 *               value:
 *                 ticketId: 5
 *                 cardToken: "tok_simulado_abc123"
 *             conCardId:
 *               value:
 *                 ticketId: 5
 *                 cardId: 1
 *     responses:
 *       200:
 *         description: Pago exitoso y factura generada
 *         content:
 *           application/json:
 *             example:
 *               ok: true
 *               payment:
 *                 id: 123
 *                 ticketIdOrigen: "5"
 *                 userId: 1
 *                 cardToken: "tok_simulado_abc123"
 *                 amount: "35.00"
 *                 status: "Succeeded"
 *               pdfPath: "/tmp/invoice-123.pdf"
 *               ticket:
 *                 id_ticket: 5
 *                 monto_total: "35.00"
 *                 estado: "Finalizado"
 *       400:
 *         description: Datos faltantes o inválidos (sin ticketId, sin tarjeta o monto inválido)
 *       402:
 *         description: Cobro fallido (rechazado por el proveedor)
 *       404:
 *         description: Ticket o Card no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.post('/close-ticket', auth, async (req, res) => {
  try {
    const { ticketId, cardId, cardToken } = req.body;

    if (!ticketId) {
      return res.status(400).json({ message: 'ticketId requerido' });
    }

    // 1. Buscar ticket (puede ser Activo o Finalizado)
    const ticketData = await Ticket.findByPk(ticketId, {
      attributes: ['id_ticket', 'monto_total', 'estado'],
      include: [{ model: Cliente, as: 'cliente' }]
    });

    if (!ticketData) return res.status(404).json({ message: 'Ticket no encontrado' });

    // 2. Validar monto
    const amountStr = ticketData.monto_total != null ? String(ticketData.monto_total) : null;
    const amountNum = amountStr ? parseFloat(amountStr) : NaN;

    if (!amountStr || Number.isNaN(amountNum)) {
      return res.status(400).json({ message: 'El monto del ticket es inválido o no está calculado.' });
    }

    // ⚠️ Caso especial: monto 0 → no generar Payment ni Invoice
    if (amountNum === 0) {
      // Si aún está Activo, lo finalizamos
      if (ticketData.estado === 'Activo') {
        await ticketData.update({ estado: 'Finalizado' });
      }
      return res.status(200).json({
        ok: true,
        message: 'Ticket con monto Q0, no se generó cobro ni factura.',
        ticket: ticketData
      });
    }

    // 3. Seleccionar tarjeta
    let card;
    if (cardToken) {
      card = { token: cardToken, last4: '0000' };
    } else if (cardId) {
      card = await Card.findByPk(cardId);
      if (!card) return res.status(404).json({ message: 'Card no encontrada' });
    } else {
      if (ticketData.cliente && ticketData.cliente.id_cliente) {
        card = await Card.findOne({ where: { userId: ticketData.cliente.id_cliente, isDefault: true } });
      }
      if (!card) return res.status(400).json({ message: 'No hay tarjeta disponible. Envía cardToken o cardId.' });
    }

    // 4. Ejecutar cobro
    let chargeResult;
    if (process.env.STRIPE_SECRET && process.env.STRIPE_SECRET !== '') {
      chargeResult = await chargeWithStripe(card.token, amountStr, { ticketId });
    } else {
      chargeResult = await simulateCharge(card.token, amountStr, { ticketId });
    }

    // 5. Registrar Payment
    const payment = await Payment.create({
      ticketIdOrigen: String(ticketData.id_ticket),
      // ⚠️ ya no guardamos cliente.id_cliente como userId
      userId: null,
      cardToken: card.token,
      amount: amountStr,
      status: chargeResult.success ? 'Succeeded' : 'Failed',
      providerResponse: chargeResult
    });

    if (!chargeResult.success) {
      return res.status(402).json({ message: 'Cobro fallido', chargeResult, payment });
    }

    // 6. Si estaba activo, lo marcamos finalizado (si ya estaba finalizado, no pasa nada)
    if (ticketData.estado === 'Activo') {
      await ticketData.update({ estado: 'Finalizado' });
    }

    // 7. Generar factura
    const pdfPath = await generateInvoicePDF({ ticket: ticketData, payment });
    await Invoice.create({ paymentId: payment.id, ticketIdOrigen: payment.ticketIdOrigen, pdfPath });

    // 8. Notificar al cliente si tiene email/telefono
    if (ticketData.cliente && ticketData.cliente.nombre) {
      if (ticketData.cliente.email) {
        try {
          await sendEmailWithAttachment({
            to: ticketData.cliente.email,
            subject: `Factura Ticket ${payment.ticketIdOrigen}`,
            text: `Se cargó Q${amountStr} por su estadía.`,
            attachments: [{ filename: `invoice-${payment.id}.pdf`, path: pdfPath }]
          });
        } catch (e) {
          console.warn("No se pudo enviar email:", e.message);
        }
      }
      if (ticketData.cliente.telefono) {
        try {
          await sendSms(ticketData.cliente.telefono, `Pago exitoso Q${amountStr} - Ticket ${payment.ticketIdOrigen}`);
        } catch (e) {
          console.warn("No se pudo enviar SMS:", e.message);
        }
      }
    }

    // 9. Respuesta final
    return res.json({ ok: true, payment, pdfPath, ticket: ticketData });

  } catch (err) {
    console.error('Error close-ticket:', err?.message || err);
    return res.status(500).json({ error: 'Error interno', details: err?.message });
  }
});
module.exports = router;