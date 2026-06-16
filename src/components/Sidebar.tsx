import React from 'react';
import { NODE_REGISTRY } from '../core/registry';

interface SidebarProps {
  onAddNode: (type: string, label: string, description: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onAddNode }) => {
  // Группируем ноды по категориям
  const categories = Array.from(new Set(Object.values(NODE_REGISTRY).map(n => n.category)));

  return (
    <aside className="w-64 min-w-[150px] max-w-[400px] bg-zinc-900 border-r border-zinc-800 p-4 flex flex-col gap-6 z-20 overflow-y-auto shadow-2xl resize-x">
      <div className="flex items-center gap-2 px-1">
        <div className="w-1.5 h-4 bg-indigo-500 rounded-full"></div>
        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Node Library</div>
      </div>
      
      <div className="flex flex-col gap-8">
        {categories.map((category) => (
          <div key={category} className="flex flex-col gap-3">
            <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest px-1 border-b border-zinc-800/50 pb-1">
              {category}s
            </div>
            <div className="flex flex-col gap-2">
              {Object.entries(NODE_REGISTRY)
                .filter(([_, def]) => def.category === category)
                .map(([key, def]) => (
                  <button
                    key={key}
                    onClick={() => onAddNode(def.type, def.label, def.description)}
                    className="flex flex-col items-start p-3 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg transition-all active:scale-95 group text-left"
                  >
                    <span className="text-[11px] font-black text-zinc-300 group-hover:text-indigo-400 uppercase tracking-tight transition-colors">
                      {def.label}
                    </span>
                    <span className="text-[9px] text-zinc-500 mt-1 uppercase tracking-tighter leading-none font-medium">
                      {def.description}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-6 border-t border-zinc-800/50">
        <p className="text-[9px] text-zinc-600 italic leading-tight font-medium px-1">
          Select a node to add it to the graph workspace.
        </p>
      </div>
    </aside>
  );
};
