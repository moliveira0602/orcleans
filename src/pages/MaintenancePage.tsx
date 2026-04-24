import React from 'react';
import { Hammer, Clock, MessageSquare } from 'lucide-react';

const MaintenancePage: React.FC = () => {
  return (
    <div className="maintenance-container">
      <div className="maintenance-card">
        <div className="maintenance-icon">
          <Hammer size={48} className="animate-bounce-slow" />
        </div>
        
        <h1>Estamos a melhorar para si</h1>
        
        <p className="maintenance-msg">
          A plataforma ORCA encontra-se em manutenção programada para implementar novas funcionalidades e melhorias de performance.
        </p>
        
        <div className="maintenance-details">
          <div className="detail-item">
            <Clock size={20} />
            <span>Voltamos em breve</span>
          </div>
          <div className="detail-item">
            <MessageSquare size={20} />
            <span>Suporte: suporte@etos.pt</span>
          </div>
        </div>
        
        <div className="maintenance-footer">
          Agradecemos a sua paciência e compreensão.
        </div>
      </div>
      
      <style>{`
        .maintenance-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-main);
          color: var(--t1);
          font-family: 'Outfit', sans-serif;
          padding: 20px;
        }
        
        .maintenance-card {
          max-width: 500px;
          width: 100%;
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 48px;
          text-align: center;
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
          backdrop-filter: blur(10px);
        }
        
        .maintenance-icon {
          width: 80px;
          height: 80px;
          background: var(--accent-gradient);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 32px;
          color: white;
          box-shadow: var(--accent-shadow);
        }
        
        h1 {
          font-size: 32px;
          font-weight: 700;
          margin-bottom: 16px;
          background: var(--accent-gradient);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .maintenance-msg {
          font-size: 18px;
          line-height: 1.6;
          color: var(--t2);
          margin-bottom: 32px;
        }
        
        .maintenance-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 32px;
          padding: 20px;
          background: rgba(255,255,255,0.03);
          border-radius: 16px;
        }
        
        .detail-item {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--t3);
          font-size: 14px;
        }
        
        .maintenance-footer {
          font-size: 14px;
          color: var(--t3);
          font-style: italic;
        }
        
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default MaintenancePage;
