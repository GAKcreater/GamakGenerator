import React, { useRef, useEffect, useState } from 'react';

interface ViewportProps {
  entities: any[];
  selectedNode: any | null;
}

export const Viewport: React.FC<ViewportProps> = ({ entities, selectedNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Постоянная проверка размеров и отрисовка
  useEffect(() => {
    let frameId: number;
    
    const render = () => {
      const canvas = canvasRef.current;
      const parent = parentRef.current;
      if (!canvas || !parent) {
        frameId = requestAnimationFrame(render);
        return;
      }

      // Синхронизация размера
      if (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight) {
          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Очистка
        ctx.fillStyle = '#09090b';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.save();
        ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
        ctx.scale(zoom, zoom);

        // Сетка
        ctx.strokeStyle = '#1a1a1e';
        ctx.lineWidth = 1 / zoom;
        const gridStep = 50;
        const limit = 5000;
        ctx.beginPath();
        for (let i = -limit; i <= limit; i += gridStep) {
          ctx.moveTo(i, -limit); ctx.lineTo(i, limit);
          ctx.moveTo(-limit, i); ctx.lineTo(limit, i);
        }
        ctx.stroke();

        // Центр мира
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(-20/zoom, 0); ctx.lineTo(20/zoom, 0);
        ctx.moveTo(0, -20/zoom); ctx.lineTo(0, 20/zoom);
        ctx.stroke();

        // Отрисовка сущностей
        if (entities && entities.length > 0) {
            entities.forEach(ent => {
                if (ent.type === 'Point') {
                    ctx.fillStyle = ent.color || '#fbbf24';
                    ctx.beginPath();
                    ctx.arc(ent.data.pos[0], ent.data.pos[1], 3/zoom, 0, Math.PI*2);
                    ctx.fill();
                }
                if (ent.type === 'Polygon' && ent.data.exterior) {
                    ctx.strokeStyle = ent.color || '#3b82f6';
                    ctx.fillStyle = ent.color || '#3b82f6';
                    ctx.globalAlpha = 0.2;
                    ctx.beginPath();
                    ctx.moveTo(ent.data.exterior[0][0], ent.data.exterior[0][1]);
                    ent.data.exterior.forEach((p: any) => ctx.lineTo(p[0], p[1]));
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 1.0;
                    ctx.stroke();
                }
            });
        }

        // Хелперы
        if (selectedNode?.data?.label === 'POINT SCATTER') {
            const { centerX: cx = 0, centerY: cy = 0, radius = 200 } = selectedNode.data;
            ctx.strokeStyle = '#6366f1';
            ctx.setLineDash([5/zoom, 5/zoom]);
            ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2); ctx.stroke();
            ctx.setLineDash([]);
        }

        if (selectedNode?.data?.label === 'IMAGE MASK') {
            const { centerX = 0, centerY = 0, maskScale = 1.0, maskWidth = 0, maskHeight = 0 } = selectedNode.data;
            if (maskWidth > 0 && maskHeight > 0) {
                const w = maskWidth * maskScale;
                const h = maskHeight * maskScale;
                ctx.strokeStyle = '#10b981'; // Green to indicate Mask
                ctx.setLineDash([5/zoom, 5/zoom]);
                ctx.strokeRect(centerX - w/2, centerY - h/2, w, h);
                ctx.setLineDash([]);
            }
        }

        ctx.restore();
      } catch (e) {
        console.error("Render Error:", e);
      }

      frameId = requestAnimationFrame(render);
    };

    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [entities, offset, zoom, selectedNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 || e.button === 1) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset(prev => ({
        x: prev.x + (e.clientX - lastMousePos.x),
        y: prev.y + (e.clientY - lastMousePos.y)
      }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div ref={parentRef} 
         className="flex-1 w-full h-full relative bg-zinc-950 overflow-hidden cursor-crosshair"
         onMouseDown={handleMouseDown}
         onMouseMove={handleMouseMove}
         onMouseUp={() => setIsDragging(false)}
         onMouseLeave={() => setIsDragging(false)}
         onWheel={(e) => setZoom(z => Math.max(0.01, Math.min(z * (e.deltaY > 0 ? 0.9 : 1.1), 50)))}
    >
      <canvas ref={canvasRef} className="block w-full h-full" style={{ background: '#09090b' }} />
      
      {/* Статусная панель */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
        <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-mono">
          <span className="text-zinc-500 uppercase">Status:</span> <span className="text-emerald-400 font-bold">READY</span>
        </div>
        <div className="bg-black/80 backdrop-blur-md border border-white/10 px-2 py-1 rounded text-[10px] font-mono">
          <span className="text-zinc-500 uppercase">Buffer:</span> <span className="text-indigo-400 font-bold">{entities.length} items</span>
        </div>
      </div>

      <button 
        onClick={() => {setOffset({x:0,y:0}); setZoom(1);}}
        className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 text-white text-[9px] font-bold px-2 py-1 rounded border border-white/5 transition-all"
      >
        RESET CAMERA
      </button>
    </div>
  );
};
