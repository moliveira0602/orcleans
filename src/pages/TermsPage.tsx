export default function TermsPage() {
    return (
        <div className="legal-page">
            <div className="legal-header">
                <div className="legal-header-bg" />
                <div className="container">
                    <a href="/" className="legal-back-btn">← Voltar</a>
                    <h1>Termos de Uso</h1>
                    <p>Última atualização: Abril de 2026</p>
                </div>
            </div>
            <div className="container">
                <div className="legal-content">
                    <section>
                        <h2>1. Aceitação dos Termos</h2>
                        <p>Ao acessar ou utilizar a plataforma ORCA, operada pela ETOS ("nós", "nosso"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não utilize a plataforma.</p>
                    </section>
                    <section>
                        <h2>2. Descrição do Serviço</h2>
                        <p>A ORCA é uma plataforma de inteligência comercial B2B que permite a análise de dados de mercado, identificação de leads, qualificação prospectiva e ferramentas de gestão de vendas. Os serviços incluem, mas não se limitam a:</p>
                        <ul>
                            <li>Importação e gerenciamento de listas de contatos comerciais.</li>
                            <li>Análise geográfica de leads.</li>
                            <li>Segmentação automática de públicos.</li>
                            <li>Pipeline de vendas e acompanhamento de funil.</li>
                            <li>Varredura Sonar para descoberta de oportunidades.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>3. Registro e Conta</h2>
                        <p>Para utilizar os serviços da ORCA, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por:</p>
                        <ul>
                            <li>Manter a confidencialidade de suas credenciais de acesso.</li>
                            <li>Todas as atividades realizadas sob sua conta.</li>
                            <li>Notificar-nos imediatamente sobre qualquer uso não autorizado.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>4. Uso Permitido e Proibido</h2>
                        <p>Você concorda em utilizar a plataforma somente para fins legítimos e de acordo com estes termos e com a legislação aplicável. É proibido:</p>
                        <ul>
                            <li>Utilizar os dados coletados para envio de spam ou práticas antiéticas.</li>
                            <li>Revender, redistribuir ou sublicenciar o acesso à plataforma.</li>
                            <li>Realizar engenharia reversa, descompilar ou tentar acessar o código-fonte.</li>
                            <li>Utilizar a plataforma para fins ilegais ou em desacordo com o RGPD/LGPD.</li>
                            <li>Interferir com a segurança ou o desempenho da plataforma.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>5. Propriedade Intelectual</h2>
                        <p>Todo o conteúdo, código-fonte, design, marcas e funcionalidades da plataforma ORCA são de propriedade exclusiva da ETOS e protegidos pelas leis de propriedade intelectual aplicáveis. Você não adquire qualquer direito de propriedade sobre a plataforma.</p>
                    </section>
                    <section>
                        <h2>6. Dados e Privacidade</h2>
                        <p>O tratamento de dados pessoais é regido pela nossa <a href="/privacidade">Política de Privacidade</a>. Ao utilizar a plataforma, você consente com as práticas descritas nessa política.</p>
                    </section>
                    <section>
                        <h2>7. Plano e Pagamento</h2>
                        <p>A ORCA oferece um período de teste gratuito. Após o período de avaliação, o acesso pode estar sujeito a assinatura com planos e preços definidos. Valores e condições serão comunicados previamente na plataforma.</p>
                    </section>
                    <section>
                        <h2>8. Disponibilidade do Serviço</h2>
                        <p>Nos esforçamos para manter a plataforma disponível de forma contínua, mas não garantimos acesso ininterrupto. A ORCA pode realizar manutenções programadas ou emergenciais sem aviso prévio quando necessário.</p>
                    </section>
                    <section>
                        <h2>9. Limitação de Responsabilidade</h2>
                        <p>A ORCA não será responsável por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso da plataforma. A responsabilidade total da ETOS é limitada ao valor pago pelo usuário nos últimos 12 meses.</p>
                    </section>
                    <section>
                        <h2>10. Rescisão</h2>
                        <p>A ETOS pode suspender ou encerrar sua conta a qualquer momento, com ou sem aviso prévio, em caso de violação destes termos. Você pode encerrar sua conta a qualquer momento solicitando a exclusão dos seus dados através de <a href="mailto:moliveira@etos.pt">moliveira@etos.pt</a>.</p>
                    </section>
                    <section>
                        <h2>11. Alterações nos Termos</h2>
                        <p>Estes termos podem ser atualizados periodicamente. Notificaremos os usuários sobre mudanças significativas. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.</p>
                    </section>
                    <section>
                        <h2>12. Legislação Aplicável</h2>
                        <p>Estes termos são regidos pelas leis portuguesas e pela legislação europeia aplicável. Qualquer disputa será submetida à jurisdição exclusiva dos tribunais de Portugal.</p>
                    </section>
                    <section>
                        <h2>13. Contato</h2>
                        <p>Para dúvidas sobre estes termos, entre em contato:</p>
                        <p><strong>E-mail:</strong> <a href="mailto:moliveira@etos.pt">moliveira@etos.pt</a></p>
                        <p><strong>Empresa:</strong> ETOS</p>
                    </section>
                </div>
            </div>

            <style>{`
                .legal-page {
                    min-height: 100vh;
                    background: #0A0A0A;
                    color: #EAF6FF;
                    font-family: 'Satoshi', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                }
                .legal-header {
                    position: relative;
                    padding: 120px 24px 60px;
                    text-align: center;
                }
                .legal-header-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                }
                .legal-header-bg::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 50% 0%, rgba(51, 51, 51, 0.5) 0%, #0A0A0A 80%);
                }
                .legal-header-bg::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                    background-size: 60px 60px;
                    opacity: 0.3;
                }
                .legal-header .container {
                    position: relative;
                    z-index: 1;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .legal-header h1 {
                    font-family: 'Satoshi', sans-serif;
                    font-size: clamp(28px, 5vw, 42px);
                    font-weight: 700;
                    color: #EAF6FF;
                    margin-bottom: 8px;
                }
                .legal-header p {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                }
                .legal-back-btn {
                    display: inline-block;
                    margin-bottom: 24px;
                    color: rgba(255, 255, 255, 0.6);
                    text-decoration: none;
                    font-size: 14px;
                    transition: color 0.2s;
                }
                .legal-back-btn:hover { color: var(--orca-accent); }
                .legal-content {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px 24px 120px;
                }
                .legal-content section {
                    margin-bottom: 40px;
                }
                .legal-content h2 {
                    font-family: 'Satoshi', sans-serif;
                    font-size: 20px;
                    font-weight: 700;
                    color: var(--orca-accent);
                    margin-bottom: 16px;
                    padding-top: 8px;
                }
                .legal-content p {
                    font-size: 15px;
                    line-height: 1.8;
                    color: rgba(234, 246, 255, 0.65);
                    margin-bottom: 12px;
                }
                .legal-content ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                .legal-content li {
                    font-size: 15px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.65);
                    padding: 6px 0 6px 20px;
                    position: relative;
                }
                .legal-content li::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 14px;
                    width: 6px;
                    height: 6px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                }
                .legal-content a {
                    color: var(--orca-accent);
                    text-decoration: none;
                }
                .legal-content a:hover { text-decoration: underline; }
            `}</style>
        </div>
    );
}
