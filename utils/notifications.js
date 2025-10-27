// ===============================
// Dependencias
// ===============================
const nodemailer = require('nodemailer');   // Para envío de correos electrónicos
const PDFDocument = require('pdfkit');      // Para generar facturas PDF
const fs = require('fs');                   // Manejo de archivos locales
const path = require('path');               // Construcción de rutas
const twilio = require('twilio');           // Envío de SMS con Twilio

// ===============================
// Configuración del transporter SMTP (Nodemailer)
// ===============================
// Render puede bloquear algunos puertos. Asegúrate de usar TLS (587).
// Recomendado: usar un servicio confiable como Gmail con App Password o SendGrid.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,   // ej: smtp.gmail.com
  port: +process.env.SMTP_PORT,  // ej: 587
  secure: false,                 // STARTTLS
  auth: {
    user: process.env.SMTP_USER, // correo emisor
    pass: process.env.SMTP_PASS  // contraseña o app password
  }
});

// ===============================
// Enviar correo de registro
// ===============================
async function sendRegistrationEmail(email, nombre) {
  const mailOptions = {
    from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Confirmación de registro - Parqueo Arquitectura',
    html: `
      <div style="font-family: Arial, sans-serif; background-color: #f4f6f9; padding: 20px;">
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">
          <div style="background: #004aad; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0;">Bienvenido a Parqueo Arquitectura</h2>
          </div>
          <div style="padding: 20px; color: #333333; line-height: 1.6;">
            <h3 style="color:#004aad;">Hola ${nombre},</h3>
            <p>Tu cuenta fue creada exitosamente. A partir de ahora podrás acceder a todos los servicios de nuestro sistema de parqueo.</p>
            <p style="margin-top: 20px;">Estamos muy felices de tenerte con nosotros 🚗</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="https://tu-dominio.com/login" 
                 style="background: #004aad; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Iniciar Sesión
              </a>
            </div>
            <p style="font-size: 12px; color: #888;">Si no creaste esta cuenta, por favor ignora este correo.</p>
          </div>
          <div style="background: #f0f0f0; color: #555; text-align: center; font-size: 12px; padding: 15px;">
            &copy; ${new Date().getFullYear()} Parqueo Arquitectura. Todos los derechos reservados.
          </div>
        </div>
      </div>
    `
  };

  // No bloqueamos el flujo principal con await, solo loggeamos el resultado.
  transporter.sendMail(mailOptions)
    .then(info => console.log(`Correo de registro enviado a ${email}`, info.response))
    .catch(err => console.error('Error enviando correo de registro:', err.message));
}


// ===============================
// Enviar correo con adjunto (ej. factura PDF)
// ===============================
async function sendEmailWithAttachment({ to, subject, text, attachments }) {
  if (!to) {
    console.warn('No email destino provisto; se salta envío.');
    return;
  }

  transporter.sendMail({
    from: `"Parqueo Arquitectura" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    attachments
  })
  .then(info => console.log(`Correo con adjunto enviado a ${to}`, info.response))
  .catch(err => console.error('Error enviando correo con adjunto:', err.message));
}

// ===============================
// Enviar SMS con Twilio
// ===============================
async function sendSms(to, body) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    // Render no siempre permite Twilio → simulamos en desarrollo
    console.warn('Twilio no configurado; SMS simulado:', to, body);
    return { simulated: true };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

  client.messages.create({ body, from: process.env.TWILIO_FROM, to })
    .then(msg => console.log(`SMS enviado a ${to}`, msg.sid))
    .catch(err => console.error('Error enviando SMS:', err.message));
}

// ===============================
// Generar factura PDF y guardarla en disco
// ===============================
async function generateInvoicePDF({ ticket, payment }) {
  const filename = `invoice-${payment.id}.pdf`;
  const dir = path.join(__dirname, '..', 'invoices');

  // Crear carpeta si no existe (recursive:true evita errores)
  fs.mkdirSync(dir, { recursive: true });

  const outPath = path.join(dir, filename);
  const doc = new PDFDocument();

  // Guardar PDF en un archivo
  doc.pipe(fs.createWriteStream(outPath));

  // Contenido de la factura
  doc.fontSize(20).text('Factura - Parqueo Arquitectura', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Ticket: ${payment.ticketIdOrigen}`);
  doc.text(`Fecha: ${new Date().toLocaleString()}`);
  doc.text(`Monto: Q${payment.amount}`);
  doc.text(
    `Transacción: ${payment.providerResponse.transactionId || 
      payment.providerResponse.raw?.id || ''}`
  );
  doc.end();

  // Esperar a que termine de escribir antes de devolver la ruta
  await new Promise(res => setTimeout(res, 300));

  return outPath;
}

// ===============================
// Exportamos las utilidades
// ===============================
module.exports = { 
  sendRegistrationEmail, 
  sendEmailWithAttachment, 
  sendSms, 
  generateInvoicePDF 
};
