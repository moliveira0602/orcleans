import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';

export default function LoginPage() {
    const { login, register } = useAuth();
    const navigate = useNavigate();
    const [isRegister, setIsRegister] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [orgName, setOrgName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log('[LOGIN] handleSubmit called, email:', email, 'isRegister:', isRegister, 'loading:', loading);
        setError('');
        setLoading(true);

        if (!email || !password || (isRegister && (!name || !orgName))) {
            setError('Preencha todos os campos.');
            setLoading(false);
            return;
        }

        if (password.length < 8) {
            setError('A senha deve ter pelo menos 8 caracteres.');
            setLoading(false);
            return;
        }

        try {
            if (isRegister) {
                await register(name, email, password, orgName);
            } else {
                await login(email, password);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao autenticar.');
        }

        setLoading(false);
    };

    return (
        <div className="login-page">
            <div className="hero-bg">
                <video className="hero-video" autoPlay muted playsInline poster="/images/ORCA.png">
                    <source src="/images/video/video-orca.mp4" type="video/mp4" />
                </video>
                <div className="hero-gradient" />
                <div className="hero-particles" />
            </div>
            <div className="login-card">
                <div className="login-logo" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <img src="/images/ORCA-white.png" alt="ORCA" />
                </div>

                <h2 className="login-title">
                    {isRegister ? 'Criar conta' : 'Bem-vindo de volta'}
                </h2>
                <p className="login-subtitle">
                    {isRegister
                        ? 'Preencha os dados para começar'
                        : 'Entre na sua conta para continuar'}
                </p>

                {error && <div className="login-error">{error}</div>}

                <form className="login-form" onSubmit={handleSubmit}>
                    {isRegister && (
                        <div className="login-field">
                            <label>Nome</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Seu nome"
                            />
                        </div>
                    )}
                    {isRegister && (
                        <div className="login-field">
                            <label>Empresa</label>
                            <input
                                type="text"
                                value={orgName}
                                onChange={(e) => setOrgName(e.target.value)}
                                placeholder="Nome da sua empresa"
                            />
                        </div>
                    )}
                    <div className="login-field">
                        <label>Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="seu@email.com"
                            autoComplete="email"
                        />
                    </div>
                    <div className="login-field">
                        <label>Senha</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Sua senha"
                            autoComplete={isRegister ? 'new-password' : 'current-password'}
                        />
                    </div>

                    <button type="submit" className="login-submit" disabled={loading}>
                        {loading ? 'Aguarde...' : isRegister ? 'Criar conta' : 'Entrar'}
                    </button>
                </form>

                <button
                    className="login-toggle"
                    onClick={() => {
                        setIsRegister((v) => !v);
                        setError('');
                    }}
                >
                    {isRegister ? 'Já tem uma conta? Entrar' : 'Não tem conta? Criar agora'}
                </button>
            </div>

            <style>{`
                .login-page {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                }
                .hero-bg { position: absolute; inset: 0; z-index: 0; overflow: hidden; }
                .hero-video {
                    position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%;
                    width: auto; height: auto; transform: translate(-50%, -50%);
                    object-fit: cover; opacity: 0.4;
                }
                .hero-gradient { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 0%, rgba(51, 51, 51, 0.4) 0%, #0A0A0A 80%); z-index: 1; }
                .hero-particles {
                    position: absolute; inset: 0;
                    background-image: radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px);
                    background-size: 60px 60px; opacity: 0.3; z-index: 2;
                }
                .login-card {
                    position: relative;
                    z-index: 10;
                    background: rgba(51, 51, 51, 0.95);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 20px;
                    padding: 40px 36px;
                    width: 100%;
                    max-width: 400px;
                    animation: loginAppear 0.35s ease;
                }
                @keyframes loginAppear {
                    from { opacity: 0; transform: translateY(20px) scale(0.97); }
                    to { opacity: 1; transform: translateY(0) scale(1); }
                }
                .login-logo {
                    display: flex;
                    justify-content: center;
                    margin-bottom: 24px;
                }
                .login-logo img { height: 28px; }
                .login-title {
                    font-family: 'Satoshi', sans-serif;
                    font-size: 22px;
                    font-weight: 700;
                    color: #EAF6FF;
                    text-align: center;
                    margin-bottom: 4px;
                }
                .login-subtitle {
                    font-size: 14px;
                    color: rgba(234, 246, 255, 0.45);
                    text-align: center;
                    margin-bottom: 28px;
                }
                .login-error {
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 10px;
                    padding: 10px 14px;
                    font-size: 13px;
                    color: #EF4444;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .login-form { display: flex; flex-direction: column; gap: 16px; }
                .login-field { display: flex; flex-direction: column; gap: 6px; }
                .login-field label {
                    font-size: 12px;
                    font-weight: 500;
                    color: rgba(234, 246, 255, 0.5);
                    letter-spacing: 0.02em;
                }
                .login-field input {
                    background: rgba(5, 7, 10, 0.5);
                    border: 1px solid rgba(234, 246, 255, 0.1);
                    border-radius: 10px;
                    padding: 11px 14px;
                    font-family: inherit;
                    font-size: 14px;
                    color: #EAF6FF;
                    outline: none;
                    transition: all 0.2s ease;
                }
                .login-field input::placeholder { color: rgba(234, 246, 255, 0.25); }
                .login-field input:focus {
                    border-color: rgba(255, 255, 255, 0.5);
                    background: rgba(5, 7, 10, 0.8);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                }
                .login-submit {
                    background: var(--orca-accent);
                    color: #0A0A0A;
                    border: none;
                    border-radius: 10px;
                    padding: 13px;
                    font-family: 'Satoshi', sans-serif;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    margin-top: 4px;
                }
                .login-submit:hover { background: #E6E6E6; transform: translateY(-1px); }
                .login-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
                .login-toggle {
                    background: none;
                    border: none;
                    color: rgba(255, 255, 255, 0.6);
                    font-size: 13px;
                    cursor: pointer;
                    margin-top: 16px;
                    width: 100%;
                    transition: color 0.2s ease;
                }
                .login-toggle:hover { color: var(--orca-accent); }
            `}</style>
        </div>
    );
}
