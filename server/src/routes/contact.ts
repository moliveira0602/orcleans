import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';
import { getBaseTemplate } from '../utils/emailTemplates';
import { prisma } from '../config/database';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { name, email, company, phone, message, website } = req.body;

  // Honeypot check
  if (website) {
    console.log('[SPAM] Honeypot field filled. Silently ignoring.');
    return res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  }

  // Basic validation
  if (!name || !email || !company) {
    return res.status(400).json({ 
      success: false, 
      message: 'Por favor, preencha todos os campos obrigatórios (Nome, Email e Empresa).' 
    });
  }

  try {
    // Save to database
    const isDemo = message && message.includes('[PEDIDO DE DEMO]');
    await prisma.orcaLead.create({
      data: {
        name,
        email,
        company,
        phone: phone || '',
        message: message || '',
        type: isDemo ? 'demo' : 'contact',
        source: 'landing_page'
      }
    });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const subject = isDemo ? `Novo Pedido de Demo - ${name}` : `Novo Contacto - ${name}`;

    // 1. Internal notification for ORCA Team
    const adminMailOptions = {
      from: `"ORCA Lens" <${process.env.SMTP_USER || 'no-reply@orcaleads.online'}>`,
      to: 'contacto@orcaleads.online',
      subject: subject,
      html: getBaseTemplate({
        title: subject,
        content: `Recebeu uma nova submissão do formulário de ${isDemo ? 'demo' : 'contacto'} na Landing Page.`,
        details: [
          { label: 'Nome', value: name },
          { label: 'Email', value: email },
          { label: 'Empresa', value: company },
          { label: 'Telefone', value: phone || 'Não fornecido' },
          { label: 'Mensagem', value: message || 'Sem mensagem adicional.' }
        ]
      }),
      replyTo: email,
    };

    // 2. Confirmation for the Client
    const clientMailOptions = {
      from: `"ORCA Lens" <${process.env.SMTP_USER || 'no-reply@orcaleads.online'}>`,
      to: email,
      subject: isDemo ? 'O seu pedido de demo na ORCA' : 'Obrigado pelo seu contacto - ORCA',
      html: getBaseTemplate({
        title: isDemo ? 'Quase lá!' : 'Recebemos a sua mensagem',
        content: isDemo 
          ? `Olá ${name.split(' ')[0]},\n\nObrigado pelo seu interesse na ORCA. Recebemos o seu pedido de demo e a nossa equipa de especialistas irá analisar o perfil da sua empresa.\n\nEntraremos em contacto em breve para agendar uma demonstração personalizada das nossas ferramentas de inteligência comercial.`
          : `Olá ${name.split(' ')[0]},\n\nRecebemos a sua mensagem e agradecemos o seu contacto. A nossa equipa irá analisar a sua solicitação e responderemos o mais breve possível (geralmente em menos de 24 horas).`,
        ctaText: 'Ver plataforma',
        ctaUrl: 'https://orcaleads.online'
      })
    };

    // Send both emails
    await Promise.all([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(clientMailOptions)
    ]);
    
    console.log(`[CONTACT] Emails sent successfully to team and client (${email})`);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error) {
    console.error('[CONTACT] Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ocorreu um erro ao processar o seu contacto. Por favor, tente novamente mais tarde.' 
    });
  }
});


export default router;
