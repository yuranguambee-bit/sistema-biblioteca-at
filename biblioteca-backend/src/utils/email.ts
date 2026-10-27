import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

interface DadosEmprestimo {
  clienteNome: string;
  clienteEmail: string;
  obraTitulo: string;
  obraAutor: string | null;
  obraEditora: string | null;
  dataEmprestimo: string;
  dataPrevistaDevolucao: string;
  diasEmprestimo: number;
  valorMultaDia: number;
}

export async function enviarEmailEmprestimo(dados: DadosEmprestimo): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.log('⚠️  Resend API Key não configurada. A saltar envio.');
    return false;
  }

  if (!dados.clienteEmail) {
    console.log('⚠️  Cliente não tem email. A saltar envio.');
    return false;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f3f4f6; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #003366 0%, #004080 100%); color: #fff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; }
        .header p { margin: 6px 0 0 0; font-size: 13px; color: #c7d9f0; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 16px; }
        .info-box { background: #f9fafb; border-left: 4px solid #003366; padding: 16px; border-radius: 6px; margin: 20px 0; }
        .info-row { padding: 8px 0; border-bottom: 1px dashed #e5e7eb; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .info-row strong { color: #003366; display: inline-block; min-width: 140px; }
        .dates { display: flex; gap: 12px; margin: 20px 0; }
        .date-card { flex: 1; padding: 14px; border-radius: 8px; text-align: center; }
        .date-card.blue { background: #eff6ff; }
        .date-card.red { background: #fef2f2; }
        .date-card p { margin: 0; font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: 700; letter-spacing: 0.5px; }
        .date-card h3 { margin: 6px 0 0 0; font-size: 16px; }
        .date-card.blue h3 { color: #1e40af; }
        .date-card.red h3 { color: #b91c1c; }
        .rules { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; margin: 20px 0; font-size: 13px; color: #78350f; }
        .rules p { margin: 0 0 8px 0; font-weight: bold; }
        .rules ul { margin: 0; padding-left: 20px; }
        .rules li { margin-bottom: 4px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📚 Autoridade Tributária de Moçambique</h1>
          <p>Sistema de Gestão de Biblioteca</p>
        </div>

        <div class="content">
          <p class="greeting">Olá <strong>${dados.clienteNome}</strong>,</p>
          <p style="color:#4b5563; font-size:14px; margin-bottom: 20px;">
            Confirmamos o teu empréstimo na biblioteca da AT Moçambique. 
            Aqui estão os detalhes:
          </p>

          <div class="info-box">
            <div class="info-row"><strong>📖 Obra</strong> ${dados.obraTitulo}</div>
            ${dados.obraAutor ? `<div class="info-row"><strong>✍️ Autor</strong> ${dados.obraAutor}</div>` : ''}
            ${dados.obraEditora ? `<div class="info-row"><strong>🏢 Editora</strong> ${dados.obraEditora}</div>` : ''}
          </div>

          <div class="dates">
            <div class="date-card blue">
              <p>Data do Empréstimo</p>
              <h3>${dados.dataEmprestimo}</h3>
            </div>
            <div class="date-card red">
              <p>Devolver até</p>
              <h3>${dados.dataPrevistaDevolucao}</h3>
            </div>
          </div>

          <div class="rules">
            <p>⚠️ Informações Importantes</p>
            <ul>
              <li>Prazo de empréstimo: <strong>${dados.diasEmprestimo} dias</strong></li>
              <li>Multa por atraso: <strong>${dados.valorMultaDia} MT / dia</strong></li>
              <li>Em caso de atraso, o valor será calculado automaticamente</li>
              <li>Apresenta o comprovativo na devolução da obra</li>
            </ul>
          </div>

          <p style="color:#6b7280; font-size:13px; text-align:center; margin-top: 24px;">
            Em caso de dúvidas, contacta a biblioteca da AT Moçambique.
          </p>
        </div>

        <div class="footer">
          <p>Este é um email automático. Por favor, não respondas.</p>
          <p style="margin-top: 8px;">© ${new Date().getFullYear()} Autoridade Tributária de Moçambique</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [dados.clienteEmail],
      subject: `📚 Empréstimo Confirmado — ${dados.obraTitulo}`,
      html,
    });

    if (result.error) {
      console.error(`❌ Erro do Resend:`, result.error.message);
      return false;
    }

    console.log(`✅ Email enviado para ${dados.clienteEmail} (id: ${result.data?.id})`);
    return true;
  } catch (error: any) {
    console.error(`❌ Erro ao enviar email:`, error.message);
    return false;
  }
}

// ============ BACKUP ============
interface DadosBackup {
  destinatario: string;
  dataBackup: string;
  conteudo: any;
}

export async function enviarEmailBackup({ destinatario, dataBackup, conteudo }: DadosBackup): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  if (!destinatario) return false;

  const json = JSON.stringify(conteudo, null, 2);
  const buffer = Buffer.from(json, 'utf-8');
  const tamanhoKB = (buffer.length / 1024).toFixed(2);
  const nomeFicheiro = `backup_biblioteca_at_${new Date().toISOString().slice(0, 10)}.json`;

  try {
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [destinatario],
      subject: `💾 Backup Automático — Biblioteca AT (${dataBackup})`,
      html: `<p>Segue em anexo o backup do sistema gerado em ${dataBackup}.</p>`,
      attachments: [{ filename: nomeFicheiro, content: buffer }],
    });
    return !result.error;
  } catch (error) {
    return false;
  }
}

// ============ NOVAS NOTIFICAÇÕES AUTOMÁTICAS ============

export async function enviarEmailLembrete({ clienteNome, clienteEmail, obraTitulo, dataPrevista }: any): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !clienteEmail) return false;
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [clienteEmail],
      subject: `⏰ Lembrete de Devolução — ${obraTitulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #003366;">Olá ${clienteNome},</h2>
          <p style="font-size: 16px; color: #333;">Este é um lembrete amigável de que o prazo de devolução da obra <strong>"${obraTitulo}"</strong> termina em breve.</p>
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 18px; color: #78350f;"><strong>Data de Devolução:</strong> ${dataPrevista}</p>
          </div>
          <p style="color: #666;">Por favor, dirige-te à biblioteca para efetuar a devolução e evitar multas por atraso.</p>
        </div>
      `,
    });
    return true;
  } catch (error) { return false; }
}

export async function enviarEmailAtraso({ clienteNome, clienteEmail, obraTitulo, dataPrevista, diasAtraso, multa }: any): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !clienteEmail) return false;
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [clienteEmail],
      subject: `🚨 Aviso de Atraso — ${obraTitulo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #b91c1c;">Olá ${clienteNome},</h2>
          <p style="font-size: 16px; color: #333;">Verificámos que a obra <strong>"${obraTitulo}"</strong> se encontra em atraso desde o dia <strong>${dataPrevista}</strong>.</p>
          <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #991b1b;"><strong>Dias em atraso:</strong> ${diasAtraso} dias</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; color: #991b1b;"><strong>Multa acumulada:</strong> ${multa} MT</p>
          </div>
          <p style="color: #666;">Por favor, devolve a obra o mais breve possível para travar o valor da multa.</p>
        </div>
      `,
    });
    return true;
  } catch (error) { return false; }
}

export async function enviarEmailReservaDisponivel({ clienteNome, clienteEmail, obraTitulo }: any): Promise<boolean> {
  if (!process.env.RESEND_API_KEY || !clienteEmail) return false;
  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: [clienteEmail],
      subject: `🎉 Boa Notícia! O livro "${obraTitulo}" está disponível`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Olá ${clienteNome},</h2>
          <p style="font-size: 16px; color: #333;">A obra <strong>"${obraTitulo}"</strong> que reservaste acabou de ser devolvida e já está disponível na biblioteca!</p>
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px; color: #065f46;"><strong>Atenção:</strong> A obra está reservada em teu nome. Passa na biblioteca para a requisitar.</p>
          </div>
        </div>
      `,
    });
    return true;
  } catch (error) { return false; }
}