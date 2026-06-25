import React from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from "@tauri-apps/api/core";

interface InspectorProps {
  selectedNode: any;
  onUpdateNodeData: (nodeId: string, newData: any) => void;
}

export const Inspector: React.FC<InspectorProps> = ({ selectedNode, onUpdateNodeData }) => {
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

  // --- ЭКСПОНЕНЦИАЛЬНАЯ ЛОГИКА ---
  const valToPos = (val: number, min: number, max: number) => {
    if (val < min) val = min;
    return ((Math.log(val) - Math.log(min)) / (Math.log(max) - Math.log(min))) * 100;
  };

  const posToVal = (pos: number, min: number, max: number) => {
    const v = Math.exp(Math.log(min) + (pos / 100) * (Math.log(max) - Math.log(min)));
    return Math.round(v);
  };

  return (
    <aside className="w-full h-full bg-zinc-900 p-4 flex flex-col gap-6 overflow-y-auto font-sans border-l border-zinc-800 shadow-inner">
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
              <div className="flex justify-between text-[10px] font-black text-zinc-500 uppercase">
                <span>Distribution Method</span>
              </div>
              <select 
                value={data.distribution || 'Uniform'}
                onChange={(e) => handleChange('distribution', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 font-bold"
              >
                <option value="Uniform">Uniform (Circle)</option>
                <option value="Gaussian">Gaussian (Normal)</option>
                <option value="Square">Legacy Square</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Point Count</span>
                <span className="text-indigo-400 font-mono font-black">{data.count || 50}</span>
              </div>
              <input type="range" min="0" max="100" 
                value={valToPos(data.count || 50, 1, 2000)}
                onChange={(e) => handleChange('count', posToVal(parseInt(e.target.value), 1, 2000))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Spawn Radius</span>
                <span className="text-indigo-400 font-mono font-black">{data.radius || 200}</span>
              </div>
              <input type="range" min="0" max="100" 
                value={valToPos(data.radius || 200, 10, 5000)}
                onChange={(e) => handleChange('radius', posToVal(parseInt(e.target.value), 10, 5000))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Edge Gravity</span>
                <span className="text-indigo-400 font-mono font-black">{(data.gravity || 0).toFixed(2)}</span>
              </div>
              <input type="range" min="-1" max="1" step="0.01"
                value={data.gravity || 0}
                onChange={(e) => handleChange('gravity', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[7px] text-zinc-600 uppercase font-black">
                <span>Center</span><span>None</span><span>Edges</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Clumping</span>
                <span className="text-indigo-400 font-mono font-black">{(data.clumping || 0).toFixed(2)}</span>
              </div>
              <input type="range" min="0" max="1" step="0.01"
                value={data.clumping || 0}
                onChange={(e) => handleChange('clumping', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
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
            
            <div className="space-y-1">
                <div className="text-[9px] font-black text-zinc-500 uppercase">Random Seed</div>
                <input type="number" value={data.seed || 42}
                  onChange={(e) => handleChange('seed', parseInt(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-indigo-300 focus:outline-none focus:border-indigo-500 font-mono"
                />
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
          </div>
        )}

        {/* SAT PHYSICS */}
        {data.label === 'SAT PHYSICS' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Separation Iterations</span>
                <span className="text-indigo-400 font-mono font-black">{data.iterations || 10}</span>
              </div>
              <input type="range" min="0" max="100" 
                value={valToPos(data.iterations || 10, 1, 200)}
                onChange={(e) => handleChange('iterations', posToVal(parseInt(e.target.value), 1, 200))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-zinc-800 text-[9px] text-zinc-600 font-mono flex justify-between uppercase">
          <span>Engine:</span>
          <span className="text-zinc-400 font-bold tracking-tighter">PROC_V2_REANIMATED</span>
      </div>
    </aside>
  );
};
