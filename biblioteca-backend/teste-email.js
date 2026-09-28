require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const emailDestino = (process.env.EMAIL_USER || '').toLowerCase().trim();

console.log('🔍 A testar envio via Resend (HTTPS)...');
console.log('   API Key:', process.env.RESEND_API_KEY?.substring(0, 12) + '...');
console.log('   Destino:', emailDestino);

async function testar() {
  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [emailDestino],
      subject: '✅ Teste do Sistema de Biblioteca AT',
      html: '<h1>Olá!</h1><p>Se estás a ler isto, o envio de emails está a funcionar!</p>'
    });

    if (result.error) {
      console.error('❌ ERRO do Resend:', result.error.message);
      process.exit(1);
    }

    console.log('✅ Email enviado com sucesso!');
    console.log('   ID:', result.data?.id);
    console.log('📬 Verifica a caixa de entrada de', emailDestino);
    process.exit(0);
  } catch (err) {
    console.error('❌ ERRO:', err.message);
    process.exit(1);
  }
}

testar();