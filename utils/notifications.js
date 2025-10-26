const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: +process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendRegistrationEmail(email, nombre) {
  const mailOptions = {
    from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Confirmación de registro - Parqueo Arquitectura',
    html: `<h3>Hola ${nombre},</h3><p>Tu cuenta fue creada exitosamente.</p>`
  };
  await transporter.sendMail(mailOptions);
}

async function sendEmailWithAttachment({ to, subject, text, attachments }) {
  if (!to) {
    console.warn('No email destino provisto, se salta envío.');
    return;
  }
  const info = await transporter.sendMail({
    from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
    to, subject, text,
    attachments
  });
  return info;
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
  fs.mkdirSync(dir, exist_ok=True);
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
  // wait for file write
  await new Promise(res => setTimeout(res, 300));
  return outPath;
}

module.exports = { sendRegistrationEmail, sendEmailWithAttachment, sendSms, generateInvoicePDF };