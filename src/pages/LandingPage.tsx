import { useState, useEffect, useRef } from 'react';
import { 
    X, 
    Check, 
    Layout, 
    Zap, 
    Target, 
    BarChart3, 
    Search, 
    Layers, 
    Users, 
    Star, 
    ArrowRight, 
    ChevronUp,
    ChevronDown,
    Minus,
    Plus,
    MessageSquare,
    ShieldCheck,
    Clock,
    Phone,
    Mail,
    Send,
    Snowflake,
    UserMinus,
    FastForward,
    BarChart
} from 'lucide-react';
import MistBackground from '../components/ui/MistBackground';
import api from '../services/api';

// ===== DATA: FAQ Items =====
const faqItems = [
    {
        question: "Como funciona o período de teste?",
        answer: "Oferecemos 7 dias de teste gratuito com acesso completo a todas as funcionalidades. Não é necessário cartão de crédito. No final, escolha o plano ideal."
    },
    {
        question: "Preciso de cartão de crédito para começar?",
        answer: "Não. Crie sua conta e explore todas as funcionalidades gratuitamente por 7 dias. Só pedimos pagamento se decidir fazer upgrade."
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

// ===== DATA: Client Logos (B2B Authority) =====
const clientLogos = [
    { name: "ALP", color: "var(--orca-text)" },
    { name: "ContaHub", color: "var(--orca-text)" },
    { name: "Katu Soluções", color: "var(--orca-text)" },
    { name: "New Meaning", color: "var(--orca-text)" },
    { name: "Etos", color: "var(--orca-text)" },
    { name: "Mandacaru", color: "var(--orca-text)" }
];

// ===== DATA: Pricing Plans =====
const pricingPlans = [
    {
        name: "Starter",
        description: "Para pequenos negócios que precisam prospectar",
        monthlyPrice: 49,
        annualPrice: 39,
        features: [
            "Até 500 leads / mês",
            "Score automático básico",
            "Pipeline visual",
            "Importação CSV/Excel",
            "Suporte por email",
            "1 utilizador"
        ],
        cta: "Começar agora",
        highlighted: false,
        badge: null
    },
    {
        name: "Pro",
        description: "Para equipes em crescimento acelerado",
        monthlyPrice: 99,
        annualPrice: 79,
        features: [
            "Até 2.000 leads / mês",
            "Score avançado com IA",
            "Sonar de mercado completo",
            "Segmentação inteligente",
            "Integração CRM (Beta)",
            "Relatórios de performance",
            "Até 5 utilizadores",
            "Suporte prioritário"
        ],
        cta: "Experimentar 7 Dias Grátis",
        highlighted: true,
        badge: "Mais escolhido por times de vendas"
    },
    {
        name: "Enterprise",
        description: "Para grandes operações comerciais",
        monthlyPrice: 249,
        annualPrice: 199,
        features: [
            "Até 10.000 leads / mês",
            "IA de abordagem personalizada",
            "API dedicada",
            "Single Sign-On (SSO)",
            "Relatórios white-label",
            "Gestor de conta dedicado",
            "Utilizadores ilimitados",
            "Suporte 24/7"
        ],
        cta: "Falar com Especialista",
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
    const [honeypot, setHoneypot] = useState('');
    const [heroAnimated, setHeroAnimated] = useState(false);
    const [heroPhrase, setHeroPhrase] = useState(0);
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
        teamSize: '',
        phone: ''
    });
    const sectionRefs = useRef<{ [key: string]: HTMLElement | null }>({});

    const visibleSections = useScrollAnimation();

    // ===== SCROLL HANDLERS =====
    useEffect(() => {
        const sentinel = document.getElementById('scroll-sentinel');
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setScrolled(!entry.isIntersecting);
            },
            { rootMargin: '0px', threshold: 0 }
        );

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    // Hero staggered animation
    useEffect(() => {
        const timer = setTimeout(() => setHeroAnimated(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Rotate hero phrases
    const heroPhrases = [
        'Encontre leads que seus concorrentes ignoram',
        'Escaneie o mercado em tempo real',
        'Leads qualificados direto no seu CRM',
        'Dados de mercado, decisões certeiras',
        'Mais vendas, menos suposições',
    ];
    useEffect(() => {
        const interval = setInterval(() => {
            setHeroPhrase((prev) => (prev + 1) % heroPhrases.length);
        }, 6000);
        return () => clearInterval(interval);
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

        if (honeypot) {
            setFormSubmitted(true);
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await api.post<any>('/contact', {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                company: formData.company,
                message: formData.message,
                website: honeypot
            });
            
            if (data.success) {
                setFormSubmitted(true);
            } else {
                alert('Erro ao enviar mensagem. Tente novamente ou escreva para contacto@orcaleads.online');
            }
        } catch (err: any) {
            alert(err.message || 'Erro de conexão. Tente novamente ou escreva para contacto@orcaleads.online');
        }
        setIsSubmitting(false);
    };

    const closeModal = () => {
        setContactModalOpen(false);
        setFormSubmitted(false);
    };

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
        
        if (honeypot) {
            closeDemoModal();
            return;
        }

        setIsSubmitting(true);
        try {
            await api.post('/contact', {
                name: `${demoFormData.firstName} ${demoFormData.lastName}`,
                email: demoFormData.email,
                company: demoFormData.company,
                phone: demoFormData.phone,
                message: `[PEDIDO DE DEMO]\nTamanho do time: ${demoFormData.teamSize}`,
                website: honeypot
            });
            
            setFormSubmitted(true);
            setDemoFormData({ firstName: '', lastName: '', email: '', company: '', teamSize: '', phone: '' });
            // closeDemoModal(); // User requested to see success msg
        } catch (err: any) {
            alert('Erro ao processar pedido. Por favor tente novamente ou escreva para contacto@orcaleads.online');
        }
        setIsSubmitting(false);
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
            <div id="scroll-sentinel" style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1 }} />
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
                        <button 
                            onClick={() => window.location.href = '/login'} 
                            className="btn-login"
                        >
                            Login
                        </button>
                        <button 
                            className={`mobile-menu-btn ${mobileMenuOpen ? 'open' : ''}`} 
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Menu"
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>

                        <div className={`mobile-menu ${mobileMenuOpen ? 'active' : ''}`}>
                            <div className="mobile-menu-inner">
                                {navItems.map((item) => (
                                    <button
                                        key={item.id}
                                        className={`mobile-nav-link${activeSection === item.id ? ' active' : ''}`}
                                        onClick={() => {
                                            scrollToSection(item.id);
                                            setMobileMenuOpen(false);
                                        }}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                                <button 
                                    className="btn btn-primary w-full mobile-login" 
                                    style={{ marginTop: 24, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }} 
                                    onClick={() => window.location.href = '/login'}
                                >
                                    Login
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
                    <div className={`hero-badge animate-fade-up${heroAnimated ? ' visible' : ''}`}>Sonar — Inteligência Comercial B2B</div>
                    <h1 className={`hero-title animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ fontStyle: 'normal', animationDelay: '120ms' }}>
                        <span
                            key={heroPhrase}
                            className="hero-title-rotating"
                            style={{ display: 'block', animation: 'heroFade 1s ease forwards', minHeight: '2.1em' }}
                        >
                            {heroPhrases[heroPhrase]}
                        </span>
                        <em style={{ fontStyle: 'normal', opacity: 1, color: 'var(--orca-text)', display: 'block', marginTop: '4px' }}>sem depender de achismo.</em>
                    </h1>
                    <p className={`hero-subtitle animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '240ms' }}>
                        A ORCA escaneia o mercado em tempo real e entrega oportunidades qualificadas direto no seu CRM. Saia do achismo e escale sua operação comercial com inteligência profunda.
                    </p>
                    <div className={`hero-cta animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ animationDelay: '360ms' }}>
                        <a href="/login" className="btn btn-primary btn-lg pulse-animation">
                            Ver minha lista de leads grátis
                        </a>
                        <button className="btn btn-ghost btn-lg" onClick={() => scrollToSection('sonar')}>
                            Ver demo de 2 minutos <ArrowRight size={18} style={{ marginLeft: 8 }} />
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

            {/* ===== PRODUCT PREVIEW (MacBook Mockup) ===== */}
            <section className={`product-preview-section animate-fade-up${heroAnimated ? ' visible' : ''}`} style={{ padding: '0 0 100px 0', marginTop: '-20px', position: 'relative', zIndex: 10, animationDelay: '600ms' }}>
                <div className="container">
                    <div className="macbook-mockup-container">
                        <div className="macbook-frame">
                            <div className="macbook-screen">
                                <img src="/images/dashboard-mockup.png?v=2" alt="ORCA Dashboard" />
                            </div>
                            <div className="macbook-base"></div>
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
                            <div className="pas-icon"><Clock size={20} /></div>
                            <h3>Prospecção manual interminável</h3>
                            <p>Seus SDRs gastam horas garimpando leads no Google, LinkedIn e bases desatualizadas.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-2">
                            <div className="pas-icon"><Snowflake size={20} /></div>
                            <h3>Listas frias e desatualizadas</h3>
                            <p>Contatos que não respondem, emails que voltam e telefones que não existem mais.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-3">
                            <div className="pas-icon"><UserMinus size={20} /></div>
                            <h3>Leads sem qualificação real</h3>
                            <p>Reuniões marcadas com empresas que não têm budget, autoridade ou necessidade real.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-4">
                            <div className="pas-icon"><FastForward size={20} /></div>
                            <h3>Concorrência chegando primeiro</h3>
                            <p>Enquanto seu time analisa planilhas, o concorrente já fechou o contrato.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-5">
                            <div className="pas-icon"><BarChart size={20} /></div>
                            <h3>Relatórios que ninguém entende</h3>
                            <p>Dashboards complexos que exigem horas de análise e não geram ações práticas.</p>
                        </div>
                        <div className="pas-card problem" data-animate="pas-6">
                            <div className="pas-icon"><Users size={20} /></div>
                            <h3>Time comercial desalinhado</h3>
                            <p>Cada vendedor usa seu próprio método, sem padronização ou visibilidade do todo.</p>
                        </div>
                    </div>
                    <div className="pas-solution" data-animate="pas-solution">
                        <div className="pas-solution-icon"><Check size={24} /></div>
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
                            <div className="feature-icon"><Layout size={24} /></div>
                            <h3>Centro de Comando</h3>
                            <p>Visão 360º da sua operação: conversão por etapa, velocidade do pipeline e previsão de receita em tempo real.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-2">
                            <div className="feature-icon"><Search size={24} /></div>
                            <h3>Sonar de Mercado</h3>
                            <p>Rastreie sinais de compra, mudanças de cargo e rodadas de investimento automaticamente.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-3">
                            <div className="feature-icon"><Layers size={24} /></div>
                            <h3>Cardumes (Segmentação)</h3>
                            <p>Agrupe leads por comportamento e perfil ideal (ICP) para abordagens cirúrgicas e personalizadas.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-4">
                            <div className="feature-icon"><Zap size={24} /></div>
                            <h3>Captura Inteligente</h3>
                            <p>Esqueça o preenchimento manual. Importe listas e deixe nossa IA enriquecer e qualificar cada contato.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-5">
                            <div className="feature-icon"><Target size={24} /></div>
                            <h3>Alvos & Corrente</h3>
                            <p>Gestão de leads prioritários e fluxo de negociação com gatilhos automáticos de follow-up.</p>
                        </div>
                        <div className="feature-card" data-animate="feature-6">
                            <div className="feature-icon"><BarChart3 size={24} /></div>
                            <h3>Relatórios Executivos</h3>
                            <p>Gere relatórios de performance do time e ROI por canal em 1 clique, prontos para apresentar ao board.</p>
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
                                <div className="testimonial-rating" style={{ display: 'flex', gap: 2 }}>
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} fill={i < t.rating ? "#F59E0B" : "none"} color="#F59E0B" />
                                    ))}
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
                            <span className="section-badge sonar-badge">Exclusividade ORCA</span>
                            <h2 className="sonar-title">Sonar<span className="sonar-title-accent">.</span></h2>
                            <p className="sonar-narrative">
                                O Sonar é o motor de inteligência profunda da ORCA. Enquanto seu time dorme, ele rastreia sinais de compra, mudanças de cargo e expansões de equipe — e te avisa quando o momento exato de abordar chegar.
                            </p>
                            <div className="sonar-features">
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon"><Search size={20} /></div>
                                    <div>
                                        <h4>Escaneamento Ativo</h4>
                                        <p>Identificação de novas empresas no seu radar baseada em sinais de crescimento real.</p>
                                    </div>
                                </div>
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon"><Target size={20} /></div>
                                    <div>
                                        <h4>Inteligência de Momento</h4>
                                        <p>Saiba quem está contratando ou recebeu aporte antes de todo o mercado.</p>
                                    </div>
                                </div>
                                <div className="sonar-feature">
                                    <div className="sonar-feature-icon"><Zap size={20} /></div>
                                    <div>
                                        <h4>Precisão de Dados</h4>
                                        <p>Informações validadas e atualizadas em tempo real, prontas para prospecção.</p>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-primary btn-lg pulse-animation" onClick={openDemoModal}>
                                Ativar meu Sonar agora
                            </button>
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
                                        <li key={idx}><span className="feature-check"><Check size={14} /></span>{feature}</li>
                                    ))}
                                </ul>
                                <a href="/login" className={`btn ${plan.highlighted ? 'btn-primary' : 'btn-ghost'} pricing-cta`} style={{ textAlign: 'center', display: 'block', textDecoration: 'none' }}>
                                    {plan.cta}
                                </a>
                                <p className="pricing-guarantee">Garantia de 7 dias ou seu dinheiro de volta</p>
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
                                    <span className="faq-icon">{openFaqIndex === index ? <Minus size={18} /> : <Plus size={18} />}</span>
                                </button>
                                {openFaqIndex === index && <div className="faq-answer"><p>{item.answer}</p></div>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== CONTACT SECTION ===== */}
            <section id="contacto" className="contact-form-section">
                <div className="container">
                    <div className="contact-grid">
                        <div className="contact-info">
                            <span className="section-badge">Contacto</span>
                            <h2 className="section-title">Pronto para acelerar as suas vendas?</h2>
                            <p className="section-subtitle">
                                Preencha o formulário e a nossa equipa entrará em contacto em menos de 24 horas para mostrar como a ORCA pode transformar a sua prospecção.
                            </p>
                            
                            <div className="contact-methods">
                                <div className="contact-method">
                                    <div className="method-icon"><Mail size={20} /></div>
                                    <div className="method-content">
                                        <h4>Email</h4>
                                        <p>contacto@orcaleads.online</p>
                                    </div>
                                </div>
                                <div className="contact-method">
                                    <div className="method-icon"><MessageSquare size={20} /></div>
                                    <div className="method-content">
                                        <h4>Suporte</h4>
                                        <p>Disponível das 9h às 18h</p>
                                    </div>
                                </div>
                                <div className="contact-method">
                                    <div className="method-icon"><Phone size={20} /></div>
                                    <div className="method-content">
                                        <h4>Telefone</h4>
                                        <p>+351 900 000 000</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="contact-card-container">
                            <div className="contact-card-inner">
                                {!formSubmitted ? (
                                    <form className="inline-contact-form" onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="name-inline">Nome completo *</label>
                                            <input 
                                                type="text" 
                                                id="name-inline" 
                                                name="name" 
                                                value={formData.name} 
                                                onChange={handleInputChange} 
                                                placeholder="Seu nome" 
                                                required 
                                            />
                                            {formErrors.name && <span className="error-text">{formErrors.name}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="email-inline">E-mail corporativo *</label>
                                            <input 
                                                type="email" 
                                                id="email-inline" 
                                                name="email" 
                                                value={formData.email} 
                                                onChange={handleInputChange} 
                                                placeholder="seu@empresa.com" 
                                                required 
                                            />
                                            {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="company-inline">Empresa *</label>
                                            <input 
                                                type="text" 
                                                id="company-inline" 
                                                name="company" 
                                                value={formData.company} 
                                                onChange={handleInputChange} 
                                                placeholder="Sua empresa" 
                                                required 
                                            />
                                            {formErrors.company && <span className="error-text">{formErrors.company}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="phone-inline">Telefone / WhatsApp</label>
                                            <input 
                                                type="tel" 
                                                id="phone-inline" 
                                                name="phone" 
                                                value={formData.phone} 
                                                onChange={handlePhoneChange} 
                                                placeholder="+351 9XX XXX XXX" 
                                            />
                                            {formErrors.phone && <span className="error-text">{formErrors.phone}</span>}
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="message-inline">Como podemos ajudar?</label>
                                            <textarea 
                                                id="message-inline" 
                                                name="message" 
                                                value={formData.message} 
                                                onChange={handleInputChange} 
                                                placeholder="Descreva brevemente o que você precisa..." 
                                                rows={4} 
                                            />
                                        </div>
                                        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
                                            {isSubmitting ? 'Enviando...' : 'Enviar Mensagem'}
                                        </button>

                                        {/* Honeypot */}
                                        <div style={{ display: 'none' }} aria-hidden="true">
                                            <input 
                                                type="text" 
                                                name="website" 
                                                tabIndex={-1} 
                                                autoComplete="off" 
                                                value={honeypot} 
                                                onChange={(e) => setHoneypot(e.target.value)} 
                                            />
                                        </div>
                                        <p className="form-privacy">Ao enviar, concorda com a nossa <a href="/privacidade">Política de Privacidade</a>.</p>
                                    </form>
                                ) : (
                                    <div className="contact-success">
                                        <div className="success-icon-circle">
                                            <Check size={32} />
                                        </div>
                                        <h3>Mensagem enviada!</h3>
                                        <p>Obrigado pelo contacto. A nossa equipa entrará em contacto consigo em breve.</p>
                                        <button className="btn btn-ghost" onClick={() => setFormSubmitted(false)}>Enviar outra mensagem</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ===== CTA FINAL SECTION ===== */}
            <section className="cta-section">
                <div className="cta-bg">
                    <MistBackground contained />
                    <div className="cta-gradient" />
                    <div className="cta-particles" />
                    <div className="cta-glow" />
                </div>
                <div className="container">
                    <h2 className="cta-title">Pronto para parar de perder leads para a concorrência?</h2>
                    <p className="cta-subtitle">Setup em menos de 10 minutos. Primeiros leads ainda hoje.</p>
                    <div className="cta-buttons">
                        <a href="/login" className="btn btn-primary btn-lg pulse-animation">
                            Começar agora — é grátis por 7 dias
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
                                        <MessageSquare size={24} color="var(--orca-text)" strokeWidth={1.5} />
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
                                            <label htmlFor="phone">Telefone / WhatsApp</label>
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

                                    {/* Honeypot */}
                                    <div style={{ display: 'none' }} aria-hidden="true">
                                        <input 
                                            type="text" 
                                            name="website" 
                                            tabIndex={-1} 
                                            autoComplete="off" 
                                            value={honeypot} 
                                            onChange={(e) => setHoneypot(e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-trust">
                                        <div className="trust-item"><ShieldCheck size={14} /><span>Seus dados estão seguros</span></div>
                                        <div className="trust-item"><Clock size={14} /><span>Resposta em até 24h</span></div>
                                    </div>
                                </form>
                            </>
                        ) : (
                            <div className="modal-success">
                                <div className="success-icon">
                                    <Check size={64} color="var(--orca-text)" strokeWidth={1.5} />
                                </div>
                                <h3 className="modal-title">Mensagem enviada!</h3>
                                <p className="modal-subtitle">Obrigado pelo contato. Nossa equipe entrará em contato em até 24 horas.</p>
                                <button className="btn btn-primary btn-lg" onClick={closeModal}>Fechar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== DEMO MODAL ===== */}
            {demoModalOpen && (
                <div className="demo-modal-overlay" onClick={closeDemoModal}>
                    <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="demo-modal__close" onClick={closeDemoModal}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                        {!formSubmitted ? (
                            <>
                                <div className="demo-modal__eyebrow">Demo Personalizada</div>
                                <h3 className="demo-modal__title">Veja a ORCA em ação</h3>
                                <p className="demo-modal__subtitle">Preencha os dados abaixo e receba uma demo personalizada da plataforma.</p>
                                <form className="demo-modal__form" onSubmit={handleDemoSubmit}>
                                    <div className="demo-form-row">
                                        <div className="demo-form-field">
                                            <label htmlFor="demo-firstName">Nome</label>
                                            <input type="text" id="demo-firstName" name="firstName" value={demoFormData.firstName} onChange={handleDemoInputChange} placeholder="Seu nome" required />
                                        </div>
                                        <div className="demo-form-field">
                                            <label htmlFor="demo-lastName">Sobrenome</label>
                                            <input type="text" id="demo-lastName" name="lastName" value={demoFormData.lastName} onChange={handleDemoInputChange} placeholder="Seu sobrenome" required />
                                        </div>
                                    </div>
                                    <div className="demo-form-field">
                                        <label htmlFor="demo-email">E-mail corporativo</label>
                                        <input type="email" id="demo-email" name="email" value={demoFormData.email} onChange={handleDemoInputChange} placeholder="seu@empresa.com" required />
                                    </div>
                                    <div className="demo-form-row">
                                        <div className="demo-form-field">
                                            <label htmlFor="demo-company">Empresa</label>
                                            <input type="text" id="demo-company" name="company" value={demoFormData.company} onChange={handleDemoInputChange} placeholder="Nome da empresa" required />
                                        </div>
                                        <div className="demo-form-field">
                                            <label htmlFor="demo-phone">Telefone / WhatsApp</label>
                                            <input type="tel" id="demo-phone" name="phone" value={demoFormData.phone} onChange={handleDemoInputChange} placeholder="+351 9XX XXX XXX" required />
                                        </div>
                                        <div className="demo-form-field">
                                            <label htmlFor="demo-teamSize">Tamanho do time</label>
                                            <select id="demo-teamSize" name="teamSize" value={demoFormData.teamSize} onChange={handleDemoInputChange} required>
                                                <option value="">Selecione...</option>
                                                <option value="1-5">1-5 pessoas</option>
                                                <option value="6-20">6-20 pessoas</option>
                                                <option value="21-50">21-50 pessoas</option>
                                                <option value="51+">51+ pessoas</option>
                                            </select>
                                        </div>
                                    </div>
                                    <button type="submit" className="demo-modal__submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Enviando...' : 'Receber demo personalizada'}
                                    </button>

                                    {/* Honeypot */}
                                    <div style={{ display: 'none' }} aria-hidden="true">
                                        <input 
                                            type="text" 
                                            name="website" 
                                            tabIndex={-1} 
                                            autoComplete="off" 
                                            value={honeypot} 
                                            onChange={(e) => setHoneypot(e.target.value)} 
                                        />
                                    </div>
                                </form>
                                <p className="demo-modal__fine-print">Sem cartão de crédito. Setup em 10 minutos.</p>
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                                <div style={{ 
                                    width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', 
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' 
                                }}>
                                    <Check size={40} color="var(--orca-text)" />
                                </div>
                                <h3 className="demo-modal__title">Pedido recebido!</h3>
                                <p className="demo-modal__subtitle">Obrigado pelo seu interesse. A nossa equipa entrará em contacto para agendar a sua demo.</p>
                                <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={closeDemoModal}>Fechar</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ===== FLOATING ACTIONS ===== */}
            <div className="float-actions">
                {scrolled && (
                    <button
                        className="scroll-to-top"
                        onClick={() => scrollToSection('inicio')}
                        aria-label="Voltar ao topo"
                    >
                        <ChevronUp size={24} />
                    </button>
                )}
                
                <div className="float-contact">
                    <div className="float-contact__bubble desktop-only">
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
            </div>

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
                                <li><a href="/login">Login</a></li>
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
                                <li><a href="/privacidade">Privacidade</a></li>
                                <li><a href="/termos">Termos de Uso</a></li>
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
                html, body, #root, .landing-page, main { 
                    margin: 0 !important; 
                    padding: 0 !important; 
                    width: 100% !important;
                    height: 100% !important;
                    background: #0A0A0A !important;
                    overflow-x: hidden !important;
                    position: relative;
                }
                
                main {
                    display: block !important;
                    position: relative !important;
                    top: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
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
                @keyframes heroFade {
                    0% { opacity: 0; transform: translateY(6px); filter: blur(2px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                @keyframes pulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
                    50% { box-shadow: 0 0 0 15px rgba(255, 255, 255, 0); }
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
                    position: fixed !important; 
                    top: 0 !important; 
                    left: 0 !important; 
                    right: 0 !important; 
                    z-index: 1000 !important;
                    transition: all 0.3s ease; 
                    background: transparent;
                }
                .landing-header.scrolled {
                    background: rgba(5, 7, 10, 0.4);
                    backdrop-filter: blur(24px) saturate(180%);
                    -webkit-backdrop-filter: blur(24px) saturate(180%);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 15px 0;
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
                    background: var(--orca-text); transition: width 0.3s ease;
                }
                .nav-link:hover, .nav-link.active { color: #EAF6FF; }
                .nav-link:hover::after, .nav-link.active::after { width: 100%; }
                .landing-header-actions { 
                    display: flex; 
                    align-items: center; 
                    gap: 16px; 
                    z-index: 20;
                    min-width: 120px;
                    justify-content: flex-end;
                }
                .btn-login {
                    background: #EAF6FF !important; 
                    color: #0A0A0A !important;
                    border: none !important; 
                    padding: 8px 24px !important;
                    border-radius: 6px !important; 
                    font-size: 14px !important; 
                    font-weight: 700 !important;
                    text-decoration: none !important; 
                    transition: all 0.2s ease !important;
                    cursor: pointer !important;
                }
                .btn-login:hover { 
                    background: #FFFFFF !important; 
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(234, 246, 255, 0.2);
                }
                .mobile-login { display: block; text-align: center; margin-top: 24px; }
                .mobile-menu-btn { 
                    display: none; 
                    flex-direction: column; 
                    gap: 5px; 
                    background: none; 
                    border: none; 
                    cursor: pointer; 
                    padding: 8px; 
                    z-index: 100;
                    position: relative;
                }
                .mobile-menu-btn span { 
                    width: 24px; 
                    height: 2px; 
                    background: #EAF6FF; 
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
                    transform-origin: center;
                }
                .mobile-menu-btn.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
                .mobile-menu-btn.open span:nth-child(2) { opacity: 0; transform: translateX(-10px); }
                .mobile-menu-btn.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

                .mobile-menu {
                    position: absolute; 
                    top: 100%; 
                    left: 0; 
                    right: 0;
                    background: rgba(5, 7, 10, 0.6); 
                    backdrop-filter: blur(32px) saturate(180%);
                    -webkit-backdrop-filter: blur(32px) saturate(180%);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1); 
                    padding: 0 24px;
                    max-height: 0;
                    overflow: hidden;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
                    transform: translateY(-10px);
                }
                .mobile-menu.active {
                    max-height: 500px;
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                    padding: 24px;
                }
                .mobile-menu-inner {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mobile-nav-link { 
                    display: block; 
                    width: 100%; 
                    text-align: left; 
                    background: none; 
                    border: none; 
                    color: rgba(234, 246, 255, 0.6); 
                    font-size: 16px; 
                    font-weight: 500;
                    padding: 14px 0; 
                    cursor: pointer; 
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    transition: color 0.3s ease;
                }
                .mobile-nav-link.active { color: var(--orca-text); }
                .mobile-login { display: block; text-align: center; margin-top: 24px; }

                @media (max-width: 900px) {
                    .landing-nav { display: none; }
                    .mobile-menu-btn { display: flex; }
                }

                /* ===== HERO SECTION ===== */
                .hero-section {
                    position: relative !important;
                    top: 0 !important;
                    width: 100% !important;
                    min-height: 100vh !important;
                    overflow: hidden;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: transparent !important;
                    margin: 0 !important;
                    padding: 64px 0 60px !important;
                    z-index: 1;
                }
                .hero-bg { 
                    position: absolute; inset: 0; z-index: 0; overflow: hidden;
                    background: transparent !important;
                }
                .hero-video {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    object-fit: cover; opacity: 0.2;
                }
                .hero-gradient { 
                    position: absolute; inset: 0; 
                    background: linear-gradient(180deg, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.2) 15%, rgba(10, 10, 10, 0) 50%, #0A0A0A 100%); 
                    z-index: 1; 
                }
                .hero-particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                    background-size: 60px 60px; opacity: 0.3; z-index: 2;
                }
                .hero-content {
                    position: relative;
                    z-index: 10;
                    text-align: center;
                    max-width: 900px;
                    margin: 0 auto;
                    padding-top: 0 !important;
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                }
                .hero-badge {
                    display: inline-block; padding: 6px 16px; background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; font-size: 12px;
                    font-weight: 600; color: var(--orca-text); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 20px;
                    margin-top: 0 !important;
                }
                .hero-title {
                    font-size: clamp(32px, 5.5vw, 52px); font-weight: 900; line-height: 1.05;
                    margin-bottom: 24px; letter-spacing: -0.04em; font-family: 'Satoshi', sans-serif;
                    text-transform: uppercase;
                }
                .hero-title em { color: var(--orca-text); font-style: normal; font-weight: 700; }
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
                .btn-primary { background: var(--orca-text); color: #0A0A0A; }
                .btn-primary:hover { background: #E6E6E6; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(255, 255, 255, 0.3); }
                .btn-ghost { background: transparent; color: rgba(234, 246, 255, 0.7); border: 1px solid rgba(234, 246, 255, 0.15); }
                .btn-ghost:hover { color: #EAF6FF; border-color: rgba(234, 246, 255, 0.3); background: rgba(234, 246, 255, 0.05); }
                .btn-lg { padding: 14px 32px; font-size: 16px; }
                .hero-stats { display: flex; gap: 32px; justify-content: center; align-items: center; flex-wrap: nowrap; }
                .stat-item { display: flex; flex-direction: column; align-items: center; gap: 4px; }
                .stat-value { font-size: 28px; font-weight: 700; color: var(--orca-text); }
                .stat-label { font-size: 13px; color: rgba(234, 246, 255, 0.5); }
                .stat-divider { width: 1px; height: 40px; background: rgba(234, 246, 255, 0.1); }

                /* ===== MACBOOK MOCKUP ===== */
                .macbook-mockup-container {
                    width: 100%;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .macbook-frame {
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                }
                .macbook-screen {
                    background: #111;
                    border-radius: 16px 16px 0 0;
                    padding: 16px 16px 24px 16px;
                    border: 1px solid #222;
                    border-bottom: none;
                    box-shadow: inset 0 0 0 1px #333;
                    position: relative;
                }
                .macbook-screen img {
                    width: 100%;
                    height: auto;
                    display: block;
                    border-radius: 4px;
                    border: 1px solid #000;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                }
                .macbook-base {
                    height: 16px;
                    background: linear-gradient(to bottom, #444, #1a1a1a);
                    border-radius: 0 0 16px 16px;
                    width: 100%;
                    position: relative;
                    box-shadow: inset 0 2px 2px rgba(255,255,255,0.1), 0 10px 20px rgba(0,0,0,0.5);
                }
                .macbook-base::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 100px;
                    height: 4px;
                    background: #000;
                    border-radius: 0 0 4px 4px;
                }

                /* ===== CLIENT LOGOS ===== */
                .clients-section { padding: 60px 0; background: #0A0A0A; border-top: 1px solid rgba(255, 255, 255, 0.05); border-bottom: 1px solid rgba(255, 255, 255, 0.05); }
                .clients-label { text-align: center; font-size: 13px; color: rgba(234, 246, 255, 0.4); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 32px; }
                .clients-grid { display: flex; justify-content: center; align-items: center; gap: 48px; flex-wrap: wrap; opacity: 0.6; }
                .client-logo { padding: 8px 24px; }
                .client-logo-text { font-size: 18px; font-weight: 700; letter-spacing: 0.02em; }

                /* ===== PAS SECTION ===== */
                .pas-section { padding: 120px 0; background: #0A0A0A; }
                .section-header { text-align: center; max-width: 640px; margin: 0 auto 60px; }
                .section-badge {
                    display: inline-block; padding: 6px 16px; background: rgba(255, 255, 255, 0.08);
                    border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 20px; font-size: 12px;
                    font-weight: 600; color: var(--orca-text); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 16px;
                }
                .section-title { font-size: clamp(28px, 4vw, 40px); font-weight: 700; line-height: 1.1; margin-bottom: 16px; letter-spacing: -0.03em; font-family: 'Satoshi', sans-serif; }
                .section-subtitle { font-size: 16px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); font-weight: 400; }
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
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(0, 255, 128, 0.05));
                    border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; padding: 40px;
                    text-align: center; max-width: 700px; margin: 0 auto;
                }
                .pas-solution-icon {
                    width: 48px; height: 48px; background: rgba(255, 255, 255, 0.1); border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;
                    font-size: 24px; color: var(--orca-text);
                }
                .pas-solution h3 { font-size: 22px; font-weight: 600; margin-bottom: 12px; color: var(--orca-text); }
                .pas-solution p { font-size: 16px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); max-width: 500px; margin: 0 auto; }

                /* ===== FEATURES SECTION ===== */
                .features-section { padding: 120px 0; background: #0A0A0A; }
                .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; }
                .feature-card {
                    background: rgba(51, 51, 51, 0.7); border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px; padding: 32px; transition: all 0.3s ease;
                }
                .feature-card:hover { border-color: rgba(255, 255, 255, 0.2); background: rgba(51, 51, 51, 0.5); transform: translateY(-2px); }
                .feature-icon {
                    font-size: 24px;
                    color: var(--orca-text);
                    margin-bottom: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 56px;
                    height: 56px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 14px;
                }
                .feature-card h3 { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
                .feature-card p { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }

                /* ===== HOW IT WORKS ===== */
                .how-section {
                    padding: 120px 0; background: linear-gradient(180deg, #0A0A0A 0%, #0A0A0A 100%);
                    position: relative; overflow: hidden;
                }
                .how-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); }
                .how-section::after { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.03) 0%, transparent 60%); pointer-events: none; }
                .how-section .container { position: relative; z-index: 1; }
                .steps-container { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 0; }
                .step { display: flex; gap: 32px; align-items: flex-start; padding: 32px 0; }
                .step-number {
                    width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2); display: flex; align-items: center;
                    justify-content: center; font-size: 20px; font-weight: 700; color: var(--orca-text); flex-shrink: 0;
                }
                .step-content h3 { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
                .step-content p { font-size: 15px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }
                .step-connector { width: 1px; height: 32px; background: linear-gradient(to bottom, rgba(255, 255, 255, 0.3), transparent); margin-left: 23px; }

                /* ===== TESTIMONIALS ===== */
                .testimonials-section { padding: 120px 0; background: #0A0A0A; }
                .testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; }
                .testimonial-card {
                    background: rgba(51, 51, 51, 0.7); border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 16px; padding: 32px; transition: all 0.3s ease;
                }
                .testimonial-card:hover { border-color: rgba(255, 255, 255, 0.2); }
                .testimonial-header { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
                .testimonial-avatar {
                    width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.15);
                    display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 700; color: var(--orca-text);
                }
                .testimonial-name { font-size: 16px; font-weight: 600; }
                .testimonial-role { font-size: 13px; color: rgba(234, 246, 255, 0.5); }
                .testimonial-quote { font-size: 15px; line-height: 1.7; color: rgba(234, 246, 255, 0.7); margin-bottom: 16px; font-style: italic; }
                .testimonial-metric {
                    display: inline-block; padding: 6px 12px; background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px; font-size: 13px; font-weight: 600; color: var(--orca-text); margin-bottom: 12px;
                }
                .testimonial-rating { color: #F59E0B; font-size: 14px; }

                /* ===== SONAR SECTION ===== */
                .sonar-section {
                    padding: 140px 0; position: relative; overflow: visible;
                    background: linear-gradient(180deg, #0A0A0A 0%, #1A1A1A 50%, #0A0A0A 100%);
                }
                .sonar-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent); }
                .sonar-bg { position: absolute; inset: 0; z-index: 0; }
                .sonar-grid { position: absolute; inset: 0; background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px); background-size: 40px 40px; }
                .sonar-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; position: relative; z-index: 1; }
                .sonar-content { max-width: 500px; }
                .sonar-badge { background: rgba(255, 255, 255, 0.15); border-color: rgba(255, 255, 255, 0.3); }
                .sonar-title { font-size: clamp(48px, 8vw, 72px); font-weight: 900; line-height: 1; margin-bottom: 24px; letter-spacing: -0.04em; font-family: 'Satoshi', sans-serif; }
                .sonar-title-accent { color: var(--orca-text); }
                .sonar-narrative {
                    font-size: 16px; line-height: 1.8; color: rgba(234, 246, 255, 0.6);
                    margin-bottom: 32px; padding: 20px; background: rgba(255, 255, 255, 0.05);
                    border-left: 3px solid var(--orca-text); border-radius: 0 12px 12px 0;
                }
                .sonar-subtitle { font-size: 18px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); margin-bottom: 40px; }
                .sonar-features { display: flex; flex-direction: column; gap: 24px; margin-bottom: 40px; }
                .sonar-feature { display: flex; gap: 16px; align-items: flex-start; }
                .sonar-feature-icon { font-size: 24px; color: var(--orca-text); flex-shrink: 0; }
                .sonar-feature h4 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
                .sonar-feature p { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.5); }
                .sonar-visual { position: relative; width: 400px; height: 400px; opacity: 0.7; }
                .sonar-circle {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.2);
                    animation: sonar-circle-pulse 4s ease-in-out infinite;
                }
                .sonar-circle-1 { width: 180px; height: 180px; border-color: rgba(255, 255, 255, 0.3); animation-delay: 0s; }
                .sonar-circle-2 { width: 280px; height: 280px; border-color: rgba(255, 255, 255, 0.2); animation-delay: 0.5s; }
                .sonar-circle-3 { width: 380px; height: 380px; border-color: rgba(255, 255, 255, 0.15); animation-delay: 1s; }
                @keyframes sonar-circle-pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.6; }
                    50% { transform: translate(-50%, -50%) scale(1.05); opacity: 1; }
                }
                .sonar-sweep {
                    position: absolute; top: 50%; left: 50%; width: 200px; height: 2px;
                    background: linear-gradient(to right, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(255, 255, 255, 0.3) 80%, transparent 100%);
                    transform-origin: left center; animation: sonar-sweep 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                    filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
                }
                @keyframes sonar-sweep { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .sonar-dot {
                    position: absolute; width: 6px; height: 6px; background: var(--orca-text);
                    border-radius: 50%; box-shadow: 0 0 12px rgba(255, 255, 255, 0.6), 0 0 24px rgba(255, 255, 255, 0.2);
                    animation: sonar-dot-pulse 4s ease-in-out infinite;
                }
                .sonar-dot::after {
                    content: ''; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 20px; height: 20px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, 0.3);
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
                    width: 8px; height: 8px; background: var(--orca-text); border-radius: 50%;
                    box-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.3);
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
                    width: 12px; height: 12px; background: var(--orca-text); border-radius: 50%;
                    box-shadow: 0 0 16px rgba(255, 255, 255, 0.8), 0 0 32px rgba(255, 255, 255, 0.3);
                    margin-bottom: 8px; animation: radar-dot-blink 2s ease-in-out infinite;
                }
                @keyframes radar-dot-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                .radar-card-content {
                    background: rgba(5, 7, 10, 0.92); backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 255, 255, 0.3); border-radius: 12px;
                    padding: 12px 16px; min-width: 180px;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 255, 255, 0.1);
                }
                .radar-card-content h4 { font-size: 13px; font-weight: 600; color: var(--orca-text); margin: 0 0 4px 0; white-space: nowrap; }
                .radar-card-content p { font-size: 11px; color: rgba(234, 246, 255, 0.6); margin: 0 0 4px 0; line-height: 1.4; }
                .radar-card-phone { font-size: 10px; color: rgba(234, 246, 255, 0.4); font-family: monospace; }

                @media (max-width: 900px) {
                    .sonar-layout { grid-template-columns: 1fr; gap: 40px; }
                    .sonar-content { max-width: 100%; }
                    .sonar-visual { display: none; }
                }

                /* ===== PRICING SECTION ===== */
                .pricing-section {
                    padding: 120px 0; background: linear-gradient(180deg, #0A0A0A 0%, #333333 100%);
                    position: relative;
                }
                .pricing-section::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px; background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent); }
                .pricing-section .container { position: relative; z-index: 1; }
                .pricing-toggle { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 48px; }
                .toggle-label { font-size: 14px; color: rgba(234, 246, 255, 0.5); }
                .toggle-label-active { font-size: 14px; color: #EAF6FF; font-weight: 600; }
                .toggle-switch {
                    width: 48px; height: 26px; border-radius: 13px; background: rgba(255, 255, 255, 0.2);
                    border: 1px solid rgba(255, 255, 255, 0.3); cursor: pointer; position: relative; transition: all 0.3s ease;
                }
                .toggle-switch.active { background: rgba(255, 255, 255, 0.4); border-color: var(--orca-text); }
                .toggle-knob {
                    width: 20px; height: 20px; border-radius: 50%; background: var(--orca-text);
                    position: absolute; top: 2px; left: 2px; transition: all 0.3s ease;
                }
                .toggle-switch.active .toggle-knob { left: 22px; }
                .toggle-discount {
                    display: inline-block; padding: 2px 8px; background: rgba(255, 255, 255, 0.15);
                    border-radius: 12px; font-size: 12px; font-weight: 600; color: var(--orca-text); margin-left: 4px;
                }
                .pricing-grid {
                    display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 24px; max-width: 1000px; margin: 0 auto;
                }
                .pricing-card {
                    background: rgba(51, 51, 51, 0.7); border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px; padding: 32px; position: relative; transition: all 0.3s ease;
                }
                .pricing-card:hover { transform: translateY(-4px); border-color: rgba(255, 255, 255, 0.2); }
                .pricing-card.highlighted {
                    border-color: var(--orca-text); border-width: 2px;
                    background: rgba(255, 255, 255, 0.05);
                }
                .pricing-card.highlighted.visible { transform: scale(1.03); }
                .pricing-badge {
                    position: absolute; top: -12px; left: 50%; transform: translateX(-50%);
                    padding: 4px 16px; background: var(--orca-text); color: #0A0A0A; font-size: 12px;
                    font-weight: 700; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.05em;
                }
                .pricing-team-badge {
                    text-align: center; font-size: 12px; color: rgba(255, 255, 255, 0.7);
                    margin-bottom: 8px; font-weight: 500;
                }
                .pricing-name { font-size: 24px; font-weight: 700; margin-bottom: 8px; }
                .pricing-description { font-size: 14px; color: rgba(234, 246, 255, 0.5); margin-bottom: 24px; }
                .pricing-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
                .pricing-currency { font-size: 20px; color: rgba(234, 246, 255, 0.6); }
                .pricing-value { font-size: 48px; font-weight: 700; color: var(--orca-text); line-height: 1; }
                .pricing-period { font-size: 14px; color: rgba(234, 246, 255, 0.5); }
                .pricing-annual-note { font-size: 12px; color: rgba(234, 246, 255, 0.4); margin-bottom: 24px; }
                .pricing-features { list-style: none; padding: 0; margin: 0 0 32px 0; }
                .pricing-features li { display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 14px; color: rgba(234, 246, 255, 0.8); }
                .feature-check { color: var(--orca-text); font-weight: 700; }
                .pricing-cta { width: 100%; }
                .pricing-guarantee {
                    text-align: center; font-size: 12px; color: rgba(234, 246, 255, 0.4);
                    margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(255, 255, 255, 0.06);
                }

                /* ===== FAQ SECTION ===== */
                .faq-section { padding: 120px 0; background: #0A0A0A; }
                .faq-container { max-width: 700px; margin: 0 auto; }
                .faq-item { border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
                .faq-question {
                    width: 100%; display: flex; justify-content: space-between; align-items: center;
                    padding: 20px 0; background: none; border: none; cursor: pointer; text-align: left;
                }
                .faq-question span:first-child { font-size: 16px; font-weight: 500; color: #EAF6FF; flex: 1; padding-right: 24px; }
                .faq-icon { font-size: 20px; color: var(--orca-text); flex-shrink: 0; }
                .faq-answer { padding: 0 0 20px 0; }
                .faq-answer p { font-size: 15px; line-height: 1.7; color: rgba(234, 246, 255, 0.6); }

                /* ===== CTA SECTION ===== */
                .cta-section {
                    padding: 140px 0; position: relative; text-align: center; overflow: hidden;
                }
                .cta-bg { position: absolute; inset: 0; z-index: 0; }
                .cta-gradient {
                    position: absolute; inset: 0;
                    background: radial-gradient(ellipse at 30% 50%, rgba(255, 255, 255, 0.08) 0%, transparent 50%),
                        radial-gradient(ellipse at 70% 50%, rgba(51, 51, 51, 0.4) 0%, transparent 50%),
                        radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.05) 0%, transparent 40%);
                }
                .cta-particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
                        radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                    background-size: 80px 80px, 40px 40px; background-position: 0 0, 20px 20px;
                    opacity: 0.4; animation: cta-particles-move 20s linear infinite;
                }
                @keyframes cta-particles-move { 0% { transform: translateY(0); } 100% { transform: translateY(-80px); } }
                .cta-glow {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    width: 600px; height: 600px; background: radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%);
                    border-radius: 50%; animation: cta-glow-pulse 6s ease-in-out infinite;
                }
                @keyframes cta-glow-pulse {
                    0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                }
                .cta-title {
                    font-size: clamp(28px, 5vw, 48px); font-weight: 700; line-height: 1.1;
                    margin-bottom: 16px; position: relative; z-index: 1;
                    font-family: 'Satoshi', sans-serif; letter-spacing: -0.03em;
                }
                .cta-subtitle {
                    font-size: 18px; line-height: 1.7; color: rgba(234, 246, 255, 0.5);
                    max-width: 500px; margin: 0 auto 40px; position: relative; z-index: 1;
                }
                .cta-buttons { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; position: relative; z-index: 1; }
                .cta-section .btn { position: relative; z-index: 1; }

                /* ===== NEW CONTACT FORM SECTION ===== */
                .contact-form-section { 
                    padding: 120px 0; 
                    background: #0A0A0A; 
                    position: relative; 
                    z-index: 50;
                    display: block !important;
                    opacity: 1 !important;
                }
                .contact-grid { 
                    display: grid; 
                    grid-template-columns: 1fr 1fr; 
                    gap: 80px; 
                    align-items: start;
                    opacity: 1 !important;
                }
                .contact-methods { display: flex; flex-direction: column; gap: 24px; margin-top: 40px; }
                .contact-method { display: flex; gap: 16px; align-items: flex-start; }
                .method-icon { 
                    width: 44px; height: 44px; background: rgba(255, 255, 255, 0.05); 
                    border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;
                    display: flex; align-items: center; justify-content: center; color: var(--orca-text);
                    flex-shrink: 0;
                }
                .method-content h4 { font-size: 16px; font-weight: 600; margin-bottom: 4px; color: #FFF; }
                .method-content p { font-size: 14px; color: rgba(234, 246, 255, 0.5); }
                
                .contact-card-container { position: relative; }
                .contact-card-inner {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    border-radius: 24px;
                    padding: 50px;
                    position: relative;
                    z-index: 1;
                }
                .inline-contact-form { display: flex; flex-direction: column; gap: 20px; }
                .inline-contact-form label { font-size: 13px; font-weight: 500; color: rgba(234, 246, 255, 0.7); margin-bottom: 4px; display: block; }
                .inline-contact-form input, .inline-contact-form textarea {
                    width: 100%; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px; padding: 12px 16px; font-size: 14px; color: #FFF; outline: none;
                    transition: all 0.3s ease;
                }
                .inline-contact-form input:focus, .inline-contact-form textarea:focus {
                    border-color: var(--orca-text); background: rgba(0, 0, 0, 0.5);
                }
                .error-text { font-size: 12px; color: #EF4444; margin-top: 4px; display: block; }
                .w-full { width: 100%; }
                .form-privacy { font-size: 12px; color: rgba(234, 246, 255, 0.4); text-align: center; margin-top: 12px; }
                .form-privacy a { color: var(--orca-text); text-decoration: none; }
                
                .contact-success { text-align: center; padding: 20px 0; }
                .success-icon-circle {
                    width: 64px; height: 64px; background: rgba(0, 255, 128, 0.1); border: 2px solid var(--orca-text);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 24px; color: var(--orca-text);
                }
                .contact-success h3 { font-size: 24px; font-weight: 700; margin-bottom: 12px; }
                .contact-success p { font-size: 15px; color: rgba(234, 246, 255, 0.6); margin-bottom: 32px; }

                @media (max-width: 900px) {
                    .contact-grid { grid-template-columns: 1fr; gap: 48px; }
                    .contact-info { text-align: center; }
                    .contact-methods { 
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-top: 40px;
                    }
                    .contact-method { 
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        background: rgba(255, 255, 255, 0.03);
                        padding: 24px;
                        border-radius: 16px;
                        border: 1px solid rgba(255, 255, 255, 0.05);
                    }
                    .contact-card-inner {
                        padding: 30px 20px;
                    }
                }

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
                    background: rgba(51, 51, 51, 0.95) !important; border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    border-radius: 20px !important; padding: 40px !important; max-width: 640px !important;
                    width: 100% !important; position: relative !important;
                    animation: contact-modal-slide-in 0.3s ease !important;
                    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 255, 255, 0.05) !important;
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
                    width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(255, 255, 255, 0.08);
                    border-radius: 12px; display: flex; align-items: center; justify-content: center;
                    border: 1px solid rgba(255, 255, 255, 0.12);
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
                    width: 100%; background: rgba(5, 7, 10, 0.5); border: 1.5px solid rgba(255, 255, 255, 0.12);
                    border-radius: 10px; padding: 14px 16px; font-size: 14px; color: #EAF6FF;
                    font-family: inherit; transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    outline: none;
                }
                .input-wrapper input::placeholder, .input-wrapper textarea::placeholder { color: rgba(234, 246, 255, 0.25); font-size: 14px; }
                .input-wrapper input:hover, .input-wrapper textarea:hover { border-color: rgba(255, 255, 255, 0.2); background: rgba(5, 7, 10, 0.7); }
                .input-wrapper input:focus, .input-wrapper textarea:focus {
                    border-color: rgba(255, 255, 255, 0.5);
                    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08), 0 2px 8px rgba(0, 0, 0, 0.2);
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
                .form-submit:hover:not(:disabled) { transform: translateY(-1px) scale(1.01); box-shadow: 0 6px 24px rgba(255, 255, 255, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2); }
                .form-submit:active:not(:disabled) { transform: translateY(0) scale(0.99); }
                .form-submit:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-loading { display: inline-flex; align-items: center; gap: 8px; }
                .spinner { width: 18px; height: 18px; animation: spinner-rotate 1s linear infinite; }
                @keyframes spinner-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .form-trust { display: flex; align-items: center; justify-content: center; gap: 24px; margin-top: 16px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
                .trust-item { display: flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(234, 246, 255, 0.4); }
                .trust-item svg { color: rgba(255, 255, 255, 0.5); flex-shrink: 0; }
                @media (max-width: 480px) { .form-trust { flex-direction: column; gap: 8px; } }
                .modal-success { text-align: center; padding: 20px 0; }
                .success-icon { margin-bottom: 24px; display: flex; justify-content: center; }
                .success-icon svg { animation: success-pop 0.5s ease; }
                @keyframes success-pop { 0% { transform: scale(0); } 50% { transform: scale(1.2); } 100% { transform: scale(1); } }
                .modal-success .modal-title { margin-bottom: 12px; }
                .modal-success .btn { margin-top: 24px; }

                /* ===== FOOTER ===== */
                .landing-footer { padding: 80px 0 40px; background: #0A0A0A; border-top: 1px solid rgba(255, 255, 255, 0.05); }
                .landing-footer .container { max-width: 1400px; padding: 0 48px; }
                .footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; margin-bottom: 60px; }
                .footer-logo img { height: 24px; margin-bottom: 16px; }
                .footer-tagline { font-size: 14px; line-height: 1.6; color: rgba(234, 246, 255, 0.4); max-width: 280px; }
                .footer-trust-badges { display: flex; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
                .trust-badge {
                    padding: 4px 12px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.7); font-weight: 500;
                }
                .footer-links h4 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(234, 246, 255, 0.4); margin-bottom: 20px; }
                .footer-links ul { list-style: none; padding: 0; margin: 0; }
                .footer-links li { margin-bottom: 12px; }
                .footer-links a, .footer-links button { background: none; border: none; color: rgba(234, 246, 255, 0.6); font-size: 14px; cursor: pointer; transition: color 0.2s ease; padding: 0; }
                .footer-links a:hover, .footer-links button:hover { color: #EAF6FF; }
                .footer-bottom { padding-top: 40px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center; }
                .footer-bottom p { font-size: 13px; color: rgba(234, 246, 255, 0.3); }
                @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; } }
                @media (max-width: 600px) { .footer-grid { grid-template-columns: 1fr; gap: 24px; } }

                /* ===== UTILITY ===== */
                .desktop-only { display: block; }
                @media (max-width: 768px) { .desktop-only { display: none !important; } }

                /* ===== SCROLL TO TOP BUTTON ===== */
                .scroll-to-top {
                    width: 56px;
                    height: 56px;
                    background: var(--orca-text);
                    color: #0A0A0A;
                    border: none;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 16px rgba(255, 255, 255, 0.3);
                }
                .scroll-to-top:hover {
                    background: #E6E6E6;
                    transform: translateY(-3px);
                    box-shadow: 0 8px 24px rgba(255, 255, 255, 0.4);
                }
                .scroll-to-top:active {
                    transform: translateY(-1px);
                }

                /* ===== HERO INLINE CAPTURE ===== */
                .hero-capture-section {
                    padding: 40px 0;
                    background: #0A0A0A;
                    border-top: 1px solid rgba(255, 255, 255, 0.05);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                }
                .hero-capture__form {
                    display: flex;
                    gap: 0;
                    background: rgba(51, 51, 51, 0.5);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    max-width: 520px;
                    margin: 0 auto;
                }
                .hero-capture__form:focus-within {
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1), 0 0 40px rgba(255, 255, 255, 0.1);
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
                    background: var(--orca-text);
                    color: #0A0A0A;
                    border: none;
                    padding: 14px 22px;
                    font-family: 'Satoshi', sans-serif;
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
                    background: #E6E6E6;
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
                    bottom: 0;
                    left: 0;
                    right: 0;
                    z-index: 1100;
                    background: rgba(9, 12, 16, 0.95);
                    backdrop-filter: blur(12px);
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding: 12px 24px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 16px;
                    transform: translateY(100%);
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
                    height: 20px;
                    width: auto;
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
                    background: var(--orca-text);
                    color: #0A0A0A;
                    border: none;
                    border-radius: 8px;
                    padding: 9px 18px;
                    font-family: 'Satoshi', sans-serif;
                    font-size: 13px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    white-space: nowrap;
                }
                .sticky-bar__cta:hover {
                    background: #E6E6E6;
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

                /* ===== FLOATING ACTIONS ===== */
                .float-actions {
                    position: fixed;
                    bottom: 28px;
                    right: 28px;
                    z-index: 1500;
                    display: flex;
                    flex-direction: column-reverse;
                    align-items: flex-end;
                    gap: 12px;
                    pointer-events: none; /* Crucial: allows scroll through the container */
                }
                .float-actions > * {
                    pointer-events: all; /* Buttons capture clicks normally */
                }
                
                .float-contact {
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    gap: 10px;
                }
                .float-contact__bubble {
                    background: rgba(51, 51, 51, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.1);
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
                .float-contact:hover .float-contact__bubble {
                    opacity: 1;
                    transform: translateX(0);
                }
                .float-contact__bubble strong {
                    color: #EAF6FF;
                    display: block;
                    font-size: 13px;
                    font-weight: 500;
                    margin-bottom: 2px;
                }
                .float-contact__btn {
                    width: 56px;
                    height: 56px;
                    border-radius: 50%;
                    background: var(--orca-text);
                    color: #0A0A0A;
                    border: none;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
                    transition: all 0.3s ease;
                    position: relative;
                }
                .float-contact__btn svg {
                    width: 28px;
                    height: 28px;
                }
                .float-contact__btn:hover {
                    transform: scale(1.08) translateY(-2px);
                    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
                }

                @keyframes floatIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .float-actions {
                        bottom: 20px;
                        right: 20px;
                    }
                    .float-contact__btn {
                        width: 48px;
                        height: 48px;
                    }
                    .scroll-to-top {
                        width: 48px;
                        height: 48px;
                    }
                    .float-contact__bubble { display: none; }
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
                    background: rgba(51, 51, 51, 0.98);
                    border: 1px solid rgba(255, 255, 255, 0.15);
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
                    font-family: 'Satoshi', sans-serif;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--orca-text);
                    margin-bottom: 10px;
                }
                .demo-modal__title {
                    font-family: 'Satoshi', sans-serif;
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
                    border-color: rgba(255, 255, 255, 0.5);
                    background: rgba(5, 7, 10, 0.8);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                }
                .demo-form-field select {
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a5568' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 14px center;
                    padding-right: 36px;
                    cursor: pointer;
                }
                .demo-form-field select option {
                    background: rgba(51, 51, 51, 0.98);
                    color: #EAF6FF;
                }
                .demo-modal__submit {
                    width: 100%;
                    background: var(--orca-text);
                    color: #0A0A0A;
                    border: none;
                    border-radius: 10px;
                    padding: 14px;
                    font-family: 'Satoshi', sans-serif;
                    font-size: 14px;
                    font-weight: 700;
                    letter-spacing: 0.02em;
                    cursor: pointer;
                    margin-top: 4px;
                    transition: all 0.2s ease;
                }
                .demo-modal__submit:hover {
                    background: #E6E6E6;
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