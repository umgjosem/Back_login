const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * @swagger
 * tags:
 *   name: Invoices
 *   description: Endpoints para descargar facturas
 */

/**
 * @swagger
 * /invoices/{name}:
 *   get:
 *     summary: Descargar factura por nombre de archivo
 *     tags: [Invoices]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nombre del archivo PDF de la factura
 *     responses:
 *       200:
 *         description: Devuelve archivo PDF
 *       404:
 *         description: Factura no encontrada
 */
router.get('/:name', (req, res) => {
  const name = req.params.name;
  const file = path.join(__dirname, '..', 'invoices', name);
  res.sendFile(file, err => {
    if (err) res.status(404).json({ message: 'Factura no encontrada' });
  });
});

module.exports = router;
