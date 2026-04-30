const { Resend } = require('resend');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('\n========== CORREO ELECTRÓNICO ==========');
    console.log(`PARA: ${to}`);
    console.log(`ASUNTO: ${subject}`);
    console.log('========================================\n');
    return true;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'FastFood App <onboarding@resend.dev>',
      to,
      subject,
      html: htmlContent,
    });

    if (error) {
      console.error('Error al enviar correo:', error);
      return false;
    }

    console.log(`Correo enviado: ${data.id}`);
    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
};

module.exports = { sendEmail };
