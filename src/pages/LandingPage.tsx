import { useState, useEffect, useRef } from 'react';
import MistBackground from '../components/ui/MistBackground';

// ===== DATA: FAQ Items =====
const faqItems = [
    {
        question: "Como funciona o período de teste?",
        answer: "Oferecemos 14 dias de teste gratuito com acesso completo a todas as funcionalidades. Não é necessário cartão de crédito. No final, escolha o plano ideal."
    },
    {
        question: "Preciso de cartão de crédito para começar?",
        answer: "Não. Crie sua conta e explore todas as funcionalidades gratuitamente por 14 dias. Só pedimos pagamento se decidir fazer upgrade."
    },
    {
        question: "Posso importar meus leads existentes?",
        answer: "Sim! A ORCA suporta Excel, CSV, Google Sheets e integração via API com Salesforce, HubSpot, Pipedrive e outros CRMs."
    },
    {
        question: "A ORCA funciona com meu CRM atual?",
        answer: "Sim. Integramos nativamente com os principais CRMs via API ou Zapier. Também oferecemos integração personalizada."
    },
    {
        question: "Como é feita a qualificação automática?",
        answer: "Nossa IA analisa setor, tamanho da empresa, localização, engagement e dados públicos. Cada lead recebe um score de 0-100 indicando potencial de conversão."
    },
    {
        question: "Quais formatos de arquivo são suportados?",
        answer: "Excel (.xlsx, .xls), CSV, Google Sheets (via link) e JSON. Também conectamos diretamente via API REST ou webhook."
    },
    {
        question: "Existe suporte em português?",
        answer: "Sim! Nossa equipe fala português e está disponível por email e chat (9h-18h, dias úteis). Planos Enterprise incluem suporte 24/7."
    },
    {
        question: "Posso cancelar a qualquer momento?",
        answer: "Sim. Sem fidelização. Cancele quando quiser pelo painel, sem penalidades ou custos extras."
    }
];

// ===== DATA: Testimonials (with specific metrics) =====
const testimonials = [
    {
        name: "Rafael Costa",
        role: "Head de Vendas",
        company: "Conta Azul",
        initials: "RC",
        quote: "Dobramos o número de reuniões qualificadas em 6 semanas. A ORCA eliminou 80% do tempo que perdíamos com prospecção manual.",
        rating: 5,
        metric: "2x mais reuniões qualificadas"
    },
    {
        name: "Mariana Silva",
        role: "Diretora Comercial",
        company: "RD Station",
        initials: "MS",
        quote: "O Sonar encontrou 47 leads que nosso time nem sabia que existiam. Fechamos 12 contratos nos primeiros 30 dias.",
        rating: 5,
        metric: "12 novos contratos em 30 dias"
    },
    {
        name: "Carlos Mendes",
        role: "CEO",
        company: "PipeDrive Brasil",
        initials: "CM",
        quote: "Reduzimos de 3 semanas para 2 dias o tempo entre captar um lead e identificar seu potencial. Isso mudou nosso jogo.",
        rating: 5,
        metric: "De 3 semanas para 2 dias"
    }
];

// ===== DATA: Client Logos =====
const clientLogos = [
    { name: "TechVentures", color: "#00C2FF" },
    { name: "DataFlow", color: "#00FF80" },
    { name: "GrowthLabs", color: "#FF6B35" },
    { name: "SalesPro", color: "#A855F7" },
    { name: "CloudBase", color: "#06B6D4" },
    { name: "Innovate", color: "#F59E0B" }
];

// ===== DATA: Pricing Plans =====
const pricingPlans = [
    {
        name: "Starter",
        description: "Para equipes pequenas que estão começando",
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
        cta: "Ver minha lista grátis",
        highlighted: false,
        badge: null
    },
    {
        name: "Growth",
        description: "Para equipes em crescimento acelerado",
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
        highlighted: true,
        badge: "Mais escolhido por times de 5–15 pessoas"
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
        highlighted: false,
        badge: null
    }
];

// ===== ANIMATION HOOK: Intersection Observer for scroll animations =====
function useScrollAnimation() {
    const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        // Add .visible class to the element
                        entry.target.classList.add('visible');
                        setVisibleSections((prev) => new Set([...prev, entry.target.id]));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const elements = document.querySelectorAll('[data-animate]');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    return visibleSections;
}

// ===== COUNTER ANIMATION COMPONENT =====
function CounterAnimation({ target, duration = 1500, suffix = '', prefix = '' }: { target: number; duration?: number; suffix?: string; prefix?: string }) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) return;

        let startTime: number;
        let animationFrame: number;

        const animate = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);
            const currentCount = Math.round(easedProgress * target);
            setCount(currentCount);

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animationFrame);
    }, [isVisible, target, duration]);

    return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

export default function LandingPage() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [activeSection, setActiveSection] = useState('inicio');
    const [annualBilling, setAnnualBilling] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
    const [contactModalOpen, setContactModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', company: '', phone: '', message: '' });
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [heroAnimated, setHeroAnimated] = useState(false);
    const [demoModalOpen, setDemoModalOpen] = useState(false);
    const [heroCaptureSubmitted, setHeroCaptureSubmitted] = useState(false);
    const [stickyBarDismissed, setStickyBarDismissed] = useState(() => {
        return typeof window !== 'undefined' ? sessionStorage.getItem('orca_bar_dismissed') === 'true' : false;
    });
    const [demoFormData, setDemoFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        teamSize: ''
    });
    const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    const visibleSections = useScrollAnimation();

    // ===== SCROLL HANDLERS =====
    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Hero staggered animation
    useEffect(() => {
        const timer = setTimeout(() => setHeroAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Active section tracking
    useEffect(() => {
        const sections = ['inicio', 'clientes', 'problema', 'features', 'como-funciona', 'depoimentos', 'sonar', 'pricing', 'faq', 'contacto'];

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { rootMargin: '-50% 0px', threshold: 0 }
        );

        sections.forEach((id) => {
            const el = document.getElementById(id);
            if (el) {
                sectionRefs.current[id] = el;
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setActiveSection(id);
        }
        setMobileMenuOpen(false);
    };

    // ===== FORM HANDLERS =====
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
        setFormData((prev) => ({ ...prev, [name]: value }));
        const error = validateField(name, value);
        setFormErrors((prev) => ({ ...prev, [name]: error }));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 12) value = value.slice(0, 12);

        let formatted = '';
        if (value.length > 0) {
            if (value.length <= 3) formatted = '+' + value;
            else if (value.length <= 6) formatted = '+351 ' + value.slice(3);
            else if (value.length <= 9) formatted = '+351 ' + value.slice(3, 6) + ' ' + value.slice(6);
            else formatted = '+351 ' + value.slice(3, 6) + ' ' + value.slice(6, 9) + ' ' + value.slice(9);
        }

        e.target.value = formatted;
        setFormData((prev) => ({ ...prev, phone: formatted }));
        setFormErrors((prev) => ({ ...prev, phone: validateField('phone', formatted) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
        await new Promise((resolve) => setTimeout(resolve, 1500));
        console.log('Form submitted:', formData);
        setFormSubmitted(true);
        setIsSubmitting(false);
    };

    const closeModal = () => setContactModalOpen(false);

    // Demo modal handlers
    const openDemoModal = () => setDemoModalOpen(true);
    const closeDemoModal = () => setDemoModalOpen(false);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && contactModalOpen) closeModal();
            if (e.key === 'Escape' && demoModalOpen) closeDemoModal();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [contactModalOpen, demoModalOpen]);

    // Sticky bar dismiss
    const dismissStickyBar = () => {
        setStickyBarDismissed(true);
        sessionStorage.setItem('orca_bar_dismissed', 'true');
    };

    // Hero capture handler
    const handleHeroCapture = async (e: React.FormEvent) => {
        e.preventDefault();
        await new Promise(resolve => setTimeout(resolve, 800));
        setHeroCaptureSubmitted(true);
    };

    // Demo form handler
    const handleDemoSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await new Promise(resolve => setTimeout(resolve, 1200));
        closeDemoModal();
    };

    const handleDemoInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDemoFormData(prev => ({ ...prev, [name]: value }));
    };

    const navItems = [
        { id: 'inicio', label: 'Início' },
        { id: 'problema', label: 'Problema' },
        { id: 'features', label: 'Soluções' },
        { id: 'como-funciona', label: 'Como Funciona' },
        { id: 'sonar', label: 'Sonar' },
        { id: 'pricing', label: 'Preços' },
        { id: 'contacto', label: 'Contacto' },
    ];

    return (
        <div className="landing-page">
            {/* ===== NAVBAR ===== */}
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
                        <a href="/app" className="btn btn-login">Login</a>
                        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                            <span /><span /><span />
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div className="mobile-menu">
                        <nav>
                            {navItems.map((item) => (
                                <button key={item.id} className="mobile-nav-link" onClick={() => scrollToSection(item.id)}>
                                    {item.label}
                                </button>
                            ))}
                            <a href="/app" className="btn btn-login mobile-login">Login</a>
                        </nav>
                    </div>
                )}
            </header>

            {/* ===== HERO SECTION ===== */}
            <section id="inicio" className="hero-section">
                <div className="hero-bg">
                    <video className="hero-video" autoPlay muted playsInline poster="/images/ORCA.png">
                        <source src="/images/video/video-orca.mp4" type="video/mp4" />
                    </video>
                    <div className="hero-gradient" />
                    <div className="hero-particles" />
                </div>
                <div className="hero-content">
                    <div className={`hero-badge animate-fade-up${heroAnimated ? ' visible' : ''}`}>Inteligência Comercial B2B</div>
                    <h1 className={`hero-title animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '120ms' }}>
                        Encontre, qualifique e converta leads B2B<br />
                        <em>sem depender de achismo.</em>
                    </h1>
                    <p className={`hero-subtitle animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '240ms' }}>
                        A ORCA analisa dados de mercado em tempo real e entrega listas de prospecção qualificadas direto para o seu time comercial. Sem planilha manual. Sem leads frios.
                    </p>
                    <div className={`hero-cta animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '360ms' }}>
                        <a href="/app" className="btn btn-primary btn-lg pulse-animation">
                            Ver minha lista de leads grátis
                        </a>
                        <button className="btn btn-ghost btn-lg" onClick={() => scrollToSection('sonar')}>
                            Ver demo de 2 minutos →
                        </button>
                    </div>
                    <div className={`hero-stats animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '480ms' }}>
                        <div className="stat-item">
                            <span className="stat-value"><CounterAnimation target={200} suffix="%" prefix="+" /></span>
                            <span className="stat-label">em oportunidades geradas por mês</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value"><CounterAnimation target={60} suffix="%" prefix="-" /></span>
                            <span className="stat-label">menos tempo em prospecção manual</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value"><CounterAnimation target={100} suffix="%" /></span>
                            <span className="stat-label">dos dados em conformidade com LGPD</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CLIENT LOGOS BAR (Social Proof) ===== */}
            <section id="clientes" className="clients-section">
                <div className="container">
                    <p className="clients-label">Empresas que confiam na ORCA</p>
                    <div className="clients-grid">
                        {clientLogos.map((logo, idx) => (
                            <div key={idx} className="client-logo" data-animate={`clients-${idx}`}>
                                <span className="client-logo-text">{logo.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== PAS SECTION (Problem-Agitation-Solution) ===== */}
            <section id="problema" className="pas-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">O Problema</span>
                        <h2 className="section-title">Seu time de vendas ainda perde tempo assim?</h2>
                    </div>
                    <div className="pas-grid">
                        <div className="pas-card problem" data-animate="pas-1">
                            <div className="pas-icon">✕</div>
                            <h3>Prospecção manual interminável</h3>
                            <p>Seus SDRs gastam horas garimpando leads no Google, LinkedIn e bases desatualizadas.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-2">
                            <div className="pas-icon">✕</div>
                            <h3>Listas frias e desatualizadas</h3>
                            <p>Contatos que não respondem, emails que voltam e telefones que não existem mais.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-3">
                            <div className="pas-icon">✕</div>
                            <h3>Leads sem qualificação real</h3>
                            <p>Reuniões marcadas com empresas que não têm budget, autoridade ou necessidade real.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-4">
                            <div className="pas-icon">✕</div>
                            <h3>Concorrência chegando primeiro</h3>
                            <p>Enquanto seu time analisa planilhas, o concorrente já fechou o contrato.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-5">
                            <div className="pas-icon">✕</div>
                            <h3>Relatórios que ninguém entende</h3>
                            <p>Dashboards complexos que exigem horas de análise e não geram ações práticas.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-6">
                            <div className="pas-icon">✕</div>
                            <h3>Time comercial desalinhado</h3>
                            <p>Cada vendedor usa seu próprio método, sem padronização ou visibilidade do todo.</p>
                        </div>
                    </div>
                    <div className="pas-solution" data-animate="pas-solution">
                        <div className="pas-solution-icon">✓</div>
                        <h3>A ORCA resolve isso automaticamente.</h3>
                        <p>Enquanto seu time dorme, nossa IA varre o mercado, qualifica leads e entrega oportunidades quentes prontas para abordagem.</p>
                    </div>
                </div>
            </section>

            {/* ===== FEATURES SECTION (rewritten as benefit-oriented) ===== */}
            <section id="features" className="features-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Funcionalidades</span>
                        <h2 className="section-title">O que a ORCA faz pelo seu time</h2>
                        <p className="section-subtitle">
                            Cada funcionalidade foi desenhada para eliminar trabalho manual e acelerar resultados.
                        </p>
                    </div>
                    <div className="features-grid">
                        <div className="feature-card" data-animate="feature-1">
                            <div className="feature-icon">◈</div>
                            <h3>Veja onde sua equipe está perdendo vendas</h3>
                            <p>Dashboard executivo com métricas em tempo real: conversão por etapa, velocidade do pipeline e previsão de receita.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-2">
                            <div className="feature-icon">◎</div>
                            <h3>Saiba exatamente em qual etapa cada lead travou</h3>
                            <p>Visão completa do funil com alertas automáticos quando um lead precisa de atenção.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-3">
                            <div className="feature-icon">⊕</div>
                            <h3>Integre com seu CRM em menos de 5 minutos</h3>
                            <p>Conexão nativa com Salesforce, HubSpot, Pipedrive e outros. Ou use nossa API para integração customizada.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-4">
                            <div className="feature-icon">▦</div>
                            <h3>Gerencie sua carteira sem abrir planilha</h3>
                            <p>Pipeline visual Kanban: arraste e solte leads entre etapas com gatilhos automáticos de follow-up.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-5">
                            <div className="feature-icon">◉</div>
                            <h3>Receba alertas quando um lead esquentar</h3>
                            <p>Monitoramento contínuo de sinais de compra: mudanças de cargo, rodadas de investimento, expansões de equipe.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-6">
                            <div className="feature-icon">⊡</div>
                            <h3>Relatórios prontos para apresentar ao board</h3>
                            <p>Gere relatórios executivos em 1 clique: performance do time, ROI por canal e projeções de receita.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== HOW IT WORKS SECTION ===== */}
            <section id="como-funciona" className="how-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Como Funciona</span>
                        <h2 className="section-title">Setup em 10 minutos. Primeiros leads ainda hoje.</h2>
                    </div>
                    <div className="steps-container">
                        <div className="step" data-animate="step-1">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Conecte suas fontes de dados</h3>
                                <p>Importe de Excel, CSV, Google Sheets ou conecte seu CRM existente. Mapeamento automático de colunas.</p>
                            </div>
                        </div>
                        <div className="step-connector" data-animate="step-connector-1" />
                        <div className="step" data-animate="step-2">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>A IA qualifica automaticamente</h3>
                                <p>Nosso algoritmo analisa cada lead e atribui um score de 0-100 baseado em potencial real de conversão.</p>
                            </div>
                        </div>
                        <div className="step-connector" data-animate="step-connector-2" />
                        <div className="step" data-animate="step-3">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Seu time foca apenas no que importa</h3>
                                <p>Leads quentes vão direto para o pipeline. Alertas automáticos avisam quando agir. Relatórios mostram resultados.</p>
                            </div>
                        </div>
                    </div>

                    {/* ===== HOW IT WORKS INLINE CAPTURE ===== */}
                    <div className="hero-capture-wrapper" style={{ marginTop: '48px' }}>
                        {!heroCaptureSubmitted ? (
                            <form className="hero-capture__form hero-capture__form-inline" onSubmit={handleHeroCapture}>
                                <input className="hero-capture__input" type="email" placeholder="seu@email.com.br" required />
                                <button type="submit" className="hero-capture__btn">
                                    Ver meus leads grátis
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="5" y1="12" x2="19" y2="12"/>
                                        <polyline points="12 5 19 12 12 19"/>
                                    </svg>
                                </button>
                            </form>
                        ) : (
                            <div className="hero-capture__success hero-capture__success-inline">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12"/>
                                </svg>
                                <p>Perfeito! <span>Enviamos o acesso para seu email.</span> Verifique a caixa de entrada.</p>
                            </div>
                        )}
                        <div className="hero-capture__trust">
                            <span className="hero-capture__trust-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                Sem cartão de crédito
                            </span>
                            <span className="hero-capture__trust-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                14 dias grátis
                            </span>
                            <span className="hero-capture__trust-item">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                LGPD compliant
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== TESTIMONIALS SECTION ===== */}
            <section id="depoimentos" className="testimonials-section">
                <div className="container">
                    <div className="section-header">
                        <span className="section-badge">Depoimentos</span>
                        <h2 className="section-title">Resultados reais de times reais</h2>
                    </div>
                    <div className="testimonials-grid">
                        {testimonials.map((t, idx) => (
                            <div key={idx} className="testimonial-card" data-animate={`testimonial-${idx}`}>
                                <div className="testimonial-header">
                                    <div className="testimonial-avatar">{t.initials}</div>
                                    <div>
                                        <div className="testimonial-name">{t.name}</div>
                                        <div className="testimonial-role">{t.role}, {t.company}</div>
                                    </div>
                                </div>
                                <p className="testimonial-quote">"{t.quote}"</p>
                                <div className="testimonial-metric">
                                    <span className="testimonial-metric-value">{t.metric}</span>
                                </div>
                                <div className="testimonial-rating">
                                    {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== SONAR SECTION (Premium Feature) ===== */}
            <section id="sonar" className="sonar-section">
                <div className="sonar-bg">
                    <div className="sonar-grid" />
                </div>
                <div className="container">
                    <div className="sonar-layout">
                        <div className="sonar-content">
                            <span className="section-badge sonar-badge">Diferencial ORCA</span>
                            <h2 className="sonar-title">Sonar<span className="sonar-title-accent">.</span></h2>
                            <p className="sonar-narrative">
                                O Sonar é o motor de inteligência da ORCA. Enquanto seu time dorme, ele rastreia sinais de compra, mudanças de cargo, rodadas de investimento e expansões de equipe — e te avisa quando o momento certo chegar.
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
                            <div className="radar-card" style={{ top: '18%', left: '25%' }} data-delay="0">
                                <div className="radar-card-dot" />
                                <div className="radar-card-content">
                                    <h4>Café São Braz</h4>
                                    <p>Rua Augusta, 234 - Lisboa</p>
                                    <span className="radar-card-phone">+351 210 123 456</span>
                                </div>
                            </div>
                            <div className="radar-card" style={{ top: '55%', left: '65%' }} data-delay="1.5">
                                <div className="radar-card-dot" />
                                <div className="radar-card-content">
                                    <h4>TechHub Cowork</h4>
                                    <p>Av. da Liberdade, 110 - Lisboa</p>
                                    <span className="radar-card-phone">+351 210 987 654</span>
                                </div>
                            </div>
                            <div className="radar-card" style={{ top: '50%', left: '8%' }} data-delay="3">
                                <div className="radar-card-dot" />
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
                        <h2 className="section-title">Escolha o plano certo para o tamanho do seu time</h2>
                    </div>
                    <div className="pricing-toggle">
                        <span className={!annualBilling ? 'toggle-label-active' : 'toggle-label'}>Mensal</span>
                        <button className={`toggle-switch${annualBilling ? ' active' : ''}`} onClick={() => setAnnualBilling(!annualBilling)} aria-label="Alternar faturamento anual">
                            <div className="toggle-knob" />
                        </button>
                        <span className={annualBilling ? 'toggle-label-active' : 'toggle-label'}>
                            Anual <span className="toggle-discount">-20%</span>
                        </span>
                    </div>
                    <div className="pricing-grid">
                        {pricingPlans.map((plan) => (
                            <div key={plan.name} className={`pricing-card${plan.highlighted ? ' highlighted' : ''}`} data-animate={`pricing-${plan.name}`}>
                                {plan.badge && <div className="pricing-team-badge">{plan.badge}</div>}
                                {plan.highlighted && <div className="pricing-badge">Mais Popular</div>}
                                <h3 className="pricing-name">{plan.name}</h3>
                                <p className="pricing-description">{plan.description}</p>
                                <div className="pricing-price">
                                    <span className="pricing-currency">€</span>
                                    <span className="pricing-value">{annualBilling ? plan.annualPrice : plan.monthlyPrice}</span>
                                    <span className="pricing-period">/mês</span>
                                </div>
                                {annualBilling && <p className="pricing-annual-note">Faturado anualmente (€{annualBilling ? plan.annualPrice : plan.monthlyPrice} x 12)</p>}
                                <ul className="pricing-features">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx}><span className="feature-check">✓</span>{feature}</li>
                                    ))}
                                </ul>
                                <button className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-ghost'} pricing-cta`}>
                                    {plan.cta}
                                </button>
                                <p className="pricing-guarantee">Garantia de 14 dias ou seu dinheiro de volta</p>
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
                            <div key={index} className={`faq-item${openFaqIndex === index ? ' open' : ''}`}>
                                <button className="faq-question" onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)} aria-expanded={openFaqIndex === index}>
                                    <span>{item.question}</span>
                                    <span className="faq-icon">{openFaqIndex === index ? '−' : '+'}</span>
                                </button>
                                {openFaqIndex === index && <div className="faq-answer"><p>{item.answer}</p></div>}
                            </div>
                        ))}
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
                    <h2 className="cta-title">Pronto para parar de perder leads para a concorrência?</h2>
                    <p className="cta-subtitle">Setup em menos de 10 minutos. Primeiros leads ainda hoje.</p>
                    <div className="cta-buttons">
                        <a href="/app" className="btn btn-primary btn-lg pulse-animation">
                            Começar agora — é grátis por 14 dias
                        </a>
                    </div>
                </div>
            </section>

            {/* ===== CONTACT MODAL ===== */}
            {contactModalOpen && (
                <div className="contact-modal-overlay" onClick={closeModal}>
                    <div className="contact-modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={closeModal} aria-label="Fechar">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                        {!formSubmitted ? (
                            <>
                                <div className="modal-header">
                                    <div className="modal-header-icon">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00C2FF" strokeWidth="1.5">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                                        </svg>
                                    </div>
                                    <h3 className="modal-title">Fale com um especialista</h3>
                                    <p className="modal-subtitle">Preencha o formulário e entraremos em contato em até 24 horas.</p>
                                </div>
                                <form className="contact-form" onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="name">Nome completo *</label>
                                            <div className={`input-wrapper${formErrors.name ? ' has-error' : ''}${formData.name ? ' has-value' : ''}`}>
                                                <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} placeholder="Seu nome" autoComplete="name" />
                                                {formErrors.name && <span className="field-error">{formErrors.name}</span>}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="email">E-mail corporativo *</label>
                                            <div className={`input-wrapper${formErrors.email ? ' has-error' : ''}${formData.email ? ' has-value' : ''}`}>
                                                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="seu@empresa.com" autoComplete="email" />
                                                {formErrors.email && <span className="field-error">{formErrors.email}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label htmlFor="company">Empresa *</label>
                                            <div className={`input-wrapper${formErrors.company ? ' has-error' : ''}${formData.company ? ' has-value' : ''}`}>
                                                <input type="text" id="company" name="company" value={formData.company} onChange={handleInputChange} placeholder="Nome da empresa" autoComplete="organization" />
                                                {formErrors.company && <span className="field-error">{formErrors.company}</span>}
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="phone">Telefone</label>
                                            <div className={`input-wrapper${formErrors.phone ? ' has-error' : ''}${formData.phone ? ' has-value' : ''}`}>
                                                <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handlePhoneChange} placeholder="+351 9XX XXX XXX" autoComplete="tel" />
                                                {formErrors.phone && <span className="field-error">{formErrors.phone}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="message">Como podemos ajudar?</label>
                                        <div className={`input-wrapper${formData.message ? ' has-value' : ''}`}>
                                            <textarea id="message" name="message" value={formData.message} onChange={handleInputChange} placeholder="Descreva brevemente o que você precisa..." rows={4} />
                                        </div>
                                    </div>
                                    <button type="submit" className="btn btn-primary btn-lg form-submit" disabled={isSubmitting}>
                                        {isSubmitting ? <span className="btn-loading"><svg className="spinner" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="31.4" strokeDashoffset="10" strokeLinecap="round" /></svg>Enviando...</span> : 'Solicitar contacto'}
                                    </button>
                                    <div className="form-trust">
                                        <div className="trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg><span>Seus dados estão seguros</span></div>
                                        <div className="trust-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg><span>Resposta em até 24h</span></div>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="modal-success">
                                <div className="success-icon">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#00C2FF" strokeWidth="2">
                                        <circle cx="12" cy="12" r="10" /><polyline points="8 12 11 15 16 9" />
                                    </svg>
                                </div>
                                <h3 className="modal-title">Mensagem enviada!</h3>
                                <p className="modal-subtitle">Obrigado pelo contato. Nossa equipe entrará em contato em até 24 horas.</p>
                                <button className="btn btn-primary btn-lg" onClick={closeModal}>Fechar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== STICKY CTA BAR ===== */}
            {!stickyBarDismissed && scrolled && (
                <div className="sticky-bar visible">
                    <div className="sticky-bar__left">
                        <span className="sticky-bar__logo">ORCA</span>
                        <span className="sticky-bar__sep"></span>
                        <span className="sticky-bar__copy">Primeiros leads ainda hoje — setup em 10 min</span>
                    </div>
                    <div className="sticky-bar__right">
                        <button className="sticky-bar__cta" onClick={openDemoModal}>
                            Começar grátis
                        </button>
                        <button className="sticky-bar__dismiss" onClick={dismissStickyBar} title="Fechar">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ===== FLOATING WHATSAPP ===== */}
            <div className="float-contact">
                <div className="float-contact__bubble">
                    <strong>Falar com especialista</strong>
                    Resposta em menos de 5 minutos
                </div>
                <a href="https://wa.me/351900000000?text=Olá%2C%20quero%20conhecer%20a%20ORCA" target="_blank" rel="noopener">
                    <button className="float-contact__btn" title="Falar no WhatsApp">
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                    </button>
                </a>
            </div>

            {/* ===== SCROLL TO TOP BUTTON ===== */}
            {scrolled && (
                <button
                    className="scroll-to-top"
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    aria-label="Voltar ao topo"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15" />
                    </svg>
                </button>
            )}

            {/* ===== FOOTER ===== */}
            <footer className="landing-footer">
                <div className="container">
                    <div className="footer-grid">
                        <div className="footer-brand">
                            <div className="footer-logo"><img src="/images/ORCA-white.png" alt="ORCA" /></div>
                            <p className="footer-tagline">Inteligência comercial que opera abaixo da superfície.</p>
                            <div className="footer-trust-badges">
                                <span className="trust-badge">LGPD Compliant</span>
                                <span className="trust-badge">SOC 2</span>
                                <span className="trust-badge">Suporte em PT-BR</span>
                            </div>
                        </div>
                        <div className="footer-links">
                            <h4>Plataforma</h4>
                            <ul>
                                <li><button onClick={() => scrollToSection('features')}>Funcionalidades</button></li>
                                <li><button onClick={() => scrollToSection('sonar')}>Sonar</button></li>
                                <li><a href="/app">Login</a></li>
                            </ul>
                        </div>
                        <div className="footer-links">
                            <h4>Empresa</h4>
                            <ul>
                                <li><button onClick={() => scrollToSection('como-funciona')}>Como Funciona</button></li>
                                <li><button onClick={() => scrollToSection('pricing')}>Preços</button></li>
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
                html, body { overflow-y: auto !important; scroll-behavior: smooth; }
                
                .landing-page {
                    background: #05070A;
                    color: #EAF6FF;
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                    overflow-x: hidden;
                    min-height: 100vh;
                }

                .container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

                /* ===== ANIMATIONS ===== */
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 194, 255, 0.4); }
                    50% { box-shadow: 0 0 0 15px rgba(0, 194, 255, 0); }
                }
                @keyframes scrollReveal {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .animate-fade-up { opacity: 0; }
                .animate-fade-up.visible { animation: fadeUp 0.6s ease-out forwards; }

                [data-animate] { opacity: 0; transition: opacity 0.6s ease, transform 0.6s ease; transform: translateY(20px); }
                [data-animate].visible { opacity: 1; transform: translateY(0); }

                .pulse-animation { animation: pulse 4s infinite; }
                .pulse-animation:hover { animation: none; }

                /* ===== HEADER ===== */
                .landing-header {
                    position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
                    transition: all 0.3s ease; background: transparent;
                }
                .landing-header.scrolled {
                    background: rgba(5, 7, 10, 0.95);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.1);
                }
                .landing-header-inner {
                    max-width: 1400px; margin: 0 auto; padding: 0 48px;
                    display: flex; align-items: center; justify-content: space-between;
                    width: 100%; position: relative; height: 64px;
                }
                .landing-logo { cursor: pointer; display: flex; align-items: center; z-index: 10; }
                .landing-logo img { height: 24px; width: auto; }
                .landing-nav { display: flex; gap: 40px; align-items: center; justify-content: center; position: absolute; left: 50%; transform: translateX(-50%); }
                .nav-link {
                    background: none; border: none; color: rgba(234, 246, 255, 0.7);
                    font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.3s ease;
                    padding: 8px 12px; position: relative; white-space: nowrap;
                }
                .nav-link::after {
                    content: ''; position: absolute; bottom: 0; left: 0; width: 0; height: 2px;
                    background: #00C2FF; transition: width 0.3s ease;
                }
                .nav-link:hover, .nav-link.active { color: #EAF6FF; }
                .nav-link:hover::after, .nav-link.active::after { width: 100%; }
                .landing-header-actions { display: flex; align-items: center; gap: 16px; z-index: 10; }
                .btn-login {
                    background: rgba(0, 194, 255, 0.1); color: #00C2FF;
                    border: 1px solid rgba(0, 194, 255, 0.2); padding: 10px 24px;
                    border-radius: 8px; font-size: 14px; font-weight: 600;
                    text-decoration: none; transition: all 0.2s ease;
                }
                .btn-login:hover { background: rgba(0, 194, 255, 0.15); border-color: rgba(0, 194, 255, 0.3); }
                .mobile-menu-btn { display: none; flex-direction: column; gap: 5px; background: none; border: none; cursor: pointer; padding: 4px; }
                .mobile-menu-btn span { width: 20px; height: 2px; background: #EAF6FF; transition: all 0.3s ease; }
                .mobile-menu {
                    display: none; position: absolute; top: 100%; left: 0; right: 0;
                    background: rgba(5, 7, 10, 0.98); backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.1); padding: 24px;
                }
                .mobile-nav-link { display: block; width: 100%; text-align: left; background: none; border: none; color: rgba(234, 246, 255, 0.7); font-size: 16px; padding: 12px 0; cursor: pointer; }
                .mobile-login { display: block; text-align: center; margin-top: 16px; }

                @media (max-width: 768px) {
                    .landing-nav { display: none; }
                    .mobile-menu-btn { display: flex; }
                    .mobile-menu { display: block; }
                }

                /* ===== HERO SECTION ===== */
                .hero-section {
                    min-height: 100vh; display: flex; align-items: center; justify-content: center;
                    position: relative; padding: 140px 24px 100px; overflow: visible;
                }
                .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
                .hero-video {
                    position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%;
                    width: auto; height: auto; transform: translate(-50%, -50%);
                    object-fit: cover; opacity: 0.4;
                }
                .hero-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(14, 58, 93, 0.5) 0%, #05070A 80%); z-index: 1; }
                .hero-particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(rgba(0, 194, 255, 0.1) 1px, transparent 1px);
                    background-size: 60px 60px; opacity: 0.3; z-index: 2;
                }
                .hero-content { position: relative; z-index: 10; text-align: center; max-width: 800px; }
                .hero-badge {
                    display: inline-block; padding: 6px 16px; background: rgba(0, 194, 255, 0.1);
                    border: 1px solid rgba(0, 194, 255, 0.2); border-radius: 20px; font-size: 12px;
                    font-weight: 600; color: #00C2FF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px;
                }
                .hero-title {
                    font-size: clamp(32px, 6vw, 56px); font-weight: 500; line-height: 1.2;
                    margin-bottom: 24px; letter-spacing: 0.05em; font-family: 'Sora', 'Inter', sans-serif;
                    text-transform: uppercase;
                }
                .hero-title em { color: #00C2FF; font-style: normal; font-weight: 700; }
                .hero-subtitle {
                    font-size: 18px; line-height: 1.7; color: rgba(234, 246, 255, 0.6);
                    max-width: 600px; margin: 0 auto 40px;
                }
                .hero-cta { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-bottom: 60px; }
                .btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 12px 28px; border-radius: 10px; font-size: 15px; font-weight: 600;
                    text-decoration: none; border: none; cursor: pointer; transition: all 0.2s ease;
                }
                .btn-primary { background: #00C2FF; color: #05070A; }
                .btn-primary:hover { background: #33CFFF; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0, 194, 255, 0.3); }
                .btn-ghost { background: transparent; color: rgba(234, 246, 255, 0.7); border: 1px solid rgba(234, 246, 255, 0.15); }
                .btn-ghost:hover { color: #EAF6FF; border-color: rgba(234, 246, 255, 0.3); background: rgba(234, 246, 255, 0.05); }
                .btn-lg { padding: 14px 32px; font-size: 16px; }
                .hero-stats { display: flex; gap: 32px; justify-content: center; align-items: center; flex-wrap: nowrap; }
                .stat-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .stat-value { font-size: 28px; font-weight: 700; color: #00C2FF; }
                .stat-label { font-size: 13px; color: rgba(234, 246, 255, 0.5); }
                .stat-divider { width: 1px; height: 40px; background: rgba(234, 246, 255, 0.1); }

                /* ===== CLIENT LOGOS ===== */
                .clients-section { padding: 60px 0; background: #05070A; border-top: 1px solid rgba(0, 194, 255, 0.05); border-bottom: 1px solid rgba(0, 194, 255, 0.05); }
                .clients-label { text-align: center; font-size: 13px; color: rgba(234, 246, 255, 0.4); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 32px; }
                .clients-grid { display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; opacity: 0.6; }
                .client-logo { padding: 8px 24px; }
                .client-logo-text { font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }

                /* ===== PAS SECTION ===== */
                .pas-section { padding: 120px 0; background: #0B1F2E; }
                .section-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
                .section-badge {
                    display: inline-block; padding: 6px 16px; background: rgba(0, 194, 255, 0.08);
                    border: 1px solid rgba(0, 194, 255, 0.15); border-radius: 20px; font-size: 12px;
                    font-weight: 600; color: #00C2FF; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;
                }
                .section-title { font-size: clamp(28px, 4vw, 40px); font-weight: 500; line-height: 1.2; margin-bottom: 16px; letter-spacing: -0.01em; font-family: 'Sora', 'Inter', sans-serif; }
                .section-subtitle { font-size: 16px; line-height: 1.7; color: rgba(234, 246, 255, 0.5); }
                .pas-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px; }
                .pas-card {
                    background: rgba(5, 7, 10, 0.5); border: 1px solid rgba(239, 68, 68, 0.15);
                    border-radius: 16px; padding: 32px; transition: all 0.3s ease;
                }
                .pas-card.problem { border-color: rgba(239, 68, 68, 0.15); }
                .pas-icon {
                    font-size: 24px;
                    color: #EF4444;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 12px;
                }
                .pas-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
                .pas-card p { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }
                .pas-solution {
                    background: linear-gradient(135deg, rgba(0, 194, 255, 0.1), rgba(0, 255, 128, 0.05));
                    border: 1px solid rgba(0, 194, 255, 0.2); border-radius: 16px; padding: 40px;
                    text-align: center; max-width: 700px; margin: 0 auto;
                }
                .pas-solution-icon {
                    width: 48px; height: 48px; background: rgba(0, 194, 255, 0.1); border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
                    font-size: 24px; color: #00C2FF;
                }
                .pas-solution h3 { font-size: 22px; font-weight: 600; margin-bottom: 12px; color: #00C2FF; }
                .pas-solution p { font-size: 16px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); max-width: 500px; margin: 0 auto; }

                /* ===== FEATURES SECTION ===== */
                .features-section { padding: 120px 0; background: #05070A; }
                .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; }
                .feature-card {
                    background: rgba(11, 31, 46, 0.3); border: 1px solid rgba(0, 194, 255, 0.08);
                    border-radius: 16px; padding: 32px; transition: all 0.3s ease;
                }
                .feature-card:hover { border-color: rgba(0, 194, 255, 0.2); background: rgba(11, 31, 46, 0.5); transform: translateY(-2px); }
                .feature-icon {
                    font-size: 24px;
                    color: #00C2FF;
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 56px;
                    height: 56px;
                    background: rgba(0, 194, 255, 0.08);
                    border-radius: 14px;
                }
                .feature-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
                .feature-card p { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }

                /* ===== HOW IT WORKS ===== */
                .how-section {
                    padding: 120px 0; background: linear-gradient(180deg, #05070A 0%, #081018 100%);
                    position: relative; overflow: hidden;
                }
                .how-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.2), transparent); }
                .how-section::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(0, 194, 255, 0.03) 0%, transparent 60%); pointer-events: none; }
                .how-section .container { position: relative; z-index: 1; }
                .steps-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
                .step { display: flex; gap: 32px; align-items: flex-start; padding: 32px 0; }
                .step-number {
                    width: 48px; height: 48px; border-radius: 50%; background: rgba(0, 194, 255, 0.1);
                    border: 1px solid rgba(0, 194, 255, 0.2); display: flex; align-items: center;
                    justify-content: center; font-size: 20px; font-weight: 700; color: #00C2FF; flex-shrink: 0;
                }
                .step-content h3 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
                .step-content p { font-size: 15px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }
                .step-connector { width: 1px; height: 32px; background: linear-gradient(to bottom, rgba(0, 194, 255, 0.3), transparent); margin-left: 23px; }

                /* ===== TESTIMONIALS ===== */
                .testimonials-section { padding: 120px 0; background: #0B1F2E; }
                .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
                .testimonial-card {
                    background: rgba(11, 31, 46, 0.3); border: 1px solid rgba(0, 194, 255, 0.08);
                    border-radius: 16px; padding: 32px; transition: all 0.3s ease;
                }
                .testimonial-card:hover { border-color: rgba(0, 194, 255, 0.2); }
                .testimonial-header { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
                .testimonial-avatar {
                    width: 48px; height: 48px; border-radius: 50%; background: rgba(0, 194, 255, 0.15);
                    display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: #00C2FF;
                }
                .testimonial-name { font-size: 16px; font-weight: 600; }
                .testimonial-role { font-size: 13px; color: rgba(234, 246, 255, 0.5); }
                .testimonial-quote { font-size: 15px; line-height: 1.7; color: rgba(234, 246, 255, 0.7); margin-bottom: 16px; font-style: italic; }
                .testimonial-metric {
                    display: inline-block; padding: 6px 12px; background: rgba(0, 194, 255, 0.1);
                    border-radius: 8px; font-size: 13px; font-weight: 600; color: #00C2FF; margin-bottom: 12px;
                }
                .testimonial-rating { color: #F59E0B; font-size: 14px; }

                /* ===== SONAR SECTION ===== */
                .sonar-section {
                    padding: 140px 0; position: relative; overflow: visible;
                    background: linear-gradient(180deg, #081018 0%, #0A1828 50%, #0B1F2E 100%);
                }
                .sonar-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.15), transparent); }
                .sonar-bg { position: absolute; inset: 0; z-index: 0; }
                .sonar-grid { position: absolute; inset: 0; background-image: radial-gradient(rgba(0, 194, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px; }
                .sonar-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; position: relative; z-index: 1; }
                .sonar-content { max-width: 500px; }
                .sonar-badge { background: rgba(0, 194, 255, 0.15); border-color: rgba(0, 194, 255, 0.3); }
                .sonar-title { font-size: clamp(48px, 8vw, 72px); font-weight: 500; line-height: 1; margin-bottom: 24px; letter-spacing: -0.01em; font-family: 'Sora', 'Inter', sans-serif; }
                .sonar-title-accent { color: #00C2FF; }
                .sonar-narrative {
                    font-size: 16px; line-height: 1.8; color: rgba(234, 246, 255, 0.6);
                    margin-bottom: 32px; padding: 20px; background: rgba(0, 194, 255, 0.05);
                    border-left: 3px solid #00C2FF; border-radius: 0 12px 12px 0;
                }
                .sonar-subtitle { font-size: 18px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); margin-bottom: 40px; }
                .sonar-features { display: flex; flex-direction: column; gap: 24px; margin-bottom: 40px; }
                .sonar-feature { display: flex; gap: 16px; align-items: flex-start; }
                .sonar-feature-icon { font-size: 24px; color: #00C2FF; flex-shrink: 0; }
                .sonar-feature h4 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
                .sonar-feature p { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }
                .sonar-visual { position: relative; width: 400px; height: 400px; opacity: 0.7; }
                .sonar-circle {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    border-radius: 50%; border: 1px solid rgba(0, 194, 255, 0.2);
                    animation: sonar-circle-pulse 4s ease-in-out infinite;
                }
                .sonar-circle-1 { width: 180px; height: 180px; border-color: rgba(0, 194, 255, 0.3); animation-delay: 0s; }
                .sonar-circle-2 { width: 280px; height: 280px; border-color: rgba(0, 194, 255, 0.2); animation-delay: 0.5s; }
                .sonar-circle-3 { width: 380px; height: 380px; border-color: rgba(0, 194, 255, 0.15); animation-delay: 1s; }
                @keyframes sonar-circle-pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
                    50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
                }
                .sonar-sweep {
                    position: absolute; top: 50%; left: 50%; width: 200px; height: 2px;
                    background: linear-gradient(to right, rgba(0, 194, 255, 0) 0%, rgba(0, 194, 255, 0.9) 50%, rgba(0, 194, 255, 0.3) 80%, transparent 100%);
                    transform-origin: left center; animation: sonar-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    filter: drop-shadow(0 0 8px rgba(0, 194, 255, 0.5));
                }
                @keyframes sonar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .sonar-dot {
                    position: absolute; width: 6px; height: 6px; background: #00C2FF;
                    border-radius: 50%; box-shadow: 0 0 12px rgba(0, 194, 255, 0.6), 0 0 24px rgba(0, 194, 255, 0.2);
                    animation: sonar-dot-pulse 4s ease-in-out infinite;
                }
                .sonar-dot::after {
                    content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(0, 194, 255, 0.3);
                    animation: sonar-dot-ring 4s ease-in-out infinite;
                }
                .sonar-dot:nth-child(1) { animation-delay: 0s; }
                .sonar-dot:nth-child(2) { animation-delay: 1.5s; }
                .sonar-dot:nth-child(3) { animation-delay: 3s; }
                @keyframes sonar-dot-pulse {
                    0%, 100% { opacity: 0.3; transform: scale(0.8); }
                    50% { opacity: 1; transform: scale(1.2); }
                }
                @keyframes sonar-dot-ring {
                    0%, 100% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(2); opacity: 1; }
                }
                .sonar-visual::before {
                    content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 8px; height: 8px; background: #00C2FF; border-radius: 50%;
                    box-shadow: 0 0 20px rgba(0, 194, 255, 0.8), 0 0 40px rgba(0, 194, 255, 0.3);
                    animation: center-pulse 3s ease-in-out infinite;
                }
                @keyframes center-pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
                    50% { transform: translate(-50%, -50%) scale(1.5); opacity: 1; }
                }
                .radar-card {
                    position: absolute; opacity: 0; transform: scale(0.8) translateY(10px);
                    animation: radar-card-appear 6s ease-in-out infinite; z-index: 10;
                }
                .radar-card[data-delay="0"] { animation-delay: 0s; }
                .radar-card[data-delay="1.5"] { animation-delay: 1.5s; }
                .radar-card[data-delay="3"] { animation-delay: 3s; }
                @keyframes radar-card-appear {
                    0%, 15% { opacity: 0; transform: scale(0.8) translateY(10px); }
                    20%, 50% { opacity: 1; transform: scale(1) translateY(0); }
                    85%, 100% { opacity: 0; transform: scale(0.8) translateY(-10px); }
                }
                .radar-card-dot {
                    width: 12px; height: 12px; background: #00C2FF; border-radius: 50%;
                    box-shadow: 0 0 16px rgba(0, 194, 255, 0.8), 0 0 32px rgba(0, 194, 255, 0.3);
                    margin-bottom: 8px; animation: radar-dot-blink 2s ease-in-out infinite;
                }
                @keyframes radar-dot-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .radar-card-content {
                    background: rgba(5, 7, 10, 0.92); backdrop-filter: blur(12px);
                    border: 1px solid rgba(0, 194, 255, 0.3); border-radius: 12px;
                    padding: 12px 16px; min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 194, 255, 0.1);
                }
                .radar-card-content h4 { font-size: 13px; font-weight: 600; color: #00C2FF; margin: 0 0 4px 0; white-space: nowrap; }
                .radar-card-content p { font-size: 11px; color: rgba(234, 246, 255, 0.6); margin: 0 0 4px 0; line-height: 1.4; }
                .radar-card-phone { font-size: 10px; color: rgba(234, 246, 255, 0.4); font-family: monospace; }

                @media (max-width: 900px) {
                    .sonar-layout { grid-template-columns: 1fr; gap: 40px; }
                    .sonar-content { max-width: 100%; }
                    .sonar-visual { display: none; }
                }

                /* ===== PRICING SECTION ===== */
                .pricing-section {
                    padding: 120px 0; background: linear-gradient(180deg, #0B1F2E 0%, #0E2A42 30%, #05070A 100%);
                    position: relative;
                }
                .pricing-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(0, 194, 255, 0.2), transparent); }
                .pricing-section .container { position: relative; z-index: 1; }
                .pricing-toggle { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 48px; }
                .toggle-label { font-size: 14px; color: rgba(234, 246, 255, 0.5); }
                .toggle-label-active { font-size: 14px; color: #EAF6FF; font-weight: 600; }
                .toggle-switch {
                    width: 48px; height: 26px; border-radius: 13px; background: rgba(0, 194, 255, 0.2);
                    border: 1px solid rgba(0, 194, 255, 0.3); cursor: pointer; position: relative; transition: all 0.3s ease;
                }
                .toggle-switch.active { background: rgba(0, 194, 255, 0.4); border-color: #00C2FF; }
                .toggle-knob {
                    width: 20px; height: 20px; border-radius: 50%; background: #00C2FF;
                    position: absolute; top: 2px; left: 2px; transition: all 0.3s ease;
                }
                .toggle-switch.active .toggle-knob { left: 22px; }
                .toggle-discount {
                    display: inline-block; padding: 2px 8px; background: rgba(0, 194, 255, 0.15);
                    border-radius: 12px; font-size: 12px; font-weight: 600; color: #00C2FF; margin-left: 4px;
                }
                .pricing-grid {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px; max-width: 1000px; margin: 0 auto;
                }
                .pricing-card {
                    background: rgba(11, 31, 46, 0.3); border: 1px solid rgba(0, 194, 255, 0.1);
                    border-radius: 20px; padding: 32px; position: relative; transition: all 0.3s ease;
                }
                .pricing-card:hover { transform: translateY(-4px); border-color: rgba(0, 194, 255, 0.2); }
                .pricing-card.highlighted {
                    border-color: #00C2FF; border-width: 2px;
                    background: rgba(0, 194, 255, 0.05);
                }
                .pricing-card.highlighted.visible { transform: scale(1.03); }
                .pricing-badge {
                    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
                    padding: 4px 16px; background: #00C2FF; color: #05070A; font-size: 12px;
                    font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .pricing-team-badge {
                    text-align: center; font-size: 12px; color: rgba(0, 194, 255, 0.7);
                    margin-bottom: 8px; font-weight: 500;
                }
                .pricing-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                .pricing-description { font-size: 14px; color: rgba(234, 246, 255, 0.5); margin-bottom: 24px; }
                .pricing-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
                .pricing-currency { font-size: 20px; color: rgba(234, 246, 255, 0.6); }
                .pricing-value { font-size: 48px; font-weight: 700; color: #00C2FF; line-height: 1; }
                .pricing-period { font-size: 14px; color: rgba(234, 246, 255, 0.5); }
                .pricing-annual-note { font-size: 12px; color: rgba(234, 246, 255, 0.4); margin-bottom: 24px; }
                .pricing-features { list-style: none; padding: 0; margin: 0 0 32px 0; }
                .pricing-features li { display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 14px; color: rgba(234, 246, 255, 0.8); }
                .feature-check { color: #00C2FF; font-weight: 700; }
                .pricing-cta { width: 100%; }
                .pricing-guarantee {
                    text-align: center; font-size: 12px; color: rgba(234, 246, 255, 0.4);
                    margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(0, 194, 255, 0.06);
                }

                /* ===== FAQ SECTION ===== */
                .faq-section { padding: 120px 0; background: #0B1F2E; }
                .faq-container { max-width: 700px; margin: 0 auto; }
                .faq-item { border-bottom: 1px solid rgba(0, 194, 255, 0.1); }
                .faq-question {
                    width: 100%; display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 0; background: none; border: none; cursor: pointer; text-align: left;
                }
                .faq-question span:first-child { font-size: 16px; font-weight: 500; color: #EAF6FF; flex: 1; padding-right: 24px; }
                .faq-icon { font-size: 20px; color: #00C2FF; flex-shrink: 0; }
                .faq-answer { padding: 0 0 20px 0; }
                .faq-answer p { font-size: 15px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); }

                /* ===== CTA SECTION ===== */
                .cta-section {
                    padding: 140px 0; position: relative; text-align: center; overflow: hidden;
                }
                .cta-bg { position: absolute; inset: 0; z-index: 0; }
                .cta-gradient {
                    position: absolute; inset: 0;
                    background: radial-gradient(ellipse at 30% 50%, rgba(0, 194, 255, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 50%, rgba(14, 58, 93, 0.4) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 100%, rgba(0, 194, 255, 0.05) 0%, transparent 40%);
                }
                .cta-particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(rgba(0, 194, 255, 0.15) 1px, transparent 1px),
                        radial-gradient(rgba(0, 194, 255, 0.1) 1px, transparent 1px);
                    background-size: 80px 80px, 40px 40px; background-position: 0 0, 20px 20px;
                    opacity: 0.4; animation: cta-particles-move 20s linear infinite;
                }
                @keyframes cta-particles-move { 0% { transform: translateY(0); } 100% { transform: translateY(-80px); } }
                .cta-glow {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 600px; height: 600px; background: radial-gradient(circle, rgba(0, 194, 255, 0.06) 0%, transparent 70%);
                    border-radius: 50%; animation: cta-glow-pulse 6s ease-in-out infinite;
                }
                @keyframes cta-glow-pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                }
                .cta-title {
                    font-size: clamp(28px, 5vw, 48px); font-weight: 500; line-height: 1.2;
                    margin-bottom: 16px; position: relative; z-index: 1;
                    font-family: 'Sora', 'Inter', sans-serif; letter-spacing: -0.01em;
                }
                .cta-subtitle {
                    font-size: 18px; line-height: 1.7; color: rgba(234, 246, 255, 0.5);
                    max-width: 500px; margin: 0 auto 40px; position: relative; z-index: 1;
                }
                .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
                .cta-section .btn { position: relative; z-index: 1; }

                /* ===== CONTACT MODAL ===== */
                .contact-modal-overlay {
                    position: fixed !important; inset: 0 !important; background: rgba(5, 7, 10, 0.85) !important;
                    backdrop-filter: blur(8px) !important; z-index: 2000 !important;
                    display: flex !important; align-items: center !important; justify-content: center !important;
                    padding: 24px !important; opacity: 1 !important; pointer-events: all !important;
                    animation: contact-modal-fade-in 0.3s ease !important;
                }
                @keyframes contact-modal-fade-in { from { opacity: 0; } to { opacity: 1; } }
                .contact-modal-content {
                    background: rgba(11, 31, 46, 0.95) !important; border: 1px solid rgba(0, 194, 255, 0.15) !important;
                    border-radius: 20px !important; padding: 40px !important; max-width: 640px !important;
                    width: 100% !important; position: relative !important;
                    animation: contact-modal-slide-in 0.3s ease !important;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 194, 255, 0.05) !important;
                }
                @keyframes contact-modal-slide-in {
                    from { opacity: 0; transform: translateY(20px) scale(0.95); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .modal-close {
                    position: absolute; top: 16px; right: 16px; background: none; border: none;
                    color: rgba(234, 246, 255, 0.5); cursor: pointer; padding: 8px; border-radius: 8px;
                    transition: all 0.2s ease; display: flex; align-items: center; justify-content: center;
                }
                .modal-close:hover { color: #EAF6FF; background: rgba(234, 246, 255, 0.05); }
                .modal-header { text-align: left; margin-bottom: 32px; display: flex; flex-direction: column; gap: 16px; }
                .modal-header-icon {
                    width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(0, 194, 255, 0.08);
                    border-radius: 12px; display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(0, 194, 255, 0.12);
                }
                .modal-header-icon svg { width: 24px; height: 24px; }
                .modal-title { font-size: 24px; font-weight: 600; color: #EAF6FF; margin-bottom: 8px; letter-spacing: 0; }
                .modal-subtitle { font-size: 14px; color: rgba(234, 246, 255, 0.5); line-height: 1.6; }
                .contact-form { display: flex; flex-direction: column; gap: 20px; }
                .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                @media (max-width: 600px) { .form-row { grid-template-columns: 1fr; } }
                .form-group { display: flex; flex-direction: column; gap: 6px; }
                .form-group label { font-size: 13px; font-weight: 500; color: rgba(234, 246, 255, 0.7); letter-spacing: 0.01em; }
                .input-wrapper { position: relative; transition: all 0.2s ease; }
                .input-wrapper input, .input-wrapper textarea {
                    width: 100%; background: rgba(5, 7, 10, 0.5); border: 1.5px solid rgba(0, 194, 255, 0.12);
                    border-radius: 10px; padding: 14px 16px; font-size: 14px; color: #EAF6FF;
                    font-family: inherit; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                }
                .input-wrapper input::placeholder, .input-wrapper textarea::placeholder { color: rgba(234, 246, 255, 0.25); font-size: 14px; }
                .input-wrapper input:hover, .input-wrapper textarea:hover { border-color: rgba(0, 194, 255, 0.2); background: rgba(5, 7, 10, 0.7); }
                .input-wrapper input:focus, .input-wrapper textarea:focus {
                    border-color: rgba(0, 194, 255, 0.5);
                    box-shadow: 0 0 0 4px rgba(0, 194, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2);
                    background: rgba(5, 7, 10, 0.8); transform: translateY(-1px);
                }
                .input-wrapper.has-error input, .input-wrapper.has-error textarea {
                    border-color: rgba(239, 68, 68, 0.5); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
                }
                .input-wrapper.has-error input:focus, .input-wrapper.has-error textarea:focus {
                    border-color: rgba(239, 68, 68, 0.6); box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }
                .field-error { display: block; font-size: 12px; color: rgba(239, 129, 129, 0.9); margin-top: 6px; padding-left: 4px; animation: error-slide-in 0.2s ease; }
                @keyframes error-slide-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                .form-group textarea { resize: vertical; min-height: 100px; line-height: 1.6; }
                .form-submit { width: 100%; margin-top: 8px; position: relative; overflow: hidden; transform: translateZ(0); }
                .form-submit:hover:not(:disabled) { transform: translateY(-1px) scale(1.01); box-shadow: 0 6px 24px rgba(0, 194, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2); }
                .form-submit:active:not(:disabled) { transform: translateY(0) scale(0.99); }
                .form-submit:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-loading { display: inline-flex; align-items: center; gap: 8px; }
                .spinner { width: 18px; height: 18px; animation: spinner-rotate 1s linear infinite; }
                @keyframes spinner-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .form-trust { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 16px; padding-top: 20px; border-top: 1px solid rgba(0, 194, 255, 0.06); }
                .trust-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(234, 246, 255, 0.4); }
                .trust-item svg { color: rgba(0, 194, 255, 0.5); flex-shrink: 0; }
                @media (max-width: 480px) { .form-trust { flex-direction: column; gap: 8px; } }
                .modal-success { text-align: center; padding: 20px 0; }
                .success-icon { margin-bottom: 24px; display: flex; justify-content: center; }
                .success-icon svg { animation: success-pop 0.5s ease; }
                @keyframes success-pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
                .modal-success .modal-title { margin-bottom: 12px; }
                .modal-success .btn { margin-top: 24px; }

                /* ===== FOOTER ===== */
                .landing-footer { padding: 80px 0 40px; background: #05070A; border-top: 1px solid rgba(0, 194, 255, 0.05); }
                .landing-footer .container { max-width: 1400px; padding: 0 48px; }
                .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 60px; }
                .footer-logo img { height: 24px; margin-bottom: 16px; }
                .footer-tagline { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.4); max-width: 280px; }
                .footer-trust-badges { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
                .trust-badge {
                    padding: 4px 12px; background: rgba(0, 194, 255, 0.08); border: 1px solid rgba(0, 194, 255, 0.15);
                    border-radius: 6px; font-size: 11px; color: rgba(0, 194, 255, 0.7); font-weight: 500;
                }
                .footer-links h4 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(234, 246, 255, 0.4); margin-bottom: 20px; }
                .footer-links ul { list-style: none; padding: 0; margin: 0; }
                .footer-links li { margin-bottom: 12px; }
                .footer-links a, .footer-links button { background: none; border: none; color: rgba(234, 246, 255, 0.6); font-size: 14px; cursor: pointer; transition: color 0.2s ease; padding: 0; }
                .footer-links a:hover, .footer-links button:hover { color: #EAF6FF; }
                .footer-bottom { padding-top: 40px; border-top: 1px solid rgba(0, 194, 255, 0.05); text-align: center; }
                .footer-bottom p { font-size: 13px; color: rgba(234, 246, 255, 0.3); }
                @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
                @media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; gap: 24px; } }

                /* ===== UTILITY ===== */
                .desktop-only { display: block; }
                @media (max-width: 768px) { .desktop-only { display: none !important; } }

                /* ===== SCROLL TO TOP BUTTON ===== */
                .scroll-to-top {
                    position: fixed;
                    bottom: 90px;
                    right: 28px;
                    width: 48px;
                    height: 48px;
                    background: #00C2FF;
                    color: #05070A;
                    border: none;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 940;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 16px rgba(0, 194, 255, 0.3);
                }
                .scroll-to-top:hover {
                    background: #33CFFF;
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(0, 194, 255, 0.4);
                }
                .scroll-to-top:active {
                    transform: translateY(-1px);
                }
                @media (max-width: 768px) {
                    .scroll-to-top {
                        bottom: 72px;
                        right: 16px;
                        width: 44px;
                        height: 44px;
                    }
                }

                /* ===== HERO INLINE CAPTURE ===== */
                .hero-capture-section {
                    padding: 40px 0;
                    background: #05070A;
                    border-top: 1px solid rgba(0, 194, 255, 0.05);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.05);
                }
                .hero-capture__form {
                    display: flex;
                    gap: 0;
                    background: rgba(11, 31, 46, 0.5);
                    border: 1px solid rgba(0, 194, 255, 0.1);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    max-width: 520px;
                    margin: 0 auto;
                }
                .hero-capture__form:focus-within {
                    border-color: rgba(0, 194, 255, 0.4);
                    box-shadow: 0 0 0 3px rgba(0, 194, 255, 0.1), 0 0 40px rgba(0, 194, 255, 0.1);
                }
                .hero-capture__input {
                    flex: 1;
                    background: transparent;
                    border: none;
                    outline: none;
                    padding: 14px 18px;
                    font-family: inherit;
                    font-size: 14px;
                    color: #EAF6FF;
                }
                .hero-capture__input::placeholder {
                    color: rgba(234, 246, 255, 0.3);
                }
                .hero-capture__btn {
                    background: #00C2FF;
                    color: #05070A;
                    border: none;
                    padding: 14px 22px;
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    white-space: nowrap;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                .hero-capture__btn:hover {
                    background: #33CFFF;
                }
                .hero-capture__btn svg {
                    width: 14px;
                    height: 14px;
                    transition: transform 0.2s ease;
                }
                .hero-capture__btn:hover svg {
                    transform: translateX(3px);
                }
                .hero-capture__success {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    background: rgba(0, 229, 160, 0.1);
                    border: 1px solid rgba(0, 229, 160, 0.2);
                    border-radius: 12px;
                    padding: 14px 18px;
                    max-width: 520px;
                    margin: 0 auto;
                }
                .hero-capture__success svg {
                    width: 18px;
                    height: 18px;
                    color: #00E5A0;
                    flex-shrink: 0;
                }
                .hero-capture__success p {
                    font-size: 14px;
                    color: #EAF6FF;
                }
                .hero-capture__success span {
                    color: #00E5A0;
                    font-weight: 500;
                }
                .hero-capture__trust {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 24px;
                    flex-wrap: wrap;
                    margin-top: 16px;
                }
                .hero-capture__trust-item {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 12px;
                    color: rgba(234, 246, 255, 0.4);
                }
                .hero-capture__trust-item svg {
                    width: 12px;
                    height: 12px;
                    color: #00E5A0;
                    flex-shrink: 0;
                }
                @media (max-width: 600px) {
                    .hero-capture__form {
                        flex-direction: column;
                        border-radius: 12px;
                    }
                    .hero-capture__btn {
                        justify-content: center;
                    }
                }

                /* ===== STICKY CTA BAR ===== */
                .sticky-bar {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    z-index: 800;
                    background: rgba(9, 12, 16, 0.95);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(0, 194, 255, 0.08);
                    padding: 12px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    transform: translateY(-100%);
                    transition: transform 0.3s ease;
                }
                .sticky-bar.visible {
                    transform: translateY(0);
                }
                .sticky-bar__left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .sticky-bar__logo {
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 16px;
                    font-weight: 800;
                    color: #EAF6FF;
                    letter-spacing: 0.05em;
                }
                .sticky-bar__sep {
                    width: 1px;
                    height: 20px;
                    background: rgba(234, 246, 255, 0.1);
                }
                .sticky-bar__copy {
                    font-size: 13px;
                    color: rgba(234, 246, 255, 0.6);
                }
                .sticky-bar__right {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    flex-shrink: 0;
                }
                .sticky-bar__cta {
                    background: #00C2FF;
                    color: #05070A;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 18px;
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .sticky-bar__cta:hover {
                    background: #33CFFF;
                }
                .sticky-bar__dismiss {
                    background: none;
                    border: none;
                    color: rgba(234, 246, 255, 0.4);
                    cursor: pointer;
                    padding: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .sticky-bar__dismiss:hover {
                    color: #EAF6FF;
                }
                .sticky-bar__dismiss svg {
                    width: 16px;
                    height: 16px;
                }
                @media (max-width: 600px) {
                    .sticky-bar__copy { display: none; }
                    .sticky-bar__sep { display: none; }
                }

                /* ===== FLOATING WHATSAPP ===== */
                /* Hero Inline Capture Wrapper */
                .hero-capture-wrapper {
                    max-width: 600px;
                    margin: 42px auto 0;
                }
                .hero-capture__form-inline {
                    max-width: 520px;
                    margin: 0 auto;
                }
                .hero-capture__success-inline {
                    max-width: 520px;
                    margin: 0 auto;
                    justify-content: center;
                }

                .float-contact {
                    position: fixed;
                    bottom: 150px;
                    right: 28px;
                    z-index: 950;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 10px;
                }
                .float-contact__bubble {
                    background: rgba(11, 31, 46, 0.95);
                    border: 1px solid rgba(0, 194, 255, 0.1);
                    border-radius: 16px;
                    padding: 14px 16px;
                    font-size: 13px;
                    color: rgba(234, 246, 255, 0.6);
                    white-space: nowrap;
                    opacity: 0;
                    transform: translateX(10px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
                    backdrop-filter: blur(12px);
                }
                .float-contact__bubble strong {
                    color: #EAF6FF;
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .float-contact:hover .float-contact__bubble {
                    opacity: 1;
                    transform: translateX(0);
                    pointer-events: all;
                }
                .float-contact__btn {
                    width: 54px;
                    height: 54px;
                    border-radius: 50%;
                    background: #25D366;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(37, 211, 102, 0.35);
                    transition: all 0.3s ease;
                    position: relative;
                }
                .float-contact__btn::before {
                    content: '';
                    position: absolute;
                    inset: -3px;
                    border-radius: 50%;
                    border: 2px solid rgba(37, 211, 102, 0.3);
                    animation: pulse-ring 2.5s ease-out infinite;
                }
                @keyframes pulse-ring {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                .float-contact__btn:hover {
                    background: #20C45A;
                    transform: scale(1.08);
                    box-shadow: 0 6px 28px rgba(37, 211, 102, 0.5);
                }
                .float-contact__btn svg {
                    width: 26px;
                    height: 26px;
                    color: white;
                }
                @media (max-width: 768px) {
                    .landing-nav { display: none; }
                    .mobile-menu-btn { display: flex; }
                    .mobile-menu { display: block; }
                    .hero-stats { flex-wrap: wrap; }
                }
                    .float-contact__btn {
                        width: 48px;
                        height: 48px;
                    }
                }

                /* ===== DEMO MODAL ===== */
                .demo-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(5, 7, 10, 0.92);
                    backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    animation: fadeIn 0.25s ease;
                }
                .demo-modal {
                    background: rgba(11, 31, 46, 0.98);
                    border: 1px solid rgba(0, 194, 255, 0.15);
                    border-radius: 24px;
                    width: 100%;
                    max-width: 480px;
                    padding: 36px;
                    position: relative;
                    animation: slideInUp 0.3s ease;
                }
                @keyframes slideInUp {
                    from { opacity: 0; transform: translateY(40px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .demo-modal__close {
                    position: absolute;
                    top: 16px;
                    right: 16px;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: rgba(5, 7, 10, 0.5);
                    border: 1px solid rgba(234, 246, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    color: rgba(234, 246, 255, 0.5);
                    transition: all 0.2s ease;
                }
                .demo-modal__close:hover {
                    background: rgba(5, 7, 10, 0.8);
                    color: #EAF6FF;
                }
                .demo-modal__close svg {
                    width: 14px;
                    height: 14px;
                }
                .demo-modal__eyebrow {
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: #00C2FF;
                    margin-bottom: 10px;
                }
                .demo-modal__title {
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 22px;
                    font-weight: 700;
                    color: #EAF6FF;
                    line-height: 1.3;
                    margin-bottom: 6px;
                }
                .demo-modal__subtitle {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.5);
                    margin-bottom: 28px;
                }
                .demo-modal__form {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .demo-form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                }
                .demo-form-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .demo-form-field label {
                    font-size: 12px;
                    font-weight: 500;
                    color: rgba(234, 246, 255, 0.5);
                    letter-spacing: 0.02em;
                }
                .demo-form-field input,
                .demo-form-field select {
                    background: rgba(5, 7, 10, 0.5);
                    border: 1px solid rgba(234, 246, 255, 0.1);
                    border-radius: 10px;
                    padding: 11px 14px;
                    font-family: inherit;
                    font-size: 14px;
                    color: #EAF6FF;
                    outline: none;
                    transition: all 0.2s ease;
                    width: 100%;
                    appearance: none;
                    -webkit-appearance: none;
                }
                .demo-form-field input::placeholder {
                    color: rgba(234, 246, 255, 0.25);
                }
                .demo-form-field input:focus,
                .demo-form-field select:focus {
                    border-color: rgba(0, 194, 255, 0.5);
                    background: rgba(5, 7, 10, 0.8);
                    box-shadow: 0 0 0 3px rgba(0, 194, 255, 0.1);
                }
                .demo-form-field select {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 14px center;
                    padding-right: 36px;
                    cursor: pointer;
                }
                .demo-form-field select option {
                    background: rgba(11, 31, 46, 0.98);
                    color: #EAF6FF;
                }
                .demo-modal__submit {
                    width: 100%;
                    background: #00C2FF;
                    color: #05070A;
                    border: none;
                    border-radius: 10px;
                    padding: 14px;
                    font-family: 'Sora', 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    cursor: pointer;
                    margin-top: 4px;
                    transition: all 0.2s ease;
                }
                .demo-modal__submit:hover {
                    background: #33CFFF;
                    transform: translateY(-1px);
                }
                .demo-modal__fine-print {
                    font-size: 11px;
                    color: rgba(234, 246, 255, 0.3);
                    text-align: center;
                    margin-top: 12px;
                }
                @media (max-width: 600px) {
                    .demo-form-row {
                        grid-template-columns: 1fr;
                    }
                    .demo-modal {
                        padding: 24px;
                    }
                }
            `}</style>
        </div>
    );
}