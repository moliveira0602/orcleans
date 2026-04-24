interface EmailTemplateProps {
  title: string;
  content: string;
  details?: { label: string; value: string }[];
  ctaText?: string;
  ctaUrl?: string;
}

export const getBaseTemplate = ({ title, content, details, ctaText, ctaUrl }: EmailTemplateProps) => {
  const detailsHtml = details 
    ? details.map(d => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
            <strong style="color: rgba(255,255,255,0.5); font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">${d.label}</strong>
            <div style="color: #FFFFFF; font-size: 15px; padding-top: 4px;">${d.value}</div>
          </td>
        </tr>
      `).join('')
    : '';

  const ctaHtml = ctaText && ctaUrl 
    ? `
        <tr>
          <td align="center" style="padding-top: 40px;">
            <a href="${ctaUrl}" style="background-color: #FFFFFF; color: #000000; padding: 16px 32px; border-radius: 12px; font-weight: 700; text-decoration: none; font-size: 16px; display: inline-block;">
              ${ctaText}
            </a>
          </td>
        </tr>
      `
    : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ORCA Lens</title>
</head>
<body style="margin: 0; padding: 0; background-color: #05070A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #05070A;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A; border-radius: 24px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
                    <!-- Header -->
                    <tr>
                        <td align="center" style="padding: 60px 40px 40px; background: linear-gradient(180deg, #000000 0%, #0A0A0A 100%);">
                            <img src="https://orcaleads.online/images/ORCA-white.png" alt="ORCA" width="140" style="display: block;">
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 60px;">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding-bottom: 24px;">
                                        <h1 style="color: #FFFFFF; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -1px; line-height: 1.2;">${title}</h1>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="color: rgba(255, 255, 255, 0.7); font-size: 17px; line-height: 1.6; padding-bottom: 32px;">
                                        ${content.replace(/\n/g, '<br>')}
                                    </td>
                                </tr>
                                
                                ${detailsHtml ? `
                                <tr>
                                    <td style="background-color: rgba(255, 255, 255, 0.03); border-radius: 16px; padding: 32px; border: 1px solid rgba(255, 255, 255, 0.05);">
                                        <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                            ${detailsHtml}
                                        </table>
                                    </td>
                                </tr>
                                ` : ''}
                                
                                ${ctaHtml}
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td align="center" style="padding: 40px; background-color: rgba(255, 255, 255, 0.02); border-top: 1px solid rgba(255, 255, 255, 0.05);">
                            <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin: 0; padding-bottom: 12px; font-weight: 500;">
                                ORCA Lens &copy; 2026. Todos os direitos reservados.
                            </p>
                            <p style="color: rgba(255, 255, 255, 0.4); font-size: 13px; margin: 0;">
                                <a href="https://orcaleads.online" style="color: #00FF80; text-decoration: none; font-weight: 600;">orcaleads.online</a>
                            </p>
                        </td>
                    </tr>
                </table>
                
                <table width="600" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td align="center" style="padding-top: 30px;">
                            <p style="color: rgba(255, 255, 255, 0.3); font-size: 11px; margin: 0; line-height: 1.4;">
                                Inteligência comercial que opera abaixo da superfície.<br>
                                Este é um email automático. Por favor, não responda diretamente.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
  `;
};
