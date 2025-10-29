require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env
const express = require('express');
const { sendEmail } = require('./services/emailService'); // Importa o serviço de e-mail

const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON no corpo das requisições
app.use(express.json());

// Endpoint de teste para envio de e-mail
app.get('/send-test-email', async (req, res) => {
  const { to } = req.query;

  if (!to) {
    return res.status(400).json({ error: 'O parâmetro "to" é obrigatório (ex: /send-test-email?to=seuemail@exemplo.com)' });
  }

  try {
    await sendEmail({
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