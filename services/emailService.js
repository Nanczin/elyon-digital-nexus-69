const nodemailer = require('nodemailer');

// Configuração do transportador SMTP para o Gmail com Senha de App
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // Use 'true' para porta 465, 'false' para outras portas como 587
  auth: {
    user: process.env.MAIL_USER, // Seu e-mail do Gmail
    pass: process.env.MAIL_PASS, // Sua Senha de App do Gmail
  },
});

/**
 * Envia um e-mail transacional.
 * @param {object} options - Opções do e-mail.
 * @param {string} options.to - Endereço de e-mail do destinatário.
 * @param {string} options.subject - Assunto do e-mail.
 * @param {string} options.html - Conteúdo do e-mail em HTML.
 * @returns {Promise<object>} - Informações sobre o e-mail enviado.
 */
async function sendEmail({ to, subject, html }) {
  if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
    throw new Error('Variáveis de ambiente MAIL_USER e MAIL_PASS não configuradas.');
  }

  const mailOptions = {
    from: `Elyon Digital <${process.env.MAIL_USER}>`, // Remetente
    to,
    subject,
    html,
  };

  console.log(`Tentando enviar e-mail para: ${to} com assunto: "${subject}"`);
  const info = await transporter.sendMail(mailOptions);
  console.log('E-mail enviado: %s', info.messageId);
  return info;
}

module.exports = {
  sendEmail,
};