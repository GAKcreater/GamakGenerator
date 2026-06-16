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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parentRef.current) return;
    
    canvas.width = parentRef.current.clientWidth;
    canvas.height = parentRef.current.clientHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2 + offset.x, canvas.height / 2 + offset.y);
    ctx.scale(zoom, zoom);

    // Grid
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1 / zoom;
    const gridStep = 40;
    const gridLimit = 2000;
    for (let i = -gridLimit; i <= gridLimit; i += gridStep) {
      ctx.beginPath(); ctx.moveTo(i, -gridLimit); ctx.lineTo(i, gridLimit); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-gridLimit, i); ctx.lineTo(gridLimit, i); ctx.stroke();
    }

    // Entities Rendering
    entities.forEach(entity => {
      if (entity.type === 'Point') {
        const p = entity.data;
        ctx.fillStyle = '#facc15'; // Yellow for points
        ctx.beginPath();
        ctx.arc(p.pos[0], p.pos[1], 2 / zoom, 0, Math.PI * 2);
        ctx.fill();
      }

      if (entity.type === 'Polygon') {
        const poly = entity.data;
        if (poly.exterior && poly.exterior.length > 0) {
            ctx.strokeStyle = '#3b82f6'; // Blue for polygons
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 2 / zoom;
            
            ctx.beginPath();
            ctx.moveTo(poly.exterior[0][0], poly.exterior[0][1]);
            for (let i = 1; i < poly.exterior.length; i++) {
                ctx.lineTo(poly.exterior[i][0], poly.exterior[i][1]);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Draw vertices
            ctx.fillStyle = '#60a5fa';
            poly.exterior.forEach((pt: any) => {
                ctx.beginPath();
                ctx.arc(pt[0], pt[1], 3 / zoom, 0, Math.PI * 2);
                ctx.fill();
            });
        }
      }
    });

    // World Center Marker (0,0) - Red
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2 / zoom;
    const markerSize = 10 / zoom;
    ctx.beginPath();
    ctx.moveTo(-markerSize, 0); ctx.lineTo(markerSize, 0);
    ctx.moveTo(0, -markerSize); ctx.lineTo(0, markerSize);
    ctx.stroke();

    // --- Helper Markers for Selected Node ---
    if (selectedNode) {
      const { data } = selectedNode;
      
      // Point Scatter Marker (Blue)
      if (data.label === 'POINT SCATTER') {
        const cx = data.centerX || 0;
        const cy = data.centerY || 0;
        const radius = data.radius || 200;

        ctx.strokeStyle = '#3b82f6';
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#3b82f6';
        ctx.beginPath();
        ctx.arc(cx, cy, 4 / zoom, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.font = `${10 / zoom}px monospace`;
        ctx.fillText(`SCATTER_CENTER (${cx}, ${cy})`, cx + 8/zoom, cy + 4/zoom);
      }

      // Image Mask Marker (Green)
      if (data.label === 'IMAGE MASK') {
        const cx = data.centerX || 0;
        const cy = data.centerY || 0;
        const scale = data.maskScale || 1.0;
        const w = (data.maskWidth || 0) * scale;
        const h = (data.maskHeight || 0) * scale;

        // Draw Mask Outline
        if (w > 0 && h > 0) {
            ctx.strokeStyle = '#10b981';
            ctx.setLineDash([10 / zoom, 10 / zoom]);
            ctx.lineWidth = 1 / zoom;
            ctx.strokeRect(cx - w/2, cy - h/2, w, h);
            ctx.setLineDash([]);
        }

        // Draw Center Cross
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.moveTo(cx - markerSize, cy); ctx.lineTo(cx + markerSize, cy);
        ctx.moveTo(cx, cy - markerSize); ctx.lineTo(cx, cy + markerSize);
        ctx.stroke();

        ctx.fillStyle = '#10b981';
        ctx.font = `${10 / zoom}px monospace`;
        ctx.fillText(`MASK_BOUNDS (${data.maskWidth}x${data.maskHeight})`, cx - w/2, cy - h/2 - 5/zoom);
      }
    }

    ctx.restore();
  }, [entities, offset, zoom, selectedNode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 0) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 1.1;
    const delta = e.deltaY > 0 ? 1 / scaleFactor : scaleFactor;
    setZoom(prev => Math.max(0.1, Math.min(prev * delta, 20)));
  };

  return (
    <div className="flex-1 min-w-[400px] bg-zinc-950 border-l border-zinc-800 flex flex-col z-20 shadow-2xl overflow-hidden font-sans">
      <div className="p-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]"></div>
          <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Interactive Viewport</span>
        </div>
        <button onClick={() => { setOffset({ x: 0, y: 0 }); setZoom(1); }} className="text-[9px] px-2 py-0.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded border border-zinc-700 font-bold transition-colors">RESET CAM</button>
      </div>
      <div ref={parentRef} className="flex-1 relative bg-black overflow-hidden cursor-move" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onWheel={handleWheel}>
        <canvas ref={canvasRef} className="w-full h-full" />
        <div className="absolute bottom-4 left-4 bg-black/50 px-2 py-1 rounded text-[9px] font-mono text-zinc-500 border border-zinc-800 uppercase">
          ZOOM: {(zoom * 100).toFixed(0)}% | PAN: {offset.x.toFixed(0)},{offset.y.toFixed(0)}
        </div>
      </div>
      <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-between items-center text-[9px] text-zinc-500 font-mono italic uppercase">
        <span>BUFF: {entities.length} entities</span>
        <span>Drag LMB to Pan | Wheel to Zoom</span>
      </div>
    </div>
  );
};
