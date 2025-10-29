require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const nodemailer = require('nodemailer'); // Importa o nodemailer diretamente aqui

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Middleware para CORS (permitir requisições de qualquer origem para as Edge Functions)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Endpoint para envio de e-mail via proxy
app.post('/send-email', async (req, res) => {
  const { to, subject, html, sellerUserId, smtpConfig } = req.body; // Agora esperando smtpConfig

  if (!to || !subject || !html || !sellerUserId || !smtpConfig || !smtpConfig.email || !smtpConfig.appPassword) {
    console.error('EMAIL_SERVICE_DEBUG: Dados de e-mail incompletos recebidos no proxy:', { to, subject, html: html ? 'HTML_PRESENT' : 'HTML_MISSING', sellerUserId, smtpConfig });
    return res.status(400).json({ success: false, error: 'Dados de e-mail incompletos (to, subject, html, sellerUserId, smtpConfig.email, smtpConfig.appPassword são obrigatórios)' });
  }

  console.log('EMAIL_SERVICE_DEBUG: Received smtpConfig:', JSON.stringify(smtpConfig));

  try {
    const transporterOptions = {
      host: smtpConfig.host || "smtp.gmail.com",
      port: Number(smtpConfig.port || 587),
      secure: smtpConfig.secure, // Corrigido: usar diretamente o valor de smtpConfig.secure
      auth: {
        user: smtpConfig.email,
        pass: smtpConfig.appPassword,
      },
    };

    // Removida a lógica de ajuste de secure/requireTLS baseada na porta,
    // pois smtpConfig.secure já deve vir configurado corretamente do frontend.
    // Se a porta for 587 e secure for false, Nodemailer usará STARTTLS automaticamente.

    console.log('EMAIL_SERVICE_DEBUG: Nodemailer transporter options:', JSON.stringify(transporterOptions));

    const transporter = nodemailer.createTransport(transporterOptions);

    const fromAddress = `${smtpConfig.displayName || 'Elyon Digital'} <${smtpConfig.email}>`;

    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
    };

    console.log(`EMAIL_SERVICE_DEBUG: Tentando enviar e-mail para: ${to} com assunto: "${subject}" (via server.js)`);
    const info = await transporter.sendMail(mailOptions);
    console.log('EMAIL_SERVICE_DEBUG: E-mail enviado: %s', info.messageId);
    
    res.status(200).json({ success: true, message: `E-mail enviado para ${to} com sucesso!`, messageId: info.messageId });
  } catch (error) {
    console.error('EMAIL_SERVICE_DEBUG: Erro ao enviar e-mail via server.js:', error);
    // Log more details from Nodemailer error if available
    if (error.response) {
      console.error('EMAIL_SERVICE_DEBUG: Nodemailer response error:', error.response);
    }
    if (error.responseCode) {
      console.error('EMAIL_SERVICE_DEBUG: Nodemailer response code:', error.responseCode);
    }
    res.status(500).json({ success: false, error: 'Falha ao enviar e-mail.', details: error.message, nodemailerError: error.response || error.message });
  }
});

// Endpoint de teste para envio de e-mail (mantido para testes diretos)
app.get('/send-test-email', async (req, res) => {
  const { to } = req.query;

  if (!to) {
    return res.status(400).json({ error: 'O parâmetro "to" é obrigatório (ex: /send-test-email?to=seuemail@exemplo.com)' });
  }

  try {
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;
    const defaultDisplayName = 'Elyon Digital';

    if (!mailUser || !mailPass) {
      return res.status(500).json({ error: 'Variáveis de ambiente MAIL_USER e MAIL_PASS não configuradas no server.js.' });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });

    await transporter.sendMail({
      from: `${defaultDisplayName} <${mailUser}>`,
      to: String(to),
      subject: 'Email de Teste da Elyon Digital! ✅',
      html: `
        <h1>Olá!</h1>
        <p>Este é um e-mail de teste enviado com sucesso do seu serviço de backend da Elyon Digital.</p>
        <p>Se você recebeu este e-mail, sua configuração de SMTP com Senha de App está funcionando!</p>
        <br/>
        <p>Atenciosamente,</p>
        <p>Equipe Elyon Digital</p>
      `,
    });
    res.status(200).json({ message: `E-mail de teste enviado para ${to} com sucesso!` });
  } catch (error) {
    console.error('Erro ao enviar e-mail de teste:', error);
    res.status(500).json({ error: 'Falha ao enviar e-mail de teste.', details: error.message });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor de e-mail rodando em http://localhost:${port}`);
  console.log(`Teste o envio de e-mail acessando: http://localhost:${port}/send-test-email?to=seuemail@exemplo.com`);
});