import React, { useEffect, useState, useRef } from "react";

interface LoadingRadarProps {
  size?: number;
  className?: string;
}

interface Blip {
  id: number;
  x: number;
  y: number;
  angle: number;
  distance: number;
  opacity: number;
  createdAt: number;
}

const LoadingRadar: React.FC<LoadingRadarProps> = ({ size = 200, className }) => {
  const [blips, setBlips] = useState<Blip[]>([]);
  const radarRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);

  // Animation loop for rotation and blip triggering
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Update rotation (360 degrees in 4 seconds)
      const newRotation = (rotation + (delta * 360) / 4000) % 360;
      setRotation(newRotation);

      // Chance to spawn a blip ahead of the sweep
      if (Math.random() > 0.96) {
        const id = Date.now();
        // Spawn blip in the quadrant the sweep is heading towards
        const spawnAngle = (newRotation + 20 + Math.random() * 40) % 360;
        const distancePercent = 0.2 + Math.random() * 0.7;
        const dist = (size / 2) * distancePercent;
        
        const rad = (spawnAngle - 90) * (Math.PI / 180);
        const x = size / 2 + Math.cos(rad) * dist;
        const y = size / 2 + Math.sin(rad) * dist;

        setBlips(prev => [...prev.slice(-8), {
          id,
          x,
          y,
          angle: spawnAngle,
          distance: distancePercent,
          opacity: 0,
          createdAt: time
        }]);
      }

      // Update blip opacities based on proximity to sweep
      setBlips(prev => prev.map(blip => {
        // Calculate angular distance between sweep and blip
        let diff = (newRotation - blip.angle + 360) % 360;
        
        let newOpacity = 0;
        if (diff < 10) {
          // Pulse on hit
          newOpacity = 1;
        } else if (diff < 120) {
          // Trail fade
          newOpacity = 1 - (diff / 120);
        }

        return { ...blip, opacity: Math.max(blip.opacity * 0.95, newOpacity) };
      }).filter(b => b.opacity > 0.01 || (time - b.createdAt < 2000)));

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [rotation, size]);

  return (
    <div 
      ref={radarRef}
      className={`radar-container ${className || ""}`}
      style={{ 
        width: size, 
        height: size,
        position: 'relative',
        background: 'radial-gradient(circle at center, #111111 0%, #0A0A0A 100%)',
        borderRadius: '50%',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
        boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 255, 255, 0.02)'
      }}
    >
      {/* Grid Rings with distance markers */}
      {[0.25, 0.5, 0.75, 1.0].map((scale, i) => (
        <div 
          key={i}
          style={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: `${scale * 100}%`,
            height: `${scale * 100}%`,
            transform: 'translate(-50%, -50%)',
            border: '1px solid rgba(255, 255, 255, 0.03)',
            borderRadius: '50%',
            pointerEvents: 'none'
          }}
        >
          {scale === 1.0 && (
            <div style={{
              position: 'absolute',
              top: '50%',
              right: '4px',
              transform: 'translateY(-50%)',
              fontSize: '8px',
              color: 'rgba(255, 255, 255, 0.2)',
              fontFamily: 'monospace'
            }}>5km</div>
          )}
        </div>
      ))}
      
      {/* Dynamic Scan Line / Crosshair */}
      <div style={{ position: 'absolute', top: '50%', left: 0, width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.02)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(255, 255, 255, 0.02)' }} />

      {/* The Sweep - High contrast and glow */}
      <div 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '50%',
          background: 'conic-gradient(from 0deg, rgba(255, 255, 255, 0.25) 0deg, rgba(255, 255, 255, 0.1) 40deg, transparent 120deg)',
          transformOrigin: '0 0',
          transform: `rotate(${rotation - 90}deg)`,
          filter: 'blur(1px)',
          zIndex: 2
        }}
      />
      
      {/* Leading Edge Glow */}
      <div 
        style={{ 
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50%',
          height: '2px',
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.6), transparent)',
          transformOrigin: '0 50%',
          transform: `rotate(${rotation - 90}deg)`,
          zIndex: 3
        }}
      />

      {/* Blips */}
      {blips.map(blip => (
        <div 
          key={blip.id}
          style={{
            position: 'absolute',
            left: blip.x - 2,
            top: blip.y - 2,
            width: '4px',
            height: '4px',
            background: '#FFFFFF',
            borderRadius: '50%',
            opacity: blip.opacity,
            boxShadow: `0 0 ${8 * blip.opacity}px rgba(255, 255, 255, 0.8)`,
            transform: `scale(${0.5 + blip.opacity * 0.5})`,
            transition: 'opacity 0.1s linear',
            zIndex: 4
          }}
        />
      ))}

      {/* Central Hub */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '6px',
        height: '6px',
        background: '#FFFFFF',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
        zIndex: 5
      }} />

      {/* Scanning Noise Overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'url("https://grainy-gradients.vercel.app/noise.svg")',
        opacity: 0.05,
        pointerEvents: 'none',
        zIndex: 1
      }} />

      <style>{`
        @keyframes radar-pulse {
          0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.5; }
          100% { transform: translate(-50%, -50%) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default LoadingRadar;