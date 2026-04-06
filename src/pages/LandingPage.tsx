import { useState, useEffect, useRef } from 'react';
import MistBackground from '../components/ui/MistBackground';

// FAQ Data
const faqItems = [
    {
        question: "Como funciona o período de teste?",
        answer: "Oferecemos 14 dias de teste gratuito com acesso completo a todas as funcionalidades da plataforma. Não é necessário cartão de crédito para começar. No final do período, pode escolher o plano que melhor se adequa às suas necessidades."
    },
    {
        question: "Preciso de cartão de crédito para começar?",
        answer: "Não. Pode criar a sua conta e explorar todas as funcionalidades gratuitamente durante 14 dias. Só será solicitado um método de pagamento se decidir fazer upgrade para um plano pago após o período de teste."
    },
    {
        question: "Posso importar os meus leads existentes?",
        answer: "Sim! A ORCA suporta importação de múltiplos formatos: Excel (.xlsx), CSV, Google Sheets e integração via API com a maioria dos CRMs populares como Salesforce, HubSpot e Pipedrive."
    },
    {
        question: "A ORCA funciona com o meu CRM atual?",
        answer: "Sim. A ORCA integra-se nativamente com os principais CRMs do mercado através de APIs ou ferramentas de automação como Zapier. Também oferecemos integração personalizada mediante solicitação."
    },
    {
        question: "Como é feita a qualificação automática de leads?",
        answer: "Utilizamos algoritmos de IA que analisam múltiplos critérios: setor de atividade, dimensão da empresa, localização, engagement histórico e dados públicos. Cada lead recebe um score de 0-100 que indica o seu potencial de conversão."
    },
    {
        question: "Que tipos de ficheiros posso importar?",
        answer: "Suportamos Excel (.xlsx, .xls), CSV, Google Sheets (via link partilhado) e JSON. Também é possível conectar diretamente a bases de dados via API REST ou webhook."
    },
    {
        question: "Existe suporte em português?",
        answer: "Sim! Toda a nossa equipa de suporte fala português e está disponível por email e chat durante o horário de expediente (9h-18h, dias úteis). Planos Enterprise incluem suporte dedicado 24/7."
    },
    {
        question: "Posso cancelar a qualquer momento?",
        answer: "Sim. Não existe qualquer fidelização ou contrato de permanência. Pode cancelar a sua subscrição a qualquer momento através do painel de administração, sem penalizações ou custos adicionais."
    }
];

// Testimonials Data (for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const testimonials = [
    {
        name: "Ana Silva",
        role: "Diretora Comercial",
        company: "TechVentures",
        initials: "AS",
        quote: "A ORCA transformou completamente a nossa abordagem de prospecção. Em 3 meses, aumentámos a taxa de conversão em 180%.",
        rating: 5
    },
    {
        name: "Carlos Mendes",
        role: "Head of Sales",
        company: "DataFlow",
        initials: "CM",
        quote: "O Sonar é simplesmente incrível. Encontrámos 50+ leads qualificadas na primeira semana que nem sabíamos que existiam.",
        rating: 5
    },
    {
        name: "Patricia Costa",
        role: "CEO",
        company: "GrowthLabs",
        initials: "PC",
        quote: "Finalmente uma ferramenta que entrega o que promete. A qualificação automática poupou-nos 20h/semana de trabalho manual.",
        rating: 5
    }
];

// Client logos for social proof (for future use)

// Pricing Data
const pricingPlans = [
    {
        name: "Starter",
        description: "Para equipas pequenas que estão a começar",
        monthlyPrice: 49,
        annualPrice: 39,
        features: [
            "Até 500 leads",
            "Score automático básico",
            "Pipeline visual",
            "Importação CSV/Excel",
            "Suporte por email",
            "1 utilizador"
        ],
        cta: "Começar Grátis",
        highlighted: false
    },
    {
        name: "Growth",
        description: "Para equipas em crescimento acelerado",
        monthlyPrice: 129,
        annualPrice: 103,
        features: [
            "Até 5.000 leads",
            "Score avançado com IA",
            "Sonar de mercado",
            "Segmentação inteligente",
            "Integração CRM",
            "Relatórios avançados",
            "Até 10 utilizadores",
            "Suporte prioritário"
        ],
        cta: "Experimentar 14 Dias",
        highlighted: true
    },
    {
        name: "Enterprise",
        description: "Para grandes operações comerciais",
        monthlyPrice: 299,
        annualPrice: 239,
        features: [
            "Leads ilimitados",
            "IA personalizada",
            "API dedicada",
            "Single Sign-On (SSO)",
            "Relatórios white-label",
            "Gestor de conta dedicado",
            "Utilizadores ilimitados",
            "Suporte 24/7"
        ],
        cta: "Falar com Vendas",
        highlighted: false
    }
];

// Client logos for social proof (for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const clientLogos = [
    { name: "TechVentures", color: "#00C2FF" },
    { name: "DataFlow", color: "#00FF80" },
    { name: "GrowthLabs", color: "#FF6B35" },
    { name: "SalesPro", color: "#A855F7" },
    { name: "CloudBase", color: "#06B6D4" },
    { name: "Innovate", color: "#F59E0B" }
];

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('inicio');
    const [annualBilling, setAnnualBilling] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const [statsVisible, setStatsVisible] = useState(false);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        company: '',
        phone: '',
        message: ''
    });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const [animatedStats, setAnimatedStats] = useState({ conv: 0, time: 0, vis: 0 });
    const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});
    const wheelTimeout = useRef<number | null>(null);
    const statsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection Observer for active section
    useEffect(() => {
        const sections = ['inicio', 'plataforma', 'beneficios', 'como-funciona', 'sonar', 'contacto'];
        
        const observerOptions = {
            root: null,
            rootMargin: '-50% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    setActiveSection(entry.target.id);
                }
            });
        }, observerOptions);

        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                sectionRefs.current[id] = el;
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, []);

    // Stats counter animation (for future use)
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !statsVisible) {
                    setStatsVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, [statsVisible]);

    // Remove mouse wheel scroll to allow natural scrolling
    // useEffect(() => {
    //     const handleWheel = (e: WheelEvent) => {
    //         if (wheelTimeout.current) return;
    //         
    //         const sections = ['inicio', 'plataforma', 'beneficios', 'como-funciona', 'sonar', 'contacto'];
    //         const currentIndex = sections.indexOf(activeSection);
    //         
    //         if (e.deltaY > 50 && currentIndex < sections.length - 1) {
    //             e.preventDefault();
    //             const nextSection = document.getElementById(sections[currentIndex + 1]);
    //             if (nextSection) {
    //                 nextSection.scrollIntoView({ behavior: 'smooth' });
    //                 setActiveSection(sections[currentIndex + 1]);
    //             }
    //             wheelTimeout.current = setTimeout(() => {
    //                 wheelTimeout.current = null;
    //             }, 800);
    //         } else if (e.deltaY < -50 && currentIndex > 0) {
    //             e.preventDefault();
    //             const prevSection = document.getElementById(sections[currentIndex - 1]);
    //             if (prevSection) {
    //                 prevSection.scrollIntoView({ behavior: 'smooth' });
    //                 setActiveSection(sections[currentIndex - 1]);
    //             }
    //             wheelTimeout.current = setTimeout(() => {
    //                 wheelTimeout.current = null;
    //             }, 800);
    //         }
    //     };
    //
    //     window.addEventListener('wheel', handleWheel, { passive: false });
    //     return () => window.removeEventListener('wheel', handleWheel);
    // }, [activeSection]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
        setMobileMenuOpen(false);
    };

    // Spotlight effect for benefits section
    useEffect(() => {
        const benefitsSection = document.getElementById('beneficios');
        if (!benefitsSection) return;

        const handleMouseMove = (e: MouseEvent) => {
            const cards = benefitsSection.querySelectorAll('.benefit-card');
            cards.forEach(card => {
                const htmlCard = card as HTMLElement;
                const rect = htmlCard.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                htmlCard.style.setProperty('--mouse-x', `${x}px`);
                htmlCard.style.setProperty('--mouse-y', `${y}px`);
            });
        };

        benefitsSection.addEventListener('mousemove', handleMouseMove);
        return () => benefitsSection.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Analytics tracking placeholder (for future use with Google Analytics)
    // const trackCtaClick = (ctaName: string) => {
    //     console.log('CTA Click:', ctaName);
    //     if (typeof window !== 'undefined' && (window as any).gtag) {
    //         (window as any).gtag('event', 'cta_click', { cta_name: ctaName });
    //     }
    // };

    const handleContactClick = () => {
        setContactModalOpen(true);
        setFormSubmitted(false);
        setFormData({ name: '', email: '', company: '', phone: '', message: '' });
    };

    const validateField = (name: string, value: string): string => {
        switch (name) {
            case 'email':
                if (!value) return 'E-mail é obrigatório';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Insira um e-mail válido';
                return '';
            case 'name':
                if (!value) return 'Nome é obrigatório';
                if (value.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
                return '';
            case 'company':
                if (!value) return 'Empresa é obrigatória';
                return '';
            case 'phone':
                if (value && !/^[\d\s+\-()]+$/.test(value)) return 'Insira um telefone válido';
                return '';
            default:
                return '';
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Real-time validation
        const error = validateField(name, value);
        setFormErrors(prev => ({
            ...prev,
            [name]: error
        }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 12) value = value.slice(0, 12);
        
        // Format: +351 XXX XXX XXX
        let formatted = '';
        if (value.length > 0) {
            if (value.length <= 3) {
                formatted = '+' + value;
            } else if (value.length <= 6) {
                formatted = '+351 ' + value.slice(3);
            } else if (value.length <= 9) {
                formatted = '+351 ' + value.slice(3, 6) + ' ' + value.slice(6);
            } else {
                formatted = '+351 ' + value.slice(3, 6) + ' ' + value.slice(6, 9) + ' ' + value.slice(9);
            }
        }
        
        e.target.value = formatted;
        setFormData(prev => ({ ...prev, phone: formatted }));
        
        const error = validateField('phone', formatted);
        setFormErrors(prev => ({ ...prev, phone: error }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validate all fields
        const errors: Record<string, string> = {};
        Object.entries(formData).forEach(([name, value]) => {
            const error = validateField(name, value);
            if (error) errors[name] = error;
        });
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setIsSubmitting(true);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        console.log('Form submitted:', formData);
        setFormSubmitted(true);
        setIsSubmitting(false);
        // Here you would typically send the data to your backend
    };

    const closeModal = () => {
        setContactModalOpen(false);
    };

    // Close modal on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && contactModalOpen) {
                closeModal();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [contactModalOpen]);

    const navItems = [
        { id: 'inicio', label: 'Início' },
        { id: 'plataforma', label: 'Plataforma' },
        { id: 'beneficios', label: 'Benefícios' },
        { id: 'como-funciona', label: 'Como Funciona' },
        { id: 'sonar', label: 'Sonar' },
        { id: 'pricing', label: 'Preços' },
        { id: 'contacto', label: 'Contacto' },
    ];

    return (
        <div className="landing-page">
            {/* ===== HEADER ===== */}
            <header className={`landing-header${scrolled ? ' scrolled' : ''}`}>
                <div className="landing-header-inner">
                    <div className="landing-logo" onClick={() => scrollToSection('inicio')}>
                        <img src="/images/ORCA-white.png" alt="ORCA" />
                    </div>

                    <nav className="landing-nav desktop-only">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                className={`nav-link${activeSection === item.id ? ' active' : ''}`}
                                onClick={() => scrollToSection(item.id)}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    <div className="landing-header-actions">
                        <a href="/app" className="btn btn-login">
                            Login
                        </a>
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            <span />
                            <span />
                            <span />
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="mobile-menu">
                        <nav>
                            {navItems.map((item) => (
                                <button
                                    key={item.id}
                                    className="mobile-nav-link"
                                    onClick={() => scrollToSection(item.id)}
                                >
                                    {item.label}
                                </button>
                            ))}
                            <a href="/app" className="btn btn-login mobile-login">
                                Login
                            </a>
                        </nav>
                    </div>
                )}
            </header>

            {/* ===== HERO SECTION ===== */}
            <section id="inicio" className="hero-section">
                <div className="hero-bg">
                    <video
                        className="hero-video"
                        autoPlay
                        muted
                        playsInline
                        poster="/images/ORCA.png"
                    >
                        <source src="/images/video/video-orca.mp4" type="video/mp4" />
                    </video>
                    <div className="hero-gradient" />
                    <div className="hero-particles" />
                </div>
                <div className="hero-content">
                    <div className="hero-badge">Inteligência Comercial B2B</div>
                    <h1 className="hero-title">
                        Inteligência comercial que opera<br />
                        <em>abaixo da superfície.</em>
                    </h1>
                    <p className="hero-subtitle">
                        A ORCA ajuda sua equipa a captar, qualificar e organizar leads com precisão,
                        clareza e controlo total. Transforme dados em oportunidades reais.
                    </p>
                    <div className="hero-cta">
                        <a href="/app" className="btn btn-primary btn-lg">
                            Entrar na Plataforma
                        </a>
                        <button
                            className="btn btn-ghost btn-lg"
                            onClick={() => scrollToSection('plataforma')}
                        >
                            Explorar a ORCA
                        </button>
                    </div>
                    <div className="hero-stats">
                        <div className="stat-item">
                            <span className="stat-value">+200%</span>
                            <span className="stat-label">Mais conversões</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">-60%</span>
                            <span className="stat-label">Tempo de qualificação</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">100%</span>
                            <span className="stat-label">Visibilidade total</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== PLATAFORMA SECTION ===== */}
            <section id="plataforma" className="platform-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Plataforma</span>
                        <h2 className="section-title">Ferramentas poderosas para escalar suas vendas</h2>
                        <p className="section-subtitle">
                            Cada funcionalidade da ORCA foi desenhada para eliminar trabalho manual
                            e acelerar o ciclo comercial da sua equipa.
                        </p>
                    </div>

                    <div className="platform-grid">
                        <div className="platform-card">
                            <div className="platform-icon">◉</div>
                            <h3>Base Unificada de Leads</h3>
                            <p>
                                Um repositório central com histórico completo de cada lead,
                                incluindo interações, notas e evolução no funil.
                            </p>
                        </div>
                        <div className="platform-card">
                            <div className="platform-icon">◎</div>
                            <h3>Score Automático com IA</h3>
                            <p>
                                Algoritmo proprietário que analisa dados públicos e comportamentais
                                para atribuir nota de 0-100 a cada lead automaticamente.
                            </p>
                        </div>
                        <div className="platform-card">
                            <div className="platform-icon">▦</div>
                            <h3>Cardumes Inteligentes</h3>
                            <p>
                                Agrupe leads por setor, localização, tamanho ou qualquer critério
                                personalizado para ações em massa direcionadas.
                            </p>
                        </div>
                        <div className="platform-card">
                            <div className="platform-icon">⊞</div>
                            <h3>Pipeline Visual Kanban</h3>
                            <p>
                                Arraste e solte leads entre etapas do funil, com gatilhos automáticos
                                de tarefa e lembretes de follow-up.
                            </p>
                        </div>
                        <div className="platform-card">
                            <div className="platform-icon">⊡</div>
                            <h3>Importador Universal</h3>
                            <p>
                                Conecte-se a qualquer fonte: upload de arquivos, Google Sheets,
                                CRM existente ou API REST — mapeamento automático de colunas.
                            </p>
                        </div>
                        <div className="platform-card">
                            <div className="platform-icon">⬡</div>
                            <h3>Dashboard Executivo</h3>
                            <p>
                                Métricas em tempo real: conversão por etapa, velocidade do pipeline,
                                performance da equipa e previsão de receita.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== BENEFÍCIOS SECTION ===== */}
            <section id="beneficios" className="benefits-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Benefícios</span>
                        <h2 className="section-title">Por que escolher a ORCA?</h2>
                        <p className="section-subtitle">
                            Mais do que uma ferramenta, um sistema completo de inteligência comercial.
                        </p>
                    </div>

                    <div className="benefits-grid">
                        <div className="benefit-card">
                            <div className="benefit-number">01</div>
                            <h3>Visão Centralizada</h3>
                            <p>
                                Tenha uma visão 360° de toda sua operação comercial em tempo real,
                                eliminando planilhas dispersas e informações fragmentadas.
                            </p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-number">02</div>
                            <h3>Segmentação Inteligente</h3>
                            <p>
                                Nossa tecnologia identifica padrões e agrupa leads automaticamente
                                por comportamento, potencial e características relevantes.
                            </p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-number">03</div>
                            <h3>Qualificação Mais Rápida</h3>
                            <p>
                                Reduza drasticamente o tempo entre captar um lead e identificar
                                seu potencial real de conversão.
                            </p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-number">04</div>
                            <h3>Funil Transparente</h3>
                            <p>
                                Acompanhe cada lead em seu journey, identifique gargalos e otimize
                                seu processo comercial continuamente.
                            </p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-number">05</div>
                            <h3>Operação Escalável</h3>
                            <p>
                                Cresça sua base de leads sem perder o controle. A ORCA escala
                                junto com seu negócio.
                            </p>
                        </div>
                        <div className="benefit-card">
                            <div className="benefit-number">06</div>
                            <h3>Decisões Baseadas em Dados</h3>
                            <p>
                                Tome decisões comerciais com confiança, apoiado em dados reais
                                e análises preditivas.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== COMO FUNCIONA SECTION ===== */}
            <section id="como-funciona" className="how-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Como Funciona</span>
                        <h2 className="section-title">Simples de usar, poderoso nos resultados</h2>
                    </div>

                    <div className="steps-container">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Importe seus dados</h3>
                                <p>
                                    Carregue sua base de leads de qualquer fonte: planilhas Excel,
                                    CSV, ou conecte-se diretamente a APIs externas.
                                </p>
                            </div>
                        </div>
                        <div className="step-connector" />
                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Organize e qualifique</h3>
                                <p>
                                    A ORCA processa automaticamente seus dados, atribuindo scores
                                    de qualidade e identificando as melhores oportunidades.
                                </p>
                            </div>
                        </div>
                        <div className="step-connector" />
                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Acompanhe o funil</h3>
                                <p>
                                    Visualize o progresso de cada lead através das etapas do seu
                                    pipeline e identifique ações necessárias.
                                </p>
                            </div>
                        </div>
                        <div className="step-connector" />
                        <div className="step">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h3>Aja com precisão</h3>
                                <p>
                                    Tome decisões informadas, priorize esforços e maximize suas
                                    taxas de conversão com inteligência de dados.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== SONAR SECTION ===== */}
            <section id="sonar" className="sonar-section">
                <div className="sonar-bg">
                    <div className="sonar-grid" />
                </div>
                <div className="container">
                    <div className="sonar-layout">
                        <div className="sonar-content">
                            <span className="section-badge sonar-badge">Diferencial ORCA</span>
                            <h2 className="sonar-title">
                                Sonar
                                <span className="sonar-title-accent">.</span>
                            </h2>
                            <p className="sonar-subtitle">
                                Nosso radar inteligente varre o mercado e identifica estabelecimentos
                                que se encaixam no seu perfil ideal de cliente.
                            </p>
                            <div className="sonar-features">
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon">◎</div>
                                    <div>
                                        <h4>Detecção Automática</h4>
                                        <p>Encontre novos leads baseados em segmento e localização.</p>
                                    </div>
                                </div>
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon">◉</div>
                                    <div>
                                        <h4>Leitura de Potencial</h4>
                                        <p>Avaliação automática do potencial de cada estabelecimento.</p>
                                    </div>
                                </div>
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon">▦</div>
                                    <div>
                                        <h4>Visão Estratégica</h4>
                                        <p>Mapa completo das oportunidades na sua área de atuação.</p>
                                    </div>
                                </div>
                            </div>
                            <a href="/app" className="btn btn-primary btn-lg">
                                Experimentar Sonar
                            </a>
                        </div>
                        <div className="sonar-visual">
                            <div className="sonar-circle sonar-circle-1" />
                            <div className="sonar-circle sonar-circle-2" />
                            <div className="sonar-circle sonar-circle-3" />
                            <div className="sonar-sweep" />
                            <div className="sonar-dots">
                                <span className="sonar-dot" style={{ top: '20%', left: '30%' }} />
                                <span className="sonar-dot" style={{ top: '60%', left: '70%' }} />
                                <span className="sonar-dot" style={{ top: '40%', left: '50%' }} />
                            </div>
                            {/* Radar Detection Cards */}
                            <div className="radar-card" style={{ top: '18%', left: '25%' }} data-delay="0">
                                <div className="radar-card-dot"></div>
                                <div className="radar-card-content">
                                    <h4>Café São Braz</h4>
                                    <p>Rua Augusta, 234 - Lisboa</p>
                                    <span className="radar-card-phone">+351 210 123 456</span>
                                </div>
                            </div>
                            <div className="radar-card" style={{ top: '55%', left: '65%' }} data-delay="1.5">
                                <div className="radar-card-dot"></div>
                                <div className="radar-card-content">
                                    <h4>TechHub Cowork</h4>
                                    <p>Av. da Liberdade, 110 - Lisboa</p>
                                    <span className="radar-card-phone">+351 210 987 654</span>
                                </div>
                            </div>
                            <div className="radar-card" style={{ top: '50%', left: '8%' }} data-delay="3">
                                <div className="radar-card-dot"></div>
                                <div className="radar-card-content">
                                    <h4>Restaurante O Mar</h4>
                                    <p>Rua do Comércio, 89 - Porto</p>
                                    <span className="radar-card-phone">+351 220 456 789</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== PRICING SECTION ===== */}
            <section id="pricing" className="pricing-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Preços</span>
                        <h2 className="section-title">Planos que crescem com seu negócio</h2>
                        <p className="section-subtitle">
                            Escolha o plano ideal para sua equipa. Todos incluem 14 dias de teste gratuito.
                        </p>
                    </div>

                    {/* Billing Toggle */}
                    <div className="pricing-toggle">
                        <span className={!annualBilling ? 'toggle-label-active' : 'toggle-label'}>Mensal</span>
                        <button 
                            className={`toggle-switch${annualBilling ? ' active' : ''}`}
                            onClick={() => setAnnualBilling(!annualBilling)}
                            aria-label="Alternar faturamento anual"
                        >
                            <div className="toggle-knob" />
                        </button>
                        <span className={annualBilling ? 'toggle-label-active' : 'toggle-label'}>
                            Anual <span className="toggle-discount">-20%</span>
                        </span>
                    </div>

                    {/* Pricing Cards */}
                    <div className="pricing-grid">
                        {pricingPlans.map((plan) => (
                            <div 
                                key={plan.name} 
                                className={`pricing-card${plan.highlighted ? ' highlighted' : ''}`}
                            >
                                {plan.highlighted && <div className="pricing-badge">Mais Popular</div>}
                                <h3 className="pricing-name">{plan.name}</h3>
                                <p className="pricing-description">{plan.description}</p>
                                <div className="pricing-price">
                                    <span className="pricing-currency">€</span>
                                    <span className="pricing-value">
                                        {annualBilling ? plan.annualPrice : plan.monthlyPrice}
                                    </span>
                                    <span className="pricing-period">/mês</span>
                                </div>
                                {annualBilling && (
                                    <p className="pricing-annual-note">
                                        Faturado anualmente (€{annualBilling ? plan.annualPrice : plan.monthlyPrice} x 12)
                                    </p>
                                )}
                                <ul className="pricing-features">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx}>
                                            <span className="feature-check">✓</span>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                                <button className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-ghost'} pricing-cta`}>
                                    {plan.cta}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FAQ SECTION ===== */}
            <section id="faq" className="faq-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">FAQ</span>
                        <h2 className="section-title">Perguntas Frequentes</h2>
                    </div>

                    <div className="faq-container">
                        {faqItems.map((item, index) => (
                            <div 
                                key={index} 
                                className={`faq-item${openFaqIndex === index ? ' open' : ''}`}
                            >
                                <button 
                                    className="faq-question"
                                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
                                    aria-expanded={openFaqIndex === index}
                                >
                                    <span>{item.question}</span>
                                    <span className="faq-icon">{openFaqIndex === index ? '−' : '+'}</span>
                                </button>
                                {openFaqIndex === index && (
                                    <div className="faq-answer">
                                        <p>{item.answer}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CREDIBILIDADE SECTION ===== */}
            <section className="credibility-section">
                <div className="container">
                    <div className="credibility-grid">
                        <div className="credibility-stat">
                            <span className="credibility-value">+10K</span>
                            <span className="credibility-label">Leads gerenciados</span>
                        </div>
                        <div className="credibility-stat">
                            <span className="credibility-value">98%</span>
                            <span className="credibility-label">Satisfação dos usuários</span>
                        </div>
                        <div className="credibility-stat">
                            <span className="credibility-value">3x</span>
                            <span className="credibility-label">Mais eficiência</span>
                        </div>
                        <div className="credibility-stat">
                            <span className="credibility-value">24/7</span>
                            <span className="credibility-label">Disponibilidade</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CTA FINAL SECTION ===== */}
            <section id="contacto" className="cta-section">
                <div className="cta-bg">
                    <MistBackground />
                    <div className="cta-gradient" />
                    <div className="cta-particles" />
                    <div className="cta-glow" />
                </div>
                <div className="container">
                    <h2 className="cta-title">
                        Pronto para transformar<br />sua operação comercial?
                    </h2>
                    <p className="cta-subtitle">
                        Junte-se a empresas que já estão usando a ORCA para captar,
                        qualificar e converter mais leads.
                    </p>
                    <div className="cta-buttons">
                        <button className="btn btn-primary btn-lg" onClick={handleContactClick}>
                            Falar com Especialista
                        </button>
                    </div>
                </div>
            </section>

            {/* ===== CONTACT MODAL ===== */}
            {contactModalOpen && (
                <div className="contact-modal-overlay" onClick={closeModal}>
                    <div className="contact-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal} aria-label="Fechar">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        
                        {!formSubmitted ? (
                            <>
                                <div className="modal-header">
                                    <div className="modal-header-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C2FF" strokeWidth="1.5">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                                        </svg>
                                    </div>
                                    <h3 className="modal-title">Fale com um especialista</h3>
                                    <p className="modal-subtitle">Preencha o formulário abaixo e entraremos em contato em até 24 horas.</p>
                                </div>
                                
                                <form className="contact-form" onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="name">Nome completo *</label>
                                            <div className={`input-wrapper${formErrors.name ? ' has-error' : ''}${formData.name ? ' has-value' : ''}`}>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleInputChange}
                                                    placeholder="Seu nome completo"
                                                    autoComplete="name"
                                                />
                                                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="email">E-mail corporativo *</label>
                                            <div className={`input-wrapper${formErrors.email ? ' has-error' : ''}${formData.email ? ' has-value' : ''}`}>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    placeholder="seu.nome@empresa.com"
                                                    autoComplete="email"
                                                />
                                                {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="company">Empresa *</label>
                                            <div className={`input-wrapper${formErrors.company ? ' has-error' : ''}${formData.company ? ' has-value' : ''}`}>
                                                <input
                                                    type="text"
                                                    id="company"
                                                    name="company"
                                                    value={formData.company}
                                                    onChange={handleInputChange}
                                                    placeholder="Nome da sua empresa"
                                                    autoComplete="organization"
                                                />
                                                {formErrors.company && <span className="field-error">{formErrors.company}</span>}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="phone">Telefone</label>
                                            <div className={`input-wrapper${formErrors.phone ? ' has-error' : ''}${formData.phone ? ' has-value' : ''}`}>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handlePhoneChange}
                                                    placeholder="+351 9XX XXX XXX"
                                                    autoComplete="tel"
                                                />
                                                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="form-group">
                                        <label htmlFor="message">Como podemos ajudar?</label>
                                        <div className={`input-wrapper${formData.message ? ' has-value' : ''}`}>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleInputChange}
                                                placeholder="Descreva brevemente o que você precisa ou o seu objetivo..."
                                                rows={4}
                                            />
                                        </div>
                                    </div>
                                    
                                    <button type="submit" className="btn btn-primary btn-lg form-submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <span className="btn-loading">
                                                <svg className="spinner" viewBox="0 0 24 24">
                                                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round"/>
                                                </svg>
                                                Enviando...
                                            </span>
                                        ) : (
                                            <span>Solicitar contacto</span>
                                        )}
                                    </button>
                                    
                                    <div className="form-trust">
                                        <div className="trust-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                            </svg>
                                            <span>Seus dados estão seguros</span>
                                        </div>
                                        <div className="trust-item">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="12" cy="12" r="10"/>
                                                <polyline points="12 6 12 12 16 14"/>
                                            </svg>
                                            <span>Resposta em até 24h</span>
                                        </div>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="modal-success">
                                <div className="success-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00C2FF" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="8 12 11 15 16 9" />
                                    </svg>
                                </div>
                                <h3 className="modal-title">Mensagem enviada!</h3>
                                <p className="modal-subtitle">Obrigado pelo contato. Nossa equipe entrará em contato em até 24 horas.</p>
                                <button className="btn btn-primary btn-lg" onClick={closeModal}>
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="footer-logo">
                                <img src="/images/ORCA-white.png" alt="ORCA" />
                            </div>
                            <p className="footer-tagline">
                                Inteligência comercial que opera abaixo da superfície.
                            </p>
                        </div>
                        <div className="footer-links">
                            <h4>Plataforma</h4>
                            <ul>
                                <li><button onClick={() => scrollToSection('plataforma')}>Recursos</button></li>
                                <li><button onClick={() => scrollToSection('beneficios')}>Benefícios</button></li>
                                <li><button onClick={() => scrollToSection('sonar')}>Sonar</button></li>
                            </ul>
                        </div>
                        <div className="footer-links">
                            <h4>Empresa</h4>
                            <ul>
                                <li><button onClick={() => scrollToSection('como-funciona')}>Como Funciona</button></li>
                                <li><a href="/app">Login</a></li>
                                <li><button onClick={() => scrollToSection('contacto')}>Contacto</button></li>
                            </ul>
                        </div>
                        <div className="footer-links">
                            <h4>Legal</h4>
                            <ul>
                                <li><a href="#">Privacidade</a></li>
                                <li><a href="#">Termos de Uso</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="footer-bottom">
                        <p>&copy; {new Date().getFullYear()} ORCA. Todos os direitos reservados.</p>
                    </div>
                </div>
            </footer>

            <style>{`
                /* ===== LANDING PAGE STYLES ===== */
                
                html, body {
                    overflow-y: auto !important;
                    scroll-behavior: smooth;
                }
                
                .landing-page {
                    background: #05070A;
                    color: #EAF6FF;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    overflow-x: hidden;
                    overflow-y: auto;
                    min-height: 100vh;
                }

                .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 24px;
                }

                /* ===== HEADER ===== */
                .landing-header {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 1000;
                    transition: all 0.3s ease;
                    background: transparent;
                }

                .landing-header.scrolled {
                    background: rgba(5, 7, 10, 0.95);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.1);
                }

                .landing-header-inner {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 0 48px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    width: 100%;
                    position: relative;
                    height: 64px;
                }

                .landing-logo {
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    z-index: 10;
                }

                .landing-logo img {
                    height: 24px;
                    width: auto;
                }

                .landing-nav {
                    display: flex;
                    gap: 40px;
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    left: 50%;
                    transform: translateX(-50%);
                }

                .nav-link {
                    background: none;
                    border: none;
                    color: rgba(234, 246, 255, 0.7);
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    letter-spacing: 0.01em;
                    position: relative;
                    padding: 8px 12px;
                    white-space: nowrap;
                    display: inline-flex;
                    align-items: center;
                }

                .nav-link::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    width: 0;
                    height: 2px;
                    background: #00C2FF;
                    transition: width 0.3s ease;
                }

                .nav-link:hover,
                .nav-link.active {
                    color: #EAF6FF;
                }

                .nav-link:hover::after,
                .nav-link.active::after {
                    width: 100%;
                }

                .landing-header-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    z-index: 10;
                }

                .btn-login {
                    background: rgba(0, 194, 255, 0.1);
                    color: #00C2FF;
                    border: 1px solid rgba(0, 194, 255, 0.2);
                    padding: 10px 24px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.2s ease;
                }

                .btn-login:hover {
                    background: rgba(0, 194, 255, 0.15);
                    border-color: rgba(0, 194, 255, 0.3);
                }

                .mobile-menu-btn {
                    display: none;
                    flex-direction: column;
                    gap: 5px;
                    background: none;
                    border: none;
                    cursor: pointer;
                    padding: 4px;
                }

                .mobile-menu-btn span {
                    width: 20px;
                    height: 2px;
                    background: #EAF6FF;
                    transition: all 0.3s ease;
                }

                .mobile-menu {
                    display: none;
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: rgba(5, 7, 10, 0.98);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.1);
                    padding: 24px;
                }

                .mobile-nav-link {
                    display: block;
                    width: 100%;
                    text-align: left;
                    background: none;
                    border: none;
                    color: rgba(234, 246, 255, 0.7);
                    font-size: 16px;
                    padding: 12px 0;
                    cursor: pointer;
                }

                .mobile-login {
                    display: block;
                    text-align: center;
                    margin-top: 16px;
                }

                @media (max-width: 768px) {
                    .landing-nav { display: none; }
                    .mobile-menu-btn { display: flex; }
                    .mobile-menu { display: block; }
                }

                /* ===== HERO SECTION ===== */
                .hero-section {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    padding: 140px 24px 100px;
                    overflow: visible;
                }

                .hero-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                    overflow: hidden;
                }

                .hero-video {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    min-width: 100%;
                    min-height: 100%;
                    width: auto;
                    height: auto;
                    transform: translate(-50%, -50%);
                    object-fit: cover;
                    opacity: 0.4;
                }

                .hero-gradient {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 50% 0%, rgba(14, 58, 93, 0.5) 0%, #05070A 80%);
                    z-index: 1;
                }

                .hero-particles {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        radial-gradient(rgba(0, 194, 255, 0.1) 1px, transparent 1px);
                    background-size: 60px 60px;
                    opacity: 0.3;
                    z-index: 2;
                }

                .hero-content {
                    position: relative;
                    z-index: 10;
                    text-align: center;
                    max-width: 800px;
                }

                .hero-badge {
                    display: inline-block;
                    padding: 6px 16px;
                    background: rgba(0, 194, 255, 0.1);
                    border: 1px solid rgba(0, 194, 255, 0.2);
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #00C2FF;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 24px;
                }

                .hero-title {
                    font-size: clamp(32px, 6vw, 56px);
                    font-weight: 500;
                    line-height: 1.2;
                    margin-bottom: 24px;
                    letter-spacing: 0.05em;
                    font-family: 'Sora', 'Inter', sans-serif;
                    text-transform: uppercase;
                }

                .hero-title em {
                    color: #00C2FF;
                    font-style: normal;
                    font-weight: 700;
                }

                .hero-subtitle {
                    font-size: 18px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.6);
                    max-width: 600px;
                    margin: 0 auto 40px;
                }

                .hero-cta {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    flex-wrap: wrap;
                    margin-bottom: 60px;
                }

                .btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    padding: 12px 28px;
                    border-radius: 10px;
                    font-size: 15px;
                    font-weight: 600;
                    text-decoration: none;
                    border: none;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .btn-primary {
                    background: #00C2FF;
                    color: #05070A;
                }

                .btn-primary:hover {
                    background: #33CFFF;
                    transform: translateY(-1px);
                    box-shadow: 0 8px 24px rgba(0, 194, 255, 0.3);
                }

                .btn-ghost {
                    background: transparent;
                    color: rgba(234, 246, 255, 0.7);
                    border: 1px solid rgba(234, 246, 255, 0.15);
                }

                .btn-ghost:hover {
                    color: #EAF6FF;
                    border-color: rgba(234, 246, 255, 0.3);
                    background: rgba(234, 246, 255, 0.05);
                }

                .btn-lg {
                    padding: 14px 32px;
                    font-size: 16px;
                }

                .hero-stats {
                    display: flex;
                    gap: 32px;
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .stat-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 4px;
                }

                .stat-value {
                    font-size: 28px;
                    font-weight: 700;
                    color: #00C2FF;
                }

                .stat-label {
                    font-size: 13px;
                    color: rgba(234, 246, 255, 0.5);
                }

                .stat-divider {
                    width: 1px;
                    height: 40px;
                    background: rgba(234, 246, 255, 0.1);
                }

                /* ===== SECTIONS COMMON ===== */
                .section-header {
                    text-align: center;
                    max-width: 640px;
                    margin: 0 auto 60px;
                }

                .section-badge {
                    display: inline-block;
                    padding: 6px 16px;
                    background: rgba(0, 194, 255, 0.08);
                    border: 1px solid rgba(0, 194, 255, 0.15);
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #00C2FF;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    margin-bottom: 16px;
                }

                .section-title {
                    font-size: clamp(28px, 4vw, 40px);
                    font-weight: 500;
                    line-height: 1.2;
                    margin-bottom: 16px;
                    letter-spacing: -0.01em;
                    font-family: 'Sora', 'Inter', sans-serif;
                }

                .section-subtitle {
                    font-size: 16px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.5);
                }

                /* ===== PLATFORM SECTION ===== */
                .platform-section {
                    padding: 120px 0;
                    background: #05070A;
                }

                .platform-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                    gap: 24px;
                }

                .platform-card {
                    background: rgba(11, 31, 46, 0.3);
                    border: 1px solid rgba(0, 194, 255, 0.08);
                    border-radius: 16px;
                    padding: 32px;
                    transition: all 0.3s ease;
                }

                .platform-card:hover {
                    border-color: rgba(0, 194, 255, 0.2);
                    background: rgba(11, 31, 46, 0.5);
                    transform: translateY(-2px);
                }

                .platform-icon {
                    font-size: 28px;
                    margin-bottom: 16px;
                    opacity: 0.8;
                }

                .platform-card h3 {
                    font-size: 18px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .platform-card p {
                    font-size: 14px;
                    line-height: 1.6;
                    color: rgba(234, 246, 255, 0.5);
                }

                /* ===== BENEFITS SECTION ===== */
                .benefits-section {
                    padding: 120px 0;
                    background: #0B1F2E;
                    position: relative;
                    overflow: hidden;
                }

                .benefits-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
                    gap: 24px;
                    position: relative;
                    z-index: 1;
                }

                .benefit-card {
                    padding: 32px;
                    position: relative;
                    border-radius: 16px;
                    transition: all 0.3s ease;
                }

                .benefit-card::before {
                    content: '';
                    position: absolute;
                    inset: -2px;
                    border-radius: 16px;
                    background: radial-gradient(
                        200px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
                        rgba(0, 194, 255, 0.15),
                        transparent 70%
                    );
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    z-index: 0;
                    pointer-events: none;
                }

                .benefit-card:hover::before {
                    opacity: 1;
                }

                .benefit-card > * {
                    position: relative;
                    z-index: 1;
                }

                .benefit-number {
                    font-size: 48px;
                    font-weight: 700;
                    color: rgba(0, 194, 255, 0.1);
                    line-height: 1;
                    margin-bottom: 16px;
                    transition: all 0.3s ease;
                    text-shadow: 0 0 0 rgba(0, 194, 255, 0);
                }

                .benefit-card:hover .benefit-number {
                    color: rgba(0, 194, 255, 0.4);
                    text-shadow: 0 0 30px rgba(0, 194, 255, 0.3), 0 0 60px rgba(0, 194, 255, 0.1);
                }

                .benefit-card h3 {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .benefit-card p {
                    font-size: 15px;
                    line-height: 1.6;
                    color: rgba(234, 246, 255, 0.5);
                }

                /* ===== HOW IT WORKS SECTION ===== */
                .how-section {
                    padding: 120px 0;
                    background: linear-gradient(180deg, #05070A 0%, #081018 100%);
                    position: relative;
                    overflow: hidden;
                }

                .how-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.2), transparent);
                }

                .how-section::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(ellipse at 50% 0%, rgba(0, 194, 255, 0.03) 0%, transparent 60%);
                    pointer-events: none;
                }

                .how-section .container {
                    position: relative;
                    z-index: 1;
                }

                .steps-container {
                    max-width: 800px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                }

                .step {
                    display: flex;
                    gap: 32px;
                    align-items: flex-start;
                    padding: 32px 0;
                }

                .step-number {
                    width: 48px;
                    height: 48px;
                    border-radius: 50%;
                    background: rgba(0, 194, 255, 0.1);
                    border: 1px solid rgba(0, 194, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    font-weight: 700;
                    color: #00C2FF;
                    flex-shrink: 0;
                }

                .step-content h3 {
                    font-size: 20px;
                    font-weight: 600;
                    margin-bottom: 8px;
                }

                .step-content p {
                    font-size: 15px;
                    line-height: 1.6;
                    color: rgba(234, 246, 255, 0.5);
                }

                .step-connector {
                    width: 1px;
                    height: 32px;
                    background: linear-gradient(to bottom, rgba(0, 194, 255, 0.3), transparent);
                    margin-left: 23px;
                }

                /* ===== SONAR SECTION ===== */
                .sonar-section {
                    padding: 140px 0;
                    position: relative;
                    overflow: visible;
                    background: linear-gradient(180deg, #081018 0%, #0A1828 50%, #0B1F2E 100%);
                }

                .sonar-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.15), transparent);
                }

                .sonar-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                }

                .sonar-grid {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        radial-gradient(rgba(0, 194, 255, 0.05) 1px, transparent 1px);
                    background-size: 40px 40px;
                }

                .sonar-layout {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 60px;
                    align-items: center;
                    position: relative;
                    z-index: 1;
                }

                .sonar-content {
                    max-width: 500px;
                }

                .sonar-badge {
                    background: rgba(0, 194, 255, 0.15);
                    border-color: rgba(0, 194, 255, 0.3);
                }

                .sonar-title {
                    font-size: clamp(48px, 8vw, 72px);
                    font-weight: 500;
                    line-height: 1;
                    margin-bottom: 24px;
                    letter-spacing: -0.01em;
                    font-family: 'Sora', 'Inter', sans-serif;
                }

                .sonar-title-accent {
                    color: #00C2FF;
                }

                .sonar-subtitle {
                    font-size: 18px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.6);
                    margin-bottom: 40px;
                }

                .sonar-features {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                    margin-bottom: 40px;
                }

                .sonar-feature {
                    display: flex;
                    gap: 16px;
                    align-items: flex-start;
                }

                .sonar-feature-icon {
                    font-size: 24px;
                    color: #00C2FF;
                    flex-shrink: 0;
                }

                .sonar-feature h4 {
                    font-size: 16px;
                    font-weight: 600;
                    margin-bottom: 4px;
                }

                .sonar-feature p {
                    font-size: 14px;
                    line-height: 1.6;
                    color: rgba(234, 246, 255, 0.5);
                }

                .sonar-visual {
                    position: relative;
                    width: 400px;
                    height: 400px;
                    opacity: 0.7;
                }

                .sonar-circle {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    border-radius: 50%;
                    border: 1px solid rgba(0, 194, 255, 0.2);
                    animation: sonar-circle-pulse 4s ease-in-out infinite;
                }

                .sonar-circle-1 { 
                    width: 180px; 
                    height: 180px; 
                    border-color: rgba(0, 194, 255, 0.3);
                    animation-delay: 0s;
                }
                .sonar-circle-2 { 
                    width: 280px; 
                    height: 280px; 
                    border-color: rgba(0, 194, 255, 0.2);
                    animation-delay: 0.5s;
                }
                .sonar-circle-3 { 
                    width: 380px; 
                    height: 380px; 
                    border-color: rgba(0, 194, 255, 0.15);
                    animation-delay: 1s;
                }

                @keyframes sonar-circle-pulse {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.6;
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(1.05);
                        opacity: 1;
                    }
                }

                .sonar-sweep {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 200px;
                    height: 2px;
                    background: linear-gradient(to right, 
                        rgba(0, 194, 255, 0) 0%, 
                        rgba(0, 194, 255, 0.9) 50%, 
                        rgba(0, 194, 255, 0.3) 80%, 
                        transparent 100%
                    );
                    transform-origin: left center;
                    animation: sonar-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    filter: drop-shadow(0 0 8px rgba(0, 194, 255, 0.5));
                }


                @keyframes sonar-sweep {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .sonar-dot {
                    position: absolute;
                    width: 6px;
                    height: 6px;
                    background: #00C2FF;
                    border-radius: 50%;
                    box-shadow: 0 0 12px rgba(0, 194, 255, 0.6), 0 0 24px rgba(0, 194, 255, 0.2);
                    animation: sonar-dot-pulse 4s ease-in-out infinite;
                }

                .sonar-dot::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    border: 1px solid rgba(0, 194, 255, 0.3);
                    animation: sonar-dot-ring 4s ease-in-out infinite;
                }

                .sonar-dot:nth-child(1) { animation-delay: 0s; }
                .sonar-dot:nth-child(2) { animation-delay: 1.5s; }
                .sonar-dot:nth-child(3) { animation-delay: 3s; }

                @keyframes sonar-dot-pulse {
                    0%, 100% { 
                        opacity: 0.3; 
                        transform: scale(0.8);
                    }
                    50% { 
                        opacity: 1; 
                        transform: scale(1.2);
                    }
                }

                @keyframes sonar-dot-ring {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(0.5);
                        opacity: 0;
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(2);
                        opacity: 1;
                    }
                }

                /* Center dot with extra glow */
                .sonar-visual::before {
                    content: '';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 8px;
                    height: 8px;
                    background: #00C2FF;
                    border-radius: 50%;
                    box-shadow: 0 0 20px rgba(0, 194, 255, 0.8), 0 0 40px rgba(0, 194, 255, 0.3);
                    animation: center-pulse 3s ease-in-out infinite;
                }

                @keyframes center-pulse {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.8;
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(1.5);
                        opacity: 1;
                    }
                }

                /* Radar Detection Cards */
                .radar-card {
                    position: absolute;
                    opacity: 0;
                    transform: scale(0.8) translateY(10px);
                    animation: radar-card-appear 6s ease-in-out infinite;
                    z-index: 10;
                }

                .radar-card[data-delay="0"] { animation-delay: 0s; }
                .radar-card[data-delay="1.5"] { animation-delay: 1.5s; }
                .radar-card[data-delay="3"] { animation-delay: 3s; }

                @keyframes radar-card-appear {
                    0%, 15% { 
                        opacity: 0;
                        transform: scale(0.8) translateY(10px);
                    }
                    20%, 50% { 
                        opacity: 1;
                        transform: scale(1) translateY(0);
                    }
                    85%, 100% { 
                        opacity: 0;
                        transform: scale(0.8) translateY(-10px);
                    }
                }

                .radar-card-dot {
                    width: 12px;
                    height: 12px;
                    background: #00C2FF;
                    border-radius: 50%;
                    box-shadow: 0 0 16px rgba(0, 194, 255, 0.8), 0 0 32px rgba(0, 194, 255, 0.3);
                    margin-bottom: 8px;
                    animation: radar-dot-blink 2s ease-in-out infinite;
                }

                @keyframes radar-dot-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }

                .radar-card-content {
                    background: rgba(5, 7, 10, 0.92);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(0, 194, 255, 0.3);
                    border-radius: 12px;
                    padding: 12px 16px;
                    min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 194, 255, 0.1);
                }

                .radar-card-content h4 {
                    font-size: 13px;
                    font-weight: 600;
                    color: #00C2FF;
                    margin: 0 0 4px 0;
                    white-space: nowrap;
                }

                .radar-card-content p {
                    font-size: 11px;
                    color: rgba(234, 246, 255, 0.6);
                    margin: 0 0 4px 0;
                    line-height: 1.4;
                }

                .radar-card-phone {
                    font-size: 10px;
                    color: rgba(234, 246, 255, 0.4);
                    font-family: monospace;
                }

                @media (max-width: 900px) {
                    .sonar-layout {
                        grid-template-columns: 1fr;
                        gap: 40px;
                    }
                    .sonar-content { max-width: 100%; }
                    .sonar-visual { display: none; }
                }

                /* ===== CREDIBILITY SECTION ===== */
                .credibility-section {
                    padding: 80px 0;
                    background: #0B1F2E;
                    border-top: 1px solid rgba(0, 194, 255, 0.05);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.05);
                }

                .credibility-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 32px;
                    text-align: center;
                }

                .credibility-value {
                    display: block;
                    font-size: 40px;
                    font-weight: 700;
                    color: #00C2FF;
                    margin-bottom: 8px;
                }

                .credibility-label {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                }

                @media (max-width: 768px) {
                    .credibility-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 24px;
                    }
                }

                /* ===== CTA SECTION ===== */
                .cta-section {
                    padding: 140px 0;
                    position: relative;
                    text-align: center;
                    overflow: hidden;
                }

                .cta-bg {
                    position: absolute;
                    inset: 0;
                    z-index: 0;
                }

                .cta-gradient {
                    position: absolute;
                    inset: 0;
                    background: 
                        radial-gradient(ellipse at 30% 50%, rgba(0, 194, 255, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 50%, rgba(14, 58, 93, 0.4) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 100%, rgba(0, 194, 255, 0.05) 0%, transparent 40%);
                }

                .cta-particles {
                    position: absolute;
                    inset: 0;
                    background-image: 
                        radial-gradient(rgba(0, 194, 255, 0.15) 1px, transparent 1px),
                        radial-gradient(rgba(0, 194, 255, 0.1) 1px, transparent 1px);
                    background-size: 80px 80px, 40px 40px;
                    background-position: 0 0, 20px 20px;
                    opacity: 0.4;
                    animation: cta-particles-move 20s linear infinite;
                }

                @keyframes cta-particles-move {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-80px); }
                }

                .cta-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 600px;
                    height: 600px;
                    background: radial-gradient(circle, rgba(0, 194, 255, 0.06) 0%, transparent 70%);
                    border-radius: 50%;
                    animation: cta-glow-pulse 6s ease-in-out infinite;
                }

                @keyframes cta-glow-pulse {
                    0%, 100% { 
                        transform: translate(-50%, -50%) scale(1);
                        opacity: 0.5;
                    }
                    50% { 
                        transform: translate(-50%, -50%) scale(1.2);
                        opacity: 1;
                    }
                }

                .cta-title {
                    font-size: clamp(28px, 5vw, 48px);
                    font-weight: 500;
                    line-height: 1.2;
                    margin-bottom: 16px;
                    position: relative;
                    z-index: 1;
                    font-family: 'Sora', 'Inter', sans-serif;
                    letter-spacing: -0.01em;
                }

                .cta-subtitle {
                    font-size: 18px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.5);
                    max-width: 500px;
                    margin: 0 auto 40px;
                    position: relative;
                    z-index: 1;
                }

                .cta-buttons {
                    display: flex;
                    gap: 16px;
                    justify-content: center;
                    flex-wrap: wrap;
                    position: relative;
                    z-index: 1;
                }

                /* ===== CONTACT MODAL ===== */
                .contact-modal-overlay {
                    position: fixed !important;
                    inset: 0 !important;
                    background: rgba(5, 7, 10, 0.85) !important;
                    backdrop-filter: blur(8px) !important;
                    z-index: 2000 !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 24px !important;
                    opacity: 1 !important;
                    pointer-events: all !important;
                    animation: contact-modal-fade-in 0.3s ease !important;
                }

                @keyframes contact-modal-fade-in {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .contact-modal-content {
                    background: rgba(11, 31, 46, 0.95) !important;
                    border: 1px solid rgba(0, 194, 255, 0.15) !important;
                    border-radius: 20px !important;
                    padding: 40px !important;
                    max-width: 640px !important;
                    width: 100% !important;
                    position: relative !important;
                    animation: contact-modal-slide-in 0.3s ease !important;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 194, 255, 0.05) !important;
                }

                @keyframes contact-modal-slide-in {
                    from { 
                        opacity: 0;
                        transform: translateY(20px) scale(0.95);
                    }
                    to { 
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                .modal-close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    background: none;
                    border: none;
                    color: rgba(234, 246, 255, 0.5);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .modal-close:hover {
                    color: #EAF6FF;
                    background: rgba(234, 246, 255, 0.05);
                }

                .modal-header {
                    text-align: left;
                    margin-bottom: 32px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .modal-header-icon {
                    width: 48px;
                    height: 48px;
                    margin: 0 auto 16px;
                    background: rgba(0, 194, 255, 0.08);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 1px solid rgba(0, 194, 255, 0.12);
                }

                .modal-header-icon svg {
                    width: 24px;
                    height: 24px;
                }

                .modal-title {
                    font-size: 24px;
                    font-weight: 600;
                    color: #EAF6FF;
                    margin-bottom: 8px;
                    letter-spacing: 0;
                }

                .modal-subtitle {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                    line-height: 1.6;
                }

                .contact-form {
                    display: flex;
                    flex-direction: column;
                    gap: 20px;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }

                @media (max-width: 600px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }

                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .form-group label {
                    font-size: 13px;
                    font-weight: 500;
                    color: rgba(234, 246, 255, 0.7);
                    letter-spacing: 0.01em;
                }

                .input-wrapper {
                    position: relative;
                    transition: all 0.2s ease;
                }

                .input-wrapper input,
                .input-wrapper textarea {
                    width: 100%;
                    background: rgba(5, 7, 10, 0.5);
                    border: 1.5px solid rgba(0, 194, 255, 0.12);
                    border-radius: 10px;
                    padding: 14px 16px;
                    font-size: 14px;
                    color: #EAF6FF;
                    font-family: inherit;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                    -webkit-font-smoothing: antialiased;
                    -moz-osx-font-smoothing: grayscale;
                }

                .input-wrapper input::placeholder,
                .input-wrapper textarea::placeholder {
                    color: rgba(234, 246, 255, 0.25);
                    font-size: 14px;
                }

                .input-wrapper input:hover,
                .input-wrapper textarea:hover {
                    border-color: rgba(0, 194, 255, 0.2);
                    background: rgba(5, 7, 10, 0.7);
                }

                .input-wrapper input:focus,
                .input-wrapper textarea:focus {
                    border-color: rgba(0, 194, 255, 0.5);
                    box-shadow: 0 0 0 4px rgba(0, 194, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2);
                    background: rgba(5, 7, 10, 0.8);
                    transform: translateY(-1px);
                }

                .input-wrapper.has-error input,
                .input-wrapper.has-error textarea {
                    border-color: rgba(239, 68, 68, 0.5);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
                }

                .input-wrapper.has-error input:focus,
                .input-wrapper.has-error textarea:focus {
                    border-color: rgba(239, 68, 68, 0.6);
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .field-error {
                    display: block;
                    font-size: 12px;
                    color: rgba(239, 129, 129, 0.9);
                    margin-top: 6px;
                    padding-left: 4px;
                    animation: error-slide-in 0.2s ease;
                }

                @keyframes error-slide-in {
                    from {
                        opacity: 0;
                        transform: translateY(-4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .form-group textarea {
                    resize: vertical;
                    min-height: 100px;
                    line-height: 1.6;
                }

                .form-submit {
                    width: 100%;
                    margin-top: 8px;
                    position: relative;
                    overflow: hidden;
                    transform: translateZ(0);
                }

                .form-submit:hover:not(:disabled) {
                    transform: translateY(-1px) scale(1.01);
                    box-shadow: 0 6px 24px rgba(0, 194, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .form-submit:active:not(:disabled) {
                    transform: translateY(0) scale(0.99);
                }

                .form-submit:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .btn-loading {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                }

                .spinner {
                    width: 18px;
                    height: 18px;
                    animation: spinner-rotate 1s linear infinite;
                }

                @keyframes spinner-rotate {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                .form-trust {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 24px;
                    margin-top: 16px;
                    padding-top: 20px;
                    border-top: 1px solid rgba(0, 194, 255, 0.06);
                }

                .trust-item {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 12px;
                    color: rgba(234, 246, 255, 0.4);
                }

                .trust-item svg {
                    color: rgba(0, 194, 255, 0.5);
                    flex-shrink: 0;
                }

                @media (max-width: 480px) {
                    .form-trust {
                        flex-direction: column;
                        gap: 8px;
                    }
                }

                .form-submit {
                    width: 100%;
                    margin-top: 8px;
                }

                .modal-success {
                    text-align: center;
                    padding: 20px 0;
                }

                .success-icon {
                    margin-bottom: 24px;
                    display: flex;
                    justify-content: center;
                }

                .success-icon svg {
                    animation: success-pop 0.5s ease;
                }

                @keyframes success-pop {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.2); }
                    100% { transform: scale(1); }
                }

                .modal-success .modal-title {
                    margin-bottom: 12px;
                }

                .modal-success .btn {
                    margin-top: 24px;
                }

                .cta-section .btn {
                    position: relative;
                    z-index: 1;
                }

                /* ===== FOOTER ===== */
                .landing-footer {
                    padding: 80px 0 40px;
                    background: #05070A;
                    border-top: 1px solid rgba(0, 194, 255, 0.05);
                }

                .landing-footer .container {
                    max-width: 1400px;
                    padding: 0 48px;
                }

                .footer-grid {
                    display: grid;
                    grid-template-columns: 2fr 1fr 1fr 1fr;
                    gap: 48px;
                    margin-bottom: 60px;
                }

                .footer-logo img {
                    height: 24px;
                    margin-bottom: 16px;
                }

                .footer-tagline {
                    font-size: 14px;
                    line-height: 1.6;
                    color: rgba(234, 246, 255, 0.4);
                    max-width: 280px;
                }

                .footer-links h4 {
                    font-size: 13px;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                    color: rgba(234, 246, 255, 0.4);
                    margin-bottom: 20px;
                }

                .footer-links ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }

                .footer-links li {
                    margin-bottom: 12px;
                }

                .footer-links a,
                .footer-links button {
                    background: none;
                    border: none;
                    color: rgba(234, 246, 255, 0.6);
                    font-size: 14px;
                    cursor: pointer;
                    transition: color 0.2s ease;
                    padding: 0;
                }

                .footer-links a:hover,
                .footer-links button:hover {
                    color: #EAF6FF;
                }

                .footer-bottom {
                    padding-top: 40px;
                    border-top: 1px solid rgba(0, 194, 255, 0.05);
                    text-align: center;
                }

                .footer-bottom p {
                    font-size: 13px;
                    color: rgba(234, 246, 255, 0.3);
                }

                @media (max-width: 900px) {
                    .footer-grid {
                        grid-template-columns: 1fr 1fr;
                        gap: 32px;
                    }
                }

                @media (max-width: 600px) {
                    .footer-grid {
                        grid-template-columns: 1fr;
                        gap: 24px;
                    }
                }

                /* ===== PRICING SECTION ===== */
                .pricing-section {
                    padding: 120px 0;
                    background: linear-gradient(180deg, #0B1F2E 0%, #0E2A42 30%, #05070A 100%);
                    position: relative;
                }

                .pricing-section::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    height: 1px;
                    background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.2), transparent);
                }

                .pricing-section .container {
                    position: relative;
                    z-index: 1;
                }

                .pricing-toggle {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 16px;
                    margin-bottom: 48px;
                }

                .toggle-label {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                }

                .toggle-label-active {
                    font-size: 14px;
                    color: #EAF6FF;
                    font-weight: 600;
                }

                .toggle-switch {
                    width: 48px;
                    height: 26px;
                    border-radius: 13px;
                    background: rgba(0, 194, 255, 0.2);
                    border: 1px solid rgba(0, 194, 255, 0.3);
                    cursor: pointer;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .toggle-switch.active {
                    background: rgba(0, 194, 255, 0.4);
                    border-color: #00C2FF;
                }

                .toggle-knob {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: #00C2FF;
                    position: absolute;
                    top: 2px;
                    left: 2px;
                    transition: all 0.3s ease;
                }

                .toggle-switch.active .toggle-knob {
                    left: 22px;
                }

                .toggle-discount {
                    display: inline-block;
                    padding: 2px 8px;
                    background: rgba(0, 194, 255, 0.15);
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 600;
                    color: #00C2FF;
                    margin-left: 4px;
                }

                .pricing-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px;
                    max-width: 1000px;
                    margin: 0 auto;
                }

                .pricing-card {
                    background: rgba(11, 31, 46, 0.3);
                    border: 1px solid rgba(0, 194, 255, 0.1);
                    border-radius: 20px;
                    padding: 32px;
                    position: relative;
                    transition: all 0.3s ease;
                }

                .pricing-card:hover {
                    transform: translateY(-4px);
                    border-color: rgba(0, 194, 255, 0.2);
                }

                .pricing-card.highlighted {
                    border-color: #00C2FF;
                    border-width: 2px;
                    background: rgba(0, 194, 255, 0.05);
                }

                .pricing-badge {
                    position: absolute;
                    top: -12px;
                    left: 50%;
                    transform: translateX(-50%);
                    padding: 4px 16px;
                    background: #00C2FF;
                    color: #05070A;
                    font-size: 12px;
                    font-weight: 700;
                    border-radius: 20px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }

                .pricing-name {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }

                .pricing-description {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                    margin-bottom: 24px;
                }

                .pricing-price {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                    margin-bottom: 4px;
                }

                .pricing-currency {
                    font-size: 20px;
                    color: rgba(234, 246, 255, 0.6);
                }

                .pricing-value {
                    font-size: 48px;
                    font-weight: 700;
                    color: #00C2FF;
                    line-height: 1;
                }

                .pricing-period {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                }

                .pricing-annual-note {
                    font-size: 12px;
                    color: rgba(234, 246, 255, 0.4);
                    margin-bottom: 24px;
                }

                .pricing-features {
                    list-style: none;
                    padding: 0;
                    margin: 0 0 32px 0;
                }

                .pricing-features li {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 8px 0;
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.8);
                }

                .feature-check {
                    color: #00C2FF;
                    font-weight: 700;
                }

                .pricing-cta {
                    width: 100%;
                }

                /* ===== FAQ SECTION ===== */
                .faq-section {
                    padding: 120px 0;
                    background: #0B1F2E;
                }

                .faq-container {
                    max-width: 700px;
                    margin: 0 auto;
                }

                .faq-item {
                    border-bottom: 1px solid rgba(0, 194, 255, 0.1);
                }

                .faq-question {
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 0;
                    background: none;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                }

                .faq-question span:first-child {
                    font-size: 16px;
                    font-weight: 500;
                    color: #EAF6FF;
                    flex: 1;
                    padding-right: 24px;
                }

                .faq-icon {
                    font-size: 20px;
                    color: #00C2FF;
                    flex-shrink: 0;
                }

                .faq-answer {
                    padding: 0 0 20px 0;
                }

                .faq-answer p {
                    font-size: 15px;
                    line-height: 1.7;
                    color: rgba(234, 246, 255, 0.6);
                }

                /* ===== UTILITY ===== */
                .desktop-only {
                    display: block;
                }

                @media (max-width: 768px) {
                    .desktop-only { display: none !important; }
                }
            `}</style>
        </div>
    );
}