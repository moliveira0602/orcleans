import React, { useEffect, useState } from "react";

interface LoadingRadarProps {
  size?: number;
}

const LoadingRadar: React.FC<LoadingRadarProps> = ({ size = 200 }) => {
  const [blips, setBlips] = useState<{ id: number; x: number; y: number; opacity: number }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const id = Date.now();
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * (size / 2 - 10);
        setBlips(prev => [...prev.slice(-4), {
          id,
          x: size / 2 + Math.cos(angle) * dist,
          y: size / 2 + Math.sin(angle) * dist,
          opacity: 1
        }]);

        setTimeout(() => {
          setBlips(prev => prev.filter(b => b.id !== id));
        }, 2000);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [size]);

  return (
    <div 
      className="radar-container"
      style={{ 
        width: size, 
        height: size,
        position: 'relative',
        background: '#0A0A0A',
        borderRadius: '50%',
        border: '1px solid #333333',
        overflow: 'hidden'
      }}
    >
      {/* Grid Rings */}
      <div className="radar-ring" style={{ width: '100%', height: '100%', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
      <div className="radar-ring" style={{ width: '66%', height: '66%', top: '17%', left: '17%', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
      <div className="radar-ring" style={{ width: '33%', height: '33%', top: '33.5%', left: '33.5%', border: '1px solid rgba(255, 255, 255, 0.05)' }} />
      
      {/* Crosshair */}
      <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.05)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.05)' }} />

      {/* Sweep */}
      <div 
        className="radar-sweep"
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '50%',
          background: 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.15) 0deg, transparent 90deg)',
          transformOrigin: '0 0',
          animation: 'radar-sweep 4s linear infinite',
          filter: 'blur(2px)'
        }}
      />

      {/* Blips */}
      {blips.map(blip => (
        <div 
          key={blip.id}
          className="radar-blip"
          style={{
            position: 'absolute',
            left: blip.x,
            top: blip.y,
            width: '4px',
            height: '4px',
            background: '#FFFFFF',
            borderRadius: '50%',
            boxShadow: '0 0 8px #FFFFFF',
            animation: 'radar-blip-fade 2s ease-out forwards'
          }}
        />
      ))}

      <style>{`
        .radar-ring {
          position: absolute;
          border-radius: 50%;
          box-sizing: border-box;
        }
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes radar-blip-fade {
          0% { opacity: 0; transform: scale(0); }
          10% { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
};

export default LoadingRadar;