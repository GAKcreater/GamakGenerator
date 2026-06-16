import React from 'react';
import { Handle, Position } from "reactflow";
import { PortColors, PortType } from "../core/types";
import { NODE_REGISTRY } from "../core/registry";

export const ProcNode = ({ id, data }: any) => {
  const definition = NODE_REGISTRY[data.label.replace(' ', '_')];
  
  return (
    <div className={`bg-zinc-800 text-white border ${data.label === 'IMAGE MASK' ? 'border-emerald-500/50' : 'border-indigo-500/50'} rounded-lg shadow-xl w-48 font-sans relative`}>
      
      {/* Рендерим Входы (Targets) */}
      {definition?.inputs.map((input, idx) => (
        <Handle 
          key={`in-${idx}`}
          type="target" 
          position={Position.Left} 
          id={input.name}
          className="nopan"
          style={{ 
            background: PortColors[input.type], 
            width: '14px', 
            height: '14px', 
            border: '3px solid #18181b',
            top: `${50 + idx * 30}px`, // Фиксированное смещение сверху
            left: '-7px',
            zIndex: 1000,
            cursor: 'crosshair'
          }}
        />
      ))}

      {/* Рендерим Выходы (Sources) */}
      {definition?.outputs.map((output, idx) => (
        <Handle 
          key={`out-${idx}`}
          type="source" 
          position={Position.Right} 
          id={output.name}
          className="nopan"
          style={{ 
            background: PortColors[output.type], 
            width: '14px', 
            height: '14px', 
            border: '3px solid #18181b',
            top: `${50 + idx * 30}px`, // Фиксированное смещение сверху
            right: '-7px',
            zIndex: 1000,
            cursor: 'crosshair'
          }}
        />
      ))}

      <div className={`px-3 py-2 ${data.label === 'IMAGE MASK' ? 'bg-emerald-500/20' : 'bg-zinc-700/50'} border-b border-zinc-600/50`}>
        <div className={`text-[8px] font-black uppercase tracking-tighter ${data.label === 'IMAGE MASK' ? 'text-emerald-400' : 'text-indigo-400'} mb-0.5`}>
          {definition?.category || 'Unit'}
        </div>
        <div className="text-[11px] font-bold truncate uppercase tracking-tight">{data.label}</div>
      </div>

      <div className="p-3 min-h-[60px]">
        {data.maskPath ? (
          <div className="text-[8px] text-emerald-400 font-mono truncate">IMG: {data.maskPath.split('\\').pop()}</div>
        ) : (
          <div className="text-[9px] text-zinc-400 italic leading-tight">{data.description}</div>
        )}
        
        {data.label === 'POINT SCATTER' && (
          <div className="mt-2 flex justify-between items-center text-[9px] font-mono text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
            <span>PTS:</span><span>{data.count || 50}</span>
          </div>
        )}
      </div>

      {/* Метки для портов (чисто визуальные, не кликабельные) */}
      <div className="absolute top-[40px] left-3 pointer-events-none space-y-4">
        {definition?.inputs.map((input, idx) => (
           <div key={idx} className="text-[7px] text-zinc-500 uppercase font-black leading-[14px]">
             {input.name}
           </div>
        ))}
      </div>
      <div className="absolute top-[40px] right-3 pointer-events-none space-y-4 text-right">
        {definition?.outputs.map((output, idx) => (
           <div key={idx} className="text-[7px] text-zinc-500 uppercase font-black leading-[14px]">
             {output.name}
           </div>
        ))}
      </div>
    </div>
  );
};
