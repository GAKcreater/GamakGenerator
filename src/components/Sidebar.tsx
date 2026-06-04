import React from 'react';

const nodeDefinitions = [
  { type: 'procNode', label: 'POINT SCATTER', description: 'Source: Random Cloud' },
  { type: 'procNode', label: 'SAT PHYSICS', description: 'Modifier: Collision' },
  { type: 'procNode', label: 'VIEWPORT', description: 'Output: Final View' },
];

interface SidebarProps {
  onAddNode: (type: string, label: string, description: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode }) => {
  return (
    <aside className="w-64 bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-4 z-20">
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Node Library</div>
      
      <div className="flex flex-col gap-2">
        {nodeDefinitions.map((node) => (
          <button
            key={node.label}
            onClick={() => onAddNode(node.type, node.label, node.description)}
            className="flex flex-col items-start p-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-all active:scale-95 group text-left"
          >
            <span className="text-xs font-bold text-zinc-200 group-hover:text-indigo-400">{node.label}</span>
            <span className="text-[9px] text-zinc-500 mt-1 uppercase tracking-tighter">{node.description}</span>
          </button>
        ))}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <p className="text-[9px] text-zinc-600 italic">Tip: Click to add node to center</p>
      </div>
    </aside>
  );
};
