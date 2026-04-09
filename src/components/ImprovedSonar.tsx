import { useState, useEffect, useRef } from 'react';

const ImprovedSonar = () => {
  const [sonarProgress, setSonarProgress] = useState(0);
  const [pulseProgress, setPulseProgress] = useState(0);
  const [dotPositions, setDotPositions] = useState<{ x: number; y: number }[]>([]);
  const sonarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let sonarInterval: ReturnType<typeof setInterval>;
    let pulseInterval: ReturnType<typeof setInterval>;

    const initSonar = () => {
      sonarInterval = setInterval(() => {
        setSonarProgress((prev) => (prev + 0.01) % 1);
      }, 50);

      pulseInterval = setInterval(() => {
        setPulseProgress((prev) => (prev + 0.01) % 1);
      }, 100);

      const updateDotPositions = () => {
        const sonarEl = sonarRef.current;
        if (sonarEl) {
          const { width, height } = sonarEl.getBoundingClientRect();
          const newDots: { x: number; y: number }[] = [];
          for (let i = 0; i < 3; i++) {
            newDots.push({
              x: Math.random() * width,
              y: Math.random() * height,
            });
          }
          setDotPositions(newDots);
        }
      };
      updateDotPositions();
      const dotPositionInterval = setInterval(updateDotPositions, 3000);

      return () => {
        clearInterval(sonarInterval);
        clearInterval(pulseInterval);
        clearInterval(dotPositionInterval);
      };
    };

    initSonar();
  }, []);

  return (
    <div className="improved-sonar" ref={sonarRef}>
      <div
        className="improved-sonar-circle improved-sonar-circle-1"
        style={{
          transform: `scale(${1 + sonarProgress * 2})`,
          opacity: 1 - sonarProgress,
        }}
      />
      <div
        className="improved-sonar-circle improved-sonar-circle-2"
        style={{
          transform: `scale(${1 + sonarProgress * 2.5})`,
          opacity: 1 - sonarProgress * 1.5,
        }}
      />
      <div
        className="improved-sonar-circle improved-sonar-circle-3"
        style={{
          transform: `scale(${1 + sonarProgress * 3})`,
          opacity: 1 - sonarProgress * 2,
        }}
      />
      <div
        className="improved-sonar-sweep"
        style={{
          transform: `rotate(${sonarProgress * 360}deg)`,
          opacity: 0.8 - sonarProgress * 0.6,
        }}
      />
      <div className="improved-sonar-dots">
        {dotPositions.map((pos, i) => (
          <span
            key={i}
            className="improved-sonar-dot"
            style={{
              top: `${pos.y}px`,
              left: `${pos.x}px`,
              opacity: Math.sin(pulseProgress * Math.PI * 2) * 0.5 + 0.5,
            }}
          />
        ))}
      </div>
      <div
        className="improved-radar-card"
        style={{
          top: '18%',
          left: '25%',
          transform: `scale(${0.8 + pulseProgress * 0.2})`,
          opacity: 0.8 + pulseProgress * 0.2,
        }}
      >
        <div className="improved-radar-card-dot" />
        <div className="improved-radar-card-content">
          <h4>Café São Braz</h4>
          <p>Rua Augusta, 234 - Lisboa</p>
          <span className="improved-radar-card-phone">+351 210 123 456</span>
        </div>
      </div>
      {/* Add more radar cards as needed */}
    </div>
  );
};

export default ImprovedSonar;