import { useEffect, useRef } from 'react';

export default function DottedSurface() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create canvases
    const canvas = document.createElement('canvas');
    const postCanvas = document.createElement('canvas');
    const c = canvas.getContext('2d');
    const postctx = postCanvas.getContext('2d');

    if (!c || !postctx) return;

    // Effect Properties
    const vertexCount = 7000;
    const vertexSize = 3;
    const oceanWidth = 204;
    const oceanHeight = -80;
    const gridSize = 32;
    const waveSize = 16;
    const perspective = 100;

    // Common variables
    const depth = vertexCount / oceanWidth * gridSize;
    const sin = Math.sin, cos = Math.cos;

    // Generating dots
    const vertices: number[][] = [];
    for (let i = 0; i < vertexCount; i++) {
      const x = i % oceanWidth;
      const y = 0;
      const z = Math.floor(i / oceanWidth);
      const offset = oceanWidth / 2;
      vertices.push([(-offset + x) * gridSize, y * gridSize, z * gridSize]);
    }

    // Style canvases
    const canvasStyle = {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    };

    Object.assign(canvas.style, canvasStyle);
    Object.assign(postCanvas.style, canvasStyle);

    container.appendChild(canvas);
    container.appendChild(postCanvas);

    // Render loop
    let animationId: number;
    let slowFrame = 0;
    const loop = () => {
      animationId = requestAnimationFrame(loop);
      slowFrame += 0.03; // Slow down the animation

      // No rotation - static view with waves coming toward viewer

      if (postCanvas.width !== postCanvas.offsetWidth || postCanvas.height !== postCanvas.offsetHeight) {
        postCanvas.width = canvas.width = postCanvas.offsetWidth;
        postCanvas.height = canvas.height = postCanvas.offsetHeight;
      }

      c.fillStyle = 'black';
      c.fillRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.translate(canvas.width / 2, canvas.height / 2);
      c.beginPath();

      vertices.forEach((vertex, i) => {
        let x = vertex[0] - slowFrame % (gridSize * 2);
        let z = vertex[2] - slowFrame * 2 % gridSize + (i % 2 === 0 ? gridSize / 2 : 0);
        const wave = cos(slowFrame / 45 + x / 50) - sin(slowFrame / 20 + z / 50) + sin(slowFrame / 30 + z * x / 10000);
        let y = vertex[1] + wave * waveSize;
        const a = Math.max(0, 1 - Math.sqrt(Math.pow(x, 2) + Math.pow(z, 2)) / depth);
        y -= oceanHeight;

        // Simple perspective projection (no rotation)
        const px = x / (z / perspective);
        const py = y / (z / perspective);
        if (a < 0.01) return;
        if (z < 0) return;
        c.globalAlpha = a * 0.3; // Reduced opacity to focus on text
        c.fillStyle = 'whitesmoke';
        c.fillRect(px - a * vertexSize / 2, py - a * vertexSize / 2, a * vertexSize, a * vertexSize);
        c.globalAlpha = 1;
      });

      c.restore();

      // Post-processing
      postctx.drawImage(canvas, 0, 0);
      postctx.globalCompositeOperation = 'screen';
      postctx.filter = 'blur(16px)';
      postctx.drawImage(canvas, 0, 0);
      postctx.filter = 'blur(0)';
      postctx.globalCompositeOperation = 'source-over';
    };

    loop();

    return () => {
      cancelAnimationFrame(animationId);
      container.removeChild(canvas);
      container.removeChild(postCanvas);
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }} />;
}