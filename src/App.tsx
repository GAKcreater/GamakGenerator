import React, { useState, useCallback } from "react";
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState, 
  useEdgesState,
  addEdge,
  Connection,
  Handle,
  Position
} from "reactflow";
import "reactflow/dist/style.css";
import { invoke } from "@tauri-apps/api/core";

// Components
import { Sidebar } from "./components/Sidebar";
import { Viewport } from "./components/Viewport";

// --- Кастомный Узел: Базовый ---
const ProcNode = ({ data }: any) => (
  <div className="bg-zinc-800 text-white border border-indigo-500/50 rounded-lg shadow-xl overflow-hidden w-40 transition-all hover:border-indigo-400 group">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-indigo-500 border-2 border-zinc-800" />
    <div className="px-3 py-2 bg-zinc-700/50 border-b border-zinc-600/50">
      <div className="text-[10px] font-black uppercase tracking-tighter text-indigo-400 mb-0.5 font-sans">Generator</div>
      <div className="text-xs font-bold truncate font-sans">{data.label}</div>
    </div>
    <div className="p-3 text-[10px] text-zinc-400 italic leading-tight font-sans">
      {data.description}
    </div>
    <Handle type="source" position={Position.Right} className="w-3 h-3 bg-indigo-500 border-2 border-zinc-800" />
  </div>
);

// --- Кастомный Узел: Viewport (Финал) ---
const ViewportNode = ({ data }: any) => (
  <div className="bg-zinc-900 text-white border-2 border-purple-500 rounded-lg shadow-[0_0_20px_rgba(168,85,247,0.2)] overflow-hidden w-40 font-sans">
    <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-500 border-2 border-zinc-900" />
    <div className="px-3 py-2 bg-purple-500/20 border-b border-purple-500/30">
      <div className="text-[10px] font-black uppercase tracking-tighter text-purple-300 mb-0.5">Output</div>
      <div className="text-xs font-bold truncate">{data.label}</div>
    </div>
    <div className="p-3 text-[10px] text-purple-200/50 italic leading-tight">
      End of pipeline. Renders to live view.
    </div>
  </div>
);

const nodeTypes = {
  procNode: ProcNode,
  viewportNode: ViewportNode,
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [generatedPoints, setGeneratedPoints] = useState<any[]>([]);

  const addNode = useCallback((type: string, label: string, description: string) => {
    const id = `node-${Date.now()}`;
    // Важно: тип ноды для React Flow должен совпадать с ключами в nodeTypes
    const flowType = label === 'VIEWPORT' ? 'viewportNode' : 'procNode';
    
    const newNode = {
      id,
      type: flowType,
      data: { label, description },
      position: { x: 100, y: 100 },
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ 
      ...params, 
      animated: true, 
      style: { stroke: '#6366f1', strokeWidth: 2 } 
    }, eds)),
    [setEdges]
  );

  const handleRecalc = async () => {
    try {
      console.log("--- GRAPH EXECUTION STARTED ---");
      
      // 1. Находим ноды VIEWPORT
      const viewportNodes = nodes.filter(n => n.type === 'viewportNode');
      console.log("Found viewports:", viewportNodes.length);
      
      let totalPointsToGen = 0;
      
      viewportNodes.forEach(vNode => {
        // 2. Ищем все ребра, которые входят в этот конкретный вьюпорт
        const connections = edges.filter(e => e.target === vNode.id);
        console.log(`Viewport ${vNode.id} has ${connections.length} incoming connections`);
        
        connections.forEach(edge => {
          // 3. Ищем ноду, которая является источником (source) для этого ребра
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
            console.log(`Source found: ${sourceNode.data.label}`);
            if (sourceNode.data.label === 'POINT SCATTER') {
              totalPointsToGen += 50;
            }
          }
        });
      });

      console.log("Total points to generate:", totalPointsToGen);

      if (totalPointsToGen === 0) {
        setGeneratedPoints([]);
        return;
      }

      const res = await invoke("generate_test_points", { count: totalPointsToGen });
      setGeneratedPoints(res as any[]);
    } catch (err) {
      console.error("Failed to execute graph:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <header className="h-14 flex items-center justify-between px-6 bg-zinc-900 border-b border-zinc-800 shadow-md z-30 font-sans">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center font-black text-white italic shadow-lg shadow-indigo-500/20">P</div>
          <h1 className="text-sm font-black uppercase tracking-widest text-zinc-200">
            ProcEngine <span className="text-indigo-500">V2</span>
          </h1>
        </div>
        
        <button 
          onClick={handleRecalc}
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-[11px] font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 border border-indigo-400/30"
        >
          Execute Graph
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar onAddNode={addNode} />

        <main className="flex-[2] relative border-r border-zinc-800 bg-zinc-900/30">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            deleteKeyCode={["Backend", "Delete"]}
            fitView
          >
            <Background color="#27272a" gap={24} size={1} />
            <Controls position="bottom-right" className="bg-zinc-800 border-zinc-700 fill-zinc-200" />
          </ReactFlow>

          <div className="absolute top-6 right-6 p-4 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-lg shadow-xl pointer-events-none min-w-[150px] z-20 font-sans">
            <div className="text-[9px] font-black text-zinc-500 uppercase mb-2 tracking-tighter">System Pipeline</div>
            <div className="text-[10px] space-y-1 font-mono">
              <div className="flex justify-between"><span>NODES</span> <span className="text-zinc-200 font-bold">{nodes.length}</span></div>
              <div className="flex justify-between border-b border-zinc-800/50 pb-1 mb-1"><span>EDGES</span> <span className="text-indigo-400 font-bold">{edges.length}</span></div>
              <div className="flex justify-between font-bold">
                <span className="text-zinc-400">PTS_OUT</span> 
                <span className="text-indigo-400">{generatedPoints.length}</span>
              </div>
            </div>
          </div>
        </main>

        <Viewport points={generatedPoints} />
      </div>
    </div>
  );
}

export default App;
