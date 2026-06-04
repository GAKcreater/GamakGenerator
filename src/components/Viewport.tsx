import React, { useRef, useEffect } from 'react';

interface ViewportProps {
  points: any[];
}

export const Viewport: React.FC<ViewportProps> = ({ points }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;
    
    // Подстраиваем размер канваса под контейнер
    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 40) {
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }

    // Points
    ctx.fillStyle = '#818cf8';
    points.forEach(p => {
      ctx.beginPath();
      const x = p.pos[0] + canvas.width / 2;
      const y = p.pos[1] + canvas.height / 2;
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points]);

  return (
    <div className="flex-1 min-w-[400px] bg-zinc-950 border-l border-zinc-800 flex flex-col z-20 shadow-2xl">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Procedural Viewport</span>
        </div>
        <span className="text-[9px] px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded border border-zinc-700 font-mono font-bold">2D_COORD_SYS</span>
      </div>
      <div ref={parentRef} className="flex-1 relative bg-black overflow-hidden">
        <canvas ref={canvasRef} className="w-full h-full cursor-crosshair" />
      </div>
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-[9px] text-zinc-500 font-mono">
        <span>BUFF_SIZE: {points.length * 8} bytes</span>
        <span className="text-zinc-600 italic">Render: Canvas2D Optimized</span>
      </div>
    </div>
  );
};
