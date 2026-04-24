import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
    const [activeSection, setActiveSection] = useState('aceitacao');

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
        { id: 'aceitacao', label: '1. Aceitação dos Termos' },
        { id: 'descricao', label: '2. Descrição do Serviço' },
        { id: 'registro', label: '3. Registro e Conta' },
        { id: 'uso', label: '4. Uso Permitido' },
        { id: 'propriedade', label: '5. Propriedade Intelectual' },
        { id: 'dados', label: '6. Dados e Privacidade' },
        { id: 'plano', label: '7. Plano e Pagamento' },
        { id: 'disponibilidade', label: '8. Disponibilidade' },
        { id: 'limitacao', label: '9. Responsabilidade' },
        { id: 'rescisao', label: '10. Rescisão' },
        { id: 'alteracoes', label: '11. Alterações' },
        { id: 'legislacao', label: '12. Legislação' },
        { id: 'contato', label: '13. Contato' }
    ];

    return (
        <div className="legal-page">
            <div className="legal-header">
                <div className="legal-header-bg" />
                <div className="container header-container">
                    <a href="/" className="legal-back-btn">
                        <ArrowLeft size={16} /> Voltar para a Home
                    </a>
                    <h1>Termos de Uso</h1>
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
                    <section id="aceitacao">
                        <h2>1. Aceitação dos Termos</h2>
                        <p>Ao acessar ou utilizar a plataforma ORCA, operada pela ORCA ("nós", "nosso"), você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concorda com qualquer parte destes termos, não utilize a plataforma.</p>
                    </section>
                    
                    <section id="descricao">
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
                    
                    <section id="registro">
                        <h2>3. Registro e Conta</h2>
                        <p>Para utilizar os serviços da ORCA, você deve criar uma conta fornecendo informações verdadeiras, completas e atualizadas. Você é responsável por:</p>
                        <ul>
                            <li>Manter a confidencialidade de suas credenciais de acesso.</li>
                            <li>Todas as atividades realizadas sob sua conta.</li>
                            <li>Notificar-nos imediatamente sobre qualquer uso não autorizado.</li>
                        </ul>
                    </section>
                    
                    <section id="uso">
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
                    
                    <section id="propriedade">
                        <h2>5. Propriedade Intelectual</h2>
                        <p>Todo o conteúdo, código-fonte, design, marcas e funcionalidades da plataforma ORCA são de propriedade exclusiva da ORCA e protegidos pelas leis de propriedade intelectual aplicáveis. Você não adquire qualquer direito de propriedade sobre a plataforma.</p>
                    </section>
                    
                    <section id="dados">
                        <h2>6. Dados e Privacidade</h2>
                        <p>O tratamento de dados pessoais é regido pela nossa <a href="/privacidade">Política de Privacidade</a>. Ao utilizar a plataforma, você consente com as práticas descritas nessa política.</p>
                    </section>
                    
                    <section id="plano">
                        <h2>7. Plano e Pagamento</h2>
                        <p>A ORCA oferece um período de teste gratuito. Após o período de avaliação, o acesso pode estar sujeito a assinatura com planos e preços definidos. Valores e condições serão comunicados previamente na plataforma.</p>
                    </section>
                    
                    <section id="disponibilidade">
                        <h2>8. Disponibilidade do Serviço</h2>
                        <p>Nos esforçamos para manter a plataforma disponível de forma contínua, mas não garantimos acesso ininterrupto. A ORCA pode realizar manutenções programadas ou emergenciais sem aviso prévio quando necessário.</p>
                    </section>
                    
                    <section id="limitacao">
                        <h2>9. Limitação de Responsabilidade</h2>
                        <p>A ORCA não será responsável por danos indiretos, incidentais ou consequenciais decorrentes do uso ou impossibilidade de uso da plataforma. A responsabilidade total da ORCA é limitada ao valor pago pelo usuário nos últimos 12 meses.</p>
                    </section>
                    
                    <section id="rescisao">
                        <h2>10. Rescisão</h2>
                        <p>A ORCA pode suspender ou encerrar sua conta a qualquer momento, com ou sem aviso prévio, em caso de violação destes termos. Você pode encerrar sua conta a qualquer momento solicitando a exclusão dos seus dados através de <a href="mailto:contacto@orcaleads.online">contacto@orcaleads.online</a>.</p>
                    </section>
                    
                    <section id="alteracoes">
                        <h2>11. Alterações nos Termos</h2>
                        <p>Estes termos podem ser atualizados periodicamente. Notificaremos os usuários sobre mudanças significativas. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.</p>
                    </section>
                    
                    <section id="legislacao">
                        <h2>12. Legislação Aplicável</h2>
                        <p>Estes termos são regidos pelas leis portuguesas e pela legislação europeia aplicável. Qualquer disputa será submetida à jurisdição exclusiva dos tribunais de Portugal.</p>
                    </section>
                    
                    <section id="contato">
                        <h2>13. Contato</h2>
                        <p>Para dúvidas sobre estes termos, entre em contato:</p>
                        <p><strong>E-mail:</strong> <a href="mailto:contacto@orcaleads.online">contacto@orcaleads.online</a></p>
                        <p><strong>Empresa:</strong> ORCA</p>
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
