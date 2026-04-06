import React from "react";

interface LoadingRadarProps {
  size?: number;
  color?: string;
}

const LoadingRadar: React.FC<LoadingRadarProps> = ({ size = 150, color = "#00C2FF" }) => {
  return (
    <div 
      className="relative flex items-center justify-center rounded-full border border-[#333] overflow-hidden"
      style={{ 
        width: size, 
        height: size,
        boxShadow: `${size/6}px ${size/6}px ${size/3}px rgba(0,0,0,0.55)`
      }}
    >
      {/* inner dashed ring */}
      <div 
        className="absolute rounded-full border border-dashed border-[#444]"
        style={{ 
          inset: size * 0.15,
          boxShadow: `inset ${-size/30}px ${-size/30}px ${size/6}px rgba(0,0,0,0.25), inset ${size/30}px ${size/30}px ${size/6}px rgba(0,0,0,0.25)`
        }} 
      />

      {/* center dashed circle */}
      <div 
        className="absolute rounded-full border border-dashed border-[#444]"
        style={{ 
          width: size * 0.33, 
          height: size * 0.33,
          boxShadow: `inset ${-size/30}px ${-size/30}px ${size/6}px rgba(0,0,0,0.25), inset ${size/30}px ${size/30}px ${size/6}px rgba(0,0,0,0.25)`
        }} 
      />

      {/* radar sweep */}
      <span 
        className="absolute top-1/2 left-1/2 w-1/2 h-full bg-transparent origin-top-left border-t border-dashed border-white"
        style={{ 
          animation: 'radar81 2s linear infinite'
        }}
      >
        <span 
          className="absolute top-0 left-0 w-full h-full origin-top-left"
          style={{ 
            backgroundColor: color,
            transform: 'rotate(-55deg)',
            filter: 'blur(30px)',
            boxShadow: `20px 20px 20px ${color}`
          }} 
        />
      </span>

      <style>{`
        @keyframes radar81 {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default LoadingRadar;