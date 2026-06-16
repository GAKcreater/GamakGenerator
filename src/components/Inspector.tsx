import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";

interface InspectorProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
}

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, onUpdateNodeData }) => {
  if (!selectedNode) {
    return (
      <aside className="w-64 bg-zinc-900 border-l border-zinc-800 p-4 flex flex-col items-center justify-center text-zinc-600 z-20 font-sans">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-center opacity-50 text-zinc-500">Property Inspector</div>
        <p className="text-[10px] italic text-center text-zinc-500/50 text-zinc-600">Select a node to edit properties</p>
      </aside>
    );
  }

  const { id, data } = selectedNode;

  const handleChange = (key: string, value: any) => {
    onUpdateNodeData(id, { ...data, [key]: value });
  };

  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'Image', extensions: ['png', 'jpg', 'jpeg'] }]
      });
      if (selected && typeof selected === 'string') {
        // Получаем размеры изображения из Rust
        const info: any = await invoke("get_mask_info", { path: selected });
        
        onUpdateNodeData(id, { 
            ...data, 
            maskPath: selected,
            maskWidth: info?.width || 0,
            maskHeight: info?.height || 0
        });
      }
    } catch (err) {
      console.error("Dialog error:", err);
    }
  };

  // --- Вспомогательные функции для экспоненциальных шкал ---
  const toExp = (val: number) => Math.round(Math.pow(1.1, val));
  const fromExp = (val: number) => Math.log(val) / Math.log(1.1);
  const toLogRadius = (val: number) => Math.round(10 * Math.pow(1.05, val));
  const fromLogRadius = (val: number) => Math.log(val / 10) / Math.log(1.05);

  return (
    <aside className="w-64 bg-zinc-900 border-l border-zinc-800 p-4 flex flex-col gap-6 z-20 overflow-y-auto font-sans">
      <div>
        <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Entity ID</div>
        <div className="text-[9px] font-mono text-indigo-400 bg-indigo-500/5 px-2 py-1 rounded border border-indigo-500/20 truncate uppercase">{id}</div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold text-zinc-200 border-b border-zinc-800 pb-2 flex items-center gap-2 uppercase tracking-tighter">Parameters</h3>

        {/* POINT SCATTER */}
        {data.label === 'POINT SCATTER' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Point Count</span>
                <span className="text-indigo-400 font-mono">{data.count || 50}</span>
              </div>
              <input type="range" min="1" max="100" 
                value={fromExp(data.count || 50)}
                onChange={(e) => handleChange('count', toExp(parseInt(e.target.value)))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Scatter Radius</span>
                <span className="text-indigo-400 font-mono">{data.radius || 200}</span>
              </div>
              <input type="range" min="0" max="120" 
                value={fromLogRadius(data.radius || 200)}
                onChange={(e) => handleChange('radius', toLogRadius(parseInt(e.target.value)))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase">Center X</div>
                <input type="number" value={data.centerX || 0}
                  onChange={(e) => handleChange('centerX', parseFloat(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase">Center Y</div>
                <input type="number" value={data.centerY || 0}
                  onChange={(e) => handleChange('centerY', parseFloat(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* IMAGE MASK */}
        {data.label === 'IMAGE MASK' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-[10px] font-black text-zinc-500 uppercase mb-2">Mask Source</div>
              <button onClick={handleSelectFile} className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] font-bold text-zinc-300 transition-colors uppercase">
                {data.maskPath ? 'Change Image' : 'Select Image'}
              </button>
              {data.maskPath && (
                <div className="mt-2 space-y-1">
                    <div className="text-[8px] text-indigo-400 font-mono truncate uppercase">FILE: {data.maskPath.split('\\').pop()}</div>
                    <div className="text-[8px] text-zinc-500 font-mono">SIZE: {data.maskWidth}x{data.maskHeight}px</div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Mask Scale</span>
                <span className="text-indigo-400 font-mono">{data.maskScale || 1.0}x</span>
              </div>
              <input type="range" min="0.1" max="10.0" step="0.1" value={data.maskScale || 1.0}
                onChange={(e) => handleChange('maskScale', parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase">Center X</div>
                <input type="number" value={data.centerX || 0}
                  onChange={(e) => handleChange('centerX', parseFloat(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div className="space-y-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase">Center Y</div>
                <input type="number" value={data.centerY || 0}
                  onChange={(e) => handleChange('centerY', parseFloat(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* SAT PHYSICS */}
        {data.label === 'SAT PHYSICS' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Separation Iterations</span>
                <span className="text-indigo-400 font-mono">{data.iterations || 10}</span>
              </div>
              <input type="range" min="1" max="100" value={data.iterations || 10}
                onChange={(e) => handleChange('iterations', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800">
        <div className="text-[9px] text-zinc-600 font-mono flex justify-between uppercase text-zinc-600">
          <span>Engine:</span>
          <span className="text-zinc-400 font-bold tracking-tighter">PROC_V2_RUST</span>
        </div>
      </div>
    </aside>
  );
};
