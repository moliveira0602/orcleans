import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
    const [activeSection, setActiveSection] = useState('intro');

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: '-150px 0px -60% 0px' }
        );

        const sections = document.querySelectorAll('section[id]');
        sections.forEach((section) => observer.observe(section));

        return () => {
            sections.forEach((section) => observer.unobserve(section));
        };
    }, []);

    const scrollTo = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Since we use scroll-margin-top: 100px in the CSS, this will automatically account for the offset!
        }
    };

    const navItems = [
        { id: 'intro', label: '1. Introdução' },
        { id: 'dados', label: '2. Dados Coletados' },
        { id: 'finalidade', label: '3. Finalidade do Tratamento' },
        { id: 'base-legal', label: '4. Base Legal' },
        { id: 'compartilhamento', label: '5. Compartilhamento' },
        { id: 'seguranca', label: '6. Segurança' },
        { id: 'direitos', label: '7. Seus Direitos' },
        { id: 'cookies', label: '8. Cookies' },
        { id: 'alteracoes', label: '9. Alterações' },
        { id: 'contato', label: '10. Contato' }
    ];

    return (
        <div className="legal-page">
            <div className="legal-header">
                <div className="legal-header-bg" />
                <div className="container header-container">
                    <a href="/" className="legal-back-btn">
                        <ArrowLeft size={16} /> Voltar para a Home
                    </a>
                    <h1>Política de Privacidade</h1>
                    <p className="last-updated">Última atualização: Abril de 2026</p>
                </div>
            </div>
            
            <div className="legal-layout container">
                <aside className="legal-sidebar">
                    <nav className="legal-nav">
                        <div className="legal-nav-title">Índice</div>
                        <ul>
                            {navItems.map(item => (
                                <li key={item.id}>
                                    <button 
                                        className={activeSection === item.id ? 'active' : ''}
                                        onClick={() => scrollTo(item.id)}
                                    >
                                        {item.label}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </aside>
                
                <main className="legal-content">
                    <section id="intro">
                        <h2>1. Introdução</h2>
                        <p>A ORCA ("nós", "nosso", "nos") é uma plataforma de inteligência comercial B2B. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais, em conformidade com o Regulamento Geral de Proteção de Dados (RGPD/GPDR) da União Europeia e a Lei Geral de Proteção de Dados (LGPD) do Brasil.</p>
                    </section>
                    
                    <section id="dados">
                        <h2>2. Dados Coletados</h2>
                        <p>Coletamos os seguintes tipos de dados:</p>
                        <ul>
                            <li><strong>Dados de registro:</strong> nome, e-mail, empresa e telefone fornecidos durante o cadastro.</li>
                            <li><strong>Dados de uso:</strong> informações sobre como você interage com a plataforma, como páginas visitadas e funcionalidades utilizadas.</li>
                            <li><strong>Dados importados:</strong> informações de leads que você importa para a plataforma, obtidas de fontes públicas como Google Maps e Foursquare.</li>
                            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e cookies.</li>
                        </ul>
                    </section>
                    
                    <section id="finalidade">
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
                    
                    <section id="base-legal">
                        <h2>4. Base Legal</h2>
                        <p>O tratamento dos dados é baseado em:</p>
                        <ul>
                            <li>Seu consentimento explícito ao utilizar a plataforma.</li>
                            <li>Necessidade para execução de contrato entre você e a ORCA.</li>
                            <li>Interesse legítimo da ORCA em fornecer e melhorar seus serviços.</li>
                            <li>Cumprimento de obrigação legal aplicável.</li>
                        </ul>
                    </section>
                    
                    <section id="compartilhamento">
                        <h2>5. Compartilhamento de Dados</h2>
                        <p>Não vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para fins de marketing. Podemos compartilhar dados apenas com:</p>
                        <ul>
                            <li>Prestadores de serviço essenciais à operação da plataforma (hospedagem, análise de dados).</li>
                            <li>Autoridades legais, quando exigido por lei.</li>
                        </ul>
                    </section>
                    
                    <section id="seguranca">
                        <h2>6. Armazenamento e Segurança</h2>
                        <p>Seus dados são armazenados em servidores seguros e protegidos com medidas técnicas e organizacionais adequadas, incluindo criptografia e controle de acesso. Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas.</p>
                    </section>
                    
                    <section id="direitos">
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
                    
                    <section id="cookies">
                        <h2>8. Cookies</h2>
                        <p>Utilizamos cookies essenciais para o funcionamento da plataforma. Não utilizamos cookies de rastreamento ou publicidade de terceiros.</p>
                    </section>
                    
                    <section id="alteracoes">
                        <h2>9. Alterações</h2>
                        <p>Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças significativas através da plataforma ou por e-mail.</p>
                    </section>
                    
                    <section id="contato">
                        <h2>10. Contato</h2>
                        <p>Para dúvidas sobre esta política ou sobre seus dados pessoais, entre em contato:</p>
                        <p><strong>E-mail:</strong> <a href="mailto:moliveira@etos.pt">moliveira@etos.pt</a></p>
                        <p><strong>Empresa:</strong> ETOS</p>
                    </section>
                </main>
            </div>

            <style>{`
                html, body {
                    overflow-y: auto !important;
                    scroll-behavior: smooth;
                }
                .legal-page {
                    min-height: 100vh;
                    background: var(--orca-bg);
                    color: var(--orca-text);
                    font-family: var(--font-s);
                }
                
                /* Header */
                .legal-header {
                    position: relative;
                    padding: 100px 24px 60px;
                    text-align: center;
                    border-bottom: 1px solid var(--orca-border);
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
                    background: radial-gradient(ellipse at 50% 0%, rgba(51, 51, 51, 0.5) 0%, var(--orca-bg) 80%);
                }
                .legal-header-bg::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }
                .header-container {
                    position: relative;
                    z-index: 1;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .legal-back-btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 32px;
                    color: var(--orca-text-muted);
                    text-decoration: none;
                    font-size: 14px;
                    font-weight: 500;
                    transition: color 0.2s;
                }
                .legal-back-btn:hover { 
                    color: var(--orca-accent); 
                }
                .legal-header h1 {
                    font-family: var(--font-d);
                    font-size: clamp(32px, 5vw, 48px);
                    font-weight: 700;
                    color: var(--orca-text);
                    margin-bottom: 12px;
                    letter-spacing: -0.02em;
                }
                .last-updated {
                    font-size: 15px;
                    color: var(--orca-text-dim);
                    font-weight: 500;
                }
                
                /* Layout */
                .legal-layout {
                    display: grid;
                    grid-template-columns: 280px 1fr;
                    gap: 64px;
                    max-width: 1100px;
                    margin: 0 auto;
                    padding: 64px 24px 120px;
                }
                
                /* Sidebar Navigation */
                .legal-sidebar {
                    position: relative;
                }
                .legal-nav {
                    position: sticky;
                    top: 100px;
                }
                .legal-nav-title {
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    color: var(--orca-text-dim);
                    font-weight: 700;
                    margin-bottom: 20px;
                    padding-left: 16px;
                }
                .legal-nav ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    border-left: 1px solid var(--orca-border);
                }
                .legal-nav li {
                    margin: 0;
                    padding: 0;
                }
                .legal-nav button {
                    display: block;
                    width: 100%;
                    text-align: left;
                    background: none;
                    border: none;
                    padding: 8px 16px;
                    color: var(--orca-text-muted);
                    font-size: 14px;
                    font-family: var(--font-s);
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    position: relative;
                    margin-left: -1px;
                    border-left: 2px solid transparent;
                }
                .legal-nav button:hover {
                    color: var(--orca-accent);
                    background: rgba(255, 255, 255, 0.02);
                }
                .legal-nav button.active {
                    color: var(--orca-accent);
                    border-left-color: var(--orca-accent);
                    font-weight: 600;
                    background: rgba(255, 255, 255, 0.03);
                }
                
                /* Content Area */
                .legal-content {
                    min-width: 0; /* Prevents overflow in grid */
                }
                .legal-content section {
                    margin-bottom: 56px;
                    scroll-margin-top: 100px; /* For smooth scrolling offset */
                    border-bottom: 1px solid var(--orca-border);
                    padding-bottom: 56px;
                }
                .legal-content section:last-child {
                    border-bottom: none;
                    padding-bottom: 0;
                    margin-bottom: 0;
                }
                .legal-content h2 {
                    font-family: var(--font-d);
                    font-size: 24px;
                    font-weight: 700;
                    color: var(--orca-accent);
                    margin-bottom: 24px;
                    letter-spacing: -0.01em;
                }
                .legal-content p {
                    font-size: 16px;
                    line-height: 1.8;
                    color: var(--orca-text-muted);
                    margin-bottom: 20px;
                }
                .legal-content p:last-child {
                    margin-bottom: 0;
                }
                .legal-content ul {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 24px 0;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .legal-content li {
                    font-size: 16px;
                    line-height: 1.7;
                    color: var(--orca-text-muted);
                    padding-left: 24px;
                    position: relative;
                }
                .legal-content li::before {
                    content: '';
                    position: absolute;
                    left: 0;
                    top: 12px;
                    width: 6px;
                    height: 6px;
                    background: var(--orca-text-dim);
                    border-radius: 50%;
                }
                .legal-content strong {
                    color: var(--orca-text);
                    font-weight: 600;
                }
                .legal-content a {
                    color: var(--orca-accent);
                    text-decoration: none;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
                    padding-bottom: 1px;
                    transition: border-color 0.2s;
                }
                .legal-content a:hover { 
                    border-bottom-color: var(--orca-accent);
                }
                
                /* Responsive */
                @media (max-width: 900px) {
                    .legal-layout {
                        grid-template-columns: 1fr;
                        gap: 40px;
                        padding: 40px 24px 80px;
                    }
                    .legal-sidebar {
                        display: none; /* Hide sidebar on small screens to prioritize reading */
                    }
                    .legal-header {
                        padding: 80px 24px 40px;
                    }
                }
            `}</style>
        </div>
    );
}
