const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Configurar cabeçalhos CORS para permitir requisições das Edge Functions do Supabase
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  // Lidar com requisições OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return res.status(200).send('ok');
  }

  // Garantir que apenas requisições POST sejam processadas
  if (req.method !== 'POST') {
    console.error('EMAIL_SERVICE_DEBUG: Method Not Allowed:', req.method);
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    console.log('EMAIL_SERVICE_DEBUG: Vercel Function api/send-email.js started.');

    const { to, subject, html, sellerUserId, smtpConfig } = req.body;

    // Validação básica dos dados recebidos
    if (!to || !subject || !html || !sellerUserId || !smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
      console.error('EMAIL_SERVICE_DEBUG: Dados de e-mail incompletos recebidos no proxy:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId, smtpConfig });
      return res.status(400).json({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId, smtpConfig.email, smtpConfig.appPassword são obrigatórios)' });
    }

    // Configuração do transportador Nodemailer usando os dados do smtpConfig
    const transporterOptions = {
      host: smtpConfig.host || "smtp.gmail.com",
      port: Number(smtpConfig.port || 465), // Alterado para 465
      secure: smtpConfig.secure !== undefined ? smtpConfig.secure : true, // Garantir true para 465
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.appPassword,
      },
    };

    console.log('EMAIL_SERVICE_DEBUG: Transporter Options (user/pass masked):', JSON.stringify({ ...transporterOptions, auth: { user: transporterOptions.auth.user, pass: '***' } }));

    const transporter = nodemailer.createTransport(transporterOptions);
    const fromAddress = `${smtpConfig.displayName || 'Elyon Digital'} <${smtpConfig.email}>`;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
    };

    console.log('EMAIL_SERVICE_DEBUG: Mail Options:', JSON.stringify(mailOptions));
    console.log(`EMAIL_SERVICE_DEBUG: Tentando enviar e-mail para: ${to} com assunto: "${subject}" (via Vercel Serverless Function)`);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('EMAIL_SERVICE_DEBUG: E-mail enviado: %s', info.messageId);
    
    res.status(200).json({ success: true, message: `E-mail enviado para ${to} com sucesso!`, messageId: info.messageId });
  } catch (error) {
    console.error('EMAIL_SERVICE_DEBUG: Erro ao enviar e-mail via Vercel Serverless Function:', error);
    // Logar detalhes adicionais do erro do Nodemailer, se disponíveis
    if (error.response) {
      console.error('EMAIL_SERVICE_DEBUG: Nodemailer response error:', error.response);
    }
    if (error.responseCode) {
      console.error('EMAIL_SERVICE_DEBUG: Nodemailer response code:', error.responseCode);
    }
    // Retornar um status 500 para indicar falha à Edge Function que chamou
    res.status(500).json({ success: false, error: 'Falha ao enviar e-mail.', details: error.message, nodemailerError: error.response || error.message });
  }
};