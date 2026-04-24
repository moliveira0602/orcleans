import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { name, email, company, phone, message } = req.body;

  // Basic validation
  if (!name || !email || !company) {
    return res.status(400).json({ 
      success: false, 
      message: 'Por favor, preencha todos os campos obrigatórios (Nome, Email e Empresa).' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Formato de email inválido.' });
  }

  try {
    // Configure transporter using environment variables
    // These should be configured in Vercel/Environment Variables
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"ORCA Lens" <${process.env.SMTP_USER || 'no-reply@orcalens.com'}>`,
      to: 'moliveira@etos.pt',
      subject: `Novo Contacto - ORCA Lens Landing Page - ${name}`,
      text: `
        Recebeu uma nova mensagem do formulário de contacto da ORCA Lens:

        Nome: ${name}
        Email: ${email}
        Empresa: ${company}
        Telefone: ${phone || 'Não fornecido'}
        
        Mensagem:
        ${message || 'Sem mensagem adicional.'}
      `,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #333; border-bottom: 2px solid #00ff80; padding-bottom: 10px;">Novo Contacto - ORCA Lens</h2>
          <p style="font-size: 16px; color: #555;">Recebeu uma nova mensagem do formulário de contacto da Landing Page:</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 20px;">
            <p><strong>Nome:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Empresa:</strong> ${company}</p>
            <p><strong>Telefone:</strong> ${phone || 'Não fornecido'}</p>
          </div>
          
          <div style="margin-top: 20px;">
            <p><strong>Mensagem:</strong></p>
            <p style="background: #fff; padding: 15px; border: 1px solid #ddd; border-radius: 8px; line-height: 1.6;">${(message || 'Sem mensagem adicional.').replace(/\n/g, '<br>')}</p>
          </div>
          
          <p style="font-size: 12px; color: #999; margin-top: 30px; text-align: center;">
            Este é um email automático enviado pelo servidor da ORCA Lens.
          </p>
        </div>
      `,
      replyTo: email,
    };

    // Verify transporter configuration
    // This is optional but helpful for debugging
    // await transporter.verify();

    await transporter.sendMail(mailOptions);
    
    console.log(`[CONTACT] Email sent successfully from ${email}`);
    res.status(200).json({ success: true, message: 'Mensagem enviada com sucesso.' });
  } catch (error) {
    console.error('[CONTACT] Error sending email:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Ocorreu um erro ao processar o seu contacto. Por favor, tente novamente mais tarde ou escreva diretamente para moliveira@etos.pt.' 
    });
  }
});

export default router;
