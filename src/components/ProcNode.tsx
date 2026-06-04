import React from 'react';
import { Handle, Position } from "reactflow";

export const ProcNode = ({ data }: any) => {
  return (
    <div className="bg-zinc-800 text-white border border-indigo-500/50 rounded-lg shadow-xl overflow-hidden w-40 transition-all hover:border-indigo-400 group">
      <Handle 
        type="target" 
        position={Position.Left} 
        className="w-3 h-3 bg-indigo-500 border-2 border-zinc-800" 
      />
      <div className="px-3 py-2 bg-zinc-700/50 border-b border-zinc-600/50">
        <div className="text-[10px] font-black uppercase tracking-tighter text-indigo-400 mb-0.5">Entity</div>
        <div className="text-xs font-bold truncate">{data.label}</div>
      </div>
      <div className="p-3 text-[10px] text-zinc-400 italic leading-tight">
        {data.description}
      </div>
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-indigo-500 border-2 border-zinc-800" 
      />
    </div>
  );
};
