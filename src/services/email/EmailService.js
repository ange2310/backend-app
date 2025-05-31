const nodemailer = require('nodemailer');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
  // Para el modo desarrollo, solo mostrar en consola
  if (process.env.EMAIL_SERVICE === 'console' || process.env.NODE_ENV === 'development') {
    console.log('\n========== CORREO ELECTRÓNICO ==========');
    console.log(`PARA: ${to}`);
    console.log(`ASUNTO: ${subject}`);
    console.log('CONTENIDO:');
    console.log(htmlContent);
    console.log('========================================\n');
    return true;
  }

  try {
    // Verificar configuración necesaria
    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER) {
      console.error('Error: Configuración de correo incompleta en .env');
      return false;
    }
    
    // Crear transportador
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
    
    // Configurar remitente
    const from = process.env.EMAIL_FROM || `"FastFood App" <${process.env.EMAIL_USER}>`;
    
    // Enviar correo
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html: htmlContent
    });
    
    console.log(`Correo enviado: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
};

module.exports = { sendEmail };