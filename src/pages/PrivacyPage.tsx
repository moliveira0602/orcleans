export default function PrivacyPage() {
    return (
        <div className="legal-page">
            <div className="legal-header">
                <div className="legal-header-bg" />
                <div className="container">
                    <a href="/" className="legal-back-btn">← Voltar</a>
                    <h1>Política de Privacidade</h1>
                    <p>Última atualização: Abril de 2026</p>
                </div>
            </div>
            <div className="container">
                <div className="legal-content">
                    <section>
                        <h2>1. Introdução</h2>
                        <p>A ORCA ("nós", "nosso", "nos") é uma plataforma de inteligência comercial B2B. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com o Regulamento Geral de Proteção de Dados (RGPD/GPDR) da União Europeia e a Lei Geral de Proteção de Dados (LGPD) do Brasil.</p>
                    </section>
                    <section>
                        <h2>2. Dados Coletados</h2>
                        <p>Coletamos os seguintes tipos de dados:</p>
                        <ul>
                            <li><strong>Dados de registro:</strong> nome, e-mail, empresa e telefone fornecidos durante o cadastro.</li>
                            <li><strong>Dados de uso:</strong> informações sobre como você interage com a plataforma, como páginas visitadas e funcionalidades utilizadas.</li>
                            <li><strong>Dados importados:</strong> informações de leads que você importa para a plataforma, obtidas de fontes públicas como Google Maps e Foursquare.</li>
                            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e cookies.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>3. Finalidade do Tratamento</h2>
                        <p>Utilizamos seus dados para:</p>
                        <ul>
                            <li>Fornecer e manter os serviços da plataforma ORCA.</li>
                            <li>Processar o registro e login de usuários.</li>
                            <li>Enviar comunicações relacionadas ao serviço.</li>
                            <li>Melhorar a experiência da plataforma.</li>
                            <li>Cumprir obrigações legais.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>4. Base Legal</h2>
                        <p>O tratamento dos dados é baseado em:</p>
                        <ul>
                            <li>Seu consentimento explícito ao utilizar a plataforma.</li>
                            <li>Necessidade para execução de contrato entre você e a ORCA.</li>
                            <li>Interesse legítimo da ORCA em fornecer e melhorar seus serviços.</li>
                            <li>Cumprimento de obrigação legal aplicável.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>5. Compartilhamento de Dados</h2>
                        <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas com:</p>
                        <ul>
                            <li>Prestadores de serviço essenciais à operação da plataforma (hospedagem, análise de dados).</li>
                            <li>Autoridades legais, quando exigido por lei.</li>
                        </ul>
                    </section>
                    <section>
                        <h2>6. Armazenamento e Segurança</h2>
                        <p>Seus dados são armazenados em servidores seguros e protegidos com medidas técnicas e organizacionais adequadas, incluindo criptografia e controle de acesso. Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas.</p>
                    </section>
                    <section>
                        <h2>7. Seus Direitos</h2>
                        <p>De acordo com o RGPD e a LGPD, você tem direito a:</p>
                        <ul>
                            <li>Acessar seus dados pessoais.</li>
                            <li>Corrigir dados inexatos ou incompletos.</li>
                            <li>Solicitar a exclusão dos seus dados.</li>
                            <li>Solicitar a portabilidade dos seus dados.</li>
                            <li>Opor-se ao tratamento dos seus dados.</li>
                            <li>Retirar o consentimento a qualquer momento.</li>
                        </ul>
                        <p>Para exercer seus direitos, entre em contato: <a href="mailto:moliveira@etos.pt">moliveira@etos.pt</a></p>
                    </section>
                    <section>
                        <h2>8. Cookies</h2>
                        <p>Utilizamos cookies essenciais para o funcionamento da plataforma. Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>
                    </section>
                    <section>
                        <h2>9. Alterações</h2>
                        <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.</p>
                    </section>
                    <section>
                        <h2>10. Contato</h2>
                        <p>Para dúvidas sobre esta política ou sobre seus dados pessoais, entre em contato:</p>
                        <p><strong>E-mail:</strong> <a href="mailto:moliveira@etos.pt">moliveira@etos.pt</a></p>
                        <p><strong>Empresa:</strong> ETOS</p>
                    </section>
                </div>
            </div>

            <style>{`
                .legal-page {
                    min-height: 100vh;
                    background: #05070A;
                    color: #EAF6FF;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
                    background: radial-gradient(ellipse at 50% 0%, rgba(14, 58, 93, 0.5) 0%, #05070A 80%);
                }
                .legal-header-bg::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(0, 194, 255, 0.1) 1px, transparent 1px);
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
                    font-family: 'Sora', sans-serif;
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
                    color: rgba(0, 194, 255, 0.6);
                    text-decoration: none;
                    font-size: 14px;
                    transition: color 0.2s;
                }
                .legal-back-btn:hover { color: #00C2FF; }
                .legal-content {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 40px 24px 120px;
                }
                .legal-content section {
                    margin-bottom: 40px;
                }
                .legal-content h2 {
                    font-family: 'Sora', sans-serif;
                    font-size: 20px;
                    font-weight: 700;
                    color: #00C2FF;
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
                    background: rgba(0, 194, 255, 0.3);
                    border-radius: 50%;
                }
                .legal-content a {
                    color: #00C2FF;
                    text-decoration: none;
                }
                .legal-content a:hover { text-decoration: underline; }
            `}</style>
        </div>
    );
}
