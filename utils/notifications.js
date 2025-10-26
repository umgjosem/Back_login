// utils/notifications.js
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let transporter = null;
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: +process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendRegistrationEmail(email, nombre) {
  const html = `<h3>Hola ${nombre},</h3>
    <p>Tu cuenta fue creada exitosamente.</p>
    <p>¡Bienvenido al sistema Parqueo Arquitectura 🚗!</p>`;

  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Confirmación de registro - Parqueo Arquitectura',
        html
      });
      console.log(`Correo enviado vía SMTP a ${email}`);
      return;
    }

    if (resend) {
      await resend.emails.send({
        from: 'no-reply@parqueo-arquitectura.com',
        to: email,
        subject: 'Confirmación de registro - Parqueo Arquitectura',
        html
      });
      console.log(`Correo enviado vía Resend a ${email}`);
      return;
    }

    console.warn('No hay método de envío configurado (SMTP ni Resend).');
  } catch (err) {
    console.error('Error al enviar correo de registro:', err.message || err);
  }
}

/**
 * Envía correo con link a factura (no adjunto).
 * attachments puede seguir existiendo para local testing; en Render usaremos el link.
 */
async function sendInvoiceEmail({ to, subject, text, invoiceFilename }) {
  if (!to) {
    console.warn('No email destino provisto, se salta envío.');
    return;
  }

  // Genera link absoluto a la factura
  const base = process.env.SERVICE_BASE_URL || `http://localhost:${process.env.PORT || 8082}`;
  const invoiceUrl = `${base}/invoices/${invoiceFilename}`;

  const html = `
    <p>${text}</p>
    <p>Puede descargar su factura aquí: <a href="${invoiceUrl}">Descargar factura</a></p>
    <p>Gracias por usar Parqueo Arquitectura.</p>
  `;

  try {
    if (transporter) {
      await transporter.sendMail({
        from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html
      });
      console.log('Correo de factura enviado vía SMTP a', to);
      return;
    }

    if (resend) {
      await resend.emails.send({
        from: 'no-reply@parqueo-arquitectura.com',
        to,
        subject,
        html
      });
      console.log('Correo de factura enviado vía Resend a', to);
      return;
    }

    console.warn('No hay método de envío configurado (SMTP ni Resend).');
  } catch (err) {
    console.error('Error al enviar correo de factura:', err.message || err);
  }
}

async function sendSms(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    console.warn('Twilio no configurado; SMS simulado:', to, body);
    return { simulated: true };
  }
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const msg = await client.messages.create({ body, from: process.env.TWILIO_FROM, to });
  return msg;
}

async function generateInvoicePDF({ ticket, payment }) {
  const filename = `invoice-${payment.id}.pdf`;
  const dir = path.join(__dirname, '..', 'invoices');
  fs.mkdirSync(dir, { recursive: true });
  const outPath = path.join(dir, filename);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(outPath));
  doc.fontSize(20).text('Factura - Parqueo Arquitectura', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Ticket: ${payment.ticketIdOrigen}`);
  doc.text(`Fecha: ${new Date().toLocaleString()}`);
  doc.text(`Monto: Q${payment.amount}`);
  doc.text(`Transacción: ${payment.providerResponse.transactionId || payment.providerResponse.raw?.id || ''}`);
  doc.end();

  // esperar a que se escriba el archivo (mejor que timeout fijo en production)
  await new Promise((resolve, reject) => {
    const check = setInterval(() => {
      if (fs.existsSync(outPath)) {
        clearInterval(check);
        resolve();
      }
    }, 100);
    // time out 5s
    setTimeout(() => {
      clearInterval(check);
      if (fs.existsSync(outPath)) resolve();
      else reject(new Error('Timeout writing PDF'));
    }, 5000);
  });

  return { outPath, filename };
}

module.exports = {
  sendRegistrationEmail,
  sendInvoiceEmail,
  sendSms,
  generateInvoicePDF
};
