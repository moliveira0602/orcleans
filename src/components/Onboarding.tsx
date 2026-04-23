import { useState, useCallback } from 'react';
import { ArrowRight, ArrowLeft, Check, Waves, Download, Target, Radar, BarChart3, Rocket } from 'lucide-react';
import './ui/Onboarding.css';

type Step = {
    title: string;
    description: string;
    icon: React.ReactNode;
    action?: { label: string; onClick: () => void };
};

const ONBOARDING_STEPS: Step[] = [
    {
        title: 'Bem-vindo à ORCA',
        description: 'A sua plataforma de inteligência comercial B2B. Vamos configurar tudo em poucos passos.',
        icon: <Waves size={40} />,
    },
    {
        title: 'Importe os seus leads',
        description: 'Carregue ficheiros Excel, CSV ou importe do Google Maps. A ORCA deteta automaticamente o formato e mapeia as colunas.',
        icon: <Download size={40} />,
        action: { label: 'Ir para Captura', onClick: () => {} },
    },
    {
        title: 'Scoring automático com IA',
        description: 'Cada lead recebe uma pontuação de 1 a 10 baseada na completude dos dados, avaliações, website e palavras-chave do setor.',
        icon: <Target size={40} />,
    },
    {
        title: 'Explore com o Sonar',
        description: 'Escaneie áreas geográficas para descobrir novos negócios. O Sonar encontra empresas no mapa e adiciona aos seus leads.',
        icon: <Radar size={40} />,
    },
    {
        title: 'Gerencie o pipeline',
        description: 'Arraste leads entre etapas do funil: Novo → Qualificado → Proposta → Negociação → Ganho/Perdido.',
        icon: <BarChart3 size={40} />,
    },
    {
        title: 'Pronto a começar!',
        description: 'A sua conta está configurada. Explore os módulos e comece a captar leads inteligentes.',
        icon: <Rocket size={40} />,
    },
];

interface OnboardingProps {
    onComplete: () => void;
    onNavigate?: (page: string) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
    const [step, setStep] = useState(0);
    const current = ONBOARDING_STEPS[step];
    const isLast = step === ONBOARDING_STEPS.length - 1;

    const handleNext = useCallback(() => {
        if (isLast) {
            localStorage.setItem('orca_onboarding_done', 'true');
            onComplete();
        } else {
            setStep((s) => s + 1);
        }
    }, [isLast, onComplete]);

    const handlePrev = useCallback(() => {
        setStep((s) => Math.max(0, s - 1));
    }, []);

    return (
        <div className="onboarding-overlay">
            <div className="onboarding-card">
                <div className="onboarding-progress">
                    {ONBOARDING_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`onboarding-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
                        />
                    ))}
                </div>

                <div className="onboarding-icon">{current.icon}</div>
                <h2 className="onboarding-title">{current.title}</h2>
                <p className="onboarding-description">{current.description}</p>

                <div className="onboarding-actions">
                    {!isLast && (
                        <button className="onboarding-btn onboarding-btn-secondary" onClick={handlePrev} disabled={step === 0}>
                            <ArrowLeft size={16} />
                            Anterior
                        </button>
                    )}
                    <button className="onboarding-btn onboarding-btn-primary" onClick={handleNext}>
                        {isLast ? (
                            <>
                                <Check size={16} />
                                Começar
                            </>
                        ) : (
                            <>
                                Próximo
                                <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>

                <button className="onboarding-skip" onClick={() => {
                    localStorage.setItem('orca_onboarding_done', 'true');
                    onComplete();
                }}>
                    Pular introdução
                </button>
            </div>
        </div>
    );
}

export function useOnboarding() {
    const isDone = typeof window !== 'undefined' && localStorage.getItem('orca_onboarding_done') === 'true';
    return { isDone };
}
